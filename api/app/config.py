import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")


def env(name: str, default: str) -> str:
    value = os.environ.get(name)
    return value if value else default


DATABASE_URL = env(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:54329/postgres?sslmode=disable",
)
REDIS_URL = env("REDIS_URL", "memory://")
KAFKA_BOOTSTRAP_SERVERS = env("KAFKA_BOOTSTRAP_SERVERS", "memory://")


def _agent_id(value: str) -> str:
    text = (value or "").strip().rstrip("/")
    if "/" in text:
        text = text.rsplit("/", 1)[-1]
    return text


def _transfer_number(value: str) -> str:
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10 and digits[0] in "6789":
        return "+91" + digits
    return ""


BOLNA_API_KEY = env("BOLNA_API_KEY", "")
BOLNA_AGENT_ID = _agent_id(env("BOLNA_AGENT_ID", ""))
BOLNA_API_BASE = env("BOLNA_API_BASE", "https://api.bolna.ai")
BOLNA_TOOL_TOKEN = env("BOLNA_TOOL_TOKEN", "dev-tool-token-change-me")
BOLNA_WEBHOOK_TOKEN = env("BOLNA_WEBHOOK_TOKEN", "dev-webhook-token-change-me")
BOLNA_ENFORCE_SOURCE_IP = env("BOLNA_ENFORCE_SOURCE_IP", "0") == "1"
BOLNA_SOURCE_IPS = {"13.203.39.153", "13.126.9.249", "13.202.133.53"}
INTERNAL_TOKEN = env("INTERNAL_TOKEN", "dev-internal-token")
DESK_PIN = env("DESK_PIN", "2468")
PUBLIC_BASE_URL = env("PUBLIC_BASE_URL", "http://127.0.0.1:8000")
SIMULATOR_ENABLED = env("SIMULATOR_ENABLED", "1") == "1"
HANDOFF_WAIT_SECONDS = float(env("HANDOFF_WAIT_SECONDS", "25"))
LIVEKIT_URL = env("LIVEKIT_URL", "ws://127.0.0.1:7880")
LIVEKIT_API_KEY = env("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = env("LIVEKIT_API_SECRET", "secret")
CLINIC_NAME = "Deskie"
# SMS stays queued until one of these is set. Indian delivery also needs a DLT header.
TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM = env("TWILIO_FROM", "")
SMS_HTTP_URL = env("SMS_HTTP_URL", "")
SMS_HTTP_TOKEN = env("SMS_HTTP_TOKEN", "")
# Human mobile Bolna's Transfer call tool dials. Empty until a teammate's number is set.
TRANSFER_TO_NUMBER = _transfer_number(env("TRANSFER_TO_NUMBER", ""))
DATA_DIR = ROOT / "data"
TRACE_DIR = DATA_DIR / "traces"
RECORDING_DIR = DATA_DIR / "recordings"

# LiveKit agent dispatched into browser calls (voice/agent.py AGENT_NAME).
VOICE_AGENT_NAME = env("VOICE_AGENT_NAME", "deskie")

# Public demo phone: lets anyone on the internet list personas and start a browser
# call (POST /api/calls). Each call spends LiveKit, Gnani and LLM credits, so it
# is off by default and rate limited per IP and overall when on.
PUBLIC_DEMO = os.getenv("PUBLIC_DEMO", "").lower() in {"1", "true", "yes"}
PUBLIC_DEMO_CALLS_PER_IP_HOUR = int(os.getenv("PUBLIC_DEMO_CALLS_PER_IP_HOUR", "6"))
PUBLIC_DEMO_CALLS_PER_HOUR = int(os.getenv("PUBLIC_DEMO_CALLS_PER_HOUR", "60"))
