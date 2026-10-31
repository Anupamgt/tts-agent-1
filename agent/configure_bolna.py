"""Push the buildathon agent settings to the live Bolna agent.

Reads the repo .env. Re-runnable. Prints statuses only, never the API key or tokens.

  python3 agent/configure_bolna.py

Transfer call is added only when TRANSFER_TO_NUMBER is an Indian mobile.
"""
import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

API = os.environ.get("BOLNA_API_BASE", "https://api.bolna.ai").rstrip("/")
KEY = os.environ.get("BOLNA_API_KEY", "")
AGENT = os.environ.get("BOLNA_AGENT_ID", "").strip().rstrip("/")
if "/" in AGENT:
    AGENT = AGENT.rsplit("/", 1)[-1]
PUBLIC = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
TOOL = os.environ.get("BOLNA_TOOL_TOKEN", "")
WEBHOOK = os.environ.get("BOLNA_WEBHOOK_TOKEN", "")
TRANSFER = os.environ.get("TRANSFER_TO_NUMBER", "").strip()


def die(message):
    print(message)
    sys.exit(1)


def mobile(value):
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10 and digits[0] in "6789":
        return "+91" + digits
    return ""


def redact(obj):
    secret_keys = {"api_token", "api_key", "source_auth_token", "authorization", "token"}
    if isinstance(obj, dict):
        return {k: ("***" if k.lower() in secret_keys else redact(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [redact(item) for item in obj]
    if isinstance(obj, str) and (obj.startswith("Bearer ") or obj.startswith("bn-")):
        return "***"
    return obj


class Bolna:
    def __init__(self):
        self.client = httpx.Client(
            base_url=API,
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
            timeout=60,
        )

    def request(self, method, path, **kwargs):
        response = self.client.request(method, path, **kwargs)
        if response.status_code >= 400:
            body = response.text[:800]
            die(f"{method} {path} -> {response.status_code}: {body}")
        if not response.content:
            return {}
        return response.json()


def load_functions():
    functions = json.loads((ROOT / "agent" / "functions.json").read_text())
    for fn in functions:
        fn["value"]["url"] = fn["value"]["url"].replace("https://PUBLIC_BASE", PUBLIC)
        fn["value"]["api_token"] = f"Bearer {TOOL}"
        if fn.get("pre_call_webhook_url"):
            fn["pre_call_webhook_url"] = fn["pre_call_webhook_url"].replace("https://PUBLIC_BASE", PUBLIC)
    return functions


def transfer_tool(number):
    return {
        "name": "transfer_call",
        "description": (
            "Use only when channel is phone and the caller asks for a person, "
            "or after flag_emergency on a phone call. Never use on a web call."
        ),
        "pre_call_message": "Let me get someone from the desk.",
        "key": "transfer_call",
        "parameters": {"type": "object", "properties": {}},
        "value": {
            "method": "POST",
            "url": None,
            "param": {"call_sid": "%(call_sid)s", "call_transfer_number": number},
        },
    }


def install_tools(tools_config, functions):
    number = mobile(TRANSFER)
    extras = [transfer_tool(number)] if number else []
    wanted = {fn["name"]: fn for fn in functions}
    api = tools_config.get("api_tools")
    if not isinstance(api, dict):
        api = {"tools": [], "tools_params": {}}
    tools = list(api.get("tools") or [])
    kept = []
    seen = set()
    for tool in tools:
        name = tool.get("name")
        if name in wanted or name == "transfer_call":
            continue
        kept.append(tool)
        seen.add(name)
    merged = list(wanted.values()) + extras + kept
    params = dict(api.get("tools_params") or {})
    for fn in wanted.values():
        value = dict(fn["value"])
        if fn.get("pre_call_webhook_url"):
            value["pre_call_webhook_url"] = fn["pre_call_webhook_url"]
            value["pre_call_webhook_param"] = fn["pre_call_webhook_param"]
        params[fn["name"]] = value
    if number:
        params["transfer_call"] = transfer_tool(number)["value"]
    elif "transfer_call" in params and not number:
        params.pop("transfer_call", None)
    api["tools"] = merged
    api["tools_params"] = params
    tools_config["api_tools"] = api
    return number


def female_kalpa_voice(bolna):
    providers = bolna.request("GET", "/api/v1/voice-config/tts", params={"language": "hi"})
    kalpa = next((p for p in providers.get("providers", []) if p.get("slug") == "kalpa"), None)
    if not kalpa or not kalpa.get("models"):
        return None
    model = next((m for m in kalpa["models"] if m.get("model_id") == "kalpa-tts-1"), kalpa["models"][0])
    voices = bolna.request(
        "GET",
        "/api/v1/voice-config/tts/voices",
        params={"language": "hi", "provider_id": kalpa["id"], "model_id": model["id"], "page": 1, "page_size": 100},
    )
    items = voices.get("items") or voices.get("voices") or []
    female_names = {"ananya", "kavya", "meera", "priya", "isha", "diya", "aisha", "neha", "suhani", "anushka"}

    def label(item):
        return str(item.get("name") or item.get("voice") or item.get("display_name") or "").strip()

    def is_female(item):
        blob = " ".join(str(item.get(k) or "") for k in ("gender", "labels", "description", "name")).lower()
        return "female" in blob or label(item).split()[0].lower() in female_names

    chosen = next((item for item in items if is_female(item)), None)
    if chosen is None and items:
        chosen = next((item for item in items if label(item).lower() != "arjun"), items[0])
    if chosen is None:
        return {"voice": "Arjun", "model": model.get("model_id") or "kalpa-tts-1"}
    return {
        "voice": label(chosen) or "Arjun",
        "voice_id": chosen.get("voice_id"),
        "model": model.get("model_id") or "kalpa-tts-1",
    }


def synthesizer(voice):
    config = {"voice": voice["voice"], "model": voice["model"]}
    if voice.get("voice_id") and voice["voice_id"] != voice["voice"]:
        config["voice_id"] = voice["voice_id"]
    return {"provider": "kalpa", "provider_config": config, "stream": True, "buffer_size": 400}


def apply_voice(tools_config, prompt, welcome, welcome_hi, voice):
    # One transcriber and one voice. Two language pipelines were both speaking,
    # and every Hinglish turn played the other language's handoff on top.
    old = tools_config.get("transcriber") or {}
    tools_config["transcriber"] = {
        "provider": "sarvam",
        "model": "saaras:v4",
        "language": "unknown",
        "stream": True,
        "sampling_rate": old.get("sampling_rate") or 16000,
        "encoding": old.get("encoding") or "linear16",
        "endpointing": 700,
        "vad_threshold": 0.65,
        "vad_prefix_padding_ms": 400,
    }
    tools_config["synthesizer"] = synthesizer(voice)
    synth = synthesizer(voice)
    tools_config["multilingual_config"] = {
        "enabled": False,
        "active_language": "en",
        "language_switch_trigger": "caller_requested",
        "languages": {
            "en": {
                "transcriber": {"provider": "sarvam", "model": "saaras:v4", "language": "unknown"},
                "synthesizer": synth,
                "system_prompt": prompt,
                "welcome_message": welcome,
                "handoff_message": "",
            },
            "hi": {
                "transcriber": {"provider": "sarvam", "model": "saaras:v4", "language": "unknown"},
                "synthesizer": synth,
                "system_prompt": prompt,
                "welcome_message": welcome_hi,
                "handoff_message": "",
            },
        },
    }


def apply_ambient(task):
    config = task.setdefault("task_config", {})
    # Office noise was leaking back into the line and the agent answered it.
    config["ambient_noise"] = False
    config["optimize_latency"] = False
    config["incremental_delay"] = 800
    config["interruption_backoff_period"] = 500
    config["number_of_words_for_interruption"] = 3
    config["hangup_after_silence"] = 20
    config["trigger_user_online_message_after"] = 12
    config["discard_pre_welcome_utterance"] = True
    config["disallow_unknown_numbers"] = False
    config["inbound_limit"] = -1


def main():
    if not KEY or not AGENT:
        die("BOLNA_API_KEY and BOLNA_AGENT_ID are required")
    if not PUBLIC.startswith("https://"):
        die("PUBLIC_BASE_URL must be the public https tunnel")
    bolna = Bolna()
    current = bolna.request("GET", f"/v2/agent/{AGENT}")
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "bolna-agent.before.json").write_text(json.dumps(redact(current), indent=2))

    prompt = (ROOT / "agent" / "system-prompt.txt").read_text().strip()
    welcome = (ROOT / "agent" / "welcome-message.txt").read_text().strip()
    welcome_hi = (ROOT / "agent" / "welcome-message-hi.txt").read_text().strip()
    voice = female_kalpa_voice(bolna)
    if voice is None:
        die("Kalpa is not in the voice catalog for Hindi. Leave the current voice and set it in the Languages tab.")

    agent_config = current.get("agent_config") or current
    tasks = agent_config.get("tasks") or []
    if not tasks:
        die("Agent has no tasks. Refusing to invent one.")
    tools_config = tasks[0].setdefault("tools_config", {})
    number = install_tools(tools_config, load_functions())
    apply_voice(tools_config, prompt, welcome, welcome_hi, voice)
    apply_ambient(tasks[0])
    tools_config.setdefault("input", {})
    tools_config.setdefault("output", {})
    tools_config["input"]["provider"] = "vobiz"
    tools_config["input"]["format"] = "wav"
    tools_config["output"]["provider"] = "vobiz"
    tools_config["output"]["format"] = "wav"

    agent_config["agent_name"] = "Deskie"
    agent_config["agent_welcome_message"] = welcome
    agent_config["webhook_url"] = f"{PUBLIC}/v1/bolna/webhook"
    agent_config["ingest_source_config"] = {
        "source_type": "api",
        "source_url": f"{PUBLIC}/v1/bolna/inbound",
        "source_auth_token": TOOL,
    }
    agent_config["telephony_provider"] = "vobiz"
    agent_config["call_summary_enabled"] = True
    for header_key in ("webhook_headers", "headers"):
        if header_key in agent_config:
            agent_config[header_key] = {"Authorization": f"Bearer {WEBHOOK}"}

    prompts = dict(current.get("agent_prompts") or {})
    task_prompt = dict(prompts.get("task_1") or {})
    task_prompt["system_prompt"] = prompt
    prompts["task_1"] = task_prompt

    payload = {"agent_config": agent_config, "agent_prompts": prompts, "agent_name": "Deskie"}
    if current.get("composition_by_language"):
        payload["composition_by_language"] = {
            "en": [{"type": "text", "text": prompt}],
            "hi": [{"type": "text", "text": prompt}],
        }
    bolna.request("PUT", f"/v2/agent/{AGENT}", json=payload)
    print(f"agent updated. voice={voice['voice']} model={voice['model']}")
    print("voice: one Sarvam saaras stream, Kalpa, no second language agent, vobiz")
    print(f"inbound lookup: {PUBLIC}/v1/bolna/inbound")
    print(f"webhook: {PUBLIC}/v1/bolna/webhook")
    if number:
        print(f"transfer_call destination set ({number[:3]}…{number[-2:]})")
    else:
        print("transfer_call not added. Set TRANSFER_TO_NUMBER to a teammate mobile and re-run.")

    ensure_extractions(bolna)
    link_number(bolna)
    print("done")


def ensure_extractions(bolna):
    categories = bolna.request("GET", f"/agent/{AGENT}/extraction-categories")
    rows = categories if isinstance(categories, list) else categories.get("categories") or categories.get("data") or []
    existing = next((row for row in rows if row.get("name") == "Clinic call"), None)
    if existing is None:
        existing = bolna.request(
            "POST",
            f"/agent/{AGENT}/extraction-categories",
            json={"name": "Clinic call", "model": "gpt-4.1-mini"},
        )
        print("extraction category created")
    else:
        print("extraction category already present")
    category_id = existing["id"]
    specs = [
        ("Intent", "What did the caller want?", [
            ("booking", "Caller booked a visit"),
            ("reschedule", "Caller moved a visit"),
            ("cancel", "Caller cancelled a visit"),
            ("info", "Caller asked for clinic information"),
            ("message", "Caller left a message or a medicine request"),
            ("emergency", "Caller described an emergency or self-harm"),
            ("handoff", "Caller asked for a person"),
            ("other", "None of the above"),
        ]),
        ("Language", "Which language did the caller mostly speak?", [
            ("english", "Mostly English"),
            ("hindi", "Mostly Hindi"),
            ("hinglish", "Mixed Hindi and English"),
            ("other", "Another language"),
        ]),
        ("Verified", "Did the agent confirm a patient file on this call?", [
            ("yes", "match_patient succeeded"),
            ("no", "No file was confirmed"),
        ]),
        ("Booking made", "Did this call create a booking?", [
            ("yes", "A visit was booked"),
            ("no", "No visit was booked"),
        ]),
        ("Emergency", "Did the caller describe a current emergency or wanting to harm themselves?", [
            ("yes", "Emergency or self-harm came up"),
            ("no", "Neither came up"),
        ]),
    ]
    have = {item.get("name") for item in (existing.get("dispositions") or [])}
    listed = bolna.client.get("/dispositions/", params={"agent_id": AGENT})
    if listed.status_code < 400:
        payload = listed.json()
        rows = payload if isinstance(payload, list) else payload.get("dispositions") or payload.get("data") or []
        have.update(item.get("name") for item in rows)
    for name, question, options in specs:
        if name in have:
            continue
        bolna.request(
            "POST",
            "/dispositions/",
            json={
                "name": name,
                "question": question,
                "agent_id": AGENT,
                "category_id": category_id,
                "is_objective": True,
                "objective_options": [{"value": value, "condition": condition} for value, condition in options],
            },
        )
        print(f"extraction added: {name}")


def link_number(bolna):
    listed = bolna.request("GET", "/phone-numbers/all")
    numbers = listed if isinstance(listed, list) else listed.get("phone_numbers") or listed.get("data") or []
    indian = [
        item for item in numbers
        if "vobiz" in json.dumps(item).lower() or str(item.get("phone_number") or item.get("number") or "").startswith("+91")
    ]
    if len(indian) != 1:
        print(f"phone link skipped ({len(indian)} Indian numbers on the account). Pick the number in the Calling tab.")
        return
    item = indian[0]
    number_id = item.get("id") or item.get("phone_number_id")
    bolna.request("POST", "/inbound/setup", json={"agent_id": AGENT, "phone_number_id": number_id})
    shown = str(item.get("phone_number") or item.get("number") or "")
    print(f"inbound number linked ({shown[:3]}…{shown[-2:]})")


if __name__ == "__main__":
    main()
