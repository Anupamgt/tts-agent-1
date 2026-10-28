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
BOLNA_API_KEY = env("BOLNA_API_KEY", "")
BOLNA_AGENT_ID = env("BOLNA_AGENT_ID", "")
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
CLINIC_NAME = "Demo Family Clinic"
DATA_DIR = ROOT / "data"
TRACE_DIR = DATA_DIR / "traces"
RECORDING_DIR = DATA_DIR / "recordings"
