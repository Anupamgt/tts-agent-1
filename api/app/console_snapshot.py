"""Shape the live database into the console's sample-data fields."""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.db import many, one

IST = ZoneInfo("Asia/Kolkata")


def _hm(moment: datetime) -> str:
    local = moment.astimezone(IST)
    hour = local.hour % 12 or 12
    suffix = "am" if local.hour < 12 else "pm"
    return f"{hour}:{local.minute:02d} {suffix}"


def _range(start: datetime, end: datetime) -> str:
    a = start.astimezone(IST)
    b = end.astimezone(IST)
    left = f"{a.hour % 12 or 12}:{a.minute:02d}"
    right = f"{b.hour % 12 or 12}:{b.minute:02d}"
    suffix_a = "am" if a.hour < 12 else "pm"
    suffix_b = "am" if b.hour < 12 else "pm"
    if suffix_a == suffix_b:
        return f"{left}–{right} {suffix_b}"
    return f"{left} {suffix_a}–{right} {suffix_b}"


def _pid(code: str) -> str:
    if code and code.isdigit() and len(code) == 7:
        return f"{code[:3]} {code[3:6]} {code[6]}"
    return code


def _age(dob) -> int:
    if not dob:
        return 0
    today = datetime.now(IST).date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


async def bootstrap(conn) -> dict:
    clinic = await one(conn, "SELECT name, address FROM clinics WHERE id = 1")
    settings = await one(conn, "SELECT staff_on_desk FROM clinic_settings WHERE clinic_id = 1")
    now = datetime.now(IST)
    doctors = await many(
        conn,
        """SELECT d.id, d.name, d.specialty, d.appointment_fee_inr, d.priority_fee_inr,
                  s.id AS session_id, s.status, s.est_delay_min, s.est_basis, s.planned_start, s.planned_end
             FROM doctors d
             LEFT JOIN LATERAL (
               SELECT * FROM doctor_sessions
                WHERE doctor_id = d.id AND planned_end > now() - interval '6 hours'
                ORDER BY planned_start DESC LIMIT 1
             ) s ON true
            WHERE d.clinic_id = 1 AND d.active
            ORDER BY d.id""",
    )
    doctor_rows = []
    for doctor in doctors:
        current = await one(
            conn,
            """SELECT p.full_name FROM bookings b
                 JOIN windows w ON w.id = b.window_id
                 JOIN patients p ON p.id = b.patient_id
                WHERE w.session_id = %s AND b.status = 'in_consult' LIMIT 1""",
            (doctor["session_id"],),
        ) if doctor["session_id"] else None
        doctor_rows.append({
            "id": str(doctor["id"]),
            "name": doctor["name"].replace("Demo ", ""),
            "specialty": doctor["specialty"],
            "tier": "specialist" if doctor["priority_fee_inr"] else "general",
            "pool": "General check-up" if not doctor["priority_fee_inr"] else "",
            "session": _range(doctor["planned_start"], doctor["planned_end"]) if doctor["planned_start"] else "",
            "status": doctor["status"] or "planned",
            "delayMin": int(doctor["est_delay_min"] or 0),
            "basis": "live" if doctor["est_basis"] == "live" else "schedule",
            "nowName": current["full_name"] if current else "",
            "nowSince": "",
            "priorityFee": int(doctor["priority_fee_inr"]) if doctor["priority_fee_inr"] else None,
            "appointmentFee": int(doctor["appointment_fee_inr"]) if doctor["appointment_fee_inr"] else None,
            "consultMin": 8,
            "windowMin": 30,
            "capacity": 4,
            "priorityPlaces": 1 if doctor["priority_fee_inr"] else 0,
        })
    windows = await many(
        conn,
        """SELECT w.id, s.doctor_id, w.starts_at, w.ends_at, w.capacity, w.priority_places
             FROM windows w JOIN doctor_sessions s ON s.id = w.session_id
            WHERE w.ends_at > now() - interval '6 hours'
            ORDER BY w.starts_at""",
    )
    window_rows = []
    for window in windows:
        start = window["starts_at"].astimezone(IST)
        window_rows.append({
            "id": str(window["id"]),
            "doctorId": str(window["doctor_id"]),
            "label": _range(window["starts_at"], window["ends_at"]),
            "shifted": "",
            "capacity": window["capacity"],
            "priorityPlaces": window["priority_places"],
            "isNow": start <= now < window["ends_at"].astimezone(IST),
            "dateKey": start.date().isoformat(),
        })
    patients = await many(conn, "SELECT id, full_name, patient_code, date_of_birth FROM patients WHERE clinic_id = 1 ORDER BY id")
    phones = await many(conn, "SELECT patient_id, phone, relation FROM patient_phones")
    by_patient: dict[int, list] = {}
    for phone in phones:
        by_patient.setdefault(phone["patient_id"], []).append(
            {"number": phone["phone"], "relation": phone["relation"]}
        )
    patient_rows = [
        {
            "id": str(patient["id"]),
            "name": patient["full_name"],
            "pid": _pid(patient["patient_code"]),
            "age": _age(patient["date_of_birth"]),
            "dob": patient["date_of_birth"].isoformat() if patient["date_of_birth"] else "",
            "phones": by_patient.get(patient["id"]) or [{"number": "", "relation": "self"}],
            "holder": "",
            "consents": [],
            "past": [],
            "lockout": False,
            "history": [],
        }
        for patient in patients
    ]
    bookings = await many(
        conn,
        """SELECT b.id, b.patient_id, b.doctor_id, b.window_id, b.status, b.source, b.priority,
                  b.appointment_fee_inr, b.priority_fee_inr, b.payment_status, b.reason_category,
                  b.requested_by_relative, b.delay_sms_count, w.starts_at
             FROM bookings b JOIN windows w ON w.id = b.window_id
            WHERE w.ends_at > now() - interval '2 days'
            ORDER BY w.starts_at, b.id""",
    )
    booking_rows = []
    for booking in bookings:
        total = int(booking["appointment_fee_inr"] or 0) + int(booking["priority_fee_inr"] or 0)
        fee = None
        if total:
            state = "paid" if booking["payment_status"] == "paid" else "due"
            fee = {"state": state, "amount": total, "method": "UPI link"}
        booking_rows.append({
            "id": str(booking["id"]),
            "patientId": str(booking["patient_id"]),
            "doctorId": str(booking["doctor_id"]),
            "windowId": str(booking["window_id"]),
            "dateKey": booking["starts_at"].astimezone(IST).date().isoformat(),
            "dateLabel": booking["starts_at"].astimezone(IST).strftime("%a, %-d %b") if False else booking["starts_at"].astimezone(IST).strftime("%a, %d %b"),
            "status": booking["status"],
            "statusNote": "",
            "source": booking["source"],
            "callId": "",
            "reason": booking["reason_category"] or "general check-up",
            "priority": booking["priority"] == "priority",
            "anyDoctor": False,
            "relativeName": "Relative" if booking["requested_by_relative"] else "",
            "fee": fee,
            "arrivedMin": 0,
            "delaySms": f"{booking['delay_sms_count']}/2",
            "delayChoice": "",
            "outreach": "",
            "timeline": [],
        })
    callbacks = await many(
        conn,
        """SELECT c.id, c.priority, c.phone, c.reason, c.status, c.patient_id, c.differs_from_caller, p.full_name
             FROM callbacks c LEFT JOIN patients p ON p.id = c.patient_id
            WHERE c.status = 'open' ORDER BY c.priority, c.created_at""",
    )
    calls = await many(
        conn,
        """SELECT id, phase, from_number, disposition, summary, started_at, verified, persona_key
             FROM calls ORDER BY id DESC LIMIT 30""",
    )
    payments = await many(
        conn,
        """SELECT p.id, p.amount_inr, p.status, p.method, p.link_url, b.patient_id, b.doctor_id, w.starts_at
             FROM payments p JOIN bookings b ON b.id = p.booking_id JOIN windows w ON w.id = b.window_id
            ORDER BY p.id DESC LIMIT 30""",
    )
    refunds = await many(
        conn,
        """SELECT r.id, r.amount_inr, r.reason, r.status, r.requested_by, r.policy_note, b.patient_id, p.booking_id, p.amount_inr AS paid
             FROM refunds r JOIN payments p ON p.id = r.payment_id JOIN bookings b ON b.id = p.booking_id
            ORDER BY r.id DESC LIMIT 30""",
    )
    tickets = await many(
        conn,
        """SELECT id, type, patient_id, doctor_id, medicine_name, body, status, days_left, requested_by_relative
             FROM message_tickets ORDER BY id DESC LIMIT 30""",
    )
    messages = await many(
        conn,
        """SELECT id, channel, patient_id, template_key, status, rendered_body, created_at
             FROM messages ORDER BY id DESC LIMIT 30""",
    )
    staff = await many(
        conn,
        "SELECT id, name, role, pin, doctor_id FROM staff_users WHERE active ORDER BY id",
    )
    alerts = await many(
        conn,
        """SELECT id, kind, snippet, caller_number, acknowledged_at, created_at
             FROM emergency_alerts ORDER BY id DESC LIMIT 5""",
    )
    return {
        "clinic": clinic["name"],
        "address": clinic["address"],
        "dateLabel": now.strftime("%a, %d %b"),
        "dateKey": now.date().isoformat(),
        "timeLabel": _hm(now),
        "staffOnDesk": bool(settings["staff_on_desk"]),
        "users": [
            {
                "id": str(person["id"]),
                "name": person["name"].replace("Demo ", ""),
                "role": person["role"],
                "pin": person["pin"] or "",
                "otp": "",
                "doctorId": str(person["doctor_id"]) if person["doctor_id"] else "",
            }
            for person in staff
        ],
        "doctors": doctor_rows,
        "windows": window_rows,
        "patients": patient_rows,
        "bookings": booking_rows,
        "callbacks": [
            {
                "id": str(row["id"]),
                "priority": row["priority"],
                "isNew": False,
                "overdue": False,
                "dueSoon": row["priority"] == "P1",
                "dueText": "open",
                "dueMin": 0,
                "caller": row["full_name"] or "Unknown caller",
                "patientId": str(row["patient_id"]) if row["patient_id"] else "",
                "number": row["phone"],
                "language": "EN",
                "verified": bool(row["patient_id"]),
                "reason": row["reason"],
                "callId": "",
                "status": row["status"],
                "attempts": [],
                "smsSent": False,
                "differs": row["differs_from_caller"],
                "callbackNumber": "",
                "preferred": "",
                "wanted": row["reason"],
                "snippet": row["reason"],
                "lockout": False,
            }
            for row in callbacks
        ],
        "calls": [
            {
                "id": str(row["id"]),
                "time": _hm(row["started_at"]) if row["started_at"] else "",
                "mins": 0,
                "direction": "in",
                "patientId": "",
                "caller": row["persona_key"] or "Caller",
                "number": row["from_number"] or "",
                "language": "EN",
                "intent": "info",
                "outcome": row["disposition"] or row["phase"],
                "duration": "",
                "cost": "",
                "tags": [],
                "outbound": False,
                "verified": "Verified" if row["verified"] else "Not verified",
                "relative": "",
                "summary": row["summary"] or "",
                "recording": False,
                "produced": [],
                "transcript": [],
            }
            for row in calls
        ],
        "payments": [
            {
                "id": str(row["id"]),
                "patientId": str(row["patient_id"]),
                "doctorId": str(row["doctor_id"]),
                "when": row["starts_at"].astimezone(IST).strftime("%a, %d %b"),
                "amount": int(row["amount_inr"]),
                "feeType": "Appointment",
                "method": "UPI link" if row["method"] == "upi_link" else "Cash at desk",
                "state": "paid" if row["status"] == "paid" else "link" if row["status"] == "link_sent" else row["status"],
                "expires": "",
                "reminders": "0/1",
                "bookingId": "",
            }
            for row in payments
        ],
        "refunds": [
            {
                "id": str(row["id"]),
                "patientId": str(row["patient_id"]),
                "amount": int(row["amount_inr"]),
                "paid": int(row["paid"]),
                "refunded": 0,
                "policy": row["policy_note"] or row["reason"],
                "requestedBy": row["requested_by"],
                "requestedByName": row["requested_by"],
                "requesterId": "",
                "reason": row["policy_note"] or row["reason"],
                "callId": "",
                "bookingId": str(row["booking_id"]),
                "status": row["status"],
                "note": "",
                "method": "UPI",
            }
            for row in refunds
        ],
        "tickets": [
            {
                "id": str(row["id"]),
                "type": "Refill" if row["type"] == "refill" else "Message",
                "patientId": str(row["patient_id"]),
                "doctorId": str(row["doctor_id"]) if row["doctor_id"] else "",
                "requester": "relative" if row["requested_by_relative"] else "patient",
                "requesterName": "",
                "relative": "",
                "words": row["body"] or "",
                "medicine": row["medicine_name"] or "",
                "daysLeft": row["days_left"] or 0,
                "runsOutSoon": False,
                "newSymptoms": False,
                "at": "",
                "status": "open" if row["status"] in {"new", "seen"} else row["status"],
                "outcome": "",
                "prior": [],
            }
            for row in tickets
        ],
        "outbox": [
            {
                "id": str(row["id"]),
                "at": _hm(row["created_at"]),
                "patientId": str(row["patient_id"]) if row["patient_id"] else "",
                "channel": "WhatsApp" if row["channel"] == "whatsapp" else "SMS",
                "template": row["template_key"],
                "status": row["status"],
                "text": row["rendered_body"],
            }
            for row in messages
        ],
        "alerts": [
            {
                "id": str(row["id"]),
                "kind": row["kind"],
                "snippet": row["snippet"] or "",
                "number": row["caller_number"] or "",
                "ack": bool(row["acknowledged_at"]),
            }
            for row in alerts
        ],
        "activity": [],
        "settings": {"refillFollowupDays": 180},
        "holidays": [],
        "cancelledSessions": [],
    }
