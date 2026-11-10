"""Voice latency over real LiveKit calls.

Places N calls with tests/e2e_call.py (bot caller speaking Gnani Timbre audio
into a LiveKit room the worker joins), then reads the worker's per-stage
metrics lines ("metrics EOUMetrics {...}") logged during those calls.

  WORKER_LOG=path/to/worker.log python evals/latency_bench.py --calls 8
"""
from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import subprocess
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
QUESTIONS = [
    "What time does the clinic open on Saturday?",
    "Is Doctor Sharma running late today?",
    "Hello, mujhe kal general check-up ke liye appointment chahiye.",
    "Do you have a slot with the dentist this week?",
    "வணக்கம், சனிக்கிழமை கிளினிக் எத்தனை மணிக்கு திறக்கும்?",
    "ನಮಸ್ಕಾರ, ಶನಿವಾರ ಕ್ಲಿನಿಕ್ ಎಷ್ಟು ಗಂಟೆಗೆ ತೆರೆಯುತ್ತದೆ?",
]
LINE = re.compile(r"^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d),\d+ .* metrics (\w+) (\{[^}]*\})")


def pct(xs: list[float], q: float) -> float:
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(q * (len(xs) - 1))))]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--calls", type=int, default=8)
    a = ap.parse_args()
    log = Path(os.environ["WORKER_LOG"])
    start = datetime.now().replace(microsecond=0)
    first_words: list[float] = []
    for i in range(a.calls):
        q = QUESTIONS[i % len(QUESTIONS)]
        r = subprocess.run([sys.executable, str(ROOT / "tests" / "e2e_call.py"), "meera", q],
                           capture_output=True, text=True, encoding="utf-8", env={**os.environ, "PYTHONUTF8": "1"})
        res = json.loads(next((l for l in r.stdout.splitlines() if l.startswith("{")), "{}") or "{}")
        first_words += res.get("first_word_after_caller_s", [])
        print(f"call {i + 1}: pass={res.get('pass')} first word {res.get('first_word_after_caller_s')}", flush=True)

    stages: dict[str, list[float]] = {"eou": [], "llm_ttft": [], "tts_ttfb": []}
    clean = re.compile(r"\x1b\[[0-9;]*m")
    for raw in log.read_text("utf-8", errors="replace").splitlines():
        m = LINE.match(clean.sub("", raw))
        if not m or datetime.strptime(m.group(1), "%Y-%m-%d %H:%M:%S") < start:
            continue
        kind, f = m.group(2), json.loads(m.group(3))
        if kind == "EOUMetrics" and "end_of_utterance_delay" in f:
            stages["eou"].append(f["end_of_utterance_delay"])
        elif kind == "LLMMetrics" and "ttft" in f:
            stages["llm_ttft"].append(f["ttft"])
        elif kind == "TTSMetrics" and "ttfb" in f:
            stages["tts_ttfb"].append(f["ttfb"])

    label = {"eou": "End of turn detected (Prisma final + turn detector) after speech stops",
             "llm_ttft": "LLM first token (per model call; tool turns make two)",
             "tts_ttfb": "Gnani Timbre first audio byte",
             "first_word": "Caller stops → first agent word heard (bot sends 1 s of trailing silence, included)"}
    stages["first_word"] = first_words
    out = {"calls": a.calls, "stages": {label[k]: {"median": statistics.median(v), "p90": pct(v, 0.9), "n": len(v)}
                                        for k, v in stages.items() if v}}
    p = HERE / "results" / "latency.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(out, indent=1, ensure_ascii=False), "utf-8")
    print(json.dumps(out, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
