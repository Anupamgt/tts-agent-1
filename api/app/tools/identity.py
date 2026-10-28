import logging

from psycopg import errors
from psycopg.types.json import Json

from app.db import many, one
from app.metrics import metrics
from app.tools_common import (
    as_bool,
    audit,
    code_compact,
    load_call,
    name_matches,
    parse_call_id,
    parse_dob,
    patient_phone,
    phase_ok,
    render_template,
    result,
    settings_for,
)
from app.traces import write_trace

log = logging.getLogger("clinic")
MOBILE = __import__("re").compile(r"^\+91[6-9][0-9]{9}$")


async def _fail(conn, call, attempt_no, method, attempt_result, patient_id, say, next_, error_code):
    await conn.execute(
        """INSERT INTO verification_attempts (call_id, patient_id, attempt_no, method, result)
           VALUES (%s, %s, %s, %s, %s)""",
        (call["id"], patient_id, attempt_no, method, attempt_result),
    )
    metrics.inc("clinic_verification_attempts_total", method=method, result=attempt_result)
    await write_trace(
        conn,
        call,
        "verification",
        "warning" if attempt_result != "matched" else "info",
        {"method": method, "result": attempt_result, "dob_provided": method == "name_dob"},
    )
    return result(False, say, error_code=error_code, next_=next_)


async def lookup_caller(db, args):
    call_id = parse_call_id(args.get("call_id"))
    async with db.connection() as conn:
        async with conn.transaction():
            call = await load_call(conn, call_id) if call_id else None
            if not phase_ok(call):
                return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
            row = await one(
                conn,
                "SELECT count(DISTINCT patient_id)::int AS patient_count FROM patient_phones WHERE phone = %s",
                (call["from_number"],),
            )
            return result(
                True,
                "I will not list the names on this number.",
                data={"patient_count": int(row["patient_count"])},
            )


async def match_patient(db, args):
    call_id = parse_call_id(args.get("call_id"))
    spoken = (args.get("full_name") or "").strip()
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                if not spoken:
                    return result(False, "Please tell me the patient's full name.", error_code="need_name", next_="verify")
                settings = await settings_for(conn, call["clinic_id"])
                locked = await one(
                    conn,
                    """SELECT failures FROM verification_failures_24h
                        WHERE scope = 'number' AND key = %s""",
                    (call["from_number"],),
                )
                if locked and int(locked["failures"]) >= int(settings["verification_lockout_failures"]):
                    return result(
                        False,
                        "I cannot confirm a file from this phone today. I can ask the desk to call you back.",
                        error_code="lockout",
                    )
                prior = await one(
                    conn,
                    """SELECT count(*)::int AS n FROM verification_attempts
                        WHERE call_id = %s AND result <> 'matched'""",
                    (call["id"],),
                )
                if int(prior["n"]) >= int(settings["verification_attempts"]):
                    return result(
                        False,
                        "I cannot confirm the file on this call. I can ask the desk to call you back.",
                        error_code="verification_failed",
                    )
                attempt_no = int(prior["n"]) + 1
                caller_is_patient = as_bool(args.get("caller_is_patient"), True)
                code = code_compact(args.get("patient_code") or "")
                dob = parse_dob(args.get("date_of_birth"))
                last4 = "".join(ch for ch in str(args.get("phone_last4") or "") if ch.isdigit())
                if code:
                    if code.isdigit():
                        valid = await one(conn, "SELECT luhn_valid(%s) AS ok", (code,))
                        if not valid["ok"]:
                            say = "That does not match the file. Please try the name and the id on the card."
                            if attempt_no >= int(settings["verification_attempts"]):
                                say = "I cannot confirm the file on this call. I can ask the desk to call you back."
                            return await _fail(
                                conn, call, attempt_no, "name_patient_id", "bad_check_digit", None,
                                say, "verify", "no_match",
                            )
                    row = await one(
                        conn,
                        """SELECT id, full_name FROM patients
                            WHERE clinic_id = %s AND patient_code_norm = %s""",
                        (call["clinic_id"], code),
                    )
                    method = "name_patient_id"
                    if row is None:
                        holders = await many(
                            conn,
                            """SELECT id, full_name FROM patients
                                WHERE clinic_id = %s AND holder_code_norm = %s""",
                            (call["clinic_id"], code),
                        )
                        matched = [item for item in holders if name_matches(spoken, item["full_name"])]
                        if len(matched) == 1:
                            row = matched[0]
                            method = "name_holder_id"
                        elif len(matched) > 1:
                            return await _fail(
                                conn, call, attempt_no, "name_holder_id", "ambiguous", None,
                                "I need the last four digits of the mobile number on the file.",
                                "verify", "ambiguous",
                            )
                    if row is None or not name_matches(spoken, row["full_name"]):
                        target = row["id"] if row else None
                        say = "That does not match the file. Please try the name and the id on the card."
                        if attempt_no >= int(settings["verification_attempts"]):
                            say = "I cannot confirm the file on this call. I can ask the desk to call you back."
                        return await _fail(
                            conn, call, attempt_no, method, "no_match", target, say, "verify", "no_match",
                        )
                    return await _succeed(conn, call, row["id"], caller_is_patient, attempt_no, method)
                if dob == "invalid" or dob is None:
                    return await _fail(
                        conn, call, attempt_no, "name_dob", "no_match", None,
                        "That does not match the file. Please try the name and the id on the card.",
                        "verify", "no_match",
                    )
                candidates = await many(
                    conn,
                    """SELECT id, full_name FROM patients
                        WHERE clinic_id = %s AND date_of_birth = %s""",
                    (call["clinic_id"], dob),
                )
                matched = [item for item in candidates if name_matches(spoken, item["full_name"])]
                if last4:
                    narrowed = []
                    for item in matched:
                        phones = await many(
                            conn, "SELECT phone FROM patient_phones WHERE patient_id = %s", (item["id"],)
                        )
                        if any(phone["phone"].endswith(last4) for phone in phones):
                            narrowed.append(item)
                    matched = narrowed
                    method = "phone_last4"
                else:
                    method = "name_dob"
                if len(matched) > 1:
                    return await _fail(
                        conn, call, attempt_no, method, "ambiguous", None,
                        "I need the last four digits of the mobile number on the file.",
                        "verify", "ambiguous",
                    )
                if len(matched) != 1:
                    say = "That does not match the file. Please try the name and the id on the card."
                    if attempt_no >= int(settings["verification_attempts"]):
                        say = "I cannot confirm the file on this call. I can ask the desk to call you back."
                    return await _fail(conn, call, attempt_no, method, "no_match", None, say, "verify", "no_match")
                return await _succeed(conn, call, matched[0]["id"], caller_is_patient, attempt_no, method)
        except Exception:
            log.exception("match_patient failed")
            return result(False, "I could not check the file just now. I can ask the desk to call you back.", error_code="db_error")


async def _succeed(conn, call, patient_id, caller_is_patient, attempt_no, method):
    mode = "full" if caller_is_patient else "limited"
    await conn.execute(
        """UPDATE calls
              SET verified = true, patient_id = %s, verification_mode = %s, caller_is_relative = %s
            WHERE id = %s""",
        (patient_id, mode, not caller_is_patient, call["id"]),
    )
    await conn.execute(
        """INSERT INTO verification_attempts (call_id, patient_id, attempt_no, method, result)
           VALUES (%s, %s, %s, %s, 'matched')""",
        (call["id"], patient_id, attempt_no, method),
    )
    metrics.inc("clinic_verification_attempts_total", method=method, result="matched")
    await write_trace(
        conn, call, "verification", "info",
        {"method": method, "result": "matched", "mode": mode},
    )
    await audit(conn, call, "verification.match", "patient", patient_id, {"mode": mode})
    if mode == "limited":
        say = "I have confirmed the file for bookings and messages. I cannot share reports or visit history on this call."
    else:
        say = "I have confirmed the file for this call."
    return result(True, say, data={"verified": True, "verification_mode": mode})


async def register_patient(db, args):
    call_id = parse_call_id(args.get("call_id"))
    name = (args.get("full_name") or "").strip()
    dob = parse_dob(args.get("date_of_birth"))
    age = args.get("age_years")
    async with db.connection() as conn:
        async with conn.transaction():
            call = await load_call(conn, call_id) if call_id else None
            if not phase_ok(call):
                return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
            settings = await settings_for(conn, call["clinic_id"])
            prior = await one(
                conn,
                """SELECT count(*)::int AS n FROM verification_attempts
                    WHERE call_id = %s AND result <> 'matched'""",
                (call["id"],),
            )
            if int(prior["n"]) < int(settings["verification_attempts"]):
                return result(
                    False,
                    "I still need to try the name and the id on the card before I create a file.",
                    error_code="verify_first",
                    next_="verify",
                )
            if not name or (dob in (None, "invalid") and not age):
                return result(
                    False,
                    "To create a file I need the full name and either the date of birth or the age.",
                    error_code="need_details",
                )
            if not MOBILE.match(call["from_number"] or ""):
                return result(False, "I can only create a file for an Indian mobile number.", error_code="bad_phone")
            row = await one(
                conn,
                """INSERT INTO patients (clinic_id, full_name, date_of_birth, age_years, file_complete, created_via)
                   VALUES (%s, %s, %s, %s, false, 'agent')
                   RETURNING id, patient_code""",
                (call["clinic_id"], name, None if dob in (None, "invalid") else dob, int(age) if age else None),
            )
            await conn.execute(
                """INSERT INTO patient_phones (patient_id, phone, relation, is_primary)
                   VALUES (%s, %s, 'self', true)""",
                (row["id"], call["from_number"]),
            )
            await conn.execute(
                """UPDATE calls
                      SET verified = true, patient_id = %s, verification_mode = 'full', caller_is_relative = false
                    WHERE id = %s""",
                (row["id"], call["id"]),
            )
            clinic = await one(conn, "SELECT name, phone FROM clinics WHERE id = %s", (call["clinic_id"],))
            template = await one(
                conn,
                """SELECT body FROM message_templates
                    WHERE key = 'patient_id' AND language = 'en' AND channel = 'sms'""",
            )
            if template and MOBILE.match(call["from_number"]):
                rendered = render_template(
                    template["body"],
                    [clinic["name"], row["patient_code"], clinic["name"]],
                )
                await conn.execute(
                    """INSERT INTO messages
                         (clinic_id, channel, patient_id, template_key, language, to_number, rendered_body, status)
                       VALUES (%s, 'sms', %s, 'patient_id', 'en', %s, %s, 'queued')""",
                    (call["clinic_id"], row["id"], call["from_number"], rendered),
                )
            await audit(conn, call, "patient.register", "patient", row["id"], {"provisional": True})
            return result(
                True,
                "I have created the file and I will send the patient id by SMS.",
                data={"registered": True},
            )
