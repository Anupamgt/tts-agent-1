"""Text-mode conversation evals for the Deskie LiveKit agent.

Runs the real Deskie agent (prompt, 21 desk tools, LLM from voice/.env) against
the local clinic API, with no audio. Each scenario plays scripted caller turns
and checks which desk tools were called.

    # API on :8000 and PGlite on :54329 must be running
    .venv/Scripts/python tests/conv_eval.py            # all scenarios
    .venv/Scripts/python tests/conv_eval.py emergency  # one scenario
"""

from __future__ import annotations

import asyncio
import json
import os
import random
import sys
import time
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(HERE / ".env")

import agent as deskie  # noqa: E402
from livekit.agents import AgentSession  # noqa: E402

SCENARIOS = {
    "hours": {
        "phone": "+919822222222",
        "turns": ["What time does the clinic open on Saturday?"],
        "expect_any": ["get_clinic_info"],
    },
    "report": {
        "phone": "+919822222222",
        "turns": ["Hi, I'm Meera. Is my blood test report ready?", "Yes, it's me, Meera Demo. My card number is HC/2026/0412."],
        "expect_any": ["get_report_status"],
    },
    "booking_hinglish": {
        "phone": "NEW",
        "turns": ["Hello, mujhe kal subah general check-up ke liye appointment chahiye."],
        "persona": (
            "You are Arjun Test, 30 years old, born 12 March 1996, a NEW patient with no file. "
            "You speak casual Hinglish (Hindi in Roman script mixed with English), short phone sentences. "
            "You want a general check-up, any slot tomorrow or the earliest is fine; accept the first slot offered "
            "and say yes to confirmations. The visit is for yourself."
        ),
        "max_turns": 10,
        "expect_all": ["register_patient", "create_booking"],
        "forbid_text": ["DATA LINE", "call_id", "{"],
    },
    "emergency": {
        "phone": "+919811111111",
        "turns": ["My father has severe chest pain and he can't breathe properly!"],
        "expect_all": ["flag_emergency"],
    },
    "unknown_report_refused": {
        "phone": "NEW",
        "turns": ["Can you tell me the blood test result for Meera Demo?"],
        "forbid": ["get_report_status"],
    },
    "human": {
        "phone": "+919833333333",
        "turns": ["Mujhe kisi insaan se baat karni hai, please connect me to the reception."],
        "expect_all": ["request_human"],
    },
}


CALLER_SYSTEM = (
    "You are role-playing a caller on a phone call to a clinic's AI receptionist. {persona} "
    "Reply with ONLY what you say next, one or two short sentences. "
    "When your goal is done or the receptionist says goodbye, reply exactly <END>."
)


async def caller_turn(persona: str, transcript: list[tuple[str, str]]) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.environ["EVON_API_KEY"], base_url=os.environ["EVON_BASE_URL"])
    msgs = [{"role": "system", "content": CALLER_SYSTEM.format(persona=persona)}]
    for who, text in transcript:  # the receptionist is "user" from the caller's side
        msgs.append({"role": "assistant" if who == "caller" else "user", "content": text})
    res = await client.chat.completions.create(model=os.getenv("CALLER_MODEL", "gpt-4o-mini"), messages=msgs, temperature=0.3)
    return (res.choices[0].message.content or "<END>").strip()


def fresh_number() -> str:
    return "+9198" + "".join(random.choice("0123456789") for _ in range(8))


def tool_calls(result) -> list[str]:
    names = []
    for ev in result.events:
        item = getattr(ev, "item", None)
        if getattr(item, "type", "") == "function_call":
            names.append(item.name)
    return names


def replies(result) -> list[str]:
    out = []
    for ev in result.events:
        item = getattr(ev, "item", None)
        if getattr(item, "type", "") == "message" and item.role == "assistant":
            out.append(item.text_content or "")
    return out


async def run(name: str, spec: dict) -> dict:
    room = f"eval-{name}-{uuid.uuid4().hex[:6]}"
    desk = deskie.Desk(room)
    phone = fresh_number() if spec["phone"] == "NEW" else spec["phone"]
    call = await desk.start_call(phone)
    call.setdefault("contact_number", phone)
    call["channel"] = "phone"

    async def hangup() -> None:
        pass

    agent = deskie.Deskie(
        deskie.fill(deskie.PROMPT, call) + deskie.LIVEKIT_ADDENDUM,
        deskie.build_tools(desk, call, lambda: None),
        hangup,
    )
    called: list[str] = []
    log: list[str] = []
    started = time.perf_counter()
    async with deskie.llm() as model, AgentSession(llm=model, max_tool_steps=6) as session:
        await session.start(agent)
        transcript: list[tuple[str, str]] = []
        pending = list(spec["turns"])
        for _ in range(spec.get("max_turns", len(pending))):
            if pending:
                turn = pending.pop(0)
            elif spec.get("persona"):
                turn = await caller_turn(spec["persona"], transcript)
                if "<END>" in turn:
                    break
            else:
                break
            t0 = time.perf_counter()
            result = await session.run(user_input=turn)
            calls = tool_calls(result)
            called += calls
            said = " ".join(replies(result))
            transcript += [("caller", turn), ("deskie", said)]
            log.append(f"  caller: {turn}")
            if calls:
                log.append(f"  tools : {', '.join(calls)}")
            log.append(f"  deskie: {said}")
            log.append(f"  ({time.perf_counter() - t0:.1f}s)")
            if spec.get("persona") and all(t in called for t in spec.get("expect_all", [])):
                break
    await desk.aclose()

    problems = []
    if spec.get("expect_all"):
        problems += [f"missing {t}" for t in spec["expect_all"] if t not in called]
    if spec.get("expect_any") and not any(t in called for t in spec["expect_any"]):
        problems.append(f"none of {spec['expect_any']}")
    problems += [f"forbidden {t}" for t in spec.get("forbid", []) if t in called]
    spoken = " | ".join(line for line in log if line.startswith("  deskie:"))
    problems += [f"spoke {t!r}" for t in spec.get("forbid_text", ["DATA LINE"]) if t in spoken]
    return {
        "name": name,
        "pass": not problems,
        "problems": problems,
        "tools": called,
        "seconds": round(time.perf_counter() - started, 1),
        "log": log,
        "call_id": call.get("call_id"),
    }


async def main(names: list[str]) -> int:
    results = []
    for name in names:
        try:
            res = await run(name, SCENARIOS[name])
        except Exception as e:  # keep going so one failure doesn't hide the rest
            res = {"name": name, "pass": False, "problems": [f"error: {e!r}"], "tools": [], "log": []}
        results.append(res)
        mark = "PASS" if res["pass"] else "FAIL"
        print(f"\n[{mark}] {name}  call_id={res.get('call_id')}  {res.get('seconds', '?')}s  {'; '.join(res['problems'])}")
        print("\n".join(res["log"]))
    out = HERE / "tests" / "conv_eval_results.json"
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    passed = sum(r["pass"] for r in results)
    print(f"\n{passed}/{len(results)} scenarios passed  ->  {out}")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    picked = sys.argv[1:] or list(SCENARIOS)
    sys.exit(asyncio.run(main(picked)))
