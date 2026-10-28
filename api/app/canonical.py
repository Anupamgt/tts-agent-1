import hashlib
import json
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID


def canonicalize(value):
    if isinstance(value, bool) or value is None or isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else value
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, dict):
        return {
            str(key): canonicalize(item)
            for key, item in value.items()
            if not str(key).startswith("_")
        }
    if isinstance(value, (list, tuple)):
        return [canonicalize(item) for item in value]
    return value


def canonical_json(value) -> str:
    return json.dumps(canonicalize(value), sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def json_safe(value):
    return canonicalize(value)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def record_hash(prev_hash: str, envelope: dict) -> str:
    body = {key: value for key, value in envelope.items() if key not in ("prev_hash", "record_hash")}
    return sha256_text(prev_hash + canonical_json(body))


def verify_chain(events: list[dict]) -> str | None:
    """Return the first mismatch, or None when the chain is intact."""
    previous = "0" * 64
    for index, event in enumerate(events):
        if event.get("seq") != index:
            return f"seq {index}"
        if event.get("prev_hash") != previous:
            return f"prev {index}"
        digest = record_hash(event["prev_hash"], event)
        if digest != event.get("record_hash"):
            return f"hash {index}"
        previous = event["record_hash"]
    return None


REDACT_PARTS = ("token", "secret", "password", "api_key")


def redact_args(args: dict) -> dict:
    cleaned = {}
    for key, value in args.items():
        lowered = key.lower()
        if any(part in lowered for part in REDACT_PARTS):
            cleaned[key] = "redacted"
        elif "date_of_birth" in lowered or lowered == "dob":
            cleaned["dob_provided"] = bool(value)
        elif "phone" in lowered or lowered.endswith("number"):
            text = "" if value is None else str(value)
            cleaned[key] = text[-4:]
        else:
            cleaned[key] = value
    return cleaned
