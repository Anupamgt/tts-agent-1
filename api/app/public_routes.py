"""Public enquiry form, and desk-only records the clinic can add after sign-in."""

import re
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request

from app.auth import client_ip, desk_token_from
from app.db import db, one
from app.tools_common import indian_mobile

router = APIRouter()
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_hits: dict[str, list[float]] = {}


def _desk(request: Request):
    if desk_token_from(request) is None:
        raise HTTPException(status_code=401, detail="desk login required")


def _limited(request: Request):
    host = client_ip(request)
    now = datetime.now(timezone.utc).timestamp()
    recent = [stamp for stamp in _hits.get(host, []) if now - stamp < 3600]
    if len(recent) >= 8:
        raise HTTPException(status_code=429, detail="too many messages")
    recent.append(now)
    _hits[host] = recent


async def _ensure_enquiries(conn):
    await conn.execute(
        """CREATE TABLE IF NOT EXISTS enquiries (
             id bigserial PRIMARY KEY,
             name text NOT NULL,
             phone text NOT NULL,
             email text,
             clinic text,
             note text,
             created_at timestamptz NOT NULL DEFAULT now()
           )"""
    )


@router.post("/v1/public/enquiries")
async def create_enquiry(request: Request):
    _limited(request)
    body = await request.json()
    if (body.get("website") or "").strip():
        return {"ok": True}
    name = (body.get("name") or "").strip()
    phone = indian_mobile(body.get("phone"))
    email = (body.get("email") or "").strip()
    clinic = (body.get("clinic") or "").strip()
    note = (body.get("note") or "").strip()
    if len(name) < 2 or len(name) > 80 or phone is None:
        raise HTTPException(status_code=400, detail="name and an Indian mobile are required")
    if email and not EMAIL.match(email):
        raise HTTPException(status_code=400, detail="email is not valid")
    if len(note) > 500 or len(clinic) > 80:
        raise HTTPException(status_code=400, detail="message is too long")
    async with db.connection() as conn:
        await _ensure_enquiries(conn)
        row = await one(
            conn,
            """INSERT INTO enquiries (name, phone, email, clinic, note)
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (name, phone, email or None, clinic or None, note or None),
        )
    return {"ok": True, "id": row["id"]}


@router.get("/v1/public/desk")
async def public_desk():
    async with db.connection() as conn:
        clinic = await one(conn, "SELECT name, phone, address FROM clinics WHERE id = 1")
        hours = await one(
            conn,
            "SELECT answer FROM clinic_info WHERE clinic_id = 1 AND topic = 'hours' AND language = 'en'",
        )
    return {
        "name": clinic["name"] if clinic else "Clinic",
        "phone": clinic["phone"] if clinic else "",
        "address": clinic["address"] if clinic else "",
        "hours": hours["answer"] if hours else "",
    }


@router.post("/api/setup/clinic")
async def setup_clinic(request: Request):
    _desk(request)
    body = await request.json()
    name = (body.get("name") or "").strip()
    address = (body.get("address") or "").strip()
    hours = (body.get("hours") or "").strip()
    hours_hi = (body.get("hours_hi") or "").strip()
    phone = indian_mobile(body.get("phone")) if body.get("phone") else None
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="clinic name is required")
    async with db.connection() as conn:
        await conn.execute(
            """UPDATE clinics
                  SET name = %s,
                      address = COALESCE(NULLIF(%s, ''), address),
                      phone = COALESCE(%s, phone)
                WHERE id = 1""",
            (name, address, phone),
        )
        for topic, language, answer in (
            ("hours", "en", hours),
            ("hours", "hi", hours_hi),
        ):
            if not answer:
                continue
            await conn.execute(
                """INSERT INTO clinic_info (clinic_id, topic, language, answer)
                   VALUES (1, %s, %s, %s)
                   ON CONFLICT (clinic_id, topic, language)
                   DO UPDATE SET answer = EXCLUDED.answer""",
                (topic, language, answer),
            )
    return {"ok": True}


@router.post("/api/setup/doctors")
async def setup_doctor(request: Request):
    _desk(request)
    body = await request.json()
    name = (body.get("name") or "").strip()
    specialty = (body.get("specialty") or "").strip() or None
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="doctor name is required")
    appointment = _fee(body.get("appointment_fee_inr"), allow_empty=True)
    priority = _fee(body.get("priority_fee_inr"), allow_empty=True)
    async with db.connection() as conn:
        doctor = await one(
            conn,
            """INSERT INTO doctors (clinic_id, name, specialty, appointment_fee_inr, priority_fee_inr)
               VALUES (1, %s, %s, %s, %s) RETURNING id, name""",
            (name, specialty, appointment, priority),
        )
        await _evening_session(conn, int(doctor["id"]), priority is not None)
    return {"ok": True, "id": doctor["id"], "name": doctor["name"]}


@router.post("/api/setup/patients")
async def setup_patient(request: Request):
    _desk(request)
    body = await request.json()
    full_name = (body.get("full_name") or "").strip()
    phone = indian_mobile(body.get("phone"))
    note = (body.get("history") or "").strip()
    doctor_name = (body.get("doctor_name") or "").strip() or None
    born = _date(body.get("date_of_birth"))
    if len(full_name) < 2 or phone is None:
        raise HTTPException(status_code=400, detail="name and an Indian mobile are required")
    if len(note) > 500:
        raise HTTPException(status_code=400, detail="history is too long")
    async with db.connection() as conn:
        patient = await one(
            conn,
            """INSERT INTO patients (clinic_id, patient_code, full_name, date_of_birth, file_complete, created_via)
               VALUES (1, '', %s, %s, true, 'console')
               RETURNING id, patient_code""",
            (full_name, born),
        )
        await conn.execute(
            """INSERT INTO patient_phones (patient_id, phone, relation, is_primary)
               VALUES (%s, %s, 'self', true)""",
            (patient["id"], phone),
        )
        if note:
            await conn.execute(
                """INSERT INTO patient_interactions (clinic_id, patient_id, happened_on, kind, summary, doctor_name)
                   VALUES (1, %s, CURRENT_DATE, 'visit', %s, %s)""",
                (patient["id"], note, doctor_name),
            )
    return {"ok": True, "id": patient["id"], "patient_code": patient["patient_code"]}


@router.post("/api/setup/staff")
async def setup_staff(request: Request):
    _desk(request)
    body = await request.json()
    name = (body.get("name") or "").strip()
    role = (body.get("role") or "").strip()
    pin = re.sub(r"\D", "", str(body.get("pin") or ""))
    phone = indian_mobile(body.get("phone")) if body.get("phone") else None
    if role not in {"receptionist", "assistant", "admin"}:
        raise HTTPException(status_code=400, detail="role must be receptionist, assistant, or admin")
    if len(name) < 2 or len(pin) != 4:
        raise HTTPException(status_code=400, detail="name and a 4-digit PIN are required")
    async with db.connection() as conn:
        staff = await one(
            conn,
            """INSERT INTO staff_users (clinic_id, name, phone, role, pin, active)
               VALUES (1, %s, %s, %s, %s, true) RETURNING id, name, role""",
            (name, phone, role, pin),
        )
    return {"ok": True, "id": staff["id"], "name": staff["name"], "role": staff["role"]}


def _fee(value, allow_empty=False):
    if value is None or value == "":
        return None if allow_empty else None
    try:
        amount = int(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="fee must be a number") from None
    if amount <= 0:
        return None
    return amount


def _date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        raise HTTPException(status_code=400, detail="date of birth must be YYYY-MM-DD") from None


async def _evening_session(conn, doctor_id: int, priority: bool):
    session = await one(
        conn,
        """INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end)
           VALUES (
             %s,
             (now() AT TIME ZONE 'Asia/Kolkata')::date,
             ((now() AT TIME ZONE 'Asia/Kolkata')::date + time '17:00') AT TIME ZONE 'Asia/Kolkata',
             ((now() AT TIME ZONE 'Asia/Kolkata')::date + time '20:00') AT TIME ZONE 'Asia/Kolkata'
           )
           ON CONFLICT (doctor_id, planned_start) DO UPDATE SET doctor_id = EXCLUDED.doctor_id
           RETURNING id""",
        (doctor_id,),
    )
    places = 1 if priority else 0
    start = await one(
        conn,
        """SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date + time '17:00') AT TIME ZONE 'Asia/Kolkata' AS t""",
    )
    base = start["t"]
    for step in range(6):
        begins = base + timedelta(minutes=30 * step)
        ends = begins + timedelta(minutes=30)
        await conn.execute(
            """INSERT INTO windows (session_id, starts_at, ends_at, capacity, priority_places)
               SELECT %s, %s, %s, 4, %s
                WHERE NOT EXISTS (
                  SELECT 1 FROM windows WHERE session_id = %s AND starts_at = %s
                )""",
            (session["id"], begins, ends, places, session["id"], begins),
        )
