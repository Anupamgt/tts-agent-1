"""Build evals/RESULTS.md from the raw result files.

  python evals/report.py
"""
from __future__ import annotations

import json
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
NAMES = {"hi_in": "Hindi", "ta_in": "Tamil", "kn_in": "Kannada"}
COND = {"clean": "Clean (16 kHz)", "phone": "Phone line (8 kHz, μ-law)", "phone_noisy": "Phone + waiting-room babble (10 dB SNR)"}
SYS = {"prisma-v2.5": "Gnani Prisma v2.5 (language given)", "prisma-v3.0": "Gnani Prisma v3.0 (language given)",
       "prisma-v3.0-auto": "Gnani Prisma v3.0, indic-auto (as deployed)", "whisper-1": "OpenAI whisper-1 (language given)"}


def stt_section() -> list[str]:
    p = HERE / "results" / "stt_fleurs.json"
    if not p.exists():
        return []
    runs = json.loads(p.read_text("utf-8"))["runs"]
    langs = [l for l in NAMES if any(r["lang"] == l for r in runs)]
    systems = [s for s in SYS if any(r["system"] == s for r in runs)]
    out = ["## 1. Speech recognition: FLEURS (Google), test split", "",
           f"Same {runs[0]['utterances']} utterances per language for every system, scored with the same normaliser "
           "(punctuation removed, NFC, lower case). Word error rate (WER) / character error rate (CER), lower is better.", ""]
    for cond in COND:
        rows = [r for r in runs if r["condition"] == cond]
        if not rows:
            continue
        out += [f"### {COND[cond]}", "", "| System | " + " | ".join(f"{NAMES[l]} WER / CER" for l in langs) + " | Mean WER |",
                "|---|" + "---|" * (len(langs) + 1)]
        for s in systems:
            cells, wers = [], []
            for l in langs:
                r = next((x for x in rows if x["system"] == s and x["lang"] == l), None)
                if r:
                    cells.append(f"{r['wer']:.1f} / {r['cer']:.1f}")
                    wers.append(r["wer"])
                else:
                    cells.append("–")
            best = "" if not wers else f"{statistics.mean(wers):.1f}"
            out.append(f"| {SYS[s]} | " + " | ".join(cells) + f" | {best} |")
        out.append("")
    lid = [r for r in runs if r.get("language_id_acc") is not None]
    if lid:
        acc = statistics.mean(r["language_id_acc"] for r in lid)
        out += [f"**Language identification** (Prisma v3.0 indic-auto, never told the language): "
                f"{acc:.1f}% of utterances tagged with the right language across {len(lid)} language × condition runs.", ""]
    return out


def conv_section() -> list[str]:
    p = ROOT / "tests" / "conv_eval_results.json"
    if not p.exists():
        return []
    d = json.loads(p.read_text("utf-8"))
    if isinstance(d, list):
        return []
    k = d["trials"]
    out = ["## 2. Agent task success: Deskie conversation suite (τ-bench-style pass^k)", "",
           f"{len(d['scenarios'])} scenarios against the real agent, its 21 tools and the live clinic database, "
           f"each run {k} times. **pass@1 {d['pass_at_1']}%**, **pass^{k} {d[f'pass_hat_{k}']}%** "
           f"(every one of the {k} trials of a scenario must succeed). LLM: `{d.get('model')}`.", "",
           "| Scenario | Passed |", "|---|---|"]
    for n, s in d["scenarios"].items():
        out.append(f"| {n} | {s['passed']}/{s['trials']} |")
    out.append("")
    return out


def latency_section() -> list[str]:
    p = HERE / "results" / "latency.json"
    if not p.exists():
        return []
    d = json.loads(p.read_text("utf-8"))
    out = ["## 3. Voice latency over LiveKit Cloud (India South)", "",
           f"{d['calls']} real calls from a bot caller (Gnani Timbre voice) through LiveKit to the worker.", "",
           "| Stage | Median | p90 |", "|---|---|---|"]
    for k, v in d["stages"].items():
        out.append(f"| {k} | {v['median']:.2f} s | {v['p90']:.2f} s |")
    out.append("")
    return out


def findings() -> list[str]:
    p = HERE / "results" / "stt_fleurs.json"
    if not p.exists():
        return []
    runs = json.loads(p.read_text("utf-8"))["runs"]

    def mean_wer(system: str, cond: str) -> float:
        return statistics.mean(r["wer"] for r in runs if r["system"] == system and r["condition"] == cond)

    def wer(system: str, lang: str, cond: str) -> float:
        return next(r["wer"] for r in runs if r["system"] == system and r["lang"] == lang and r["condition"] == cond)

    out = ["## Key findings", ""]
    for cond in ("phone", "phone_noisy"):
        g, w = mean_wer("prisma-v2.5", cond), mean_wer("whisper-1", cond)
        out.append(f"- **{COND[cond]}**: Gnani Prisma v2.5 averages {g:.1f}% WER across Hindi, Tamil and Kannada, "
                   f"against {w:.1f}% for OpenAI whisper-1, so **{100 * (1 - g / w):.0f}% fewer word errors**.")
    out.append(f"- Hindi over a real-sounding phone line: Prisma v2.5 makes {wer('prisma-v2.5', 'hi_in', 'phone'):.1f}% word errors, "
               f"against {wer('whisper-1', 'hi_in', 'phone'):.1f}% for whisper-1.")
    lid = [r["language_id_acc"] for r in runs if r.get("language_id_acc") is not None]
    if lid:
        out.append(f"- Prisma v3.0 `indic-auto` picks the right language by itself {statistics.mean(lid):.1f}% of the time. "
                   "That lets one phone number serve Hindi, Tamil and Kannada callers with no IVR menu.")
    out.append(f"- Trade-off we found: when the language is known in advance, Prisma v2.5 is more accurate than v3.0 on phone audio "
               f"({mean_wer('prisma-v2.5', 'phone'):.1f}% vs {mean_wer('prisma-v3.0-auto', 'phone'):.1f}% mean WER). "
               "Deskie therefore uses v2.5 for single-language lines and v3.0 `indic-auto` for multilingual ones (`GNANI_STT_MODEL`).")
    out.append("")
    return out


LIMITS = ["## How to read these numbers", "",
          "- whisper-1 is a widely used general-purpose baseline. It is not the strongest Indic system: specialised open models "
          "(for example AI4Bharat's IndicConformer) are not in this table, and we make no claim against them.",
          "- 25 FLEURS test utterances per language per condition, the same clips for every system. FLEURS is read speech, and "
          "the phone and noise conditions are simulated (8 kHz μ-law, 300–3400 Hz, babble at 10 dB SNR).",
          "- The agent suite is our own (14 scenarios, 3 trials each), built on the τ-bench pass^k method. It is not the public τ-bench task set.",
          "- Tamil/Kannada WER is high for every system partly because these languages build long compound words, so one "
          "wrong suffix costs a whole word. CER is the fairer view there.", ""]


def main() -> None:
    body = ["# Deskie evaluation results", "",
            "Generated by `python evals/report.py` from the raw files in `evals/results/` and `tests/`.", ""]
    body += findings() + stt_section() + conv_section() + latency_section() + LIMITS
    (HERE / "RESULTS.md").write_text("\n".join(body), "utf-8")
    print("\n".join(body))


if __name__ == "__main__":
    main()
