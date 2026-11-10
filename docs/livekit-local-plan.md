# LiveKit + Gnani: local deploy and test plan

Deadline: 11:59 PM IST, 10 Nov 2026 (Gnani AI internship challenge).

## 1. What you need

| # | Item | Status | How to get it |
|---|------|--------|---------------|
| 1 | LiveKit Cloud project (URL, key, secret) | Done. It's in `voice/.env`, project `gnani-fq3t5295` | n/a |
| 2 | Gnani API key | Done. Prisma STT and Timbre TTS were tested with it | n/a |
| 3 | LiveKit SIP URI | Needed for phone calls | LiveKit Cloud dashboard → Telephony → SIP trunks. The URI looks like `xxxx.sip.livekit.cloud` |
| 4 | An LLM endpoint that accepts tool calls | **Blocking for any real conversation** | See 1a |
| 5 | Vobiz trunk you control (SIP domain, username, password, number) | **Blocking for phone calls only** | See 1b |
| 6 | `lk` CLI on PATH | Optional | Add its install folder to PATH. The scripts here use the Python API, so `lk` isn't required |

### 1a. LLM

Evon v3.3 is open weights only. Gnani doesn't host an endpoint for it. The model is 30B parameters in BF16, about 64 GB, and the card lists H100, H200 or A100 GPUs. A laptop RTX 3050 can't run it.

- **Option A (uses Evon):** rent one A100 or H100 80GB on RunPod, Lambda, Vast or Modal (about $2/hr, so a few hours costs very little), then run:
  ```
  pip install -U "vllm>=0.12.0"
  vllm serve gnani/gnani-evon-v3.3-30B-A3B --port 8100 --max-model-len 32768 \
    --trust-remote-code --enable-auto-tool-choice --tool-call-parser qwen3_coder --reasoning-parser nano_v3 \
    --api-key <pick-one>
  ```
  Put the pod's public URL in `EVON_BASE_URL=https://<pod>/v1` and set `EVON_API_KEY`.
- **Option B (fallback):** use any OpenAI-compatible endpoint with tool calling, such as Groq or OpenAI. Set `EVON_BASE_URL`, `EVON_MODEL` and `EVON_API_KEY`, plus `EVON_EXTRA_BODY=0`. The entry stays eligible, because Prisma and Timbre are both Gnani models. Say plainly in the write-up which LLM you used.
- Also ask in the Gnani Discord whether participants get a hosted Evon endpoint.

### 1b. Vobiz number

The number +918065356716 was bought through **Bolna**. Its SIP trunk most likely sits in Bolna's Vobiz account, so you probably can't point it at LiveKit yourself. In order of speed:

1. Ask Bolna support (or check what the "Move" icon offers) whether they can release the number, or set its inbound destination to a custom SIP URI.
2. Open your own Vobiz account at console.vobiz.ai and buy a DID. Indian numbers can take a while because of KYC. Create a SIP trunk with:
   - direction: both
   - inbound destination: the LiveKit SIP URI **without** the `sip:` prefix
   - username and password for outbound calls

   Copy the SIP domain (`xxx.sip.vobiz.ai`), username, password and number into `voice/.env`.
3. If neither works today, record the demo over WebRTC (LiveKit Agents Playground or the console phone page). The phone path is already written and is configured with `python sip_setup.py inbound|outbound` once you have the trunk details.

## 2. Local deploy (Windows, no Docker)

Five processes, one terminal each, all run from the repo root:

| Process | Command | Port |
|---------|---------|------|
| Database (PGlite) | `node scripts/pglite/server.mjs` | 54329 |
| API | `cd api; .venv\Scripts\python -m uvicorn app.main:app --port 8000 --loop app.winloop:selector_factory` | 8000 |
| Desk console | `node console/server.js` | 8001 (`/?live=1`; reception PIN 2468) |
| Voice worker | `cd voice; .venv\Scripts\python agent.py download-files` (once), then `.venv\Scripts\python agent.py dev` | outbound to LiveKit Cloud |
| LLM | the remote endpoint from 1a | n/a |

Notes:
- Redis and Kafka default to `memory://`, so you don't need to run them.
- LiveKit Cloud runs the rooms and SIP, so you don't need a local LiveKit server.
- The worker calls the API on localhost, so no tunnel is needed.
- One-time telephony setup, once the 1b details are in `voice/.env`: `python sip_setup.py inbound`, then `python sip_setup.py outbound`, then `python sip_setup.py check`.

## 3. Testing

### 3a. Automated tests I run (no LLM or phone needed)

1. Unit and integration tests: `api` pytest (13 pass) and `agent/check_agent.py` (91 checks pass). Run with `PYTHONUTF8=1` on Windows.
2. Gnani round trip: Timbre speaks a line and Prisma transcribes it, in en-IN and hi-IN. This passes.
3. Worker smoke test: the agent builds with 21 desk tools plus `end_call`, and the prompt is filled.
4. LiveKit Cloud check: `sip_setup.py check` connects and lists trunks and dispatch rules.
5. **Tool contract test:** every tool in `agent/functions.json` is called through the worker's `Desk` client against the real local API. Each call must return 2xx with the expected keys, and the database rows it should change must change. Planned.
6. **Room join test:** start the worker in dev mode, create a room with a dispatch, and check that the agent joins and speaks the welcome line. That audio goes through Prisma, and the text must match. Planned.

### 3b. Automated tests run by subagents in parallel (once the LLM endpoint is up)

- **Agent A, text evals:** LiveKit Agents test mode (`session.run(user_input=...)`) covering booking, rescheduling, cancelling, clinic hours, an emergency (must escalate), a human-handoff request, and Hinglish input. Each case asserts on the tool calls made and on the reply.
- **Agent B, synthetic phone caller:** a script joins the room as a caller. Its lines are generated with Timbre, then downsampled to 8 kHz with phone-line noise and babble mixed in. It records the agent's audio, transcribes it with Prisma, and then checks the database (for example, the appointment exists). This also gives evidence for the Noise Canceller award.
- **Agent C, latency and robustness:** time to first audio, response time per turn, the caller talking over the agent, silence and timeout handling, and the worker recovering after an API restart.

### 3c. Tests that need you

1. Answer `sip_setup.py call +91<your phone>`. This tests outbound calling and two-way audio over Vobiz.
2. Call the Vobiz number from your phone. This tests inbound calling and the dispatch rule.
3. Ask for a human and accept the handoff in the desk console (`/?live=1`). This tests the handoff and staff audio.
4. Call from a noisy place and speak Hinglish, to judge real call quality.
5. Record the 60-second demo video, post it on LinkedIn and X with #GnaniAI and #GreatIndianAIInternshipChallenge, and submit.

## 4. Order for today

1. Choose the LLM option (1a). Start the GPU pod now, because the download and load take a while.
2. Meanwhile, I bring up the local stack and run tests 3a.5 and 3a.6.
3. Start the Vobiz track (1b) in parallel. If it's stuck by evening, demo over WebRTC.
4. When the LLM is up, run the subagent tests (3b), then your phone tests (3c).
5. Record the demo, post it, and submit. Leave at least 2 hours of buffer.
