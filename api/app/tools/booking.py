import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from psycopg import errors

from app.db import many, one
from app.tools_common import (
    as_bool,
    audit,
    booking_failure_say,
    doctor_matches,
    load_call,
    norm_name,
    parse_call_id,
    patient_phone,
    payment_method,
    phase_ok,
    privilege_result,
    result,
    settings_for,
    visit_type,
)
from app.traces import write_trace

log = logging.getLogger("clinic")
IST = ZoneInfo("Asia/Kolkata")


def _hm(moment: datetime) -> str:
    local = moment.astimezone(IST)
    hour = local.hour % 12 or 12
    return f"{hour}:{local.minute:02d}", "am" if local.hour < 12 else "pm"


def day_label(moment: datetime) -> str:
    """Spoken day for a window, in IST: today, tomorrow, or e.g. Friday 31 October.
    The agent speaks this word for word, so it never has to work out a weekday itself."""
    from datetime import timedelta

    local = moment.astimezone(IST).date()
    today = datetime.now(IST).date()
    if local == today:
        return "today"
    if local == today + timedelta(days=1):
        return "tomorrow"
    return f"{local.strftime('%A')} {local.day} {local.strftime('%B')}"


def time_range(start: datetime, end: datetime) -> str:
    left, left_suffix = _hm(start)
    right, right_suffix = _hm(end)
    if left_suffix == right_suffix:
        return f"{left}–{right} {right_suffix}"
    return f"{left} {left_suffix}–{right} {right_suffix}"


def format_window(start: datetime, end: datetime) -> str:
    return f"{day_label(start)}, {time_range(start, end)}"


async def _require(conn, call, allow_limited: bool):
    await conn.execute(
        "SELECT require_verified_patient(%s, %s, %s)",
        (call["id"], call["patient_id"], allow_limited),
    )


async def _resolve_doctor(conn, clinic_id, spoken):
    doctors = await many(
        conn,
        """SELECT id, name, specialty, appointment_fee_inr, priority_fee_inr
             FROM doctors WHERE clinic_id = %s AND active""",
        (clinic_id,),
    )
    matches = [doctor for doctor in doctors if doctor_matches(spoken or "", doctor["name"])]
    if not matches:
        return None
    matches.sort(key=lambda doctor: norm_name(doctor["name"]))
    return matches[0]


def _pool_query(spoken: str) -> bool:
    text = norm_name(spoken or "")
    return text in {"general check up", "general checkup", "general", "any doctor", "any", "pool"}


async def get_doctor_delay(db, args):
    call_id = parse_call_id(args.get("call_id"))
    async with db.connection() as conn:
        async with conn.transaction():
            call = await load_call(conn, call_id) if call_id else None
            if not phase_ok(call):
                return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
            doctor = await _resolve_doctor(conn, call["clinic_id"], args.get("doctor_name") or args.get("name"))
            if doctor is None:
                return result(False, "I do not have that doctor on the schedule.", error_code="not_found")
            session = await one(
                conn,
                """SELECT est_delay_min, est_basis, status FROM doctor_sessions
                    WHERE doctor_id = %s ORDER BY planned_start DESC LIMIT 1""",
                (doctor["id"],),
            )
            if session is None:
                return result(True, f"I do not have a live update for {doctor['name']}.", data={"doctor_name": doctor["name"]})
            delay = int(session["est_delay_min"] or 0)
            if session["est_basis"] != "live":
                # flow 04 T8b: a schedule-only estimate cannot see delays, so never claim "on time"
                say = f"I do not have a live update for {doctor['name']}."
            elif delay <= 0:
                say = f"{doctor['name']} is on time."
            else:
                say = f"{doctor['name']} is running about {delay} minutes late."
            return result(
                True,
                say,
                data={
                    "doctor_name": doctor["name"],
                    "delay_min": delay,
                    "basis": session["est_basis"],
                },
            )


async def _windows(conn, clinic_id, spoken, cutoff):
    if _pool_query(spoken):
        return await many(
            conn,
            """SELECT a.window_id, a.shifted_start, a.shifted_end, a.routine_open, a.priority_open,
                      a.doctor_id, d.name AS doctor_name
                 FROM pool_window_availability a
                 JOIN doctors d ON d.id = a.doctor_id
                WHERE a.pool_id = (SELECT id FROM doctor_pools WHERE clinic_id = %s AND name = 'General check-up')
                  AND a.shifted_start > now() + make_interval(mins => %s)
                  AND a.routine_open > 0
                ORDER BY a.shifted_start
                LIMIT 6""",
            (clinic_id, cutoff),
        )
    doctor = await _resolve_doctor(conn, clinic_id, spoken)
    if doctor is None:
        return None
    rows = await many(
        conn,
        """SELECT a.window_id, a.shifted_start, a.shifted_end, a.routine_open, a.priority_open,
                  a.doctor_id, d.name AS doctor_name
             FROM window_availability a
             JOIN doctors d ON d.id = a.doctor_id
            WHERE a.doctor_id = %s
              AND a.shifted_start > now() + make_interval(mins => %s)
              AND (a.routine_open > 0 OR a.priority_open > 0)
            ORDER BY a.shifted_start
            LIMIT 6""",
        (doctor["id"], cutoff),
    )
    return rows


def _window_payload(rows):
    return [
        {
            "window_id": int(row["window_id"]),
            "doctor_name": row["doctor_name"],
            "start": row["shifted_start"].isoformat(),
            "end": row["shifted_end"].isoformat(),
            "routine_open": int(row["routine_open"]),
            "priority_open": int(row["priority_open"]),
            "label": format_window(row["shifted_start"], row["shifted_end"]),
        }
        for row in rows
    ]


async def get_available_windows(db, args):
    call_id = parse_call_id(args.get("call_id"))
    spoken = args.get("doctor_name") or args.get("pool_name") or args.get("name") or ""
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                await _require(conn, call, True)
                settings = await settings_for(conn, call["clinic_id"])
                rows = await _windows(conn, call["clinic_id"], spoken, int(settings["same_day_cutoff_minutes"]))
                if rows is None:
                    return result(False, "I do not have that doctor on the schedule.", error_code="not_found")
                payload = _window_payload(rows)
                if not payload:
                    return result(True, "I do not have an open arrival window for that.", data={"windows": []})
                first = payload[0]
                return result(
                    True,
                    f"The next arrival window is {first['label']} with {first['doctor_name']}.",
                    data={"windows": payload},
                )
        except errors.InsufficientPrivilege as exc:
            return privilege_result(exc)


async def _window_doctor(conn, window_id):
    return await one(
        conn,
        """SELECT w.id AS window_id, w.starts_at, w.ends_at, w.shift_minutes, s.doctor_id, d.name,
                  d.appointment_fee_inr, d.priority_fee_inr, d.clinic_id
             FROM windows w
             JOIN doctor_sessions s ON s.id = w.session_id
             JOIN doctors d ON d.id = s.doctor_id
            WHERE w.id = %s""",
        (window_id,),
    )


def _fee_plan(doctor, args):
    priority = as_bool(args.get("priority"), False)
    consent = as_bool(args.get("fee_consent"), False)
    method = payment_method(args.get("payment_method"))
    appointment = doctor["appointment_fee_inr"]
    priority_fee = doctor["priority_fee_inr"] if priority else None
    if priority and priority_fee is None:
        return None, result(False, "That doctor does not offer a priority visit.", error_code="no_priority")
    total = (appointment or 0) + (priority_fee or 0)
    if total and not consent:
        fee_text = int(appointment or 0)
        extra = f" A priority visit adds {int(priority_fee)} rupees." if priority_fee else ""
        return None, result(
            False,
            f"{doctor['name']}'s visit has a {fee_text} rupee appointment fee.{extra} I need a clear yes before I book it.",
            error_code="fee_required",
            data={"appointment_fee_inr": int(appointment or 0), "priority_fee_inr": int(priority_fee or 0)},
        )
    if total and method is None:
        return None, result(
            False,
            "How should the fee be paid: the UPI link on WhatsApp, or cash at the desk?",
            error_code="need_payment_method",
        )
    return {
        "priority": "priority" if priority else "routine",
        "priority_fee": int(priority_fee) if priority_fee else None,
        "appointment_fee": int(appointment) if appointment else None,
        "consent": consent and bool(total),
        "method": method if total else None,
        "payment_status": "pending" if total else "not_required",
        "total": int(total),
    }, None


async def _queue_fee_messages(conn, call, booking_id, doctor, plan, window_label, when):
    if not plan["total"]:
        return None
    phone = await patient_phone(conn, call["patient_id"])
    minutes = int((await settings_for(conn, call["clinic_id"]))["upi_link_valid_minutes"])
    payment = await one(
        conn,
        """INSERT INTO payments (booking_id, amount_inr, method, status, expires_at)
           VALUES (%s, %s, 'upi_link', 'link_sent', now() + make_interval(mins => %s))
           RETURNING id""",
        (booking_id, plan["total"], minutes),
    )
    url = f"https://demo.local/pay/{payment['id']}"
    await conn.execute("UPDATE payments SET link_url = %s WHERE id = %s", (url, payment["id"]))
    if phone:
        template = await one(
            conn,
            """SELECT body FROM message_templates
                WHERE key = 'payment_link' AND language = 'en' AND channel = 'whatsapp'""",
        )
        patient = await one(conn, "SELECT full_name FROM patients WHERE id = %s", (call["patient_id"],))
        kind = "appointment and priority" if plan["priority"] == "priority" else "appointment"
        rendered = render_payment(template["body"], patient["full_name"], doctor["name"], when, plan["total"], kind, url, minutes)
        await conn.execute(
            """INSERT INTO messages
                 (clinic_id, channel, patient_id, booking_id, payment_id, template_key, language, to_number, rendered_body, status)
               VALUES (%s, 'whatsapp', %s, %s, %s, 'payment_link', 'en', %s, %s, 'queued')""",
            (call["clinic_id"], call["patient_id"], booking_id, payment["id"], phone, rendered),
        )
    return {"payment_id": int(payment["id"]), "link_url": url, "amount_inr": plan["total"]}


async def _maybe_reminder(conn, call, booking_id, starts_at):
    import re
    from datetime import datetime, time as clock, timedelta

    phone = await patient_phone(conn, call["patient_id"])
    if not phone or not re.match(r"^\+91[6-9][0-9]{9}$", phone):
        return
    local = starts_at.astimezone(IST)
    scheduled = datetime.combine(local.date() - timedelta(days=1), clock(18, 0), tzinfo=IST)
    if scheduled <= datetime.now(IST):
        return
    await conn.execute(
        """INSERT INTO outbound_jobs (clinic_id, kind, booking_id, patient_id, phone, scheduled_for)
           VALUES (%s, 'reminder', %s, %s, %s, %s)""",
        (call["clinic_id"], booking_id, call["patient_id"], phone, scheduled),
    )


def render_payment(body, name, doctor, when, amount, kind, url, minutes):
    values = [name, doctor, when, str(amount), kind, url, str(minutes)]
    rendered = body
    for index, value in enumerate(values, 1):
        rendered = rendered.replace("{{" + str(index) + "}}", value)
    return rendered


async def hold_window(db, args):
    return await _write_booking(db, args, hold=True)


async def create_booking(db, args):
    return await _write_booking(db, args, hold=False)


async def _write_booking(db, args, hold: bool):
    call_id = parse_call_id(args.get("call_id"))
    window_id = parse_call_id(args.get("window_id"))
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                await _require(conn, call, True)
                if window_id is None:
                    return result(False, "I need an arrival window before I can book it.", error_code="need_window")
                window = await _window_doctor(conn, window_id)
                if window is None:
                    return result(False, "That arrival window is not open.", error_code="not_found")
                settings = await settings_for(conn, call["clinic_id"])
                from datetime import datetime, timedelta, timezone
                shifted = window["starts_at"] + timedelta(minutes=int(window["shift_minutes"] or 0))
                if shifted <= datetime.now(timezone.utc) + timedelta(minutes=int(settings["same_day_cutoff_minutes"])):
                    return result(False, "That arrival window is too soon to book by phone.", error_code="cutoff")
                plan, refusal = _fee_plan(window, args)
                if refusal:
                    return refusal
                pool_id = None
                mode = "named_doctor"
                if as_bool(args.get("any_doctor"), False) or _pool_query(args.get("pool_name") or ""):
                    pool = await one(
                        conn,
                        """SELECT pool_id FROM doctor_pool_members
                            WHERE doctor_id = %s AND pool_id = (
                              SELECT id FROM doctor_pools WHERE clinic_id = %s AND name = 'General check-up')""",
                        (window["doctor_id"], call["clinic_id"]),
                    )
                    if pool is None:
                        return result(False, "That doctor is booked by name, not from the general pool.", error_code="not_pooled")
                    pool_id = pool["pool_id"]
                    mode = "any_doctor"
                existing = await one(
                    conn,
                    """SELECT id, window_id FROM bookings
                        WHERE created_by_call_id = %s AND status = 'held' AND hold_expires_at > now()""",
                    (call["id"],),
                )
                if existing and not hold:
                    if int(existing["window_id"]) != int(window_id):
                        return result(False, "I am already holding a different arrival window on this call.", error_code="holding_other")
                    await conn.execute(
                        """UPDATE bookings
                              SET status = 'booked', hold_expires_at = NULL
                            WHERE id = %s""",
                        (existing["id"],),
                    )
                    booking_id = int(existing["id"])
                else:
                    booking = await one(
                        conn,
                        """INSERT INTO bookings (
                             patient_id, window_id, doctor_id, booking_mode, pool_id, visit_type, priority,
                             priority_fee_inr, appointment_fee_inr, fee_consent_at, payment_method, payment_status,
                             status, source, requested_by_relative, hold_expires_at, created_by_call_id,
                             gcal_sync_status, reason_category)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,
                                   CASE WHEN %s THEN now() ELSE NULL END,
                                   %s,%s,%s,'agent',%s,
                                   CASE WHEN %s THEN now() + make_interval(secs => %s) ELSE NULL END,
                                   %s,'not_needed',%s)
                           RETURNING id""",
                        (
                            call["patient_id"], window_id, window["doctor_id"], mode, pool_id,
                            visit_type(args.get("visit_type")), plan["priority"],
                            plan["priority_fee"], plan["appointment_fee"], plan["consent"],
                            plan["method"], plan["payment_status"],
                            "held" if hold else "booked",
                            bool(call["caller_is_relative"]),
                            hold, int(settings["hold_seconds"]),
                            call["id"],
                            args.get("reason_category") if args.get("reason_category") in {"follow-up", "general check-up", "first visit", "other"} else "general check-up",
                        ),
                    )
                    booking_id = int(booking["id"])
                label = format_window(
                    window["starts_at"] + __import__("datetime").timedelta(minutes=int(window["shift_minutes"] or 0)),
                    window["ends_at"] + __import__("datetime").timedelta(minutes=int(window["shift_minutes"] or 0)),
                )
                payment = None
                if not hold and plan["total"] and plan["method"] == "upi_link":
                    payment = await _queue_fee_messages(conn, call, booking_id, window, plan, label, label)
                if not hold:
                    await _maybe_reminder(conn, call, booking_id, window["starts_at"])
                await audit(conn, call, "booking.hold" if hold else "booking.create", "booking", booking_id, {"window_id": window_id})
                if hold:
                    say = f"I am holding {label} with {window['name']}."
                elif plan["total"] and plan["method"] == "cash_desk":
                    say = f"The visit is booked with {window['name']} for {label}. The fee is {plan['total']} rupees, paid at the desk."
                elif plan["total"]:
                    say = f"The visit is booked with {window['name']} for {label}. The fee is {plan['total']} rupees. I will send a UPI link on WhatsApp."
                else:
                    say = f"The visit is booked with {window['name']} for {label}."
                return result(True, say, data={"booking_id": booking_id, "window": label, "fee_inr": plan["total"], "payment": payment})
        except errors.InsufficientPrivilege as exc:
            return privilege_result(exc)
        except errors.RaiseException as exc:
            return result(False, booking_failure_say(exc), error_code="booking_rejected")
        except Exception:
            log.exception("booking write failed")
            return result(False, "I could not complete that booking. I can ask the desk to call you back.", error_code="db_error")


async def _owned_booking(conn, call, booking_id):
    if booking_id is None:
        rows = await many(
            conn,
            """SELECT b.id FROM bookings b
                 JOIN windows w ON w.id = b.window_id
                WHERE b.patient_id = %s AND w.ends_at > now()
                  AND b.status IN ('held', 'booked')
                ORDER BY w.starts_at""",
            (call["patient_id"],),
        )
        if len(rows) == 1:
            return rows[0], None
        if not rows:
            return None, result(False, "I do not have a visit to change on this file.", error_code="not_found")
        return None, result(False, "There is more than one upcoming visit. Which arrival window should I change?", error_code="ambiguous")
    row = await one(
        conn,
        """SELECT id, patient_id, window_id, doctor_id, booking_mode, pool_id, status
             FROM bookings WHERE id = %s""",
        (booking_id,),
    )
    if row is None or int(row["patient_id"]) != int(call["patient_id"]):
        await write_trace(
            conn, call, "data_access", "violation",
            {"tool": "booking", "patient_id_accessed": call["patient_id"], "matches_verified_patient": False, "booking_id": booking_id},
        )
        return None, result(False, "I can only change a visit on the confirmed file.", error_code="cross_patient", next_="stop")
    return row, None


async def reschedule_booking(db, args):
    call_id = parse_call_id(args.get("call_id"))
    window_id = parse_call_id(args.get("window_id"))
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                await _require(conn, call, True)
                booking, refusal = await _owned_booking(conn, call, parse_call_id(args.get("booking_id")))
                if refusal:
                    return refusal
                window = await _window_doctor(conn, window_id) if window_id else None
                if window is None:
                    return result(False, "I need the new arrival window.", error_code="need_window")
                if booking["booking_mode"] == "named_doctor" and int(window["doctor_id"]) != int(booking["doctor_id"]):
                    return result(False, "This visit stays with the same doctor.", error_code="named_doctor")
                await conn.execute(
                    """UPDATE bookings SET window_id = %s, doctor_id = %s WHERE id = %s""",
                    (window_id, window["doctor_id"], booking["id"]),
                )
                await conn.execute(
                    """INSERT INTO booking_changes (booking_id, kind, from_window_id, to_window_id, from_doctor_id, to_doctor_id, reason)
                       VALUES (%s, 'rescheduled_by_patient', %s, %s, %s, %s, 'patient asked on the call')""",
                    (booking["id"], booking["window_id"], window_id, booking["doctor_id"], window["doctor_id"]),
                )
                label = format_window(window["starts_at"], window["ends_at"])
                return result(True, f"The visit has moved to {label} with {window['name']}.", data={"booking_id": int(booking["id"]), "window": label})
        except errors.InsufficientPrivilege as exc:
            return privilege_result(exc)
        except errors.RaiseException as exc:
            return result(False, booking_failure_say(exc), error_code="booking_rejected")


async def cancel_booking(db, args):
    call_id = parse_call_id(args.get("call_id"))
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                await _require(conn, call, True)
                booking, refusal = await _owned_booking(conn, call, parse_call_id(args.get("booking_id")))
                if refusal:
                    return refusal
                await conn.execute(
                    """UPDATE bookings
                          SET status = 'cancelled', cancelled_at = now(), hold_expires_at = NULL, cancel_reason = 'patient'
                        WHERE id = %s""",
                    (booking["id"],),
                )
                await conn.execute(
                    """INSERT INTO booking_changes (booking_id, kind, from_window_id, reason)
                       VALUES (%s, 'cancelled', %s, 'patient asked on the call')""",
                    (booking["id"], booking["window_id"]),
                )
                return result(True, "The visit is cancelled.", data={"booking_id": int(booking["id"])})
        except errors.InsufficientPrivilege as exc:
            return privilege_result(exc)
        except errors.RaiseException as exc:
            return result(False, booking_failure_say(exc), error_code="booking_rejected")


async def get_booking_status(db, args):
    call_id = parse_call_id(args.get("call_id"))
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                await _require(conn, call, True)
                rows = await many(
                    conn,
                    """SELECT b.id, b.status, b.priority, b.booking_mode, d.name AS doctor_name,
                              w.starts_at, w.ends_at
                         FROM bookings b
                         JOIN windows w ON w.id = b.window_id
                         JOIN doctors d ON d.id = b.doctor_id
                        WHERE b.patient_id = %s AND w.ends_at > now()
                          AND b.status IN ('held', 'booked', 'arrived', 'in_consult')
                        ORDER BY w.starts_at
                        LIMIT 5""",
                    (call["patient_id"],),
                )
                payload = [
                    {
                        "booking_id": int(row["id"]),
                        "status": row["status"],
                        "doctor_name": row["doctor_name"],
                        "priority": row["priority"],
                        "window": format_window(row["starts_at"], row["ends_at"]),
                    }
                    for row in rows
                ]
                if not payload:
                    return result(True, "I do not have an upcoming visit on this file.", data={"bookings": []})
                first = payload[0]
                return result(
                    True,
                    f"The next visit is {first['window']} with {first['doctor_name']}, status {first['status']}.",
                    data={"bookings": payload},
                )
        except errors.InsufficientPrivilege as exc:
            return privilege_result(exc)
