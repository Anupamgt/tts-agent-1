"""End-to-end call through LiveKit Cloud, no human needed.

A bot caller gets a token from the clinic API (POST /api/calls, the same path the
demo phone uses), joins the room, and the token dispatches the Deskie worker.
The bot speaks each line with Gnani Timbre, and the agent's replies come back
as LiveKit transcription streams. Then the script checks the call row.

    # API :8000, PGlite :54329 and `python agent.py dev` must be running
    .venv/Scripts/python tests/e2e_call.py [persona] ["line 1" "line 2" ...]
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent.parent
load_dotenv(HERE / ".env")

from livekit import rtc  # noqa: E402
from livekit.agents.utils import http_context  # noqa: E402
from livekit.plugins import gnani  # noqa: E402

API = os.getenv("DESK_API_BASE", "http://127.0.0.1:8000")
RATE = 16000


async def speak(source: rtc.AudioSource, tts: gnani.TTS, text: str) -> float:
    started = time.perf_counter()
    async for ev in tts.synthesize(text):
        frame = ev.frame
        if frame.sample_rate != RATE:
            raise RuntimeError(f"unexpected TTS rate {frame.sample_rate}")
        await source.capture_frame(frame)
    await source.wait_for_playout()
    # trailing silence so VAD / turn detection closes the turn
    silence = rtc.AudioFrame(b"\0\0" * 320, RATE, 1, 320)
    for _ in range(50):
        await source.capture_frame(silence)
    return time.perf_counter() - started


async def main(persona: str, lines: list[str]) -> int:
    http_context._new_session_ctx()
    tts = gnani.TTS(model="timbre-v2.5", voice="Poorvi", language="auto", synthesize_method="sse")
    async with httpx.AsyncClient(base_url=API, timeout=30) as client:
        call = (await client.post("/api/calls", json={"persona_key": persona})).json()
    call_id = call["call_id"]
    print(f"call {call_id} as {persona}, room clinic-{call_id}")

    room = rtc.Room()
    agent_lines: list[tuple[float, str]] = []
    agent_joined = asyncio.Event()
    got_line = asyncio.Event()
    t0 = time.perf_counter()

    @room.on("participant_connected")
    def _joined(p: rtc.RemoteParticipant) -> None:
        if p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT:
            print(f"  [{time.perf_counter() - t0:5.1f}s] agent joined: {p.identity}")
            agent_joined.set()

    async def read_stream(reader: rtc.TextStreamReader, who: str) -> None:
        opened = time.perf_counter() - t0  # first word is on its way when the stream opens
        text = await reader.read_all()
        attrs = reader.info.attributes or {}
        if who != room.local_participant.identity and attrs.get("lk.transcription_final") != "false" and text.strip():
            agent_lines.append((opened, text.strip()))
            print(f"  [{opened:5.1f}s] deskie: {text.strip()}")
            got_line.set()

    room.register_text_stream_handler(
        "lk.transcription", lambda reader, who: asyncio.ensure_future(read_stream(reader, who))
    )

    await room.connect(call["livekit_url"], call["livekit_token"])
    source = rtc.AudioSource(RATE, 1)
    track = rtc.LocalAudioTrack.create_audio_track("mic", source)
    await room.local_participant.publish_track(track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))

    ok = True
    try:
        await asyncio.wait_for(agent_joined.wait(), 30)
    except asyncio.TimeoutError:
        print("FAIL: no agent joined within 30s (is `python agent.py dev` running?)")
        await room.disconnect()
        return 1
    try:
        await asyncio.wait_for(got_line.wait(), 30)
    except asyncio.TimeoutError:
        print("FAIL: agent never spoke a greeting")
        ok = False
    await asyncio.sleep(6)  # let the greeting finish (it is not interruptible)

    first_reply_latency: list[float] = []
    for line in lines:
        got_line.clear()
        before = len(agent_lines)
        print(f"  [{time.perf_counter() - t0:5.1f}s] caller: {line}")
        await speak(source, tts, line)
        said_at = time.perf_counter() - t0
        try:
            await asyncio.wait_for(got_line.wait(), 40)
            first_reply_latency.append(agent_lines[before][0] - said_at)
        except asyncio.TimeoutError:
            print("FAIL: no reply within 40s")
            ok = False
        await asyncio.sleep(8)

    await room.disconnect()
    await asyncio.sleep(4)  # shutdown callback posts the transcript

    report = {
        "call_id": call_id,
        "agent_lines": len(agent_lines),
        "first_word_after_caller_s": [round(x, 2) for x in first_reply_latency],
        "pass": ok and len(agent_lines) > len(lines),
    }
    print(json.dumps(report))
    await http_context._close_http_ctx()
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    persona = sys.argv[1] if len(sys.argv) > 1 else "meera"
    lines = sys.argv[2:] or ["What time does the clinic open on Saturday?"]
    sys.exit(asyncio.run(main(persona, lines)))
