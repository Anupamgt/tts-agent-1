# Deskie eval suite

Three benchmarks. Each one writes raw JSON to `evals/results/` (or `tests/`), and `python evals/report.py` turns those files into [RESULTS.md](RESULTS.md).

| # | What it measures | Benchmark | Script |
|---|---|---|---|
| 1 | Speech recognition in the languages Deskie speaks, on clean audio, telephone-line audio and noisy telephone audio | **FLEURS** (Google, public test split): Hindi, Tamil, Kannada | `evals/stt_bench.py` |
| 2 | Does the agent do the right thing (right tools, no leaks, safe handling) over whole conversations | **τ-bench-style pass^k** on 14 clinic scenarios against the real backend | `tests/conv_eval.py` |
| 3 | How fast it answers on a real call | Live LiveKit Cloud calls, per-stage metrics | `evals/latency_bench.py` |

## 1. FLEURS speech recognition

```bash
# test-split parquet files from https://huggingface.co/datasets/google/fleurs (hi_in, ta_in, kn_in)
python evals/stt_bench.py --parquet <dir> --langs hi_in,ta_in,kn_in --n 25 --snr 10 \
  --systems prisma-v2.5,prisma-v3.0,prisma-v3.0-auto,whisper-1 \
  --conditions clean,phone,phone_noisy --out evals/results/stt_fleurs.json
```

- **clean**: the FLEURS recording at 16 kHz.
- **phone**: resampled to 8 kHz, band-limited to 300–3400 Hz and passed through G.711 μ-law, the way a real Indian phone call reaches Deskie through Vobiz.
- **phone_noisy**: the phone signal plus six-speaker babble built from other FLEURS speakers at 10 dB SNR, which sounds like a clinic waiting room.
- Every system gets the same clips and the same text normaliser (NFC, lower case, punctuation removed). We report corpus WER and CER.
- `prisma-v3.0-auto` is how Deskie runs in production: it is never told the language (`indic-auto`), so we also score how often the language it detects is correct.
- Prisma is streamed through the same WebSocket the agent uses, at real-time pace. Whisper is OpenAI's `whisper-1` API with the language given, as a widely used reference.

## 2. Conversation suite (pass^k)

```bash
TRIALS=3 CONCURRENCY=8 python tests/conv_eval.py
```

The suite drives the real `Deskie` agent, its 21 tools and the local clinic database in text mode. Scripted callers, and LLM-simulated callers for the longer bookings, cover these scenarios: hours (English, Tamil, Kannada), report status with identity checks (English, Hindi script), a new-patient booking (Hinglish, Tamil), emergencies (English, Hindi), doctor delay, handoff to a human, refusing an unverified report, staff impersonation, and an unsupported language.

Each scenario passes only if it calls the required tools, avoids the forbidden ones (for example reading a report before identity is checked), never speaks internal labels or ids, and replies in the caller's script. Following τ-bench (Yao et al., 2024), every scenario runs *k* times. **pass^k** counts a scenario as passed only if all *k* runs succeed, which is the reliability a clinic actually needs.

## 3. Latency

```bash
WORKER_LOG=<worker log> python evals/latency_bench.py --calls 8
```

A bot caller speaks Gnani Timbre audio into a LiveKit Cloud room, and the worker logs LiveKit's per-stage metrics: end of turn, LLM first token and TTS first byte. We also report the end-to-end gap from when the caller stops speaking to when the agent's first word arrives.

## Honest limits

- 25 utterances per language per condition is a sample, not the full FLEURS test set (n is printed beside every number). FLEURS is read speech; real clinic calls are more spontaneous.
- The phone and noise conditions are simulated, not recorded calls.
- The LLM in these runs is `gpt-4o-mini` behind an OpenAI-compatible endpoint. Evon v3.3 drops into the same slot once it is hosted (`EVON_BASE_URL`).
