import base64
import json
import threading
import time

import httpx

from app.auth import source_allowed
from app.bus import kafka_bus
from app.canonical import verify_chain
from app.livekit_tokens import decode_token, livekit_token
from app.traces import read_jsonl
from tests.conftest import sql

TOKEN = "dev-tool-token-change-me"
INTERNAL = "dev-internal-token"
PIN = {"X-Desk-Pin": "2468"}
AUTH = {"Authorization": f"Bearer {TOKEN}"}


def activate(client, persona):
    created = client.post("/api/calls", json={"persona_key": persona})
    assert created.status_code == 200, created.text
    body = created.json()
    call_id = int(body["call_id"])
    headers = {"X-Caller-Token": body["caller_token"]}
    phase = client.post(f"/api/calls/{call_id}/phase", json={"phase": "ai_active"}, headers=headers)
    assert phase.status_code == 200, phase.text
    return call_id, body, headers


def tool(client, call_id, name, **args):
    args["call_id"] = str(call_id)
    response = client.post(f"/v1/tools/{name}", json=args, headers=AUTH)
    assert response.status_code == 200, response.text
    return response.json()


def window_for(client, call_id, doctor):
    found = tool(client, call_id, "get_available_windows", doctor_name=doctor)
    assert found["ok"], found
    if found["data"]["windows"]:
        return found["data"]["windows"][0]["window_id"]
    doctor_id = 3 if "aur" in doctor.lower() else 1
    priority = 1 if doctor_id == 3 else 0
    return _future_window(doctor_id, 36, priority)


def test_health_auth_and_tokens(client):
    assert client.get("/healthz").json()["ok"] is True
    denied = client.post("/v1/tools/lookup_caller", json={"call_id": "1"})
    assert denied.status_code == 401
    missing = client.post("/v1/tools/not_a_tool", json={"call_id": "1"}, headers=AUTH)
    assert missing.status_code == 404
    bad_pin = client.post("/api/desk/login", json={"pin": "0000"})
    assert bad_pin.status_code == 401
    assert source_allowed("8.8.8.8", True) is False
    assert source_allowed("13.203.39.153", True) is True
    token = livekit_token("recorder-1", "clinic-1", publish=False, subscribe=True, hidden=True)
    grant = decode_token(token)["video"]
    assert grant["canPublish"] is False and grant["canSubscribe"] is True and grant["room"] == "clinic-1"


def test_family_lookup_and_rohan_report(client):
    call_id, _, _ = activate(client, "family")
    looked = tool(client, call_id, "lookup_caller")
    assert looked["data"]["patient_count"] == 2
    blob = json.dumps(looked).lower()
    assert "asha" not in blob and "rohan" not in blob
    again = tool(client, call_id, "lookup_caller")
    assert again == looked
    traces = read_jsonl(call_id)
    assert sum(1 for event in traces if event["event_type"] == "tool_call") == 1
    assert verify_chain(traces) is None

    mismatch = tool(client, call_id, "match_patient", full_name="Asha Demo", patient_code="7362049", caller_is_patient=True)
    assert mismatch["ok"] is False
    assert "rohan" not in mismatch["say"].lower()
    bad_digit = tool(client, call_id, "match_patient", full_name="Asha Demo", patient_code="1000027")
    assert bad_digit["ok"] is False
    attempts = sql(
        "SELECT result FROM verification_attempts WHERE call_id = %s ORDER BY id",
        (call_id,),
    )
    assert "bad_check_digit" in {row["result"] for row in attempts}

    fresh, _, _ = activate(client, "family")
    matched = tool(client, fresh, "match_patient", full_name="Rohan Demo", patient_code="736 204 9", caller_is_patient=True)
    assert matched["ok"] is True and matched["data"]["verification_mode"] == "full"
    report = tool(client, fresh, "get_report_status")
    assert report["ok"] is True
    assert report["data"]["reports"] == []
    assert "x-ray" not in json.dumps(report).lower()
    assert "asha" not in json.dumps(report).lower()

    asha = sql("SELECT id FROM patients WHERE full_name = 'Asha Demo'")[0]["id"]
    injected = tool(client, fresh, "get_report_status", patient_id=asha)
    assert injected["ok"] is False
    assert "x-ray" not in json.dumps(injected).lower()
    violations = sql(
        """SELECT payload FROM decision_traces
            WHERE call_id = %s AND severity = 'violation'""",
        (fresh,),
    )
    assert violations
    direct = client.post(
        "/v1/internal/get_report_status",
        json={"call_id": str(fresh), "patient_id": asha},
        headers={"Authorization": f"Bearer {INTERNAL}"},
    )
    assert direct.status_code == 200, direct.text
    assert direct.json()["ok"] is False
    assert "x-ray" not in direct.text.lower()
    states = sql(
        """SELECT payload->>'sqlstate' AS sqlstate FROM decision_traces
            WHERE call_id = %s AND severity = 'violation'""",
        (fresh,),
    )
    assert "42501" in {row["sqlstate"] for row in states}


def test_meera_script_unknown_and_limited(client):
    call_id, created, headers = activate(client, "meera")
    caller = decode_token(created["livekit_token"])["video"]
    assert caller["room"] == f"clinic-{call_id}" and caller["canPublish"] is True
    hours = client.post(
        "/api/simulate/utterance",
        json={"call_id": call_id, "text": "What time are you open?", "tool": "get_clinic_info", "args": {"topic": "hours"}},
    )
    assert hours.status_code == 200, hours.text
    assert "Monday" in hours.json()["tool"]["say"]
    verified = client.post(
        "/api/simulate/utterance",
        json={
            "call_id": call_id,
            "text": "I am Meera Demo, card HC 2026 0412.",
            "tool": "match_patient",
            "args": {"full_name": "Meera Demo", "patient_code": "HC/2026/0412", "caller_is_patient": True},
        },
    )
    assert verified.json()["tool"]["ok"] is True
    report = client.post(
        "/api/simulate/utterance",
        json={"call_id": call_id, "text": "Is my blood test ready?", "tool": "get_report_status", "args": {}},
    )
    say = report.json()["tool"]["say"].lower()
    assert "ready to collect" in say and "pending" not in say
    history = client.post(
        "/api/simulate/utterance",
        json={"call_id": call_id, "text": "What happened last time?", "tool": "get_previous_interactions", "args": {}},
    )
    assert len(history.json()["tool"]["data"]["interactions"]) == 2
    assert "kabir" not in history.text.lower()
    wrapped = client.post(
        "/v1/tools/get_clinic_info",
        json={"param": {"call_id": str(call_id), "topic": "address"}},
        headers=AUTH,
    )
    assert wrapped.status_code == 200 and "Example Road" in wrapped.json()["say"]
    delay = tool(client, call_id, "get_doctor_delay", doctor_name="Sharma")
    # seed basis is schedule_only: no claim that the doctor is on time (flow 04 T8b, gold G-RS-007)
    assert delay["ok"] and "live update" in delay["say"].lower() and "on time" not in delay["say"].lower()

    window_id = window_for(client, call_id, "Kaur")
    refused = tool(client, call_id, "create_booking", window_id=window_id, doctor_name="Kaur")
    assert refused["ok"] is False and "200" in refused["say"]
    booked = client.post(
        "/api/simulate/utterance",
        json={
            "call_id": call_id,
            "text": "Yes, book it and send the UPI link.",
            "tool": "create_booking",
            "args": {"window_id": window_id, "fee_consent": True, "payment_method": "upi_link"},
        },
    )
    assert booked.json()["tool"]["ok"] is True, booked.text
    assert "200" in booked.json()["tool"]["say"]
    detail = client.get(f"/api/calls/{call_id}")
    assert detail.status_code == 200, detail.text
    payments = detail.json()["payments"]
    assert payments and int(payments[0]["amount_inr"]) == 200
    assert str(payments[0]["link_url"]).startswith("https://demo.local/pay/")

    unknown, _, _ = activate(client, "unknown")
    info = tool(client, unknown, "get_clinic_info", topic="hours")
    assert "Monday" in info["say"]
    hidden = tool(client, unknown, "get_report_status")
    assert hidden["ok"] is False and "ready_for_pickup" not in json.dumps(hidden)

    kabir, _, _ = activate(client, "kabir")
    limited = tool(client, kabir, "match_patient", full_name="Kabir Demo", patient_code="HC/2026/0413", caller_is_patient=False)
    assert limited["data"]["verification_mode"] == "limited"
    hold_window = window_for(client, kabir, "Sharma")
    held = tool(client, kabir, "hold_window", window_id=hold_window)
    assert held["ok"] is True, held
    blocked = tool(client, kabir, "get_report_status")
    assert blocked["ok"] is False
    assert "pending" not in json.dumps(blocked).lower()
    assert "blood" not in json.dumps(blocked).lower()


def test_traces_metrics_replay_and_poison(client):
    call_id, _, _ = activate(client, "unknown")
    tool(client, call_id, "get_clinic_info", topic="fees")
    events = read_jsonl(call_id)
    assert verify_chain(events) is None
    tampered = json.loads(json.dumps(events))
    tampered[0]["payload"]["tampered"] = True
    assert verify_chain(tampered) is not None
    before = sql("SELECT count(*)::int AS n FROM decision_traces WHERE call_id = %s", (call_id,))[0]["n"]
    assert before == len(events)
    sql("DELETE FROM decision_traces WHERE call_id = %s", (call_id,))
    replay = client.post("/api/admin/traces/replay", json={"call_id": call_id}, headers=PIN)
    assert replay.status_code == 200, replay.text
    assert replay.json()["chain"] is None
    after = sql("SELECT count(*)::int AS n FROM decision_traces WHERE call_id = %s", (call_id,))[0]["n"]
    assert after == before
    kafka_bus.broken = True
    try:
        tool(client, call_id, "get_clinic_info", topic="payment")
    finally:
        kafka_bus.broken = False
    metrics = client.get("/metrics").text
    assert "clinic_tool_duration_seconds" in metrics
    assert "clinic_trace_publish_failures_total" in metrics
    assert 'clinic_active_calls{phase="ai_active"}' in metrics
    poison = client.post("/api/admin/traces/poison", json={"call_id": call_id, "event_id": "00000000-0000-4000-8000-000000000099"}, headers=PIN)
    assert poison.status_code == 200, poison.text
    assert poison.json()["dlq"] >= 1


def test_bolna_webhook_and_handoff(client, runtime):
    client.patch("/api/desk", json={"staff_on_desk": True})
    call_id, _, headers = activate(client, "meera")
    matched = tool(client, call_id, "match_patient", full_name="Meera Demo", patient_code="HC/2026/0412", caller_is_patient=True)
    assert matched["ok"] is True, matched
    minted = client.post(f"/api/calls/{call_id}/bolna-session", headers=headers)
    assert minted.status_code == 200, minted.text
    posted = runtime["captured"][-1]
    assert set(posted["user_data"]) == {"call_id", "caller_phone", "patient_count", "clinic_name"}
    assert "date_of_birth" not in json.dumps(posted["user_data"])
    client.post(
        "/api/simulate/utterance",
        json={"call_id": call_id, "text": "Please get me the receptionist.", "tool": "get_clinic_info", "args": {"topic": "hours"}},
    )
    box = {}

    def ask():
        with httpx.Client(base_url="http://127.0.0.1:8765", timeout=15) as other:
            box["response"] = other.post(
                "/v1/tools/request_human",
                json={"call_id": str(call_id), "reason": "Fee is unclear", "priority": "P3"},
                headers=AUTH,
            )

    thread = threading.Thread(target=ask)
    thread.start()
    queued = None
    for _ in range(40):
        rows = client.get("/api/handoffs", params={"status": "queued"}).json()
        queued = next((row for row in rows if int(row["call_id"]) == call_id), None)
        if queued:
            break
        time.sleep(0.1)
    assert queued, rows
    assert "Meera Demo" in queued["summary"]
    assert "X-ray" not in queued["summary"]
    snapshot_max = max((item["seq"] for item in queued["transcript_snapshot"]), default=-1)
    first = client.post(
        f"/api/calls/{call_id}/recorder-frame",
        json={"pcm_b64": base64.b64encode(b"\x00\x01" * 80).decode(), "text": "hello from the caller", "speaker": "caller"},
    )
    assert first.status_code == 200, first.text
    partial = client.get(f"/api/calls/{call_id}/recording", params={"download": "partial"})
    assert partial.status_code == 200 and partial.content.startswith(b"RIFF")
    blocked = client.get(f"/api/calls/{call_id}/recording")
    assert blocked.status_code == 409
    second = client.post(
        f"/api/calls/{call_id}/recorder-frame",
        json={"pcm_b64": base64.b64encode(b"\x00\x02" * 120).decode(), "speaker": "caller"},
    )
    assert second.json()["bytes"] > first.json()["bytes"]
    accepted = client.post(f"/api/handoffs/{queued['id']}/accept")
    assert accepted.status_code == 200, accepted.text
    staff = decode_token(accepted.json()["livekit_token"])["video"]
    assert staff["canPublish"] is True and staff["room"] == f"clinic-{call_id}"
    thread.join(timeout=10)
    assert box["response"].status_code == 200, box["response"].text
    assert box["response"].json()["data"]["status"] == "accepted"
    staff_turn = client.post(
        f"/api/calls/{call_id}/recorder-frame",
        json={"pcm_b64": base64.b64encode(b"\x00\x03" * 40).decode(), "text": "Desk here", "speaker": "staff", "leg": "human", "source": "staff"},
    )
    assert staff_turn.json()["segment"]["seq"] > snapshot_max
    assert staff_turn.json()["segment"]["leg"] == "human"
    webhook = {
        "id": f"run-{call_id}",
        "status": "completed",
        "summary": "Caller asked for the desk.",
        "transcript": [{"speaker": "user", "text": "Please get me the receptionist."}],
        "conversation_duration": 12,
        "telephony_data": {"recording_url": None},
    }
    first_hook = client.post("/v1/bolna/webhook", json=webhook, headers={"Authorization": "Bearer dev-webhook-token-change-me"})
    assert first_hook.status_code == 200, first_hook.text
    phase = sql("SELECT phase, ai_leg_status FROM calls WHERE id = %s", (call_id,))[0]
    assert phase["phase"] == "with_staff" and phase["ai_leg_status"] == "completed"
    webhook["summary"] = "This second delivery must be ignored."
    second_hook = client.post("/v1/bolna/webhook", json=webhook, headers={"Authorization": "Bearer dev-webhook-token-change-me"})
    assert second_hook.json()["duplicate"] is True
    stored = sql("SELECT summary FROM calls WHERE id = %s", (call_id,))[0]["summary"]
    assert stored == "Caller asked for the desk."
    count = sql("SELECT count(*)::int AS n FROM calls WHERE bolna_execution_id = %s", (f"run-{call_id}",))[0]["n"]
    assert count == 1
    done = client.post(f"/api/handoffs/{queued['id']}/complete", json={"disposition": "transferred_to_human", "note": "Explained the fee"})
    assert done.status_code == 200, done.text
    ended = sql("SELECT phase FROM calls WHERE id = %s", (call_id,))[0]["phase"]
    assert ended == "ended"
    finished = client.get(f"/api/calls/{call_id}/recording")
    assert finished.status_code == 200 and finished.content.startswith(b"RIFF")

    other, _, other_headers = activate(client, "unknown")
    client.post(f"/api/calls/{other}/bolna-session", headers=other_headers)
    ending = client.post(
        "/v1/bolna/webhook",
        json={"id": f"run-{other}", "status": "completed", "summary": "Hours only.", "conversation_duration": 4},
        headers={"Authorization": "Bearer dev-webhook-token-change-me"},
    )
    assert ending.status_code == 200, ending.text
    assert sql("SELECT phase FROM calls WHERE id = %s", (other,))[0]["phase"] == "ended"
    unknown_hook = client.post(
        "/v1/bolna/webhook",
        json={"id": "run-missing", "status": "completed"},
        headers={"Authorization": "Bearer dev-webhook-token-change-me"},
    )
    assert unknown_hook.status_code == 404
    bad_hook = client.post("/v1/bolna/webhook", json={"id": "run-missing", "status": "completed"})
    assert bad_hook.status_code == 401


def test_desk_switch_tickets_and_socket(client):
    off = client.patch("/api/desk", json={"staff_on_desk": False})
    assert off.json()["staff_on_desk"] is False
    call_id, _, _ = activate(client, "unknown")
    closed = tool(client, call_id, "request_human", reason="A person please", priority="P3")
    assert closed["data"]["status"] == "closed"
    client.patch("/api/desk", json={"staff_on_desk": True})
    meera, _, _ = activate(client, "meera")
    tool(client, meera, "match_patient", full_name="Meera Demo", patient_code="HC/2026/0412", caller_is_patient=True)
    ticket = tool(
        client,
        meera,
        "create_message_ticket",
        type="refill",
        medicine_name="TelmaTest",
        doctor_name="Sharma",
        days_left=3,
        body="Same tablets as before.",
    )
    assert ticket["ok"] is True, ticket
    listed = client.get("/api/tickets")
    assert "TelmaTest" not in listed.text
    assert any(item.get("medicine_hidden") for item in listed.json())
    emergency = tool(client, call_id, "flag_emergency", kind="medical", snippet="chest pain")
    assert "112" in emergency["say"] and "108" in emergency["say"]
    disposition = tool(client, meera, "set_disposition", disposition="info_provided")
    assert disposition["ok"] is True
    cookie = client.cookies.get("desk_session")
    import asyncio
    import websockets

    def poke():
        with httpx.Client(base_url="http://127.0.0.1:8765", timeout=20) as other:
            response = other.post(
                "/v1/tools/get_clinic_info",
                json={"call_id": str(meera), "topic": "parking"},
                headers=AUTH,
            )
            assert response.status_code == 200, response.text

    async def listen():
        async with websockets.connect(f"ws://127.0.0.1:8765/ws?token={cookie}&call_id={meera}") as ws:
            ready = json.loads(await asyncio.wait_for(ws.recv(), 5))
            assert ready["event"] == "ready"
            await asyncio.to_thread(poke)
            event = json.loads(await asyncio.wait_for(ws.recv(), 5))
            assert event["event"] == "trace.appended"

    asyncio.run(listen())


def _future_window(doctor_id, hours, priority_places):
    session = sql(
        """INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end, status)
           VALUES (%s, (now() + make_interval(hours => %s))::date,
                   now() + make_interval(hours => %s),
                   now() + make_interval(hours => %s) + interval '2 hours', 'planned')
           RETURNING id""",
        (doctor_id, hours, hours, hours),
    )[0]["id"]
    return sql(
        """INSERT INTO windows (session_id, starts_at, ends_at, capacity, priority_places)
           VALUES (%s, now() + make_interval(hours => %s),
                   now() + make_interval(hours => %s) + interval '30 minutes', 4, %s)
           RETURNING id""",
        (session, hours, hours, priority_places),
    )[0]["id"]


def _paid_booking(client, call_id, window_id):
    booked = tool(
        client, call_id, "create_booking",
        window_id=window_id, fee_consent=True, payment_method="upi_link",
    )
    assert booked["ok"] is True, booked
    detail = client.get(f"/api/calls/{call_id}").json()
    payment = detail["payments"][-1]
    marked = client.post(f"/api/payments/{payment['id']}/mark-paid")
    assert marked.status_code == 200, marked.text
    return int(booked["data"]["booking_id"]), int(payment["id"])


def test_refunds_queue_and_reminder(client):
    sql(
        """UPDATE bookings SET status = 'cancelled', cancelled_at = now(), hold_expires_at = NULL
            WHERE patient_id = (SELECT id FROM patients WHERE full_name = 'Meera Demo')
              AND status IN ('held', 'booked', 'arrived', 'in_consult')"""
    )
    call_id, _, _ = activate(client, "meera")
    assert tool(client, call_id, "match_patient", full_name="Meera Demo", patient_code="HC/2026/0412", caller_is_patient=True)["ok"]
    late_window = _future_window(3, 6, 1)
    early_window = _future_window(3, 40, 1)
    closed_window = _future_window(3, 12, 1)
    late_booking, _late_payment = _paid_booking(client, call_id, late_window)
    early_booking, _early_payment = _paid_booking(client, call_id, early_window)
    closed_booking, _closed_payment = _paid_booking(client, call_id, closed_window)

    late = tool(client, call_id, "request_refund", booking_id=late_booking, amount_inr=5000, refund_to="attacker@upi")
    assert late["ok"] is True, late
    assert late["data"]["amount_inr"] == 100
    assert late["data"]["reason"] == "patient_cancelled_late"
    assert "approve" in late["say"] and "complete" not in late["say"].lower()

    early = tool(client, call_id, "request_refund", booking_id=early_booking, amount_inr=5000)
    assert early["data"]["amount_inr"] == 200 and early["data"]["reason"] == "patient_cancelled_early"

    sql(
        """UPDATE doctor_sessions SET status = 'cancelled'
            WHERE id = (SELECT session_id FROM windows WHERE id = %s)""",
        (closed_window,),
    )
    closed = tool(client, call_id, "request_refund", booking_id=closed_booking, amount_inr=5000, refund_to="attacker@upi")
    assert closed["data"]["amount_inr"] == 200
    assert closed["data"]["reason"] == "doctor_unavailable"
    assert closed["data"]["status"] == "requested"
    stored = sql("SELECT amount_inr, reason, status FROM refunds WHERE id = %s", (closed["data"]["refund_id"],))[0]
    assert int(stored["amount_inr"]) == 200 and stored["reason"] == "doctor_unavailable" and stored["status"] == "requested"
    assert sql("SELECT count(*)::int AS n FROM refunds WHERE amount_inr = 5000")[0]["n"] == 0

    sql("UPDATE bookings SET status = 'no_show' WHERE id = %s", (late_booking,))
    missed = tool(client, call_id, "request_refund", booking_id=late_booking)
    assert missed["ok"] is False and missed["error_code"] == "no_show"

    family, _, _ = activate(client, "family")
    assert tool(client, family, "match_patient", full_name="Rohan Demo", patient_code="7362049", caller_is_patient=True)["ok"]
    sharma = _future_window(1, 8, 0)
    visit = tool(client, family, "create_booking", window_id=sharma)
    assert visit["ok"] is True, visit
    arrived = client.post(f"/api/bookings/{visit['data']['booking_id']}/arrive")
    assert arrived.status_code == 200, arrived.text
    nxt = client.post("/api/doctors/1/call-next")
    assert nxt.status_code == 200, nxt.text
    assert nxt.json()["waiting"] is True
    assert nxt.json()["patient_name"] == "Rohan Demo"
    status = sql("SELECT status FROM bookings WHERE id = %s", (visit["data"]["booking_id"],))[0]["status"]
    assert status == "in_consult"
    reminders = sql(
        "SELECT count(*)::int AS n FROM outbound_jobs WHERE booking_id = %s AND kind = 'reminder'",
        (early_booking,),
    )[0]["n"]
    assert reminders == 1


def test_desk_operations(client):
    assert sql("SELECT pin FROM staff_users WHERE role = 'admin'")[0]["pin"] == "1357"
    window = _future_window(1, 9, 0)
    rohan = sql("SELECT id FROM patients WHERE full_name = 'Rohan Demo'")[0]["id"]
    held = sql(
        """INSERT INTO bookings (
             patient_id, window_id, doctor_id, status, source, hold_expires_at, gcal_sync_status, visit_type)
           VALUES (%s, %s, 1, 'held', 'agent', now() - interval '2 minutes', 'not_needed', 'general_checkup')
           RETURNING id""",
        (rohan, window),
    )[0]["id"]
    job = client.post("/api/admin/jobs/run")
    assert job.status_code == 200, job.text
    assert sql("SELECT status FROM bookings WHERE id = %s", (held,))[0]["status"] == "cancelled"

    delayed_window = _future_window(1, 11, 0)
    delayed = sql(
        """INSERT INTO bookings (
             patient_id, window_id, doctor_id, status, source, gcal_sync_status, visit_type, delay_sms_count)
           VALUES (%s, %s, 1, 'booked', 'console', 'not_needed', 'general_checkup', 2)
           RETURNING id""",
        (rohan, delayed_window),
    )[0]["id"]
    again = client.post("/api/admin/jobs/run")
    assert again.status_code == 200, again.text
    assert sql(
        "SELECT count(*)::int AS n FROM outbound_jobs WHERE booking_id = %s AND kind = 'delay_choice'",
        (delayed,),
    )[0]["n"] == 1

    meera = sql("SELECT id FROM patients WHERE full_name = 'Meera Demo'")[0]["id"]
    kaur_window = _future_window(3, 14, 1)
    named = sql(
        """INSERT INTO bookings (
             patient_id, window_id, doctor_id, status, source, gcal_sync_status, visit_type,
             appointment_fee_inr, payment_status, fee_consent_at, payment_method)
           VALUES (%s, %s, 3, 'booked', 'console', 'not_needed', 'general_checkup', 200, 'pending', now(), 'cash_desk')
           RETURNING id""",
        (meera, kaur_window),
    )[0]["id"]
    cancelled = client.post("/api/doctors/3/cancel-session")
    assert cancelled.status_code == 200, cancelled.text
    assert sql(
        "SELECT count(*)::int AS n FROM outbound_jobs WHERE booking_id = %s AND kind = 'reschedule_offer'",
        (named,),
    )[0]["n"] == 1

    walk_window = _future_window(1, 16, 0)
    walked = client.post("/api/walk-ins", json={
        "full_name": "Sunil Demo", "phone": "+919800001111", "doctor_id": 1, "window_id": walk_window,
    })
    assert walked.status_code == 200, walked.text
    assert sql("SELECT status, source FROM bookings WHERE id = %s", (walked.json()["booking_id"],))[0]["source"] == "walk_in"

    call_id, _, _ = activate(client, "meera")
    assert tool(client, call_id, "match_patient", full_name="Meera Demo", patient_code="HC/2026/0412", caller_is_patient=True)["ok"]
    open_refill = sql(
        """SELECT id FROM message_tickets
            WHERE patient_id = %s AND type = 'refill' AND status IN ('new', 'seen')
            ORDER BY id DESC LIMIT 1""",
        (meera,),
    )
    if open_refill:
        ticket_id = open_refill[0]["id"]
    else:
        ticket = tool(client, call_id, "create_message_ticket", type="refill", medicine_name="TelmaTest", doctor_name="Sharma", days_left=4, body="Same tablets.")
        assert ticket["ok"] is True, ticket
        ticket_id = ticket["data"]["ticket_id"]
    session = sql(
        """INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end, status)
           VALUES (1, current_date - 20, now() - interval '20 days', now() - interval '20 days' + interval '1 hour', 'ended')
           RETURNING id"""
    )[0]["id"]
    past = sql(
        """INSERT INTO windows (session_id, starts_at, ends_at, capacity, priority_places)
           VALUES (%s, now() - interval '20 days', now() - interval '20 days' + interval '30 minutes', 4, 0)
           RETURNING id""",
        (session,),
    )[0]["id"]
    sql(
        """INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, gcal_sync_status, visit_type)
           VALUES (%s, %s, 1, 'done', 'console', 'not_needed', 'general_checkup')""",
        (meera, past),
    )
    refused = client.post(f"/api/tickets/{ticket_id}/refill-decision", json={"pin": "2468", "decision": "approve", "checks_confirmed": True, "issued_via": "collect_at_desk"})
    assert refused.status_code == 401
    approved = client.post(f"/api/tickets/{ticket_id}/refill-decision", json={"pin": "2222", "decision": "approve", "checks_confirmed": True, "issued_via": "collect_at_desk"})
    assert approved.status_code == 200, approved.text

    refund_id = sql("SELECT id FROM refunds WHERE status = 'requested' ORDER BY id DESC LIMIT 1")[0]["id"]
    blocked = client.post(f"/api/refunds/{refund_id}/decide", json={"pin": "2468", "decision": "approve"})
    assert blocked.status_code == 403
    ok = client.post(f"/api/refunds/{refund_id}/decide", json={"pin": "1357", "decision": "approve"})
    assert ok.status_code == 200, ok.text
    assert sql("SELECT status FROM refunds WHERE id = %s", (refund_id,))[0]["status"] == "approved"
    snap = client.get("/api/console/bootstrap")
    assert snap.status_code == 200, snap.text
    assert snap.json()["doctors"] and snap.json()["clinic"] == "Demo Family Clinic"


def test_spoken_facts_are_true(client):
    """Tool sentences are spoken word for word (agent/system-prompt.txt), so each one must be true:
    windows carry their day, cash bookings do not promise a UPI link, and SMS bodies hold the real visit."""
    call_id, _, _ = activate(client, "meera")
    assert tool(client, call_id, "match_patient", full_name="Meera Demo", patient_code="HC/2026/0412", caller_is_patient=True)["ok"]
    # earlier tests leave Meera at the upcoming-visit limit
    sql("""UPDATE bookings SET status = 'cancelled', cancelled_at = now(), hold_expires_at = NULL
            WHERE patient_id = (SELECT id FROM patients WHERE full_name = 'Meera Demo') AND status IN ('held', 'booked')""")
    sql("UPDATE clinic_settings SET max_agent_bookings_per_number_day = 50")
    window_id = _future_window(3, 30, 1)
    found = tool(client, call_id, "get_available_windows", doctor_name="Kaur")
    labels = [w["label"] for w in found["data"]["windows"]]
    assert labels and all(label.split(",")[0] for label in labels)
    assert all(("today" in l) or ("tomorrow" in l) or any(d in l for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")) for l in labels)
    booked = tool(client, call_id, "create_booking", window_id=window_id, doctor_name="Kaur", fee_consent=True, payment_method="cash_desk")
    sql("UPDATE clinic_settings SET max_agent_bookings_per_number_day = 4")
    assert booked["ok"], booked
    assert "at the desk" in booked["say"] and "UPI" not in booked["say"]
    assert any(d in booked["say"] for d in ("today", "tomorrow", "day "))
    sms = tool(client, call_id, "send_sms", template_key="cancelled")
    assert sms["ok"] is False and sms["error_code"] == "need_booking"
    sms = tool(client, call_id, "send_sms", template_key="booking_confirmed", booking_id=booked["data"]["booking_id"])
    assert sms["ok"], sms
    body = sql("SELECT rendered_body FROM messages WHERE id = %s", (sms["data"]["message_id"],))[0]["rendered_body"]
    assert "Dr Demo Kaur" in body and "Dr Dr" not in body and "HC/2026/0412" in body and "Demo Family Clinic is" not in body
    pid = tool(client, call_id, "send_sms", template_key="patient_id")
    body = sql("SELECT rendered_body FROM messages WHERE id = %s", (pid["data"]["message_id"],))[0]["rendered_body"]
    assert "HC/2026/0412" in body
    assert tool(client, call_id, "send_sms", template_key="delay_update")["error_code"] == "bad_template"
