import base64
import struct

from psycopg.types.json import Json

from app.bus import redis_bus
from app.config import RECORDING_DIR
from app.db import db, one

open_recordings: set[int] = set()


def recording_path(call_id: int):
    return RECORDING_DIR / f"{call_id}.wav"


def wav_header(data_bytes: int, sample_rate: int) -> bytes:
    channels = 1
    bits = 16
    return struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_bytes,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        sample_rate,
        sample_rate * channels * bits // 8,
        channels * bits // 8,
        bits,
        b"data",
        data_bytes,
    )


def open_recording(call_id: int, sample_rate: int = 16000):
    RECORDING_DIR.mkdir(parents=True, exist_ok=True)
    path = recording_path(call_id)
    if not path.exists() or path.stat().st_size < 44:
        path.write_bytes(wav_header(0, sample_rate))
    open_recordings.add(int(call_id))
    return path


def append_pcm(call_id: int, pcm: bytes, sample_rate: int = 16000) -> int:
    path = open_recording(call_id, sample_rate)
    with path.open("ab") as handle:
        handle.write(pcm)
    data_bytes = path.stat().st_size - 44
    header = wav_header(data_bytes, sample_rate)
    with path.open("r+b") as handle:
        handle.seek(0)
        handle.write(header)
    return path.stat().st_size


def close_recording(call_id: int):
    open_recordings.discard(int(call_id))


def is_open(call_id: int) -> bool:
    return int(call_id) in open_recordings


def decode_pcm(pcm_b64: str) -> bytes:
    return base64.b64decode(pcm_b64 or "")


async def append_segment(call_id: int, speaker: str, text: str, leg: str, source: str, language: str | None = None):
    async with db.connection() as conn:
        async with conn.transaction():
            current = await one(
                conn,
                "SELECT COALESCE(MAX(seq), -1) AS seq FROM transcript_segments WHERE call_id = %s",
                (call_id,),
            )
            seq = int(current["seq"]) + 1
            await conn.execute(
                """INSERT INTO transcript_segments
                     (call_id, seq, speaker, leg, source, text_body, language)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (call_id, seq, speaker, leg, source, text, language),
            )
            row = {
                "call_id": str(call_id),
                "seq": seq,
                "speaker": speaker,
                "leg": leg,
                "source": source,
                "text_body": text,
                "language": language,
            }
    await redis_bus.publish(f"live:call:{call_id}", {"event": "transcript.appended", "payload": row})
    return row
