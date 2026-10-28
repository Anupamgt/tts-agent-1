import logging

import httpx
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response

from app.auth import (
    caller_call_id,
    desk_sessions,
    desk_token_from,
    internal_authorized,
    is_loopback,
    issue_caller_token,
    new_desk_session,
    pin_ok,
    source_allowed,
    tool_authorized,
    webhook_authorized,
)
from app.bus import kafka_bus, redis_bus
from app.canonical import json_safe, verify_chain
from app.config import (
    BOLNA_AGENT_ID,
    BOLNA_API_BASE,
    BOLNA_API_KEY,
    BOLNA_ENFORCE_SOURCE_IP,
    CLINIC_NAME,
    LIVEKIT_URL,
    SIMULATOR_ENABLED,
)
from app.db import db, many, one
from app.gateway import normalize_args, run_tool
from app.livekit_tokens import livekit_token
from app.metrics import metrics
from app.recorder import append_pcm, append_segment, close_recording, decode_pcm, is_open, open_recording, recording_path
from app.tools import TOOLS
from app.tools.desk import set_phase
from app.handoff_wait import notify
from app.traces import read_jsonl, replay_call

log = logging.getLogger("clinic")
router = APIRouter()


def _loopback_or_404(request: Request):
    if not is_loopback(request):
        raise HTTPException(status_code=404, detail="not found")


def _desk_or_401(request: Request):
    if desk_token_from(request) is None:
        raise HTTPException(status_code=401, detail="desk login required")


def _public_row(row, drop=()):
    if row is None:
        return None
    return json_safe({key: value for key, value in dict(row).items() if key not in drop})


@router.get("/healthz")
async def healthz():
    async with db.connection() as conn:
        await conn.execute("SELECT 1")
    return {"ok": True}


@router.get("/metrics")
async def metrics_page():
    async with db.connection() as conn:
        rows = await many(
            conn,
            "SELECT phase, count(*)::int AS n FROM calls GROUP BY phase",
        )
    active = {row["phase"]: row["n"] for row in rows}
    return PlainTextResponse(metrics.render(active), media_type="text/plain; version=0.0.4")


@router.post("/v1/tools/{name}")
async def tool_route(name: str, request: Request):
    if not tool_authorized(request):
        return JSONResponse({"detail": "unauthorized"}, status_code=401)
    try:
        raw = await request.json()
    except Exception:
        return JSONResponse({"detail": "invalid json"}, status_code=400)
    status, body = await run_tool(
        name,
        normalize_args(raw),
        execution_id=request.headers.get("x-bolna-execution-id"),
    )
    return JSONResponse(body, status_code=status)


@router.post("/v1/internal/{name}")
async def internal_route(name: str, request: Request):
    if not internal_authorized(request):
        return JSONResponse({"detail": "unauthorized"}, status_code=401)
    if name not in TOOLS:
        return JSONResponse({"detail": "unknown tool"}, status_code=404)
    raw = normalize_args(await request.json())
    body = json_safe(await TOOLS[name](db, raw))
    return body


@router.get("/api/personas")
async def personas(request: Request):
    _loopback_or_404(request)
    async with db.connection() as conn:
        rows = await many(conn, "SELECT key, display_name, phone, note FROM caller_personas ORDER BY key")
    return [_public_row(row) for row in rows]


@router.post("/api/calls")
async def create_call(request: Request):
    _loopback_or_404(request)
    body = await request.json()
    persona_key = body.get("persona_key")
    async with db.connection() as conn:
        async with conn.transaction():
            persona = await one(conn, "SELECT * FROM caller_personas WHERE key = %s", (persona_key,))
            if persona is None:
                raise HTTPException(status_code=404, detail="unknown persona")
            count = await one(
                conn,
                "SELECT count(DISTINCT patient_id)::int AS n FROM patient_phones WHERE phone = %s",
                (persona["phone"],),
            )
            row = await one(
                conn,
                """INSERT INTO calls (clinic_id, direction, from_number, started_at, phase, persona_key)
                   VALUES (1, 'inbound', %s, now(), 'created', %s)
                   RETURNING id""",
                (persona["phone"], persona_key),
            )
            call_id = int(row["id"])
            room = f"clinic-{call_id}"
            await conn.execute("UPDATE calls SET livekit_room = %s WHERE id = %s", (room, call_id))
            await redis_bus.hset(
                f"call:{call_id}",
                {"phase": "created", "persona": persona_key, "from_number": persona["phone"], "livekit_room": room},
            )
    open_recording(call_id)
    token = issue_caller_token(call_id)
    return {
        "call_id": str(call_id),
        "livekit_url": LIVEKIT_URL,
        "livekit_token": livekit_token(f"caller-{call_id}", room, publish=True, subscribe=True),
        "patient_count": str(int(count["n"])),
        "caller_token": token,
    }


@router.post("/api/calls/{call_id}/phase")
async def update_phase(call_id: int, request: Request):
    _loopback_or_404(request)
    if caller_call_id(request.headers.get("x-caller-token") or request.query_params.get("token")) != call_id:
        raise HTTPException(status_code=401, detail="caller token required")
    body = await request.json()
    phase = body.get("phase")
    if phase not in {"ai_active", "ended"}:
        raise HTTPException(status_code=400, detail="phase not allowed")
    async with db.connection() as conn:
        async with conn.transaction():
            await set_phase(conn, call_id, phase)
            if phase == "ended":
                await conn.execute("UPDATE calls SET ended_at = now() WHERE id = %s AND ended_at IS NULL", (call_id,))
    if phase == "ended":
        close_recording(call_id)
    return {"ok": True, "phase": phase}


@router.post("/api/calls/{call_id}/bolna-session")
async def bolna_session(call_id: int, request: Request):
    _loopback_or_404(request)
    if caller_call_id(request.headers.get("x-caller-token") or request.query_params.get("token")) != call_id:
        raise HTTPException(status_code=401, detail="caller token required")
    async with db.connection() as conn:
        call = await one(conn, "SELECT * FROM calls WHERE id = %s", (call_id,))
        count = await one(
            conn,
            "SELECT count(DISTINCT patient_id)::int AS n FROM patient_phones WHERE phone = %s",
            (call["from_number"],),
        )
    user_data = {
        "call_id": str(call_id),
        "caller_phone": call["from_number"],
        "patient_count": str(int(count["n"])),
        "clinic_name": CLINIC_NAME,
    }
    payload = {"agent_id": BOLNA_AGENT_ID, "user_data": user_data}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            upstream = await client.post(
                f"{BOLNA_API_BASE.rstrip('/')}/web-call/session",
                json=payload,
                headers={"Authorization": f"Bearer {BOLNA_API_KEY}"},
            )
    except httpx.HTTPError as exc:
        log.error("bolna session failed: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="bolna session failed") from exc
    if upstream.status_code >= 400:
        raise HTTPException(status_code=502, detail="bolna session rejected")
    session = upstream.json()
    run_id = str(session.get("run_id") or session.get("id") or "")
    if run_id:
        async with db.connection() as conn:
            async with conn.transaction():
                await conn.execute(
                    """UPDATE calls SET bolna_execution_id = %s, phase = 'ringing', ai_leg_status = 'ringing'
                        WHERE id = %s""",
                    (run_id, call_id),
                )
        await redis_bus.set(f"exec:{run_id}", str(call_id))
        await redis_bus.hset(f"call:{call_id}", {"phase": "ringing", "bolna_execution_id": run_id})
    return session


@router.get("/api/calls")
async def list_calls(request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    phase = request.query_params.get("phase")
    sql = """SELECT id, phase, persona_key, from_number, disposition, started_at, verified
               FROM calls"""
    params = ()
    if phase:
        sql += " WHERE phase = %s"
        params = (phase,)
    sql += " ORDER BY id DESC LIMIT 50"
    async with db.connection() as conn:
        rows = await many(conn, sql, params)
    listed = []
    for row in rows:
        item = _public_row(row, drop=("from_number",))
        item["from_last4"] = (row["from_number"] or "")[-4:]
        listed.append(item)
    return listed


@router.get("/api/calls/{call_id}")
async def call_detail(call_id: int, request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    async with db.connection() as conn:
        call = await one(conn, "SELECT * FROM calls WHERE id = %s", (call_id,))
        if call is None:
            raise HTTPException(status_code=404, detail="unknown call")
        handoff = await one(conn, "SELECT * FROM handoff_sessions WHERE call_id = %s", (call_id,))
        recordings = await many(conn, "SELECT * FROM recordings WHERE call_id = %s", (call_id,))
        bookings = await many(
            conn,
            """SELECT b.id, b.status, b.payment_status, d.name AS doctor_name
                 FROM bookings b JOIN doctors d ON d.id = b.doctor_id
                WHERE b.created_by_call_id = %s ORDER BY b.id""",
            (call_id,),
        )
        payments = await many(
            conn,
            """SELECT p.id, p.amount_inr, p.status, p.link_url, p.method
                 FROM payments p JOIN bookings b ON b.id = p.booking_id
                WHERE b.created_by_call_id = %s ORDER BY p.id""",
            (call_id,),
        )
    return {
        "call": _public_row(call, drop=("raw_payload", "transcript")),
        "handoff": _public_row(handoff),
        "recordings": [_public_row(row) for row in recordings],
        "bookings": [_public_row(row) for row in bookings],
        "payments": [_public_row(row) for row in payments],
    }


@router.get("/api/calls/{call_id}/transcript")
async def transcript(call_id: int, request: Request):
    _loopback_or_404(request)
    caller = caller_call_id(request.headers.get("x-caller-token") or request.query_params.get("token"))
    if desk_token_from(request) is None and caller != call_id:
        raise HTTPException(status_code=401, detail="unauthorized")
    after = int(request.query_params.get("after_seq") or -1)
    async with db.connection() as conn:
        rows = await many(
            conn,
            """SELECT * FROM transcript_segments
                WHERE call_id = %s AND seq > %s ORDER BY seq""",
            (call_id, after),
        )
    return [_public_row(row) for row in rows]


@router.get("/api/calls/{call_id}/traces")
async def traces(call_id: int, request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    after = int(request.query_params.get("after_seq") or -1)
    async with db.connection() as conn:
        rows = await many(
            conn,
            """SELECT seq, event_id, event_type, severity, ts, payload, prev_hash, record_hash
                 FROM decision_traces WHERE call_id = %s AND seq > %s ORDER BY seq""",
            (call_id, after),
        )
    return [_public_row(row) for row in rows]


@router.get("/api/calls/{call_id}/recording")
async def recording(call_id: int, request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    path = recording_path(call_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="no recording")
    if is_open(call_id) and request.query_params.get("download") != "partial":
        return JSONResponse({"detail": "recording in progress"}, status_code=409)
    return FileResponse(path, media_type="audio/wav")


@router.post("/api/calls/{call_id}/recorder-frame")
async def recorder_frame(call_id: int, request: Request):
    _loopback_or_404(request)
    if not SIMULATOR_ENABLED:
        raise HTTPException(status_code=404, detail="not found")
    body = await request.json()
    pcm = decode_pcm(body.get("pcm_b64") or "")
    size = append_pcm(call_id, pcm, int(body.get("sample_rate") or 16000))
    segment = None
    text = (body.get("text") or "").strip()
    if text:
        speaker = body.get("speaker") if body.get("speaker") in {"caller", "agent", "staff", "system"} else "caller"
        leg = body.get("leg") if body.get("leg") in {"ai", "human"} else ("human" if speaker == "staff" else "ai")
        source = body.get("source") if body.get("source") in {"room_stt", "bolna", "staff", "system"} else (
            "staff" if speaker == "staff" else "room_stt"
        )
        segment = await append_segment(call_id, speaker, text, leg, source, body.get("language"))
    return {"ok": True, "bytes": size, "segment": segment}


@router.post("/api/desk/login")
async def desk_login(request: Request):
    _loopback_or_404(request)
    body = await request.json()
    if not pin_ok(str(body.get("pin") or "")):
        raise HTTPException(status_code=401, detail="invalid pin")
    token = new_desk_session()
    response = JSONResponse({"ok": True})
    response.set_cookie("desk_session", token, httponly=True, samesite="lax")
    return response


@router.get("/api/desk")
async def desk_state(request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    async with db.connection() as conn:
        row = await one(conn, "SELECT staff_on_desk FROM clinic_settings WHERE clinic_id = 1")
    return {"staff_on_desk": bool(row["staff_on_desk"])}


@router.patch("/api/desk")
async def desk_patch(request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    body = await request.json()
    if "staff_on_desk" not in body:
        raise HTTPException(status_code=400, detail="staff_on_desk required")
    value = bool(body["staff_on_desk"])
    async with db.connection() as conn:
        await conn.execute("UPDATE clinic_settings SET staff_on_desk = %s WHERE clinic_id = 1", (value,))
    await redis_bus.set("desk:open", "1" if value else "0")
    return {"staff_on_desk": value}


@router.get("/api/handoffs")
async def list_handoffs(request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    status = request.query_params.get("status") or "queued"
    async with db.connection() as conn:
        rows = await many(
            conn,
            """SELECT * FROM handoff_sessions
                WHERE status = %s ORDER BY priority, queued_at""",
            (status,),
        )
    return [_public_row(row) for row in rows]


@router.post("/api/handoffs/{handoff_id}/accept")
async def accept_handoff(handoff_id: int, request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    async with db.connection() as conn:
        async with conn.transaction():
            row = await one(conn, "SELECT * FROM handoff_sessions WHERE id = %s", (handoff_id,))
            if row is None or row["status"] != "queued":
                raise HTTPException(status_code=409, detail="handoff is not queued")
            await conn.execute(
                """UPDATE handoff_sessions
                      SET status = 'accepted', accepted_at = now()
                    WHERE id = %s""",
                (handoff_id,),
            )
            await set_phase(conn, int(row["call_id"]), "with_staff")
            await conn.execute(
                "UPDATE calls SET transfer_connected = true WHERE id = %s",
                (row["call_id"],),
            )
    room = f"clinic-{row['call_id']}"
    notified = notify(int(row["call_id"]), {"status": "accepted", "staff_name": "Desk", "handoff_id": handoff_id})
    payload = {
        "call_id": str(row["call_id"]),
        "handoff_id": handoff_id,
        "staff_name": "Desk",
    }
    await redis_bus.publish("live:desk", {"event": "handoff.accepted", "payload": payload})
    await redis_bus.publish(f"live:call:{row['call_id']}", {"event": "handoff.accepted", "payload": payload})
    return {
        "ok": True,
        "status": "accepted",
        "waiter": notified,
        "livekit_url": LIVEKIT_URL,
        "livekit_token": livekit_token(f"staff-{row['call_id']}", room, publish=True, subscribe=True),
    }


@router.post("/api/handoffs/{handoff_id}/complete")
async def complete_handoff(handoff_id: int, request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    body = await request.json()
    disposition = body.get("disposition") or "transferred_to_human"
    async with db.connection() as conn:
        async with conn.transaction():
            row = await one(conn, "SELECT * FROM handoff_sessions WHERE id = %s", (handoff_id,))
            if row is None:
                raise HTTPException(status_code=404, detail="unknown handoff")
            await conn.execute(
                """UPDATE handoff_sessions
                      SET status = 'completed', ended_at = now(), staff_note = %s
                    WHERE id = %s""",
                (body.get("note"), handoff_id),
            )
            await conn.execute(
                """UPDATE calls
                      SET phase = 'ended', ended_at = COALESCE(ended_at, now()),
                          disposition = %s, disposition_by = 'staff', outcome = 'transferred'
                    WHERE id = %s""",
                (disposition, row["call_id"]),
            )
    close_recording(int(row["call_id"]))
    return {"ok": True}


@router.get("/api/tickets")
async def tickets(request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    async with db.connection() as conn:
        rows = await many(conn, "SELECT * FROM message_tickets ORDER BY id DESC LIMIT 50")
    visible = []
    for row in rows:
        item = _public_row(row, drop=("medicine_name",))
        item["medicine_hidden"] = bool(row["medicine_name"])
        visible.append(item)
    return visible


@router.patch("/api/tickets/{ticket_id}")
async def patch_ticket(ticket_id: int, request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    body = await request.json()
    if body.get("status") != "seen":
        raise HTTPException(status_code=403, detail="desk can only mark a ticket seen")
    async with db.connection() as conn:
        await conn.execute(
            "UPDATE message_tickets SET status = 'seen' WHERE id = %s AND status = 'new'",
            (ticket_id,),
        )
    return {"ok": True}


@router.get("/api/callbacks")
async def callbacks(request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    async with db.connection() as conn:
        rows = await many(
            conn,
            """SELECT * FROM callbacks WHERE status = 'open' ORDER BY priority, created_at""",
        )
    return [_public_row(row) for row in rows]


@router.post("/api/payments/{payment_id}/mark-paid")
async def mark_paid(payment_id: int, request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    async with db.connection() as conn:
        async with conn.transaction():
            row = await one(conn, "SELECT * FROM payments WHERE id = %s", (payment_id,))
            if row is None:
                raise HTTPException(status_code=404, detail="unknown payment")
            if row["status"] != "paid":
                await conn.execute(
                    "UPDATE payments SET status = 'paid', paid_at = now() WHERE id = %s",
                    (payment_id,),
                )
                await conn.execute(
                    "UPDATE bookings SET payment_status = 'paid' WHERE id = %s",
                    (row["booking_id"],),
                )
    return {"ok": True, "payment_id": payment_id, "status": "paid"}


@router.get("/api/refunds")
async def list_refunds(request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    async with db.connection() as conn:
        rows = await many(
            conn,
            """SELECT r.id, r.amount_inr, r.reason, r.status, r.requested_by, r.policy_note, p.booking_id
                 FROM refunds r JOIN payments p ON p.id = r.payment_id
                ORDER BY r.id DESC LIMIT 50""",
        )
    return [_public_row(row) for row in rows]


@router.post("/api/bookings/{booking_id}/arrive")
async def arrive(booking_id: int, request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    async with db.connection() as conn:
        async with conn.transaction():
            row = await one(
                conn,
                """UPDATE bookings SET status = 'arrived', arrived_at = now()
                    WHERE id = %s AND status = 'booked'
                    RETURNING id, status""",
                (booking_id,),
            )
            if row is None:
                raise HTTPException(status_code=409, detail="booking is not waiting to arrive")
    return {"ok": True, "booking_id": booking_id, "status": "arrived"}


@router.post("/api/doctors/{doctor_id}/call-next")
async def call_next(doctor_id: int, request: Request):
    _loopback_or_404(request)
    _desk_or_401(request)
    async with db.connection() as conn:
        async with conn.transaction():
            session = await one(
                conn,
                """SELECT id FROM doctor_sessions
                    WHERE doctor_id = %s AND status IN ('planned', 'started') AND planned_end > now()
                    ORDER BY planned_start LIMIT 1""",
                (doctor_id,),
            )
            if session is None:
                raise HTTPException(status_code=404, detail="no session")
            await conn.execute(
                "UPDATE doctor_sessions SET status = 'started', actual_start = COALESCE(actual_start, now()) WHERE id = %s",
                (session["id"],),
            )
            current = await one(
                conn,
                """SELECT b.id FROM bookings b
                     JOIN windows w ON w.id = b.window_id
                    WHERE w.session_id = %s AND b.status = 'in_consult'
                    LIMIT 1""",
                (session["id"],),
            )
            if current:
                await conn.execute(
                    "UPDATE bookings SET status = 'done', consult_ended_at = now() WHERE id = %s",
                    (current["id"],),
                )
            nxt = await one(
                conn,
                """SELECT b.id, p.full_name FROM bookings b
                     JOIN windows w ON w.id = b.window_id
                     JOIN patients p ON p.id = b.patient_id
                    WHERE w.session_id = %s AND b.status = 'arrived'
                    ORDER BY (b.priority = 'priority') DESC, b.arrived_at
                    LIMIT 1""",
                (session["id"],),
            )
            if nxt is None:
                return {"ok": True, "waiting": False}
            await conn.execute(
                "UPDATE bookings SET status = 'in_consult', consult_started_at = now() WHERE id = %s",
                (nxt["id"],),
            )
            await conn.execute(
                """INSERT INTO queue_events (session_id, booking_id, kind, source)
                   VALUES (%s, %s, 'call_next', 'reception')""",
                (session["id"], nxt["id"]),
            )
    return {"ok": True, "waiting": True, "booking_id": int(nxt["id"]), "patient_name": nxt["full_name"]}


@router.post("/api/simulate/utterance")
async def simulate(request: Request):
    _loopback_or_404(request)
    if not SIMULATOR_ENABLED:
        raise HTTPException(status_code=404, detail="not found")
    body = await request.json()
    call_id = int(body["call_id"])
    text = (body.get("text") or "").strip()
    tool = body.get("tool")
    args = dict(body.get("args") or {})
    args["call_id"] = str(call_id)
    async with db.connection() as conn:
        call = await one(conn, "SELECT phase FROM calls WHERE id = %s", (call_id,))
        if call is None:
            raise HTTPException(status_code=404, detail="unknown call")
        if call["phase"] in {"created", "ringing"}:
            async with conn.transaction():
                await set_phase(conn, call_id, "ai_active")
    if text:
        await append_segment(call_id, "caller", text, "ai", "bolna")
    status, tool_body = await run_tool(tool, normalize_args(args))
    say = tool_body.get("say") or ""
    if say:
        await append_segment(call_id, "agent", say, "ai", "bolna")
    return JSONResponse({"status": status, "tool": tool_body}, status_code=200)


@router.post("/v1/bolna/webhook")
async def bolna_webhook(request: Request):
    if not webhook_authorized(request):
        return JSONResponse({"detail": "unauthorized"}, status_code=401)
    if not source_allowed(request.client.host if request.client else "", BOLNA_ENFORCE_SOURCE_IP):
        return JSONResponse({"detail": "forbidden"}, status_code=403)
    payload = await request.json()
    execution_id = str(payload.get("id") or payload.get("execution_id") or "")
    status = str(payload.get("status") or "")
    if not execution_id:
        return JSONResponse({"detail": "missing execution id"}, status_code=400)
    async with db.connection() as conn:
        async with conn.transaction():
            call = await one(conn, "SELECT * FROM calls WHERE bolna_execution_id = %s", (execution_id,))
            if call is None:
                return JSONResponse({"detail": "unknown execution"}, status_code=404)
            raw = call["raw_payload"] if isinstance(call["raw_payload"], dict) else {}
            seen = list(raw.get("statuses") or [])
            if status and status in seen:
                return {"ok": True, "duplicate": True}
            if status:
                seen.append(status)
            raw["statuses"] = seen
            raw["last"] = payload
            from psycopg.types.json import Json

            await conn.execute(
                "UPDATE calls SET raw_payload = %s, ai_leg_status = %s, status = %s WHERE id = %s",
                (Json(raw), status or call["ai_leg_status"], status or call["status"], call["id"]),
            )
            if status == "completed":
                await conn.execute(
                    """UPDATE calls
                          SET transcript = %s, summary = %s, duration_seconds = %s, recording_url = %s
                        WHERE id = %s""",
                    (
                        Json(payload.get("transcript")) if payload.get("transcript") is not None else None,
                        payload.get("summary"),
                        payload.get("conversation_duration"),
                        (payload.get("telephony_data") or {}).get("recording_url") if isinstance(payload.get("telephony_data"), dict) else payload.get("recording_url"),
                        call["id"],
                    ),
                )
                recording_url = None
                telephony = payload.get("telephony_data")
                if isinstance(telephony, dict):
                    recording_url = telephony.get("recording_url")
                if recording_url:
                    await conn.execute(
                        """INSERT INTO recordings (call_id, leg, storage, uri)
                           VALUES (%s, 'ai_bolna', 'bolna', %s)
                           ON CONFLICT (call_id, leg) DO NOTHING""",
                        (call["id"], recording_url),
                    )
                if call["phase"] in {"created", "ringing", "ai_active"}:
                    await conn.execute(
                        "UPDATE calls SET phase = 'ended', ended_at = COALESCE(ended_at, now()) WHERE id = %s",
                        (call["id"],),
                    )
                    close_recording(int(call["id"]))
    return {"ok": True, "duplicate": False}


@router.post("/v1/bolna/pre-handoff")
async def pre_handoff(request: Request):
    if not webhook_authorized(request):
        return JSONResponse({"detail": "unauthorized"}, status_code=401)
    body = await request.json()
    call_id = int(body.get("call_id") or 0)
    reason = (body.get("reason") or "Caller asked for a person.")[:500]
    async with db.connection() as conn:
        async with conn.transaction():
            call = await one(conn, "SELECT * FROM calls WHERE id = %s", (call_id,))
            if call is None:
                return JSONResponse({"ok": True, "ignored": True})
            existing = await one(conn, "SELECT id FROM handoff_sessions WHERE call_id = %s", (call_id,))
            if existing is None:
                await conn.execute(
                    """INSERT INTO handoff_sessions (
                         call_id, clinic_id, status, priority, reason, summary, transcript_snapshot,
                         patient_id, verified, verification_mode)
                       VALUES (%s, %s, 'queued', 'P3', %s, %s, '[]'::jsonb, %s, %s, %s)""",
                    (
                        call_id, call["clinic_id"], reason, "Pre-handoff notice.",
                        call["patient_id"], bool(call["verified"]), call["verification_mode"],
                    ),
                )
                if call["phase"] == "ai_active":
                    await set_phase(conn, call_id, "handoff_queued")
    await redis_bus.publish("live:desk", {"event": "handoff.queued", "payload": {"call_id": str(call_id), "reason": reason}})
    return {"ok": True}


@router.post("/api/admin/traces/replay")
async def replay(request: Request):
    _loopback_or_404(request)
    if not pin_ok(request.headers.get("x-desk-pin") or ""):
        raise HTTPException(status_code=401, detail="desk pin required")
    body = await request.json()
    call_id = int(body["call_id"])
    inserted = await replay_call(call_id)
    events = read_jsonl(call_id)
    return {"ok": True, "inserted": inserted, "events": len(events), "chain": verify_chain(events)}


@router.post("/api/admin/traces/poison")
async def poison(request: Request):
    _loopback_or_404(request)
    if not SIMULATOR_ENABLED or not pin_ok(request.headers.get("x-desk-pin") or ""):
        raise HTTPException(status_code=401, detail="desk pin required")
    body = await request.json()
    message = {
        "event_id": body.get("event_id") or "poison",
        "body": {
            "call_id": str(body["call_id"]),
            "seq": 99,
            "event_id": body.get("event_id") or "poison",
            "event_type": "nope",
            "severity": "info",
            "ts": "2026-10-28T00:00:00.000Z",
            "payload": {},
            "prev_hash": "0" * 64,
            "record_hash": "ab",
        },
    }
    await kafka_bus.deliver_trace(message)
    return {"dlq": len(kafka_bus.dlq)}


@router.websocket("/ws")
async def socket(ws: WebSocket):
    token = ws.query_params.get("token") or ""
    cookie = ws.cookies.get("desk_session") or ""
    call_id = caller_call_id(token)
    desk = token in desk_sessions or cookie in desk_sessions
    if call_id is None and not desk:
        await ws.close(code=4401)
        return
    await ws.accept()
    channels = ["live:desk"] if desk else []
    watched = ws.query_params.get("call_id") or (str(call_id) if call_id else None)
    if watched:
        channels.append(f"live:call:{watched}")
    queue = redis_bus.subscribe(*channels)
    await ws.send_json({"event": "ready", "payload": {}})
    try:
        while True:
            message = await queue.get()
            await ws.send_json(message)
    except WebSocketDisconnect:
        redis_bus.unsubscribe(queue, *channels)
    finally:
        redis_bus.unsubscribe(queue, *channels)
