# Deskie: the clinic phone desk that never misses a call

**A Hinglish voice front desk for small Indian clinics, built on Gnani AI's Prisma and Timbre with LiveKit Agents.**

📞 **Talk to it in your browser:** https://deskie-clinic.vercel.app/phone · 🌐 https://deskie-clinic.vercel.app
📄 **Full product + technical report:** [submission/REPORT.md](submission/REPORT.md)

When the doctor is with a patient and the receptionist is at the counter, the phone rings out and the patient books elsewhere. Deskie answers it. It speaks English, Hindi and Hinglish, books arrival windows from the clinic's own records, answers "is the doctor late?", checks report status after verifying the caller, never gives medical advice, sends emergencies straight to people, and puts everything on the receptionist's live console.

## Built for The Great Indian AI Internship Challenge (Gnani AI)

| Gnani AI model | How Deskie uses it |
|---|---|
| **Prisma v3.0 / v2.5** (speech to text) | Streams every caller turn through `livekit-plugins-gnani`. On the multilingual line, v3.0 `indic-auto` works out whether the caller speaks English, Hindi, Tamil or Kannada; v2.5 serves single-language lines, where it is the most accurate on phone audio |
| **Timbre v2.5** (text to speech) | Speaks every reply, streamed over SSE, voice **Poorvi** (made for Hinglish) |
| **Evon v3.3** (reasoning) | The LLM slot is an OpenAI-compatible client built for Evon (`EVON_BASE_URL`, `EVON_THINKING`). The live demo runs gpt-4o-mini through that slot because Evon is open weights only and doesn't fit our 4 GB GPU; a vLLM server running Evon drops in with no code change |

**LiveKit** runs the call: a named agent worker (`deskie`), one room per call, `AgentSession` with VAD and the multilingual turn detector, 21 clinic function tools, session memory and transcripts, and SIP telephony (Vobiz inbound trunk with Krisp, dispatch rule, outbound calls, transfer to a person).

```text
Phone ─ Vobiz SIP ─┐
Browser ─ WebRTC ──┴─► LiveKit Cloud room ◄─► Deskie worker ─ Gnani Prisma (STT)
                                                 │            ─ LLM + 21 tools ─► Clinic API (FastAPI) ─► Postgres
                                                 │            ─ Gnani Timbre (TTS)               └─► Desk console
```

### Benchmarks ([full results](voice/evals/RESULTS.md))

| Benchmark | Deskie (Gnani) | Baseline |
|---|---|---|
| **FLEURS speech recognition, phone-line audio** (8 kHz μ-law; Hindi, Tamil, Kannada; mean WER) | **25.7%** Prisma v2.5 | 56.9% OpenAI whisper-1 |
| **FLEURS, phone + waiting-room babble at 10 dB SNR** (mean WER) | **35.3%** Prisma v2.5 | 77.7% whisper-1 |
| **FLEURS Hindi, phone line** (WER) | **10.3%** | 34.3% whisper-1 |
| **Automatic language ID** (Prisma v3.0 `indic-auto`, never told the language) | **95.1%** correct | n/a |
| **Agent task success** (14 clinic scenarios × 3 trials, τ-bench-style) | **pass@1 88.1%, pass^3 85.7%** | n/a |
| **Live call latency** over LiveKit Cloud (8 calls) | end of turn **0.65 s**, LLM first token **1.1 s**, Timbre first audio **0.17 s** (medians) | n/a |

Fewer word errors on phone audio than whisper-1: **55%**. Methods, sample sizes and limits are in [voice/evals/README.md](voice/evals/README.md). whisper-1 is a general-purpose reference point, not the strongest Indic system.

### Tested

| Test | Result |
|---|---|
| End-to-end voice calls over LiveKit Cloud (`voice/tests/e2e_call.py`) | Pass, English and Hinglish, locally and through the public path |
| Conversation evals with an AI-played caller (`voice/tests/conv_eval.py`), 14 scenarios × 3 trials in English, Hindi, Hinglish, Tamil, Kannada | pass^3 85.7% (12 / 14 scenarios pass all 3 trials) |
| Static agent checks (`agent/check_agent.py`) | 91 checks pass |
| Proxy and demo-line auth (`api/tests/test_proxy_auth.py`) | 12 / 12 pass |

### Submission pack

- [submission/REPORT.md](submission/REPORT.md): product and technical report
- [submission/demo-video-script.md](submission/demo-video-script.md): 60-second and 2:30 demo scripts
- [voice/evals/RESULTS.md](voice/evals/RESULTS.md): benchmark results; [submission/engagement-kit.md](submission/engagement-kit.md): posting plan
- [submission/x-post.md](submission/x-post.md), [submission/linkedin-post.md](submission/linkedin-post.md), [submission/medium-blog.md](submission/medium-blog.md)

### Run it locally

See [voice/README.md](voice/README.md) for the worker, [docs/livekit-local-plan.md](docs/livekit-local-plan.md) for the full local stack (PGlite, API, console, worker, tunnel), and `deploy/vercel-sync.sh <backend-url> --prod` to point the Vercel site at a backend.

## Repository map

- `voice/` - the voice agent: LiveKit Agents worker on Gnani Prisma (STT), an OpenAI-compatible LLM slot built for Evon v3.3, and Gnani Timbre (TTS), Vobiz SIP trunk setup and test-call script. Start at `voice/README.md`

- `agent/` - agent definition shared by the LiveKit worker (previously Bolna): system prompt, fixed welcome message, the 21 custom functions, and `check_agent.py` (static checks against the backend)
- `docs/prd/TECHNICAL_PRD.md` - local prototype runtime (Bolna web call, LiveKit, Kafka, traces, handoff)
- `docs/scope.md` - scope and open questions
- `docs/gtm.md` - go-to-market decisions the product depends on (full plan: https://claude.ai/artifact/BjosXcjEXwY6SnBRMTF6Ud)
- `docs/metrics.md` - success metrics: north star (saved calls), drivers, safety limits, targets by stage (full model: https://claude.ai/artifact/FSXF4LNjKg5znEgeg6adgx)
- `docs/flows/` - architecture, clinic flow today vs with agent, and the detailed decision trees (00 to 11, start at `docs/flows/README.md`)
- `docs/alignment.md` - decisions (all decided as of 29 Oct 2026) (with pointers into the flows), caveats, and inputs needed
- `docs/decision-log.md` - audit trail of the 29 Oct 2026 scope and compliance decisions (D-01 to D-40) and the pilot gate checklist (full doc: https://claude.ai/artifact/QuWJEoAzZ5Xv3dvh1NiQAM)
- `docs/privacy-notice.md` - draft call opening line and privacy notice for the clinic and its lawyer
- `docs/design/claude-design-handoff.md` - console UI brief for Claude Design (users, screens, states, sample data, kickoff prompt)
- `design-system/` - snapshot of the "Deskie Helpdesk" design system (live copy: https://claude.ai/artifact/Tjkq5Qy2Ac4VLZWS7eWuRk): `tokens.json` (source), generated `tokens.css`, React components (`components/bundle.js` as `window.Deskie`, `bundle.css`, `index.d.ts`), per-component guidelines and previews, Anek fonts (SIL OFL 1.1). Regenerate CSS with `node design-system/build-tokens-css.mjs`
- `docs/security/threat-model.md` - security and abuse review: findings, fixes, status, and what is not yet covered
- `db/` - demo Postgres schema, seed data, tests and notes
- `docs/research/` - hospital help desk research (final report + four source notes)
