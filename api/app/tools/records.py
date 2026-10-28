import logging

from psycopg import errors

from app.db import many, one
from app.metrics import metrics
from app.tools_common import load_call, parse_call_id, phase_ok, privilege_result, result
from app.traces import write_trace

log = logging.getLogger("clinic")


def _report_sentence(label: str, status: str) -> str:
    name = (label or "report").casefold()
    if status == "ready_for_pickup":
        return f"Your {name} is ready to collect at the desk."
    if status == "pending":
        return f"Your {name} is not ready yet."
    if status == "collected":
        return f"Your {name} has already been collected."
    return f"Your {name} is with the clinic."


async def _guard(conn, call, args, tool: str):
    supplied = args.get("patient_id")
    target = call["patient_id"]
    if supplied not in (None, ""):
        try:
            target = int(supplied)
        except (TypeError, ValueError):
            target = -1
    await conn.execute(
        "SELECT require_verified_patient(%s, %s, false)",
        (call["id"], target),
    )
    return int(call["patient_id"])


async def get_report_status(db, args):
    call_id = parse_call_id(args.get("call_id"))
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                patient_id = await _guard(conn, call, args, "get_report_status")
                rows = await many(
                    conn,
                    """SELECT label, status FROM lab_orders
                        WHERE patient_id = %s ORDER BY ordered_on DESC""",
                    (patient_id,),
                )
                reports = [{"label": row["label"], "status": row["status"]} for row in rows]
                await write_trace(
                    conn, call, "data_access", "info",
                    {"tool": "get_report_status", "patient_id_accessed": patient_id, "matches_verified_patient": True},
                )
                if not reports:
                    return result(True, "There is no report on this file.", data={"reports": []})
                say = " ".join(_report_sentence(item["label"], item["status"]) for item in reports)
                return result(True, say, data={"reports": reports})
        except errors.InsufficientPrivilege as exc:
            await _violation(conn, call_id, "get_report_status", args)
            return privilege_result(exc)


async def get_previous_interactions(db, args):
    call_id = parse_call_id(args.get("call_id"))
    async with db.connection() as conn:
        try:
            async with conn.transaction():
                call = await load_call(conn, call_id) if call_id else None
                if not phase_ok(call):
                    return result(False, "This call is not active.", error_code="bad_phase", next_="stop")
                patient_id = await _guard(conn, call, args, "get_previous_interactions")
                rows = await many(
                    conn,
                    """SELECT happened_on, kind, summary, doctor_name
                         FROM patient_interactions
                        WHERE patient_id = %s
                        ORDER BY happened_on DESC
                        LIMIT 5""",
                    (patient_id,),
                )
                items = [
                    {
                        "happened_on": row["happened_on"].isoformat(),
                        "kind": row["kind"],
                        "summary": row["summary"],
                        "doctor_name": row["doctor_name"],
                    }
                    for row in rows
                ]
                await write_trace(
                    conn, call, "data_access", "info",
                    {"tool": "get_previous_interactions", "patient_id_accessed": patient_id, "matches_verified_patient": True},
                )
                if not items:
                    return result(True, "I do not have an earlier visit on this file.", data={"interactions": []})
                say = " ".join(item["summary"] for item in items)
                return result(True, say, data={"interactions": items})
        except errors.InsufficientPrivilege as exc:
            await _violation(conn, call_id, "get_previous_interactions", args)
            return privilege_result(exc)


async def _violation(conn, call_id, tool: str, args: dict):
    import psycopg
    if conn.info.transaction_status == psycopg.pq.TransactionStatus.INERROR:
        await conn.rollback()
    metrics.inc("clinic_data_access_violations_total", tool=tool)
    call = await load_call(conn, call_id) if call_id else None
    if call is None:
        return
    supplied = args.get("patient_id")
    try:
        accessed = int(supplied) if supplied not in (None, "") else call["patient_id"]
    except (TypeError, ValueError):
        accessed = None
    async with conn.transaction():
        await write_trace(
            conn,
            call,
            "data_access",
            "violation",
            {
                "tool": tool,
                "patient_id_accessed": accessed,
                "matches_verified_patient": False,
                "sqlstate": "42501",
            },
        )
