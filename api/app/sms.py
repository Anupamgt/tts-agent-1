"""Send queued SMS once a provider is configured. With no provider the row stays queued."""

import asyncio
import base64
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from app.config import SMS_HTTP_TOKEN, SMS_HTTP_URL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
from app.db import db, many, one

log = logging.getLogger("clinic")


def configured() -> bool:
    twilio = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM)
    return twilio or bool(SMS_HTTP_URL)


def _twilio(to_number: str, body: str) -> str:
    url = f"https://api.twilio.com/2010-04-01/Accounts/{urllib.parse.quote(TWILIO_ACCOUNT_SID)}/Messages.json"
    data = urllib.parse.urlencode({"To": to_number, "From": TWILIO_FROM, "Body": body}).encode()
    cred = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()).decode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Basic {cred}")
    with urllib.request.urlopen(req, timeout=15) as resp:
        payload = json.loads(resp.read().decode() or "{}")
    return str(payload.get("sid") or "")


def _http(to_number: str, body: str) -> str:
    headers = {"Content-Type": "application/json"}
    if SMS_HTTP_TOKEN:
        headers["Authorization"] = f"Bearer {SMS_HTTP_TOKEN}"
    req = urllib.request.Request(
        SMS_HTTP_URL,
        data=json.dumps({"to": to_number, "body": body}).encode(),
        method="POST",
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = resp.read().decode()
    try:
        payload = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        payload = {}
    if not isinstance(payload, dict):
        payload = {}
    return str(payload.get("id") or payload.get("message_id") or "")


def _send(to_number: str, body: str) -> str:
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM:
        return _twilio(to_number, body)
    return _http(to_number, body)


async def _mark(message_id: int, status: str, provider_id: str = "", error: str = "") -> None:
    async with db.connection() as conn:
        if status == "sent":
            await conn.execute(
                """UPDATE messages
                      SET status = 'sent', sent_at = now(), provider_message_id = %s, error = NULL
                    WHERE id = %s AND status = 'queued'""",
                (provider_id or None, message_id),
            )
            return
        await conn.execute(
            "UPDATE messages SET status = 'failed', error = %s WHERE id = %s AND status = 'queued'",
            (error[:200], message_id),
        )


async def dispatch_one(message_id: int) -> str:
    if not configured():
        return "queued"
    async with db.connection() as conn:
        row = await one(
            conn,
            "SELECT id, to_number, rendered_body, status FROM messages WHERE id = %s",
            (message_id,),
        )
    if row is None:
        return "queued"
    if row["status"] != "queued":
        return row["status"]
    try:
        provider_id = await asyncio.to_thread(_send, row["to_number"], row["rendered_body"])
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        log.warning("sms provider failed for message %s (%s)", message_id, type(exc).__name__)
        await _mark(message_id, "failed", error=type(exc).__name__)
        return "failed"
    await _mark(message_id, "sent", provider_id=provider_id)
    return "sent"


async def flush_sms(limit: int = 20) -> int:
    if not configured():
        return 0
    async with db.connection() as conn:
        rows = await many(
            conn,
            """SELECT id FROM messages
                WHERE channel = 'sms' AND status = 'queued'
                ORDER BY id
                LIMIT %s""",
            (limit,),
        )
    sent = 0
    for row in rows:
        if await dispatch_one(int(row["id"])) == "sent":
            sent += 1
    return sent
