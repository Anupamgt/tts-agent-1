# Deskie voice agent (LiveKit + Gnani AI)

The phone side of Deskie, the clinic voice help desk. It replaces the Bolna-hosted agent with
a LiveKit Agents worker that we run ourselves, and every model in the call loop is a Gnani AI model.

```
 caller's phone ──Vobiz SIP trunk──► LiveKit SIP ──► room call-<id> ◄── Deskie worker (this folder)
                                                         ▲                 │  Prisma v2.5  speech → text
 desk staff (console) ──LiveKit token on handoff─────────┘                 │  Evon v3.3    reasoning + tool calls
                                                                           │  Timbre v2.5  text → speech
                                                                           ▼
                                                     clinic backend (api/): /v1/tools/<name>, Postgres, Redis
```

## Who does what

| Concern | Owner |
| --- | --- |
| Rooms, one per call (`call-*`, from the SIP dispatch rule) | LiveKit |
| Agent dispatch to calls (`agent_name=deskie`) | LiveKit |
| Session: turn taking, interruptions, preemptive generation | LiveKit `AgentSession` |
| In-call memory: the whole conversation and tool results | LiveKit chat context |
| Memory across calls: earlier calls and bookings on this number | backend, through `lookup_caller` and `get_previous_interactions` |
| Tool-call loop (21 clinic tools + `end_call`) | LiveKit runs `agent/functions.json` as raw function tools |
| Facts, verification, bookings, handoff queue | clinic backend, unchanged |
| Speech to text | Gnani **Prisma v2.5** (`livekit-plugins-gnani`) |
| Reasoning | Gnani **Evon v3.3** (open weights, served OpenAI-compatible) |
| Text to speech | Gnani **Timbre v2.5** (`livekit-plugins-gnani`) |
| Phone line | Vobiz SIP trunk |

`call_id` and `from_number` are filled in by the worker on every tool call, never by the model,
so a caller can't talk the agent into acting on another call.

## Run it

```bash
cd voice
python -m venv .venv && .venv/Scripts/activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                                 # fill in LiveKit, Gnani, Evon, backend tokens
python agent.py download-files                       # turn detector + VAD weights
python agent.py dev
```

Evon v3.3 runs on a GPU box with vLLM (tool calling has to be on):

```bash
vllm serve gnani/gnani-evon-v3.3-30B-A3B --port 8100 --max-model-len 32768 --trust-remote-code --enable-auto-tool-choice --tool-call-parser qwen3_coder --reasoning-parser nano_v3
```

Set `EVON_BASE_URL` to that server. Any other OpenAI-compatible endpoint also works for local testing.

## Connect the Vobiz number

1. `python sip_setup.py inbound` creates the LiveKit inbound trunk for `VOBIZ_NUMBER` (Krisp noise
   filtering on) and a dispatch rule that gives each call its own `call-*` room with agent `deskie`.
2. In the Vobiz console, set the trunk's inbound destination to the LiveKit SIP URI
   (LiveKit Cloud → Settings → Project → SIP URI) **without** the `sip:` prefix, and link the number
   to that trunk. Unlink it from the old Bolna agent.
3. `python sip_setup.py check` lists the trunks, the rule and any live call rooms.
4. Call the number. The worker log shows `caller joined ... sip: true`.

Outbound (also the quickest way to prove the Vobiz credentials work):

```bash
python sip_setup.py outbound              # prints SIP_OUTBOUND_TRUNK_ID, put it in .env
python sip_setup.py call +9198XXXXXXXX    # the agent dials this phone
```

`max auth retry attempts` in the worker log means the Vobiz username or password is wrong.

## Handoff to the desk

`request_human` queues the call on the desk console as before. When staff accept, the backend
returns a LiveKit token for the same room the caller is in (`calls.livekit_room`). The worker says
"Someone from the desk is here", then mutes itself so staff and caller talk directly. If
`TRANSFER_TO_NUMBER` is set, the worker instead SIP-transfers the phone caller to that number.

## End of call

On shutdown the worker posts the transcript and duration to the backend's end-of-call webhook,
so call history, the desk console and the metrics work as they did with Bolna.

## Tests

With PGlite (`node scripts/pglite/server.mjs`), the API (`uvicorn app.main:app --port 8000 --loop app.winloop:selector_factory` in `api/`) and, for the call test, the worker (`python agent.py dev`) running:

```bash
# Conversation evals: real prompt, real 21 desk tools, real LLM, text only.
# A second LLM plays the caller for multi-turn scenarios. Results in tests/conv_eval_results.json.
.venv/Scripts/python tests/conv_eval.py                 # hours, report, booking_hinglish, emergency, unknown_report_refused, human
# End-to-end call over LiveKit Cloud: a bot caller speaks with Gnani Timbre, Deskie hears with Gnani Prisma.
.venv/Scripts/python tests/e2e_call.py meera "What time does the clinic open on Saturday?"
.venv/Scripts/python tests/e2e_call.py unknown "Hello, mujhe kal general check-up ke liye appointment chahiye."
```

The demo phone (`http://localhost:8001/phone.html`) makes the same browser call with your microphone: its LiveKit token dispatches the `deskie` agent into the call's room.
