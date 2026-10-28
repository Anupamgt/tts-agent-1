import base64
import hashlib
import hmac
import json
import time

from app.config import LIVEKIT_API_KEY, LIVEKIT_API_SECRET


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def livekit_token(identity: str, room: str, *, publish: bool, subscribe: bool, hidden: bool = False) -> str:
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    now = int(time.time())
    video = {
        "roomJoin": True,
        "room": room,
        "canPublish": publish,
        "canSubscribe": subscribe,
        "canPublishData": publish,
    }
    if hidden:
        video["hidden"] = True
    payload = {
        "exp": now + 7200,
        "iss": LIVEKIT_API_KEY,
        "nbf": now,
        "sub": identity,
        "video": video,
    }
    body = _b64(json.dumps(payload, separators=(",", ":")).encode())
    signing = f"{header}.{body}".encode()
    signature = _b64(hmac.new(LIVEKIT_API_SECRET.encode(), signing, hashlib.sha256).digest())
    return f"{header}.{body}.{signature}"


def decode_token(token: str) -> dict:
    payload = token.split(".")[1]
    pad = "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload + pad))
