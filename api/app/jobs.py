"""Background desk jobs. They write rows. They do not dial or send messages."""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.db import db, many, one

IST = ZoneInfo("Asia/Kolkata")


def next_call_time(now: datetime | None = None) -> datetime:
    current = now.astimezone(IST) if now else datetime.now(IST)
    if 9 <= current.hour < 21:
        return current
    if current.hour >= 21:
        day = current.date() + timedelta(days=1)
    else:
        day = current.date()
    return datetime.combine(day, time(9, 0), tzinfo=IST)


async def expire_holds(conn) -> int:
    cur = await conn.execute(
        """UPDATE bookings
              SET status = 'cancelled', cancelled_at = now(), hold_expires_at = NULL,
                  cancel_reason = 'hold expired'
            WHERE status = 'held' AND hold_expires_at IS NOT NULL AND hold_expires_at <= now()"""
    )
    return cur.rowcount or 0


async def sweep_cancelled_sessions(conn) -> int:
    created = 0
    rows = await many(
        conn,
        """SELECT b.id, b.patient_id, b.booking_mode, b.pool_id, b.doctor_id, b.window_id, p.phone
             FROM bookings b
             JOIN windows w ON w.id = b.window_id
             JOIN doctor_sessions s ON s.id = w.session_id
             JOIN LATERAL (
               SELECT phone FROM patient_phones
                WHERE patient_id = b.patient_id
                ORDER BY is_primary DESC LIMIT 1
             ) p ON true
            WHERE s.status = 'cancelled' AND b.status = 'booked'""",
    )
    for row in rows:
        moved = False
        if row["booking_mode"] == "any_doctor" and row["pool_id"]:
            target = await one(
                conn,
                """SELECT a.window_id, a.doctor_id FROM pool_window_availability a
                    WHERE a.pool_id = %s AND a.doctor_id <> %s AND a.routine_open > 0
                      AND a.shifted_start > now() + interval '30 minutes'
                    ORDER BY a.shifted_start LIMIT 1""",
                (row["pool_id"], row["doctor_id"]),
            )
            if target:
                await conn.execute(
                    "UPDATE bookings SET window_id = %s, doctor_id = %s WHERE id = %s",
                    (target["window_id"], target["doctor_id"], row["id"]),
                )
                await conn.execute(
                    """INSERT INTO booking_changes
                         (booking_id, kind, from_window_id, to_window_id, from_doctor_id, to_doctor_id, reason)
                       VALUES (%s, 'doctor_reassigned', %s, %s, %s, %s, 'session cancelled')""",
                    (row["id"], row["window_id"], target["window_id"], row["doctor_id"], target["doctor_id"]),
                )
                moved = True
        if moved:
            created += 1
            continue
        exists = await one(
            conn,
            """SELECT 1 FROM outbound_jobs
                WHERE booking_id = %s AND kind = 'reschedule_offer' AND status = 'scheduled'""",
            (row["id"],),
        )
        if exists or not row["phone"]:
            continue
        clinic = await one(conn, "SELECT id FROM clinics LIMIT 1")
        await conn.execute(
            """INSERT INTO outbound_jobs (clinic_id, kind, booking_id, patient_id, phone, scheduled_for)
               VALUES (%s, 'reschedule_offer', %s, %s, %s, %s)""",
            (clinic["id"], row["id"], row["patient_id"], row["phone"], next_call_time()),
        )
        created += 1
    return created


async def queue_delay_choices(conn) -> int:
    cap = await one(conn, "SELECT delay_sms_cap FROM clinic_settings WHERE clinic_id = 1")
    rows = await many(
        conn,
        """SELECT b.id, b.patient_id, p.phone
             FROM bookings b
             JOIN LATERAL (
               SELECT phone FROM patient_phones
                WHERE patient_id = b.patient_id
                ORDER BY is_primary DESC LIMIT 1
             ) p ON true
            WHERE b.status = 'booked' AND b.delay_sms_count >= %s
              AND NOT EXISTS (
                SELECT 1 FROM outbound_jobs j
                 WHERE j.booking_id = b.id AND j.kind = 'delay_choice'
              )""",
        (int(cap["delay_sms_cap"]),),
    )
    clinic = await one(conn, "SELECT id FROM clinics LIMIT 1")
    for row in rows:
        if not row["phone"]:
            continue
        await conn.execute(
            """INSERT INTO outbound_jobs (clinic_id, kind, booking_id, patient_id, phone, scheduled_for)
               VALUES (%s, 'delay_choice', %s, %s, %s, %s)""",
            (clinic["id"], row["id"], row["patient_id"], row["phone"], next_call_time()),
        )
    return len(rows)


async def note_call_next(conn, session_id: int):
    session = await one(
        conn,
        """SELECT planned_start, (SELECT count(*) FROM bookings b
              JOIN windows w ON w.id = b.window_id
             WHERE w.session_id = s.id AND b.status IN ('done', 'in_consult')) AS seen
             FROM doctor_sessions s WHERE id = %s""",
        (session_id,),
    )
    if session is None:
        return
    started = session["planned_start"]
    elapsed = max(0, int((datetime.now(started.tzinfo) - started).total_seconds() // 60))
    expected = int(session["seen"]) * 8
    delay = max(0, elapsed - expected)
    await conn.execute(
        """UPDATE doctor_sessions
              SET est_delay_min = %s, est_basis = 'live', last_next_tap = now(), est_updated_at = now(),
                  status = 'started', actual_start = COALESCE(actual_start, now())
            WHERE id = %s""",
        (delay, session_id),
    )


async def run_jobs() -> dict:
    async with db.connection() as conn:
        async with conn.transaction():
            holds = await expire_holds(conn)
            absent = await sweep_cancelled_sessions(conn)
            delays = await queue_delay_choices(conn)
    return {"holds_expired": holds, "absent_outreach": absent, "delay_choices": delays}
