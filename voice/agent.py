"""Deskie voice agent on LiveKit Agents, speaking through Gnani AI models.

    Prisma (STT)  ->  Evon v3.3 (LLM, OpenAI-compatible server)  ->  Timbre (TTS)

LiveKit owns the call: rooms, the agent session, turn taking, interruptions,
conversation memory (chat context) and the tool-call loop. The clinic backend
(api/) owns the facts: every tool in agent/functions.json is a POST to
/v1/tools/<name>, exactly as before, so the 91 prompt checks and the tool
contract do not change.

Phone calls arrive from Vobiz over a LiveKit SIP trunk (see sip_setup.py).
Browser calls (console/public/phone.html or the LiveKit playground) land in the
same entrypoint.

    python agent.py download-files   # turn detector + VAD weights, once
    python agent.py dev              # worker, hot reload
    python agent.py start            # production worker
    python agent.py console          # talk to it from this terminal's mic
"""

from __future__ import annotations

import asyncio
import json
import re
import logging
import os
import time
from pathlib import Path
from typing import Any, AsyncIterable

import httpx
from dotenv import load_dotenv
from google.protobuf.duration_pb2 import Duration
from livekit import api, rtc
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.plugins import gnani, openai, silero

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
load_dotenv(ROOT / ".env")

log = logging.getLogger("deskie.voice")

AGENT_NAME = os.getenv("AGENT_NAME", "deskie")
DESK_API = os.getenv("DESK_API_BASE", "http://127.0.0.1:8000").rstrip("/")
TOOL_TOKEN = os.getenv("TOOL_TOKEN") or os.getenv("BOLNA_TOOL_TOKEN", "")
WEBHOOK_TOKEN = os.getenv("WEBHOOK_TOKEN") or os.getenv("BOLNA_WEBHOOK_TOKEN", "")
DEMO_CALLER = os.getenv("DEMO_CALLER_NUMBER", "")
TRANSFER_TO = os.getenv("TRANSFER_TO_NUMBER", "")

PROMPT = (REPO / "agent" / "system-prompt.txt").read_text(encoding="utf-8")
WELCOME = (REPO / "agent" / "welcome-message.txt").read_text(encoding="utf-8").strip()
WELCOME_HI = (REPO / "agent" / "welcome-message-hi.txt").read_text(encoding="utf-8").strip()
FUNCTIONS = json.loads((REPO / "agent" / "functions.json").read_text(encoding="utf-8"))

HOLD_LINE = os.getenv("HOLD_LINE", "Please stay on the line, I am connecting you to the desk.")

LIVEKIT_ADDENDUM = """

## THIS CALL RUNS ON LIVEKIT
- Tool results arrive as JSON. Speak the "say" field as R3 describes.
- When a tool returns next = "stop", or after a goodbye line, call end_call.
- If request_human returns status "accepted", say its say and then stay silent: a person from the desk is now on the line.
- Words in capitals such as DATA LINE are names of lines in this prompt. Speak the line's text, never its name.
- Never read out JSON, field names, tool names or ids other than the caller's own booking or patient id.
"""


# ---------------------------------------------------------------- backend


class Desk:
    """Thin client for the clinic backend. One per call."""

    def __init__(self, room: str) -> None:
        self.room = room
        self.http = httpx.AsyncClient(base_url=DESK_API, timeout=httpx.Timeout(30.0, connect=5.0))

    def _auth(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}", "x-bolna-execution-id": self.room}

    async def start_call(self, phone: str) -> dict[str, Any]:
        res = await self.http.get(
            "/v1/bolna/inbound",
            params={"contact_number": phone, "execution_id": self.room, "room": self.room},
            headers=self._auth(TOOL_TOKEN),
        )
        res.raise_for_status()
        return res.json()

    async def tool(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        try:
            # request_human can wait up to HANDOFF_WAIT_SECONDS for the desk.
            res = await self.http.post(f"/v1/tools/{name}", json=args, headers=self._auth(TOOL_TOKEN), timeout=90.0)
            return res.json()
        except Exception:
            log.exception("tool %s failed", name)
            return {"ok": False, "say": "I'm having trouble with our system right now.", "next": "offer_callback"}

    async def end_call(self, transcript: list[dict[str, str]], seconds: int) -> None:
        try:
            await self.http.post(
                "/v1/bolna/webhook",
                json={
                    "id": self.room,
                    "status": "completed",
                    "transcript": transcript,
                    "conversation_duration": seconds,
                    "summary": None,
                },
                headers=self._auth(WEBHOOK_TOKEN),
            )
        except Exception:
            log.exception("end-of-call webhook failed")

    async def aclose(self) -> None:
        await self.http.aclose()


# ---------------------------------------------------------------- tools


def build_tools(desk: Desk, call: dict[str, Any], on_handoff) -> list:
    """Turn agent/functions.json into LiveKit raw function tools.

    call_id and from_number are filled in here, never by the model, so a caller
    cannot talk the agent into acting on another call (prompt rule on call_id).
    """
    tools = []
    for spec in FUNCTIONS:
        name = spec["name"]
        schema = {"name": name, "description": spec["description"], "parameters": spec["parameters"]}

        def make(tool_name: str):
            async def handler(raw_arguments: dict[str, object], context: RunContext) -> str:
                args = dict(raw_arguments or {})
                args["call_id"] = call["call_id"]
                args["from_number"] = call["contact_number"]
                started = time.perf_counter()
                if tool_name == "request_human":
                    # The desk can take up to HANDOFF_WAIT_SECONDS to pick up; don't leave dead air.
                    try:
                        context.session.say(HOLD_LINE, allow_interruptions=False, add_to_chat_ctx=False)
                    except Exception:
                        log.debug("hold line not spoken", exc_info=True)
                body = await desk.tool(tool_name, args)
                log.info("tool %s ok=%s %.0fms", tool_name, body.get("ok"), (time.perf_counter() - started) * 1000)
                if tool_name == "request_human" and (body.get("data") or {}).get("status") == "accepted":
                    on_handoff()
                return json.dumps(body, ensure_ascii=False)

            return function_tool(handler, raw_schema=schema)

        tools.append(make(name))
    return tools


# Names of the fixed lines in agent/system-prompt.txt. The model sometimes says
# the name before the line ("DATA LINE: I will keep..."); strip it before TTS.
LINE_NAMES = sorted(set(re.findall(r"^([A-Z][A-Z ]{2,}[A-Z])$", PROMPT, re.M)), key=len, reverse=True)
LABEL = re.compile(r"(?:^|(?<=[\s.!?]))(?:" + "|".join(map(re.escape, LINE_NAMES)) + r")\s*[:\-–—]\s*")


async def strip_labels(text: AsyncIterable[str]) -> AsyncIterable[str]:
    """Drop "NAME:" labels from streamed text. Holds back a short tail so a
    label split across chunks is still caught."""
    hold = max((len(n) for n in LINE_NAMES), default=0) + 3
    buf = ""
    async for chunk in text:
        buf = LABEL.sub("", buf + str(chunk))
        if len(buf) > hold:
            yield buf[:-hold]
            buf = buf[-hold:]
    buf = LABEL.sub("", buf)
    if buf:
        yield buf


class Deskie(Agent):
    def __init__(self, instructions: str, tools: list, hangup) -> None:
        self._hangup = hangup
        super().__init__(instructions=instructions, tools=tools)

    def tts_node(self, text, model_settings):
        return Agent.default.tts_node(self, strip_labels(text), model_settings)

    def transcription_node(self, text, model_settings):
        return Agent.default.transcription_node(self, strip_labels(text), model_settings)

    @function_tool()
    async def end_call(self, context: RunContext) -> None:
        """End the phone call. Use after the goodbye line, after next = "stop", or after abuse continues."""
        await context.wait_for_playout()
        await self._hangup()


# ---------------------------------------------------------------- models


def stt():
    # Prisma. en-IN transcribes English and romanised Hinglish; hi-IN gives Devanagari.
    # (A comma pair like "en-IN,hi-IN" is rejected by the API for the default model.)
    return gnani.STT(
        language=os.getenv("GNANI_STT_LANGUAGE", "en-IN"),
        sample_rate=int(os.getenv("GNANI_STT_SAMPLE_RATE", "16000")),
    )


def tts():
    return gnani.TTS(
        model=os.getenv("GNANI_TTS_MODEL", "timbre-v2.5"),
        voice=os.getenv("GNANI_TTS_VOICE", "Poorvi"),
        language=os.getenv("GNANI_TTS_LANGUAGE", "auto"),
        synthesize_method=os.getenv("GNANI_TTS_METHOD", "sse"),
    )


def llm():
    # Evon v3.3 is open weight: serve it with vLLM or SGLang, which expose
    # /v1/chat/completions. Any OpenAI-compatible endpoint works here.
    # Evon reasons before answering by default; on a phone call that is dead
    # air, so thinking is off unless EVON_THINKING=1 (model card: chat_template_kwargs).
    thinking = os.getenv("EVON_THINKING", "0") == "1"
    extra = {"chat_template_kwargs": {"enable_thinking": thinking}}
    if not thinking:
        extra["repetition_penalty"] = 1.1
    return openai.LLM(
        model=os.getenv("EVON_MODEL", "gnani/gnani-evon-v3.3-30B-A3B"),
        base_url=os.getenv("EVON_BASE_URL", "http://127.0.0.1:8100/v1"),
        api_key=os.getenv("EVON_API_KEY", "none"),
        temperature=float(os.getenv("EVON_TEMPERATURE", "0.2")),
        extra_body=extra if os.getenv("EVON_EXTRA_BODY", "1") == "1" else None,
    )


def turn_detector():
    try:
        from livekit.plugins.turn_detector.multilingual import MultilingualModel

        return MultilingualModel()  # handles Hindi and Hinglish end-of-turn
    except Exception:
        log.warning("turn detector unavailable, falling back to VAD turn taking")
        return "vad"


# ---------------------------------------------------------------- call


def caller_number(participant: rtc.RemoteParticipant) -> str:
    attrs = participant.attributes or {}
    for key in ("sip.phoneNumber", "phone", "phone_number"):
        if attrs.get(key):
            return attrs[key]
    try:
        meta = json.loads(participant.metadata or "{}")
        if meta.get("phone"):
            return meta["phone"]
    except ValueError:
        pass
    return DEMO_CALLER


def fill(template: str, values: dict[str, Any]) -> str:
    out = template
    for key, value in values.items():
        out = out.replace("{" + key + "}", str(value))
    return out


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext) -> None:
    ctx.log_context_fields = {"room": ctx.room.name}
    await ctx.connect()

    meta = json.loads(ctx.job.metadata or "{}") if ctx.job.metadata else {}
    outbound_to = meta.get("phone_number")

    if outbound_to:
        # Outbound: dial through the Vobiz trunk and wait for an answer.
        try:
            await ctx.api.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=ctx.room.name,
                    sip_trunk_id=meta.get("trunk_id") or os.environ["SIP_OUTBOUND_TRUNK_ID"],
                    sip_call_to=outbound_to,
                    participant_identity="phone-user",
                    krisp_enabled=True,
                    ringing_timeout=Duration(seconds=45),
                    wait_until_answered=True,
                )
            )
            log.info("call answered", extra={"to": outbound_to})
        except api.TwirpError as e:
            log.warning("outbound call did not connect: %s %s", e.message, e.metadata)
            ctx.shutdown("call did not connect")
            return

    participant = await ctx.wait_for_participant()
    is_phone = participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
    phone = outbound_to or caller_number(participant)
    log.info("caller joined", extra={"identity": participant.identity, "sip": is_phone})

    desk = Desk(ctx.room.name)
    try:
        call = await desk.start_call(phone)
    except Exception:
        log.exception("inbound lookup failed; continuing without a call row")
        call = {"call_id": "0", "clinic_name": os.getenv("CLINIC_NAME", "Deskie"), "patient_count": "0", "contact_number": phone}
    call.setdefault("contact_number", phone)
    call["channel"] = "phone" if is_phone else "web"

    async def hangup() -> None:
        await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))

    session = AgentSession(
        stt=stt(),
        llm=llm(),
        tts=tts(),
        vad=ctx.proc.userdata["vad"],
        turn_detection=turn_detector(),
        preemptive_generation=True,
        max_tool_steps=6,
    )

    handed_off = asyncio.Event()

    def on_handoff() -> None:
        handed_off.set()

    @session.on("agent_state_changed")
    def _state(ev) -> None:
        # Once the agent has finished saying "someone from the desk is here",
        # stop listening and speaking so staff and caller talk directly.
        if handed_off.is_set() and ev.new_state == "listening":
            session.input.set_audio_enabled(False)
            session.output.set_audio_enabled(False)
            log.info("handed off to desk staff")
            if TRANSFER_TO and is_phone:
                asyncio.create_task(_transfer())

    async def _transfer() -> None:
        try:
            await ctx.api.sip.transfer_sip_participant(
                api.TransferSIPParticipantRequest(
                    room_name=ctx.room.name,
                    participant_identity=participant.identity,
                    transfer_to=f"tel:{TRANSFER_TO}",
                    play_dialtone=True,
                )
            )
        except Exception:
            log.exception("SIP transfer failed")

    started = time.time()

    async def finish() -> None:
        lines = []
        for item in session.history.items:
            if getattr(item, "type", "") == "message" and item.role in ("user", "assistant"):
                text = item.text_content or ""
                if text:
                    lines.append({"role": item.role, "content": text})
        await desk.end_call(lines, int(time.time() - started))
        await desk.aclose()

    ctx.add_shutdown_callback(finish)

    instructions = fill(PROMPT, call) + LIVEKIT_ADDENDUM
    agent = Deskie(instructions, build_tools(desk, call, on_handoff), hangup)
    await session.start(agent=agent, room=ctx.room)

    welcome = WELCOME_HI if os.getenv("WELCOME_LANGUAGE", "en") == "hi" else WELCOME
    await session.say(fill(welcome, call), allow_interruptions=False)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm, agent_name=AGENT_NAME))
