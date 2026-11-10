import re

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from psycopg import errors

from app.auth import (
    client_ip,
    desk_sessions,
    desk_token_from,
    digest_equal,
    is_loopback,
    login_failed,
    login_succeeded,
    login_wait,
    new_desk_session,
    verify_pin_hash,
)
from app.config import ADMIN_OTP
from app.console_snapshot import bootstrap
from app.db import db, many, one
from app.jobs import note_call_next, run_jobs

router = APIRouter()
MOBILE = re.compile(r"^\+91[6-9][0-9]{9}$")


def _guard(request: Request):
    if is_loopback(request):
        return
    if desk_token_from(request) is None:
        raise HTTPException(status_code=401, detail="desk login required")


async def _staff_by_pin(conn, pin: str):
    return await one(conn, "SELECT * FROM staff_users WHERE pin = %s AND active", (pin,))


def _public_staff(person) -> dict:
    return {
        "id": str(person["id"]),
        "name": person["name"].replace("Demo ", ""),
        "role": person["role"],
        "doctorId": str(person["doctor_id"]) if person["doctor_id"] else "",
    }


@router.get("/api/desk/staff")
async def desk_staff():
    """Names and roles for the sign-in picker. No PINs, no codes."""
    async with db.connection() as conn:
        rows = await many(conn, "SELECT id, name, role, doctor_id FROM staff_users WHERE active ORDER BY id")
    return [_public_staff(row) for row in rows]


@router.post("/api/desk/staff-login")
async def desk_staff_login(request: Request):
    """Per-staff sign-in. The PIN (and the admin code) are checked here, never in the browser."""
    body = await request.json()
    staff_id = str(body.get("staff_id") or "")
    pin = str(body.get("pin") or "")
    otp = str(body.get("otp") or "")
    key = f"{client_ip(request)}|{staff_id}"
    wait = login_wait(key)
    if wait:
        raise HTTPException(status_code=429, detail="too many tries", headers={"Retry-After": str(wait)})
    staff = None
    if staff_id.isdigit():
        async with db.connection() as conn:
            staff = await one(conn, "SELECT * FROM staff_users WHERE id = %s AND active", (int(staff_id),))
    ok = False
    if staff and pin:
        if staff.get("pin_hash"):
            ok = verify_pin_hash(pin, staff["pin_hash"])
        elif staff.get("pin"):
            ok = digest_equal(pin, staff["pin"])
        if ok and staff["role"] == "admin":
            ok = digest_equal(otp, ADMIN_OTP)
    if not ok:
        login_failed(key)
        raise HTTPException(status_code=401, detail="invalid pin")
    login_succeeded(key)
    response = JSONResponse({"ok": True, "user": _public_staff(staff)})
    secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    response.set_cookie("desk_session", new_desk_session(staff), httponly=True, samesite="lax", secure=secure)
    return response


@router.post("/api/desk/logout")
async def desk_logout(request: Request):
    token = request.cookies.get("desk_session")
    if token:
        desk_sessions.pop(token, None)
    response = JSONResponse({"ok": True})
    response.delete_cookie("desk_session")
    return response


@router.get("/api/console/bootstrap")
async def console_bootstrap(request: Request):
    _guard(request)
    async with db.connection() as conn:
        return await bootstrap(conn)


@router.post("/api/admin/jobs/run")
async def jobs_run(request: Request):
    _guard(request)
    return await run_jobs()


@router.post("/api/walk-ins")
async def walk_in(request: Request):
    _guard(request)
    body = await request.json()
    name = (body.get("full_name") or "").strip()
    phone = re.sub(r"\s+", "", body.get("phone") or "")
    if phone.startswith("91") and not phone.startswith("+"):
        phone = "+" + phone
    if not phone.startswith("+"):
        phone = "+91" + phone.lstrip("0")
    doctor_id = int(body.get("doctor_id") or 0)
    if not name or not MOBILE.match(phone) or not doctor_id:
        raise HTTPException(status_code=400, detail="name, Indian mobile, and doctor are required")
    priority = bool(body.get("priority"))
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                patient = await one(
                    conn,
                    """SELECT p.id FROM patients p
                         JOIN patient_phones ph ON ph.patient_id = p.id
                        WHERE ph.phone = %s AND lower(p.full_name) = lower(%s)""",
                    (phone, name),
                )
                if patient is None:
                    patient = await one(
                        conn,
                        """INSERT INTO patients (clinic_id, full_name, file_complete, created_via)
                           VALUES (1, %s, false, 'walk_in') RETURNING id""",
                        (name,),
                    )
                    await conn.execute(
                        """INSERT INTO patient_phones (patient_id, phone, relation, is_primary)
                           VALUES (%s, %s, 'self', true)""",
                        (patient["id"], phone),
                    )
                doctor = await one(
                    conn,
                    "SELECT id, appointment_fee_inr, priority_fee_inr FROM doctors WHERE id = %s",
                    (doctor_id,),
                )
                if doctor is None:
                    raise HTTPException(status_code=404, detail="unknown doctor")
                if priority and doctor["priority_fee_inr"] is None:
                    raise HTTPException(status_code=400, detail="this doctor has no priority visit")
                if body.get("window_id"):
                    window = {"window_id": int(body["window_id"])}
                else:
                    window = await one(
                        conn,
                        """SELECT window_id FROM window_availability
                            WHERE doctor_id = %s AND shifted_start > now() - interval '30 minutes'
                              AND ((%s AND priority_open > 0) OR (NOT %s AND routine_open > 0))
                            ORDER BY shifted_start LIMIT 1""",
                        (doctor_id, priority, priority),
                    )
                if window is None:
                    raise HTTPException(status_code=409, detail="no open arrival window")
                fee = int(doctor["appointment_fee_inr"] or 0)
                extra = int(doctor["priority_fee_inr"] or 0) if priority else 0
                total = fee + extra
                booking = await one(
                    conn,
                    """INSERT INTO bookings (
                         patient_id, window_id, doctor_id, booking_mode, visit_type, priority,
                         priority_fee_inr, appointment_fee_inr, payment_status, status, source,
                         requested_by_relative, gcal_sync_status, reason_category, arrived_at)
                       VALUES (%s, %s, %s, 'named_doctor', 'general_checkup', %s,
                               %s, %s, %s, 'arrived', 'walk_in', false, 'not_needed', %s, now())
                       RETURNING id""",
                    (
                        patient["id"], window["window_id"], doctor_id,
                        "priority" if priority else "routine",
                        extra or None, fee or None,
                        "pending" if total else "not_required",
                        body.get("reason") or "general check-up",
                    ),
                )
        except errors.RaiseException as exc:
            raise HTTPException(status_code=409, detail=exc.diag.message_primary or "could not add the walk-in") from exc
    return {"ok": True, "booking_id": int(booking["id"]), "patient_id": int(patient["id"])}


@router.post("/api/refunds/{refund_id}/decide")
async def decide_refund(refund_id: int, request: Request):
    _guard(request)
    body = await request.json()
    decision = body.get("decision")
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                staff = await _staff_by_pin(conn, str(body.get("pin") or ""))
                if staff is None:
                    raise HTTPException(status_code=401, detail="unknown pin")
                if decision == "reject":
                    await conn.execute(
                        "UPDATE refunds SET status = 'rejected', policy_note = COALESCE(%s, policy_note) WHERE id = %s",
                        (body.get("note"), refund_id),
                    )
                elif decision == "approve":
                    if body.get("amount_inr"):
                        await conn.execute(
                            "UPDATE refunds SET amount_inr = %s WHERE id = %s AND status = 'requested'",
                            (int(body["amount_inr"]), refund_id),
                        )
                    await conn.execute(
                        """UPDATE refunds
                              SET status = 'approved', approved_by = %s, approved_at = now(),
                                  policy_note = COALESCE(%s, policy_note)
                            WHERE id = %s AND status = 'requested'""",
                        (staff["id"], body.get("note"), refund_id),
                    )
                else:
                    raise HTTPException(status_code=400, detail="decision must be approve or reject")
        except errors.RaiseException as exc:
            raise HTTPException(status_code=403, detail=exc.diag.message_primary or "refund was refused") from exc
    return {"ok": True}


@router.post("/api/tickets/{ticket_id}/refill-decision")
async def refill_decision(ticket_id: int, request: Request):
    _guard(request)
    body = await request.json()
    decision = {"approve": "approved", "decline": "declined", "visit": "visit_requested"}.get(body.get("decision") or "")
    if decision is None:
        raise HTTPException(status_code=400, detail="decision must be approve, decline, or visit")
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                staff = await _staff_by_pin(conn, str(body.get("pin") or ""))
                if staff is None or staff["role"] != "doctor":
                    raise HTTPException(status_code=401, detail="a doctor's pin is required")
                issued = body.get("issued_via") if body.get("issued_via") in {"collect_at_desk", "doctor_sent_to_patient"} else None
                await conn.execute(
                    """UPDATE message_tickets
                          SET status = %s, responded_by = %s, response_note = %s,
                              teleconsult_checks_confirmed = %s, prescription_issued_via = %s
                        WHERE id = %s AND type = 'refill'""",
                    (
                        decision, staff["id"], body.get("note"),
                        bool(body.get("checks_confirmed")) and decision == "approved",
                        issued, ticket_id,
                    ),
                )
        except errors.RaiseException as exc:
            raise HTTPException(status_code=403, detail=exc.diag.message_primary or "the doctor could not decide") from exc
    return {"ok": True, "status": decision}


@router.post("/api/doctors/{doctor_id}/cancel-session")
async def cancel_session(doctor_id: int, request: Request):
    _guard(request)
    async with db.connection() as conn:
        async with conn.transaction():
            await conn.execute(
                """UPDATE doctor_sessions SET status = 'cancelled', cancel_reason = 'desk'
                    WHERE doctor_id = %s AND status IN ('planned', 'started') AND planned_end > now()""",
                (doctor_id,),
            )
            moved = await __import__("app.jobs", fromlist=["sweep_cancelled_sessions"]).sweep_cancelled_sessions(conn)
    return {"ok": True, "outreach": moved}


@router.post("/api/alerts/{alert_id}/ack")
async def ack_alert(alert_id: int, request: Request):
    _guard(request)
    async with db.connection() as conn:
        await conn.execute(
            "UPDATE emergency_alerts SET acknowledged_at = now() WHERE id = %s AND acknowledged_at IS NULL",
            (alert_id,),
        )
    return {"ok": True}


async def after_call_next(conn, session_id: int):
    await note_call_next(conn, session_id)
