"""Speech-to-text benchmark on Google FLEURS (test split) for Indian languages.

Scores Gnani Prisma (streaming WebSocket, the same path Deskie uses) and,
as a reference, OpenAI whisper-1, on the same clips under three conditions:

  clean        FLEURS audio as released (16 kHz)
  phone        8 kHz, 300-3400 Hz band, G.711 mu-law: what a phone line delivers
  phone_noisy  phone + waiting-room babble (other FLEURS speakers) at 5 dB SNR

Metrics: corpus WER and CER after the same normalisation for every system
(punctuation removed, lower-cased, whitespace collapsed).

Usage:
  python evals/stt_bench.py --parquet <dir with hi_in.parquet ...> \
      --langs hi_in,ta_in --n 30 --systems prisma-v2.5,prisma-v3.0,prisma-v3.0-auto,whisper-1 \
      --conditions clean,phone,phone_noisy --out evals/results/stt_fleurs.json

FLEURS parquet: https://huggingface.co/api/datasets/google/fleurs/parquet/<lang>/test/0.parquet
"""
from __future__ import annotations

import argparse
import asyncio
import io
import json
import os
import sys
import time
import unicodedata
import wave
from pathlib import Path

import httpx
import numpy as np
import websockets
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

LOCALE = {"hi_in": "hi-IN", "ta_in": "ta-IN", "kn_in": "kn-IN", "bn_in": "bn-IN",
          "te_in": "te-IN", "mr_in": "mr-IN", "gu_in": "gu-IN", "ml_in": "ml-IN", "pa_in": "pa-IN"}
WHISPER_LANG = {"hi_in": "hi", "ta_in": "ta", "kn_in": "kn", "bn_in": "bn", "te_in": "te",
                "mr_in": "mr", "gu_in": "gu", "ml_in": "ml", "pa_in": "pa"}
GNANI_WS = "wss://api.vachana.ai/stt/v3/stream"


# ---------------------------------------------------------------- audio

def read_wav(b: bytes) -> tuple[np.ndarray, int]:
    import struct
    fmt = struct.unpack_from("<H", b, 20)[0]
    if fmt in (3, 0xFFFE):  # IEEE float (FLEURS) or extensible: walk the RIFF chunks
        pos, sr, ch, bits = 12, 16000, 1, 32
        while pos + 8 <= len(b):
            cid, size = b[pos:pos + 4], struct.unpack_from("<I", b, pos + 4)[0]
            if cid == b"fmt ":
                _, ch, sr = struct.unpack_from("<HHI", b, pos + 8)
                bits = struct.unpack_from("<H", b, pos + 22)[0]
            elif cid == b"data":
                raw = b[pos + 8: pos + 8 + size]
                x = np.frombuffer(raw, "<f4" if bits == 32 else "<f8").astype(np.float32)
                return (x.reshape(-1, ch).mean(1) if ch > 1 else x), sr
            pos += 8 + size + (size & 1)
        raise ValueError("no data chunk")
    with wave.open(io.BytesIO(b)) as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(w.getnframes())
    if sw == 2:
        x = np.frombuffer(raw, "<i2").astype(np.float32) / 32768
    elif sw == 4:
        x = np.frombuffer(raw, "<i4").astype(np.float32) / 2**31
    else:
        raise ValueError(f"sample width {sw}")
    if ch > 1:
        x = x.reshape(-1, ch).mean(1)
    return x, sr


def fir(cutoff_lo: float, cutoff_hi: float, sr: int, taps: int = 255) -> np.ndarray:
    """Windowed-sinc band-pass (cutoff_lo=0 gives a low-pass)."""
    n = np.arange(taps) - (taps - 1) / 2
    def lp(fc):
        return 2 * fc / sr * np.sinc(2 * fc / sr * n)
    h = lp(cutoff_hi) - (lp(cutoff_lo) if cutoff_lo > 0 else 0)
    return h * np.hamming(taps)


def resample_16k_to_8k(x: np.ndarray) -> np.ndarray:
    return np.convolve(x, fir(0, 3800, 16000), "same")[::2]


def mulaw(x: np.ndarray, mu: float = 255.0) -> np.ndarray:
    """G.711-style mu-law encode to 8 bits and decode back."""
    x = np.clip(x, -1, 1)
    y = np.sign(x) * np.log1p(mu * np.abs(x)) / np.log1p(mu)
    q = np.round((y + 1) / 2 * 255) / 255 * 2 - 1
    return np.sign(q) * ((1 + mu) ** np.abs(q) - 1) / mu


def to_phone(x: np.ndarray, sr: int) -> np.ndarray:
    if sr != 16000:
        raise ValueError("FLEURS is 16 kHz")
    y = resample_16k_to_8k(x)
    y = np.convolve(y, fir(300, 3400, 8000), "same")
    return mulaw(y)


def add_noise(x: np.ndarray, noise: np.ndarray, snr_db: float) -> np.ndarray:
    if len(noise) < len(x):
        noise = np.tile(noise, int(np.ceil(len(x) / len(noise))))
    noise = noise[: len(x)]
    px, pn = np.mean(x**2) + 1e-12, np.mean(noise**2) + 1e-12
    return x + noise * np.sqrt(px / (pn * 10 ** (snr_db / 10)))


def babble(pool: list[np.ndarray], k: int = 6) -> np.ndarray:
    """Waiting-room babble: k other speakers overlaid."""
    L = max(len(p) for p in pool[:k])
    out = np.zeros(L, np.float32)
    for p in pool[:k]:
        p = p / (np.sqrt(np.mean(p**2)) + 1e-9)
        out[: len(p)] += p
    return out / k


def pcm16(x: np.ndarray) -> bytes:
    peak = np.max(np.abs(x)) + 1e-9
    if peak > 0.99:
        x = x / peak * 0.99
    return (x * 32767).astype("<i2").tobytes()


# ---------------------------------------------------------------- text + metrics

def norm(s: str) -> str:
    s = unicodedata.normalize("NFC", s).lower()
    s = "".join(" " if unicodedata.category(c)[0] in "PS" else c for c in s)
    return " ".join(s.split())


def edits(a: list, b: list) -> int:
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, y in enumerate(b, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y))
        prev = cur
    return prev[-1]


def score(pairs: list[tuple[str, str]]) -> dict:
    we = wn = ce = cn = 0
    for ref, hyp in pairs:
        r, h = norm(ref), norm(hyp)
        we += edits(r.split(), h.split()); wn += len(r.split())
        ce += edits(list(r.replace(" ", "")), list(h.replace(" ", ""))); cn += len(r.replace(" ", ""))
    return {"wer": round(100 * we / max(wn, 1), 2), "cer": round(100 * ce / max(cn, 1), 2),
            "utterances": len(pairs), "ref_words": wn}


# ---------------------------------------------------------------- systems

async def prisma(audio: bytes, sr: int, lang: str, model: str, key: str, meta: dict | None = None) -> tuple[str, float]:
    meta = {} if meta is None else meta
    headers = {"x-api-key-id": key, "language_code": lang, "lang_code": lang,
               "model": model, "x-model": model, "x-sample-rate": str(sr)}
    if sr == 8000:
        headers.update({"x-vad-threshold": "0.7", "x-min-speech-ms": "200", "x-min-silence-ms": "500"})
    chunk, pace = 1024, 512 / sr
    finals: dict[str, str] = {}
    sent_at = [float("inf")]
    t0 = time.monotonic()
    async with websockets.connect(GNANI_WS, additional_headers=headers, ping_interval=20,
                                  max_size=None, open_timeout=20) as ws:
        hello = json.loads(await asyncio.wait_for(ws.recv(), 15))
        if hello.get("type") == "error":
            raise RuntimeError(hello)
        meta["hello"] = hello

        async def send():
            # 1 s of silence after speech so the server VAD closes the last segment
            data = audio + b"\0" * (sr * 2)
            data += b"\0" * (-len(data) % chunk)
            for i in range(0, len(data), chunk):
                await ws.send(data[i:i + chunk])
                await asyncio.sleep(pace)
            await ws.send(json.dumps({"type": "commit"}))
            sent_at[0] = time.monotonic()

        sender = asyncio.create_task(send())
        last = time.monotonic()
        while True:
            # Poll in short steps; once all audio is sent, stop after 3 s of quiet.
            if sender.done() and time.monotonic() - max(last, sent_at[0]) > 3.0:
                break
            try:
                msg = json.loads(await asyncio.wait_for(ws.recv(), 0.5))
            except asyncio.TimeoutError:
                continue
            except websockets.ConnectionClosed:
                break
            if msg.get("type") == "error":
                raise RuntimeError(msg.get("message"))
            if msg.get("type") == "connected" or "detected_language_code" in msg:
                meta.update({k: v for k, v in msg.items() if k in ("config", "detected_language_code")})
            if msg.get("type") == "transcript" and msg.get("is_final", True):
                seg = str(msg.get("segment_index", msg.get("segment_id", len(finals))))
                finals[seg] = msg.get("text", "")
                last = time.monotonic()
        await sender
    def key_fn(k):
        return int(k) if k.isdigit() else k
    return " ".join(finals[k] for k in sorted(finals, key=key_fn)), time.monotonic() - t0


async def whisper(audio: bytes, sr: int, lang: str, key: str, client: httpx.AsyncClient) -> tuple[str, float]:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(audio)
    t0 = time.monotonic()
    r = await client.post("https://api.openai.com/v1/audio/transcriptions",
                          headers={"Authorization": f"Bearer {key}"},
                          data={"model": "whisper-1", "language": lang},
                          files={"file": ("a.wav", buf.getvalue(), "audio/wav")}, timeout=120)
    r.raise_for_status()
    return r.json()["text"], time.monotonic() - t0


# ---------------------------------------------------------------- run

def load_rows(parquet: Path, n: int):
    import pyarrow.parquet as pq
    t = pq.read_table(parquet, columns=["id", "audio", "transcription", "raw_transcription"]) \
        if "audio" in pq.ParquetFile(parquet).schema_arrow.names else None
    if t is None:
        # HF parquet stores audio as struct {bytes, path}
        t = pq.read_table(parquet)
    rows = t.slice(0, n + 8).to_pylist()
    seen, out = set(), []
    for r in rows:  # FLEURS repeats sentences with different speakers; keep one each
        if r["id"] in seen:
            continue
        seen.add(r["id"])
        audio = r.get("audio") or {}
        b = audio.get("bytes") if isinstance(audio, dict) else r.get("bytes")
        out.append((r["id"], b, r["transcription"]))
    return out


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--parquet", required=True)
    ap.add_argument("--langs", default="hi_in")
    ap.add_argument("--n", type=int, default=30)
    ap.add_argument("--systems", default="prisma-v2.5,prisma-v3.0,whisper-1")
    ap.add_argument("--conditions", default="clean,phone,phone_noisy")
    ap.add_argument("--snr", type=float, default=5.0)
    ap.add_argument("--concurrency", type=int, default=6)
    ap.add_argument("--out", default="evals/results/stt_fleurs.json")
    a = ap.parse_args()

    gkey, okey = os.environ["GNANI_API_KEY"], os.getenv("OPENAI_API_KEY", "")
    out_path = Path(a.out)
    results = json.loads(out_path.read_text("utf-8")) if out_path.exists() else {"runs": []}
    done = {(r["lang"], r["system"], r["condition"]) for r in results["runs"]}
    sem = asyncio.Semaphore(a.concurrency)
    client = httpx.AsyncClient()

    for lang in a.langs.split(","):
        rows = load_rows(Path(a.parquet) / f"{lang}.parquet", a.n)[: a.n]
        clips = []
        for _id, b, ref in rows:
            x, sr = read_wav(b)
            clips.append((_id, x, sr, ref))
        pool = [c[1] for c in clips]
        print(f"{lang}: {len(clips)} clips, {sum(len(c[1]) / c[2] for c in clips) / 60:.1f} min", flush=True)

        def render(i, cond):
            _id, x, sr, ref = clips[i]
            if cond == "clean":
                return pcm16(x), sr
            if cond == "phone":
                return pcm16(to_phone(x, sr)), 8000
            noise = babble(pool[i + 1:] + pool[:i])
            return pcm16(to_phone(add_noise(x, noise, a.snr), sr)), 8000

        for system in a.systems.split(","):
            for cond in a.conditions.split(","):
                if (lang, system, cond) in done:
                    print(f"  skip {system} {cond} (cached)")
                    continue
                if system.startswith("whisper") and not okey:
                    continue

                detected: dict[int, str | None] = {}

                async def one(i):
                    audio, sr = render(i, cond)
                    async with sem:
                        for attempt in range(3):
                            try:
                                if system.startswith("prisma"):
                                    # "prisma-v3.0-auto": the product's setting, language detected per call
                                    auto = system.endswith("-auto")
                                    m: dict = {}
                                    txt, dt = await prisma(audio, sr, "indic-auto" if auto else LOCALE[lang],
                                                           system.removesuffix("-auto"), gkey, m)
                                    detected[i] = m.get("detected_language_code")
                                    return txt, dt
                                return await whisper(audio, sr, WHISPER_LANG[lang], okey, client)
                            except Exception as e:  # noqa: BLE001
                                err = f"{type(e).__name__}: {str(e)[:160]}"
                                await asyncio.sleep(2 * (attempt + 1))
                        return f"__ERROR__ {err}", 0.0

                t0 = time.monotonic()
                outs = await asyncio.gather(*(one(i) for i in range(len(clips))))
                errors = [o[0] for o in outs if o[0].startswith("__ERROR__")]
                pairs = [(clips[i][3], o[0]) for i, o in enumerate(outs) if not o[0].startswith("__ERROR__")]
                run = {"lang": lang, "system": system, "condition": cond, **score(pairs),
                       "errors": len(errors), "first_error": errors[0] if errors else None,
                       "wall_s": round(time.monotonic() - t0, 1),
                       "language_id_acc": (round(100 * sum(v == LOCALE[lang] for v in detected.values()) / len(detected), 1)
                                           if system.endswith("-auto") and detected else None),
                       "samples": [{"id": clips[i][0], "ref": clips[i][3], "hyp": o[0]} for i, o in enumerate(outs[:3])]}
                results["runs"].append(run)
                print(f"  {system:12s} {cond:12s} WER {run['wer']:6.2f}  CER {run['cer']:6.2f}  "
                      f"n={run['utterances']} err={len(errors)}"
                      + (f"  LID {run['language_id_acc']}%" if run["language_id_acc"] is not None else ""), flush=True)
                if errors:
                    print("    e.g.", errors[0], flush=True)
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_text(json.dumps(results, ensure_ascii=False, indent=1), "utf-8")
    await client.aclose()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
