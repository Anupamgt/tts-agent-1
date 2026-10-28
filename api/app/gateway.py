import logging
import time

from psycopg.types.json import Json

from app.bus import redis_bus
from app.canonical import canonical_json, json_safe, redact_args, sha256_text
from app.db import db, one
from app.metrics import metrics
from app.tools import TOOLS
from app.tools_common import load_call, parse_call_id, phase_ok, result
from app.traces import write_trace

log = logging.getLogger("clinic")

MONEY_KEYS = {
    "amount", "amount_inr", "fee", "priority_fee_inr", "appointment_fee_inr",
    "refund_amount", "refund_to", "reason_note",
}


def normalize_args(raw: dict) -> dict:
    if not isinstance(raw, dict):
        return {}
    source = raw["param"] if isinstance(raw.get("param"), dict) else raw
    cleaned = {}
    for key, value in source.items():
        if value is None or value == "":
            continue
        if key == "call_id":
            parsed = parse_call_id(value)
            cleaned[key] = str(parsed) if parsed is not None else str(value)
        else:
            cleaned[key] = value
    return cleaned


async def run_tool(name: str, args: dict, *, execution_id: str | None = None) -> tuple[int, dict]:
    started = time.perf_counter()
    if name not in TOOLS:
        return 404, {"ok": False, "error_code": "unknown_tool", "say": "I cannot do that.", "next": "stop"}
    call_id = parse_call_id(args.get("call_id"))
    args_hash = sha256_text(canonical_json(args))
    async with db.connection() as conn:
        call = await load_call(conn, call_id) if call_id else None
        if call_id and call:
            prior = await one(
                conn,
                """SELECT response_json FROM tool_invocations
                    WHERE call_id = %s AND tool_name = %s AND args_hash = %s
                      AND response_json IS NOT NULL
                      AND created_at > now() - interval '15 seconds'
                    ORDER BY id DESC LIMIT 1""",
                (call_id, name, args_hash),
            )
            if prior and prior["response_json"] is not None:
                return 200, json_safe(prior["response_json"])
    if call_id is None or not phase_ok(call):
        body = result(False, "This call is not active.", error_code="bad_phase", next_="stop")
        return 200, body
    if execution_id:
        mapped = await redis_bus.get(f"exec:{execution_id}")
        owned = call.get("bolna_execution_id")
        if (mapped and str(mapped) != str(call_id)) or (owned and owned != execution_id):
            body = result(False, "I can only use this call.", error_code="bad_call", next_="stop")
            await _finish(call, name, args, args_hash, body, started, severity="warning")
            return 200, body
    forwarded = dict(args)
    supplied = forwarded.get("patient_id")
    if supplied is not None:
        try:
            supplied_id = int(supplied)
        except (TypeError, ValueError):
            supplied_id = -1
        verified = call["patient_id"]
        if verified is None or supplied_id != int(verified):
            metrics.inc("clinic_data_access_violations_total", tool=name)
            body = result(
                False,
                "I can only use the file confirmed on this call.",
                error_code="cross_patient",
                next_="stop",
            )
            await _finish(
                call, name, args, args_hash, body, started,
                event_type="data_access", severity="violation",
                payload={
                    "tool": name,
                    "patient_id_accessed": supplied_id,
                    "matches_verified_patient": False,
                },
            )
            return 200, body
        forwarded.pop("patient_id", None)
    removed_money = [key for key in list(forwarded) if key in MONEY_KEYS]
    for key in removed_money:
        forwarded.pop(key, None)
    try:
        body = await TOOLS[name](db, forwarded)
    except Exception:
        log.exception("tool %s failed", name)
        body = result(False, "I could not complete that. I can ask the desk to call you back.", error_code="db_error")
    body = json_safe(body)
    await _finish(call, name, args, args_hash, body, started)
    return 200, body


async def _finish(call, name, args, args_hash, body, started, event_type="tool_call", severity=None, payload=None):
    latency_ms = int((time.perf_counter() - started) * 1000)
    ok = bool(body.get("ok"))
    if severity is None:
        severity = "info" if ok else "warning"
    metrics.inc("clinic_tool_calls_total", tool=name, ok=str(ok).lower())
    metrics.observe("clinic_tool_duration_seconds", latency_ms / 1000, tool=name)
    trace_payload = payload or {
        "tool": name,
        "args": redact_args(args),
        "result_summary": {"ok": ok, "error_code": body.get("error_code"), "next": body.get("next")},
        "success": ok,
        "latency_ms": latency_ms,
    }
    try:
        async with db.connection() as conn:
            async with conn.transaction():
                fresh = await load_call(conn, call["id"])
                await write_trace(conn, fresh or call, event_type, severity, trace_payload)
                await conn.execute(
                    """INSERT INTO tool_invocations
                         (call_id, tool_name, args_hash, request_json, response_json, ok, http_status, latency_ms)
                       VALUES (%s, %s, %s, %s, %s, %s, 200, %s)""",
                    (call["id"], name, args_hash, Json(args), Json(body), ok, latency_ms),
                )
    except Exception:
        log.exception("failed to store tool trace")
