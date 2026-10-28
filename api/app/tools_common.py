import logging
import re
from datetime import datetime

from psycopg import errors
from psycopg.types.json import Json

from app.db import many, one

log = logging.getLogger("clinic")


def result(ok: bool, say: str, *, data=None, next_="continue", error_code=None) -> dict:
    body = {"ok": ok, "say": say, "data": data or {}, "next": next_}
    if error_code:
        body["error_code"] = error_code
    return body


def parse_call_id(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def as_bool(value, default=None):
    if isinstance(value, bool):
        return value
    if value is None or value == "":
        return default
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y", "haan", "ha"}:
        return True
    if text in {"0", "false", "no", "n"}:
        return False
    return default


def norm_name(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", (value or "").casefold()).split())


def levenshtein(left: str, right: str) -> int:
    if left == right:
        return 0
    if not left:
        return len(right)
    if not right:
        return len(left)
    prev = list(range(len(right) + 1))
    for i, ca in enumerate(left, 1):
        cur = [i]
        for j, cb in enumerate(right, 1):
            cur.append(min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def name_matches(spoken: str, stored: str) -> bool:
    left, right = norm_name(spoken), norm_name(stored)
    if not left or not right:
        return False
    if left == right:
        return True
    if len(right) < 5:
        return False
    return levenshtein(left, right) <= 2


def doctor_matches(spoken: str, stored: str) -> bool:
    left, right = norm_name(spoken), norm_name(stored)
    if not left or not right:
        return False
    if left == right or (len(left) >= 4 and left in right):
        return True
    return levenshtein(left, right) <= 2


def parse_dob(value):
    if value is None or str(value).strip() == "":
        return None
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return "invalid"


def code_compact(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", value or "").upper()


def payment_method(value):
    if not value:
        return None
    text = str(value).strip().lower().replace("-", " ").replace("_", " ")
    if "upi" in text or "link" in text or "whatsapp" in text:
        return "upi_link"
    if "cash" in text or "desk" in text:
        return "cash_desk"
    return None


def visit_type(value) -> str:
    text = norm_name(value or "")
    if "follow" in text:
        return "follow_up"
    if "first" in text:
        return "first_visit"
    if text in {"other"}:
        return "other"
    return "general_checkup"


def privilege_result(exc: errors.InsufficientPrivilege) -> dict:
    message = (exc.diag.message_primary or str(exc)).lower()
    if "limited mode" in message:
        return result(
            False,
            "I can help with bookings, but I cannot share reports or visit history on this call.",
            error_code="limited_mode",
        )
    return result(
        False,
        "I need to confirm the patient's name and the id on the card first.",
        error_code="not_verified",
        next_="verify",
    )


def booking_failure_say(exc, doctor_name=None, fee=None) -> str:
    message = (getattr(getattr(exc, "diag", None), "message_primary", None) or str(exc)).lower()
    if "full" in message or "no priority place" in message or "over capacity" in message:
        return "That arrival window is full."
    if "appointment fee" in message or "requires an appointment fee" in message:
        if fee and doctor_name:
            return f"{doctor_name}'s visit has a {int(fee)} rupee fee."
        return "That visit has a fee. I need a clear yes before I book it."
    if "does not offer priority" in message:
        return "That doctor does not offer a priority visit."
    if "already holds a window" in message:
        return "I am already holding an arrival window on this call."
    if "maximum number of upcoming" in message:
        return "This patient already has the maximum number of upcoming visits."
    if "daily booking limit" in message:
        return "This phone has reached today's booking limit. I can ask the desk to call you back."
    if "not in pool" in message:
        return "That doctor is not in the general check-up pool."
    log.error("booking rejected: %s", message)
    return "I could not complete that booking. I can ask the desk to call you back."


async def load_call(conn, call_id: int):
    return await one(conn, "SELECT * FROM calls WHERE id = %s", (call_id,))


def phase_ok(call) -> bool:
    return bool(call) and call["phase"] in {"ai_active", "handoff_queued"}


async def settings_for(conn, clinic_id: int):
    return await one(conn, "SELECT * FROM clinic_settings WHERE clinic_id = %s", (clinic_id,))


async def audit(conn, call, action: str, entity: str, entity_id, details: dict):
    await conn.execute(
        """INSERT INTO audit_log (clinic_id, actor_type, action, entity, entity_id, call_id, details)
           VALUES (%s, 'agent', %s, %s, %s, %s, %s)""",
        (call["clinic_id"], action, entity, entity_id, call["id"], Json(details)),
    )


async def patient_phone(conn, patient_id: int):
    row = await one(
        conn,
        """SELECT phone FROM patient_phones
            WHERE patient_id = %s
            ORDER BY is_primary DESC, phone
            LIMIT 1""",
        (patient_id,),
    )
    return row["phone"] if row else None


def render_template(body: str, values: list[str]) -> str:
    parts = body.split("{#var#}")
    if len(parts) > 1:
        rendered = []
        for index, part in enumerate(parts):
            rendered.append(part)
            if index < len(parts) - 1:
                rendered.append(values[index] if index < len(values) else "")
        body = "".join(rendered)
    for index, value in enumerate(values, 1):
        body = body.replace("{{" + str(index) + "}}", value)
    return body
