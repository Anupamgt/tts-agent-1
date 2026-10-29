import logging
import time

from psycopg import errors
from psycopg.types.json import Json

from app.bus import redis_bus
from app.config import HANDOFF_WAIT_SECONDS
from app.db import many, one
from app.handoff_wait import pop, prime, wait_for_desk
from app.metrics import metrics
from app.tools_common import (
    as_bool,
    audit,
    doctor_matches,
    load_call,
    parse_call_id,
    patient_phone,
    phase_ok,
    privilege_result,
    render_template,
    result,
    settings_for,
)
from app.traces import write_trace

log = logging.getLogger("clinic")
MOBILE = __import__("re").compile(r"^\+91[6-9][0-9]{9}$")
CALLBACK_PHONE = __import__("re").compile(r"^\+91[0-9]{10}$")
DISPOSITIONS = {
    "in_progress", "booked", "rescheduled", "cancelled", "info_provided",
    "ticket_created", "callback_queued", "transferred_to_human",
    "emergency_redirected", "abandoned", "verification_failed", "out_of_scope",
}


async def set_phase(conn, call_id: int, phase: str):
    await conn.execute("UPDATE calls SET phase = %s WHERE id = %s", (phase, call_id))
    await redis_bus.hset(f"call:{call_id}", {"phase": phase})
    payload = {"call_id": str(call_id), "phase": phase}
    await redis_bus.publish(f"live:call:{call_id}", {"event": "call.phase", "payload": payload})
    await redis_bus.publish("live:desk", {"event": "call.phase", "payload": payload})


async def get_clinic_info(db, args):
    call_id = parse_call_id(args.get("call_id"))
    topic = (args.get("topic") or "hours").strip().lower()
    async with db.connection() as conn:
        async with conn.transaction():
            call = await load_call(conn, call_id) if call_id else None
            if not phase_ok(call):
                return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
            if topic == "doctors":
                rows = await many(
                    conn,
                    """SELECT name, specialty, appointment_fee_inr, priority_fee_inr
                         FROM doctors WHERE clinic_id = %s AND active ORDER BY id""",
                    (call["clinic_id"],),
                )
                names = ", ".join(row["name"] for row in rows)
                return result(True, f"The doctors are {names}.", data={"doctors": [dict(row) for row in rows]})
            row = await one(
                conn,
                """SELECT answer FROM clinic_info
                    WHERE clinic_id = %s AND topic = %s
                    ORDER BY CASE WHEN language = 'en' THEN 0 ELSE 1 END
                    LIMIT 1""",
                (call["clinic_id"], topic),
            )
            if row is None:
                return result(True, "I do not have that information.", data={"topic": topic})
            return result(True, row["answer"], data={"topic": topic, "answer": row["answer"]})


async def _summary(conn, call, reason: str) -> str:
    phone = (call["from_number"] or "")[-4:]
    if not call["verified"]:
        who = f"Caller not verified. Phone ending {phone}."
    elif call["verification_mode"] == "limited":
        who = f"Relative, verified for bookings only. Phone ending {phone}."
    else:
        patient = await one(conn, "SELECT full_name FROM patients WHERE id = %s", (call["patient_id"],))
        who = f"Caller: {patient['full_name']}, verified, card on file. Phone ending {phone}."
    lines = [who, f"Asked for: {reason}"]
    invocations = await many(
        conn,
        """SELECT tool_name, ok FROM tool_invocations
            WHERE call_id = %s ORDER BY id""",
        (call["id"],),
    )
    done = [
        f"{row['tool_name']} {'ok' if row['ok'] else 'failed'}"
        for row in invocations
        if row["tool_name"] not in {"request_human", "set_disposition"}
    ]
    if done:
        lines.append("Done on this call: " + "; ".join(done) + ".")
    if call["verified"]:
        bookings = await many(
            conn,
            """SELECT d.name, w.starts_at, b.status
                 FROM bookings b
                 JOIN windows w ON w.id = b.window_id
                 JOIN doctors d ON d.id = b.doctor_id
                WHERE b.patient_id = %s AND b.status IN ('held', 'booked', 'arrived', 'in_consult')
                ORDER BY w.starts_at""",
            (call["patient_id"],),
        )
        if bookings:
            lines.append(
                "Open bookings: "
                + "; ".join(f"{row['name']} {row['status']}" for row in bookings)
                + "."
            )
    turns = await many(
        conn,
        """SELECT speaker, text_body FROM transcript_segments
            WHERE call_id = %s ORDER BY seq DESC LIMIT 4""",
        (call["id"],),
    )
    if turns:
        lines.append("Recent turns:")
        for turn in reversed(turns):
            lines.append(f"  {turn['speaker']}: {turn['text_body']}")
    return "\n".join(lines)


async def _snapshot(conn, call_id: int):
    rows = await many(
        conn,
        """SELECT seq, speaker, text_body FROM transcript_segments
            WHERE call_id = %s ORDER BY seq""",
        (call_id,),
    )
    return [{"seq": int(row["seq"]), "speaker": row["speaker"], "text": row["text_body"]} for row in rows]


async def request_human(db, args):
    call_id = parse_call_id(args.get("call_id"))
    if call_id is None:
        return result(False, "This call is not active.", error_code="bad_call", next_="stop")
    reason = (args.get("reason") or "Caller asked for a person.")[:500]
    priority = args.get("priority") if args.get("priority") in {"P1", "P2", "P3"} else "P3"
    prime(call_id)
    started = time.perf_counter()
    try:
        async with db.connection() as conn:
            async with conn.transaction():
                call = await load_call(conn, call_id)
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                settings = await settings_for(conn, call["clinic_id"])
                if not settings["staff_on_desk"]:
                    await conn.execute(
                        "UPDATE calls SET transfer_attempted = true, transfer_connected = false WHERE id = %s",
                        (call_id,),
                    )
                    await write_trace(conn, call, "escalation", "info", {"status": "closed", "reason": reason})
                    metrics.observe("clinic_handoff_wait_seconds", 0, result="closed")
                    return result(
                        True,
                        "Nobody is at the desk right now. I can ask them to call you back.",
                        data={"status": "closed"},
                    )
                summary = await _summary(conn, call, reason)
                snapshot = await _snapshot(conn, call_id)
                existing = await one(conn, "SELECT id, status FROM handoff_sessions WHERE call_id = %s", (call_id,))
                if existing is None:
                    row = await one(
                        conn,
                        """INSERT INTO handoff_sessions (
                             call_id, clinic_id, status, priority, reason, summary, transcript_snapshot,
                             patient_id, verified, verification_mode)
                           VALUES (%s, %s, 'queued', %s, %s, %s, %s, %s, %s, %s)
                           RETURNING id""",
                        (
                            call_id, call["clinic_id"], priority, reason, summary, Json(snapshot),
                            call["patient_id"], bool(call["verified"]), call["verification_mode"],
                        ),
                    )
                    handoff_id = int(row["id"])
                else:
                    handoff_id = int(existing["id"])
                await conn.execute(
                    "UPDATE calls SET phase = 'handoff_queued', transfer_attempted = true WHERE id = %s",
                    (call_id,),
                )
                await write_trace(conn, call, "escalation", "info", {"status": "queued", "handoff_id": handoff_id})
        await redis_bus.publish(
            "live:desk",
            {
                "event": "handoff.queued",
                "payload": {
                    "call_id": str(call_id),
                    "handoff_id": handoff_id,
                    "priority": priority,
                    "reason": reason,
                    "summary": summary,
                    "transcript_snapshot": snapshot,
                },
            },
        )
        outcome = await wait_for_desk(call_id, HANDOFF_WAIT_SECONDS)
        elapsed = time.perf_counter() - started
        if outcome and outcome.get("status") == "accepted":
            metrics.observe("clinic_handoff_wait_seconds", elapsed, result="accepted")
            return result(True, "Someone from the desk is here.", data={"status": "accepted", "handoff_id": handoff_id})
        async with db.connection() as conn:
            async with conn.transaction():
                await conn.execute(
                    """UPDATE handoff_sessions
                          SET status = 'timeout', ended_at = now()
                        WHERE call_id = %s AND status = 'queued'""",
                    (call_id,),
                )
                await set_phase(conn, call_id, "ai_active")
        metrics.observe("clinic_handoff_wait_seconds", elapsed, result="timeout")
        return result(
            True,
            "Nobody could take the call just now. I can ask the desk to call you back.",
            data={"status": "timeout", "handoff_id": handoff_id},
        )
    finally:
        pop(call_id)


async def create_callback(db, args):
    call_id = parse_call_id(args.get("call_id"))
    priority = args.get("priority") if args.get("priority") in {"P1", "P2", "P3"} else "P3"
    reason = (args.get("reason") or "Caller asked for a call back.")[:500]
    async with db.connection() as conn:
        async with conn.transaction():
            call = await load_call(conn, call_id) if call_id else None
            if not phase_ok(call):
                return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
            settings = await settings_for(conn, call["clinic_id"])
            phone = call["from_number"] or ""
            supplied = (args.get("phone") or "").replace(" ", "")
            differs = False
            if supplied and CALLBACK_PHONE.match(supplied) and supplied != phone:
                phone = supplied
                differs = True
            if not CALLBACK_PHONE.match(phone):
                return result(False, "I can only book a callback to an Indian number.", error_code="bad_phone")
            due_sql = "now() + make_interval(mins => %s)"
            due_minutes = int(settings["p1_callback_minutes"] if priority == "P1" else settings["p2_callback_minutes"])
            if priority == "P3":
                due_expr = "NULL"
                params_due = ()
            else:
                due_expr = due_sql
                params_due = (due_minutes,)
            row = await one(
                conn,
                f"""INSERT INTO callbacks (
                       clinic_id, call_id, patient_id, phone, differs_from_caller, priority, reason, due_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, {due_expr})
                    RETURNING id""",
                (call["clinic_id"], call["id"], call["patient_id"], phone, differs, priority, reason, *params_due),
            )
            return result(
                True,
                "I have asked the desk to call back.",
                data={"callback_id": int(row["id"]), "priority": priority, "differs_from_caller": differs},
            )


async def flag_emergency(db, args):
    call_id = parse_call_id(args.get("call_id"))
    kind = args.get("kind") if args.get("kind") in {"medical", "self_harm"} else "medical"
    snippet = (args.get("snippet") or "")[:240]
    async with db.connection() as conn:
        async with conn.transaction():
            call = await load_call(conn, call_id) if call_id else None
            if not phase_ok(call):
                return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
            alert = await one(
                conn,
                """INSERT INTO emergency_alerts (clinic_id, call_id, kind, snippet, caller_number)
                   VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (call["clinic_id"], call["id"], kind, snippet, call["from_number"]),
            )
            await conn.execute(
                "UPDATE calls SET outcome = 'emergency' WHERE id = %s",
                (call["id"],),
            )
            settings = await settings_for(conn, call["clinic_id"])
            if CALLBACK_PHONE.match(call["from_number"] or ""):
                await conn.execute(
                    """INSERT INTO callbacks (clinic_id, call_id, patient_id, phone, priority, reason, due_at)
                       VALUES (%s, %s, %s, %s, 'P1', %s, now() + make_interval(mins => %s))""",
                    (
                        call["clinic_id"], call["id"], call["patient_id"], call["from_number"],
                        f"Emergency ({kind}).", int(settings["p1_callback_minutes"]),
                    ),
                )
            await write_trace(conn, call, "compliance_flag", "warning", {"kind": kind, "tool": "flag_emergency"})
            await redis_bus.publish(
                "live:desk",
                {"event": "emergency", "payload": {"call_id": str(call["id"]), "kind": kind, "snippet": snippet}},
            )
            return result(
                True,
                "This may be an emergency. Please ring 112 or 108 now. I am alerting the clinic.",
                data={"alert_id": int(alert["id"]), "kind": kind},
                next_="handoff",
            )


async def create_message_ticket(db, args):
    call_id = parse_call_id(args.get("call_id"))
    ticket_type = (args.get("type") or "message").strip().lower().replace(" ", "_")
    if ticket_type in {"report", "report_question"}:
        ticket_type = "report_query"
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                await conn.execute(
                    "SELECT require_verified_patient(%s, %s, true)",
                    (call["id"], call["patient_id"]),
                )
                doctor_id = None
                if args.get("doctor_name"):
                    doctors = await many(conn, "SELECT id, name FROM doctors WHERE clinic_id = %s AND active", (call["clinic_id"],))
                    match = next((doctor for doctor in doctors if doctor_matches(args["doctor_name"], doctor["name"])), None)
                    if match:
                        doctor_id = match["id"]
                medicine = (args.get("medicine_name") or "").strip()
                if ticket_type == "refill" and (not medicine or doctor_id is None):
                    return result(
                        False,
                        "Please read the name on the strip and tell me which doctor prescribed it. I will only pass the request on.",
                        error_code="need_refill_facts",
                    )
                guardian = bool(call["caller_is_relative"]) and as_bool(args.get("requester_is_guardian"), False)
                row = await one(
                    conn,
                    """INSERT INTO message_tickets (
                         clinic_id, call_id, patient_id, doctor_id, type, medicine_name, body,
                         requested_by_relative, requester_is_guardian, days_left, new_symptoms_mentioned)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       RETURNING id""",
                    (
                        call["clinic_id"], call["id"], call["patient_id"], doctor_id, ticket_type,
                        medicine or None, (args.get("body") or "")[:1000] or None,
                        bool(call["caller_is_relative"]), guardian,
                        int(args["days_left"]) if str(args.get("days_left") or "").isdigit() else None,
                        as_bool(args.get("new_symptoms_mentioned"), False),
                    ),
                )
                phone = await patient_phone(conn, call["patient_id"])
                if ticket_type == "refill" and phone and MOBILE.match(phone):
                    template = await one(
                        conn,
                        """SELECT body FROM message_templates
                            WHERE key = 'refill_received' AND language = 'en' AND channel = 'sms'""",
                    )
                    doctor = await one(conn, "SELECT name FROM doctors WHERE id = %s", (doctor_id,))
                    clinic = await one(conn, "SELECT name, phone FROM clinics WHERE id = %s", (call["clinic_id"],))
                    rendered = render_template(template["body"], [_short_doctor(doctor["name"]), clinic["phone"] or clinic["name"]])
                    await conn.execute(
                        """INSERT INTO messages
                             (clinic_id, channel, patient_id, template_key, language, to_number, rendered_body, status)
                           VALUES (%s, 'sms', %s, 'refill_received', 'en', %s, %s, 'queued')""",
                        (call["clinic_id"], call["patient_id"], phone, rendered),
                    )
                say = "I have passed that request to the doctor. This is not a prescription." if ticket_type == "refill" else "I have passed that message to the desk."
                return result(True, say, data={"ticket_id": int(row["id"]), "type": ticket_type})
        except errors.InsufficientPrivilege as exc:
            return privilege_result(exc)
        except errors.RaiseException as exc:
            message = (exc.diag.message_primary or "").lower()
            if "guardian" in message:
                return result(False, "A child's medicine request has to come from a parent or guardian. I have not decided anything.", error_code="need_guardian")
            if "too many refill" in message:
                return result(False, "There are already several medicine requests on this file. I will ask the desk to call back.", error_code="refill_limit")
            log.error("ticket rejected: %s", message)
            return result(False, "I could not pass that request on. I can ask the desk to call you back.", error_code="ticket_rejected")


def _short_doctor(name: str) -> str:
    # templates already say "Dr {#var#}"
    return name[3:] if (name or "").startswith("Dr ") else (name or "")


async def _sms_values(conn, call, key: str, booking_id):
    """Real values for each template the agent may send. A template whose details
    cannot be filled is refused rather than sent with wrong or empty details."""
    from app.tools.booking import day_label, time_range

    clinic = await one(conn, "SELECT name, phone FROM clinics WHERE id = %s", (call["clinic_id"],))
    contact = clinic["phone"] or clinic["name"]
    if key == "patient_id":
        patient = await one(conn, "SELECT patient_code FROM patients WHERE id = %s", (call["patient_id"],))
        return [clinic["name"], patient["patient_code"], clinic["name"]], None
    if key in {"booking_confirmed", "rescheduled", "cancelled"}:
        if booking_id is None:
            return None, result(False, "I need the visit before I can send that message.", error_code="need_booking")
        row = await one(
            conn,
            """SELECT b.patient_id, d.name AS doctor, p.full_name, p.patient_code,
                      w.starts_at + make_interval(mins => w.shift_minutes) AS starts_at,
                      w.ends_at + make_interval(mins => w.shift_minutes) AS ends_at
                 FROM bookings b
                 JOIN doctors d ON d.id = b.doctor_id
                 JOIN windows w ON w.id = b.window_id
                 JOIN patients p ON p.id = b.patient_id
                WHERE b.id = %s""",
            (booking_id,),
        )
        if row is None or int(row["patient_id"]) != int(call["patient_id"]):
            await write_trace(
                conn, call, "data_access", "violation",
                {"tool": "send_sms", "matches_verified_patient": False, "booking_id": booking_id},
            )
            return None, result(False, "I can only send a message about a visit on the confirmed file.", error_code="cross_patient", next_="stop")
        doctor = _short_doctor(row["doctor"])
        day = day_label(row["starts_at"])
        window = time_range(row["starts_at"], row["ends_at"])
        first_name = (row["full_name"] or "").split(" ")[0]
        if key == "booking_confirmed":
            return [first_name, doctor, day, window, row["patient_code"], contact, clinic["name"]], None
        if key == "rescheduled":
            return [doctor, day, window, contact, clinic["name"]], None
        return [doctor, day, contact, clinic["name"]], None
    return None, result(False, "I cannot send that message from here.", error_code="bad_template")


async def send_sms(db, args):
    call_id = parse_call_id(args.get("call_id"))
    key = (args.get("template_key") or "").strip()
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                await conn.execute("SELECT require_verified_patient(%s, %s, true)", (call["id"], call["patient_id"]))
                template = await one(
                    conn,
                    """SELECT body, channel FROM message_templates
                        WHERE key = %s AND language = 'en' AND channel = 'sms'""",
                    (key,),
                )
                if template is None:
                    return result(False, "I do not have that message template.", error_code="bad_template")
                phone = await patient_phone(conn, call["patient_id"])
                if not phone or not MOBILE.match(phone):
                    return result(False, "I can only text the mobile number on the file.", error_code="bad_phone")
                values, refusal = await _sms_values(conn, call, key, parse_call_id(args.get("booking_id")))
                if refusal:
                    return refusal
                rendered = render_template(template["body"], values)
                row = await one(
                    conn,
                    """INSERT INTO messages
                         (clinic_id, channel, patient_id, template_key, language, to_number, rendered_body, status)
                       VALUES (%s, 'sms', %s, %s, 'en', %s, %s, 'queued')
                       RETURNING id""",
                    (call["clinic_id"], call["patient_id"], key, phone, rendered),
                )
                return result(True, "I have queued that message. Nothing is sent in this demo.", data={"message_id": int(row["id"]), "status": "queued"})
        except errors.InsufficientPrivilege as exc:
            return privilege_result(exc)


async def create_payment_link(db, args):
    call_id = parse_call_id(args.get("call_id"))
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                await conn.execute("SELECT require_verified_patient(%s, %s, true)", (call["id"], call["patient_id"]))
                booking_id = parse_call_id(args.get("booking_id"))
                if booking_id is None:
                    found = await one(
                        conn,
                        """SELECT id FROM bookings
                            WHERE patient_id = %s AND status IN ('held', 'booked')
                              AND COALESCE(appointment_fee_inr, 0) + COALESCE(priority_fee_inr, 0) > 0
                            ORDER BY id DESC LIMIT 1""",
                        (call["patient_id"],),
                    )
                    booking_id = int(found["id"]) if found else None
                if booking_id is None:
                    return result(False, "I do not have a visit with a fee to send a link for.", error_code="not_found")
                owned = await one(
                    conn,
                    "SELECT id, appointment_fee_inr, priority_fee_inr FROM bookings WHERE id = %s AND patient_id = %s",
                    (booking_id, call["patient_id"]),
                )
                if owned is None:
                    await write_trace(
                        conn, call, "data_access", "violation",
                        {"tool": "create_payment_link", "matches_verified_patient": False, "booking_id": booking_id},
                    )
                    return result(False, "I can only send a link for the confirmed file.", error_code="cross_patient", next_="stop")
                existing = await one(
                    conn,
                    """SELECT id, link_url, amount_inr FROM payments
                        WHERE booking_id = %s AND status = 'link_sent' ORDER BY id DESC LIMIT 1""",
                    (booking_id,),
                )
                if existing:
                    return result(True, "The payment link is already queued.", data={"payment_id": int(existing["id"]), "link_url": existing["link_url"]})
                total = int(owned["appointment_fee_inr"] or 0) + int(owned["priority_fee_inr"] or 0)
                if total <= 0:
                    return result(False, "This visit does not have a fee.", error_code="no_fee")
                minutes = int((await settings_for(conn, call["clinic_id"]))["upi_link_valid_minutes"])
                payment = await one(
                    conn,
                    """INSERT INTO payments (booking_id, amount_inr, method, status, expires_at)
                       VALUES (%s, %s, 'upi_link', 'link_sent', now() + make_interval(mins => %s))
                       RETURNING id""",
                    (booking_id, total, minutes),
                )
                url = f"https://demo.local/pay/{payment['id']}"
                await conn.execute("UPDATE payments SET link_url = %s WHERE id = %s", (url, payment["id"]))
                phone = await patient_phone(conn, call["patient_id"])
                if phone and MOBILE.match(phone):
                    template = await one(
                        conn,
                        """SELECT body FROM message_templates
                            WHERE key = 'payment_link' AND language = 'en' AND channel = 'whatsapp'""",
                    )
                    patient = await one(conn, "SELECT full_name FROM patients WHERE id = %s", (call["patient_id"],))
                    doctor = await one(
                        conn,
                        """SELECT d.name FROM bookings b JOIN doctors d ON d.id = b.doctor_id WHERE b.id = %s""",
                        (booking_id,),
                    )
                    rendered = template["body"]
                    for index, value in enumerate([patient["full_name"], doctor["name"], "the booked day", str(total), "appointment", url, str(minutes)], 1):
                        rendered = rendered.replace("{{" + str(index) + "}}", value)
                    await conn.execute(
                        """INSERT INTO messages
                             (clinic_id, channel, patient_id, booking_id, payment_id, template_key, language, to_number, rendered_body, status)
                           VALUES (%s, 'whatsapp', %s, %s, %s, 'payment_link', 'en', %s, %s, 'queued')""",
                        (call["clinic_id"], call["patient_id"], booking_id, payment["id"], phone, rendered),
                    )
                return result(True, f"I have queued a UPI link for {total} rupees. It will arrive on WhatsApp.", data={"payment_id": int(payment["id"]), "link_url": url, "amount_inr": total})
        except errors.InsufficientPrivilege as exc:
            return privilege_result(exc)


async def request_refund(db, args):
    """Policy amount only. The model cannot set the figure or a destination."""
    call_id = parse_call_id(args.get("call_id"))
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                await conn.execute(
                    "SELECT require_verified_patient(%s, %s, true)",
                    (call["id"], call["patient_id"]),
                )
                booking, refusal = await _refund_booking(conn, call, parse_call_id(args.get("booking_id")))
                if refusal:
                    return refusal
                if booking["status"] == "no_show":
                    return result(
                        False,
                        "A missed visit is not refunded. I can book another arrival window.",
                        error_code="no_show",
                    )
                paid = await one(
                    conn,
                    """SELECT id, amount_inr FROM payments
                        WHERE booking_id = %s AND status = 'paid'
                        ORDER BY id DESC LIMIT 1""",
                    (booking["id"],),
                )
                if paid is None:
                    return result(False, "There is no paid fee to return on this visit.", error_code="not_paid")
                already = await one(
                    conn,
                    """SELECT COALESCE(sum(amount_inr), 0) AS total FROM refunds
                        WHERE payment_id = %s AND status NOT IN ('rejected', 'failed')""",
                    (paid["id"],),
                )
                settings = await settings_for(conn, call["clinic_id"])
                reason, percent, note = _refund_policy(booking, settings)
                amount = int(paid["amount_inr"]) * int(percent) // 100
                remaining = int(paid["amount_inr"]) - int(already["total"])
                if amount > remaining:
                    amount = remaining
                if amount <= 0:
                    return result(False, "That fee has already been put forward for a refund.", error_code="refund_cap")
                row = await one(
                    conn,
                    """INSERT INTO refunds
                         (payment_id, amount_inr, reason, policy_note, status, requested_by, call_id)
                       VALUES (%s, %s, %s, %s, 'requested', 'agent', %s)
                       RETURNING id""",
                    (paid["id"], amount, reason, note, call["id"]),
                )
                await write_trace(
                    conn, call, "decision", "info",
                    {"tool": "request_refund", "amount_inr": amount, "reason": reason, "needs_approval": True},
                )
                return result(
                    True,
                    f"I have asked the desk to return {amount} rupees. A person at the clinic still has to approve it.",
                    data={"refund_id": int(row["id"]), "amount_inr": amount, "reason": reason, "status": "requested"},
                )
        except errors.InsufficientPrivilege as exc:
            return privilege_result(exc)
        except errors.RaiseException as exc:
            log.error("refund rejected: %s", exc.diag.message_primary)
            return result(False, "I could not ask for that refund. The desk will have to look at it.", error_code="refund_rejected")


def _refund_policy(booking, settings):
    from datetime import datetime, timezone

    if booking["session_status"] == "cancelled":
        percent = int(settings["refund_clinic_caused_percent"])
        return "doctor_unavailable", percent, "Doctor unavailable: full" if percent == 100 else f"Doctor unavailable: {percent}%"
    starts = booking["starts_at"]
    if starts.tzinfo is None:
        starts = starts.replace(tzinfo=timezone.utc)
    hours = (starts - datetime.now(timezone.utc)).total_seconds() / 3600
    if hours >= int(settings["refund_full_hours_before"]):
        return "patient_cancelled_early", 100, "Cancelled 24 hours or more before: full"
    percent = int(settings["refund_late_cancel_percent"])
    return "patient_cancelled_late", percent, f"Cancelled inside {settings['refund_full_hours_before']} hours: {percent}%"


async def _refund_booking(conn, call, booking_id):
    if booking_id is None:
        rows = await many(
            conn,
            """SELECT b.id FROM bookings b
                 JOIN windows w ON w.id = b.window_id
                WHERE b.patient_id = %s
                  AND b.status IN ('held', 'booked', 'cancelled', 'no_show')
                  AND COALESCE(b.appointment_fee_inr, 0) + COALESCE(b.priority_fee_inr, 0) > 0
                ORDER BY w.starts_at DESC LIMIT 2""",
            (call["patient_id"],),
        )
        if len(rows) != 1:
            return None, result(False, "Which visit should I ask the desk to refund?", error_code="ambiguous")
        booking_id = int(rows[0]["id"])
    row = await one(
        conn,
        """SELECT b.id, b.patient_id, b.status, w.starts_at, s.status AS session_status
             FROM bookings b
             JOIN windows w ON w.id = b.window_id
             JOIN doctor_sessions s ON s.id = w.session_id
            WHERE b.id = %s""",
        (booking_id,),
    )
    if row is None or int(row["patient_id"]) != int(call["patient_id"]):
        await write_trace(
            conn, call, "data_access", "violation",
            {"tool": "request_refund", "matches_verified_patient": False, "booking_id": booking_id},
        )
        return None, result(False, "I can only ask about a visit on the confirmed file.", error_code="cross_patient", next_="stop")
    return row, None


async def set_disposition(db, args):
    call_id = parse_call_id(args.get("call_id"))
    disposition = args.get("disposition")
    async with db.connection() as conn:
        async with conn.transaction():
            call = await load_call(conn, call_id) if call_id else None
            if not phase_ok(call) and not (call and call["phase"] == "with_staff"):
                return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
            if disposition not in DISPOSITIONS:
                return result(False, "I could not record that outcome.", error_code="bad_disposition")
            await conn.execute(
                "UPDATE calls SET disposition = %s, disposition_by = 'agent' WHERE id = %s",
                (disposition, call["id"]),
            )
            await write_trace(conn, call, "disposition_set", "info", {"disposition": disposition, "by": "agent"})
            return result(True, "I have recorded the outcome of this call.", data={"disposition": disposition})
