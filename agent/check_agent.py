"""Static checks that keep the Bolna agent config in step with the backend and free of hard-coded facts.

Run from the repo root:  python3 agent/check_agent.py
Exit code 1 on any failure. It does not call Bolna or a model; the gold set (docs/evals) is the behaviour test.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENT = ROOT / "agent"
prompt = (AGENT / "system-prompt.txt").read_text()
welcome = (AGENT / "welcome-message.txt").read_text()
functions = json.loads((AGENT / "functions.json").read_text())
tools_init = (ROOT / "api/app/tools/__init__.py").read_text()
desk = (ROOT / "api/app/tools/desk.py").read_text()
seed = (ROOT / "db/seed.sql").read_text()

failures = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f" -> {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


# 1. functions match the gateway's tools
tools = set(re.findall(r'"(\w+)":\s*\w+,', tools_init.split("TOOLS = {")[1]))
defined = {f["name"] for f in functions}
check("every backend tool has a Bolna function", tools <= defined, sorted(tools - defined))
check("no Bolna function without a backend tool", defined <= tools, sorted(defined - tools))

# 2. each function's parameters are read by the backend module that implements it
module_args = {}
for path in (ROOT / "api/app/tools").glob("*.py"):
    src = path.read_text()
    for fn in re.findall(r"^async def (\w+)\(db, args\)", src, re.M):
        module_args[fn] = set(re.findall(r'args(?:\.get)?\(?\[?"(\w+)"', src))
for f in functions:
    params = set(f["parameters"]["properties"])
    read = module_args.get(f["name"], set())
    check(f"{f['name']}: parameters are read by the backend", params <= read, sorted(params - read))
    check(f"{f['name']}: call_id required", "call_id" in f["parameters"]["required"])
    check(f"{f['name']}: param map covers every parameter", set(f["value"]["param"]) == params)

# 3. every tool the prompt names exists
named = set(re.findall(r"\b([a-z]+(?:_[a-z]+)+)\b", prompt))
known_values = set()
for f in functions:
    for key, prop in f["parameters"]["properties"].items():
        known_values.add(key)
        known_values.update(prop.get("enum", []))
known_values.update({"clinic_name", "call_id", "patient_count", "booking_id", "window_id", "pool_name"})
unknown = sorted(n for n in named if n not in tools and n not in known_values)
check("prompt names only real tools, parameters and values", not unknown, unknown)

# 4. enum values the prompt relies on exist in the backend and seed
dispositions = set(re.findall(r'"(\w+)"', desk.split("DISPOSITIONS = {")[1].split("}")[0]))
used_disp = set(re.findall(r"\b(booked|rescheduled|cancelled|info_provided|ticket_created|callback_queued|transferred_to_human|"
                           r"emergency_redirected|verification_failed|out_of_scope|abandoned)\b", prompt))
check("dispositions in the prompt are accepted by set_disposition", used_disp <= dispositions, sorted(used_disp - dispositions))
sms_keys = set(re.findall(r"\('(\w+)',\s*'en',\s*'sms'", seed))
used_sms = set(re.findall(r'template_key "(\w+)"', prompt))
check("SMS templates in the prompt exist in the seed", used_sms and used_sms <= sms_keys, sorted(used_sms - sms_keys))
topics = set(re.findall(r"\(1, '(\w+)',\s*'en'", seed)) | {"doctors"}
enum_topics = set(next(f for f in functions if f["name"] == "get_clinic_info")["parameters"]["properties"]["topic"]["enum"])
check("clinic info topics exist in the seed", enum_topics <= topics, sorted(enum_topics - topics))

# 5. no clinic facts hard-coded in the prompt or welcome message (facts come from tools)
text = prompt + "\n" + welcome
money = re.findall(r"(?:₹|\brs\.?|\brupees?)\s*\d+|\d+\s*(?:₹|rupees?)", text, re.I)
check("no rupee amounts in the prompt", not money, money)
times = [t for t in re.findall(r"\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b", text, re.I) if t.replace(" ", "").lower() not in {"9am", "9pm"}]
check("no clinic hours or window times in the prompt", not times, times)
names = re.findall(r"\b(Sharma|Verma|Kaur|Demo|Meera|Asha|Rohan|Kabir|Example Road)\b", text)
check("no doctor, patient or address names in the prompt", not names, names)
numbers = set(re.findall(r"(?<![A-Za-z])\d{3,}", text))
check("only the emergency numbers appear as long numbers", numbers <= {"112", "108", "14416"}, sorted(numbers))

# 6. fixed lines: present in English and Hindi, and every one the flows mention is defined
blocks = re.findall(r"^([A-Z][A-Z -]+[A-Z])(?: \(.*\))?\n(.*?)(?=\n\n|\Z)", prompt.split("FIXED LINES")[1].split("HOW TO HANDLE")[0], re.M | re.S)
fixed = {name.strip(): body for name, body in blocks}
for name, body in fixed.items():
    if name == "OTHER LANGUAGE":
        check(f"fixed line {name} has English and Hindi", bool(re.search(r"[A-Za-z]", body) and re.search(r"[ऀ-ॿ]", body)))
    else:
        check(f"fixed line {name} has en and hi", "\nen: " in "\n" + body and "\nhi: " in "\n" + body)
flows = prompt.split("HOW TO HANDLE")[1]
mentioned = set(re.findall(r"\b(EMERGENCY|SELF-HARM|MEDICAL QUESTION|REFILL|ARRIVAL WINDOW|ANY DOCTOR|PAYMENT SECRETS|NOT A PERSON|"
                           r"INSTRUCTIONS|OTHER LANGUAGE|CANNOT CHECK|ABUSE WARNING)\b", flows))
check("every fixed line used in the flows is defined", mentioned <= set(fixed), sorted(mentioned - set(fixed)))
check("emergency line carries 112 and 108", "112" in fixed.get("EMERGENCY", "") and "108" in fixed.get("EMERGENCY", ""))
check("self-harm line carries 112 and Tele-MANAS 14416", "112" in fixed.get("SELF-HARM", "") and "14416" in fixed.get("SELF-HARM", ""))
check("welcome message discloses the assistant and the recording", "automated assistant" in welcome and "recorded" in welcome)

# 7. no secrets in the committed function file
blob = json.dumps(functions)
check("functions.json holds placeholders, not real URLs or tokens", "PUBLIC_BASE" in blob and "Bearer TOKEN" in blob
      and "trycloudflare" not in blob and not re.search(r"Bearer (?!TOKEN)\w", blob))

print(f"\n{len(failures)} failed" if failures else "\nall checks passed")
sys.exit(1 if failures else 0)
