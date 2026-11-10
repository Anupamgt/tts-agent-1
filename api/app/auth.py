import hashlib
import hmac
import secrets

from fastapi import Request

from app.config import BOLNA_SOURCE_IPS, BOLNA_TOOL_TOKEN, BOLNA_WEBHOOK_TOKEN, DESK_PIN, INTERNAL_TOKEN

desk_sessions: dict[str, dict] = {}
caller_tokens: dict[str, int] = {}


def digest_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(
        hashlib.sha256(left.encode()).digest(),
        hashlib.sha256(right.encode()).digest(),
    )


def bearer(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return ""


def tool_authorized(request: Request) -> bool:
    return digest_equal(bearer(request), BOLNA_TOOL_TOKEN)


def internal_authorized(request: Request) -> bool:
    return digest_equal(bearer(request), INTERNAL_TOKEN)


def webhook_authorized(request: Request) -> bool:
    return digest_equal(bearer(request), BOLNA_WEBHOOK_TOKEN)


def pin_ok(pin: str) -> bool:
    return digest_equal(pin or "", DESK_PIN)


def source_allowed(ip: str, enforce: bool) -> bool:
    if not enforce:
        return True
    return ip in BOLNA_SOURCE_IPS


# A tunnel (cloudflared), the console proxy or a Vercel rewrite delivers internet
# traffic from 127.0.0.1. Those hops add one of these headers, so a request that
# carries one is not local, whatever its socket address.
PROXY_HEADERS = ("cf-connecting-ip", "x-forwarded-for", "x-real-ip", "forwarded", "cf-ray", "x-vercel-id")


def client_ip(request: Request) -> str:
    """Best guess at the caller's IP, for rate limits only. Behind Vercel ->
    Cloudflare, cf-connecting-ip is Vercel's egress, so the first X-Forwarded-For
    hop comes first. That hop can be spoofed; the overall caps still hold."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd and fwd.split(",")[0].strip():
        return fwd.split(",")[0].strip()
    cf = request.headers.get("cf-connecting-ip")
    if cf:
        return cf.strip()
    return request.client.host if request.client else "unknown"


def is_loopback(request: Request) -> bool:
    if any(request.headers.get(h) for h in PROXY_HEADERS):
        return False
    host = request.client.host if request.client else ""
    return host in {"127.0.0.1", "::1", "localhost"}


def new_desk_session() -> str:
    token = secrets.token_urlsafe(24)
    desk_sessions[token] = {"role": "receptionist"}
    return token


def desk_token_from(request: Request) -> str | None:
    token = request.cookies.get("desk_session") or request.query_params.get("token") or ""
    if token and token in desk_sessions:
        return token
    header = request.headers.get("x-desk-pin")
    if header and pin_ok(header):
        return "pin"
    return None


def issue_caller_token(call_id: int) -> str:
    token = secrets.token_urlsafe(24)
    caller_tokens[token] = call_id
    return token


def caller_call_id(token: str | None) -> int | None:
    if not token:
        return None
    return caller_tokens.get(token)
