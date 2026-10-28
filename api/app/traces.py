import json
import uuid
from datetime import datetime, timezone

from psycopg.types.json import Json

from app.bus import kafka_bus, redis_bus
from app.canonical import canonical_json, record_hash
from app.config import TRACE_DIR
from app.db import db, one


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


async def write_trace(conn, call, event_type: str, severity: str, payload: dict) -> dict:
    call_id = int(call["id"])
    await conn.execute("SELECT id FROM calls WHERE id = %s FOR UPDATE", (call_id,))
    previous = await one(
        conn,
        """SELECT seq, record_hash FROM decision_traces
            WHERE call_id = %s ORDER BY seq DESC LIMIT 1""",
        (call_id,),
    )
    if previous:
        seq = int(previous["seq"]) + 1
        prev_hash = previous["record_hash"]
    else:
        seq = 0
        prev_hash = "0" * 64
    envelope = {
        "schema_version": 1,
        "event_id": str(uuid.uuid4()),
        "trace_id": f"call-{call_id}",
        "call_id": str(call_id),
        "clinic_id": int(call["clinic_id"]),
        "seq": seq,
        "ts": _now(),
        "event_type": event_type,
        "severity": severity,
        "payload": payload,
    }
    envelope["prev_hash"] = prev_hash
    envelope["record_hash"] = record_hash(prev_hash, envelope)
    TRACE_DIR.mkdir(parents=True, exist_ok=True)
    path = TRACE_DIR / f"dtrace_{call_id}.jsonl"
    with path.open("w" if seq == 0 else "a", encoding="utf-8") as handle:
        handle.write(canonical_json(envelope) + "\n")
    await conn.execute(
        """INSERT INTO decision_traces
             (call_id, seq, event_id, event_type, severity, ts, payload, prev_hash, record_hash)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
           ON CONFLICT (event_id) DO NOTHING""",
        (
            call_id,
            seq,
            envelope["event_id"],
            event_type,
            severity,
            envelope["ts"],
            Json(envelope["payload"]),
            prev_hash,
            envelope["record_hash"],
        ),
    )
    message = {
        "schema_version": 1,
        "event_id": envelope["event_id"],
        "call_id": str(call_id),
        "type": "decision_trace",
        "ts": envelope["ts"],
        "body": envelope,
    }
    await kafka_bus.publish("clinic.trace.events", message)
    await redis_bus.publish(
        f"live:call:{call_id}",
        {"event": "trace.appended", "payload": envelope},
    )
    return envelope


async def index_envelope(envelope: dict):
    """Indexer path: insert a trace that was published, ignoring duplicates."""
    if not envelope or "event_id" not in envelope:
        raise ValueError("trace envelope is missing event_id")
    async with db.connection() as conn:
        async with conn.transaction():
            await conn.execute(
                """INSERT INTO decision_traces
                     (call_id, seq, event_id, event_type, severity, ts, payload, prev_hash, record_hash)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (event_id) DO NOTHING""",
                (
                    int(envelope["call_id"]),
                    int(envelope["seq"]),
                    envelope["event_id"],
                    envelope["event_type"],
                    envelope["severity"],
                    envelope["ts"],
                    Json(envelope.get("payload") or {}),
                    envelope["prev_hash"],
                    envelope["record_hash"],
                ),
            )
    await redis_bus.publish(
        f"live:call:{envelope['call_id']}",
        {"event": "trace.appended", "payload": envelope},
    )


def read_jsonl(call_id: int) -> list[dict]:
    path = TRACE_DIR / f"dtrace_{call_id}.jsonl"
    if not path.exists():
        return []
    events = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            events.append(json.loads(line))
    return events


async def replay_call(call_id: int) -> int:
    inserted = 0
    for envelope in read_jsonl(call_id):
        async with db.connection() as conn:
            async with conn.transaction():
                cur = await conn.execute(
                    """INSERT INTO decision_traces
                         (call_id, seq, event_id, event_type, severity, ts, payload, prev_hash, record_hash)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (event_id) DO NOTHING""",
                    (
                        int(envelope["call_id"]),
                        int(envelope["seq"]),
                        envelope["event_id"],
                        envelope["event_type"],
                        envelope["severity"],
                        envelope["ts"],
                        Json(envelope.get("payload") or {}),
                        envelope["prev_hash"],
                        envelope["record_hash"],
                    ),
                )
                if cur.rowcount:
                    inserted += cur.rowcount
    return inserted
