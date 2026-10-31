# Bolna agent setup (Symphony buildathon)

One conversation agent. The clinic facts and the safety rules stay in this repo. Bolna runs the voice, the phone number, the language switch, the transfer, and the post-call extractions.

`python3 agent/configure_bolna.py` pushes the items marked **script**. Do the items marked **dashboard** by hand. Re-run the script after you set `TRANSFER_TO_NUMBER`.

The public tunnel in `PUBLIC_BASE_URL` has to be up before a phone call, or Bolna cannot reach the tools.

## 1. Calling tab

| Setting | Value | Who |
|---|---|---|
| Telephony provider | Vobiz | script |
| Audio format | wav | script |
| Inbound calling | On | dashboard, if the script cannot see exactly one Indian number |
| Inbound number | The Vobiz number you bought | script when the account has one Indian number, otherwise dashboard |
| Data source | Use your internal APIs | script |
| API endpoint | `$PUBLIC_BASE_URL/v1/bolna/inbound` | script |
| Auth token | The raw `BOLNA_TOOL_TOKEN` (no `Bearer ` prefix). Bolna adds the prefix. | script |
| Allow calls only from the database | Off. A new patient must still get through. The lookup creates a row for every Indian mobile. | dashboard, confirm it stayed off |
| Maximum calls per number | `-1` for the demo | script (`inbound_limit`) |
| Ambient noise | `office-ambience` | script. Vobiz supports it. Plivo and SIP do too. |
| Noise cancellation | On, about 85%, if the Calling tab shows it | dashboard |
| India server routing | On, if Organisation settings shows data residency or Indian servers | dashboard. It is an enterprise control and the API does not expose it on every account. |

Bolna calls the lookup with `contact_number`, `agent_id`, and `execution_id` before the welcome message. The route inserts the `calls` row and returns `call_id`, `clinic_name`, `patient_count`, `channel=phone`, and `contact_number`. It does not return a name. A second lookup with the same `execution_id` returns the same call.

Web calls do not use this route. The mock phone still mints a session with `channel=web`.

Outbound stays a single manual call to a teammate (`POST /call` or the dashboard). No batch and no workflow. Reminder campaigns wait until the number series and the robo-call notice are done.

## 2. Agent tab

| Setting | Value | Who |
|---|---|---|
| Welcome message | `agent/welcome-message.txt` | script |
| Prompt | `agent/system-prompt.txt` | script |
| Webhook URL | `$PUBLIC_BASE_URL/v1/bolna/webhook` | script |
| Webhook header | `Authorization: Bearer $BOLNA_WEBHOOK_TOKEN` | dashboard. Open Extractions, turn on Add headers, and send a test. The script sets the header only if the agent already has a header field. |
| Call summary | On | script |

Variables the prompt already uses: `{clinic_name}`, `{call_id}`, `{patient_count}`, `{channel}`. Do not add fees, hours, or doctor names to the prompt. `agent/check_agent.py` fails the build if you do.

## 3. Languages tab

| | English | Hindi |
|---|---|---|
| Speech to text | Deepgram `nova-3` | Sarvam `saaras:v4` |
| Voice | Kalpa `kalpa-tts-1`, voice **Kiara** (female; the catalog pick that matches the feminine Hindi) | Same Kalpa voice. One model speaks English, Hindi, and Hinglish. |
| Welcome | `agent/welcome-message.txt` | `agent/welcome-message-hi.txt` |
| Switch | `requested_or_auto_detected` | same |
| Hand-in line | "Yes, go ahead." | "जी, बताइए।" |

The script keeps the full system prompt on both languages. A short Hindi prompt would drop the safety rules.

If a test call sounds flat, switch English to Cartesia Sonic 3.6 and Hindi to Sarvam Bulbul (a female `voice_id` such as the one the dashboard shows), and leave the transcribers as they are. Stay on models inside Bolna's flat per-minute rate.

## 4. Tools tab

Paste is handled by the script from `agent/functions.json`. It writes the live tunnel and `Bearer $BOLNA_TOOL_TOKEN` into the agent only. The file in git keeps `PUBLIC_BASE` and `TOKEN`.

21 custom functions, all `key: custom_task`, all POST `/v1/tools/<name>`. Each one sends `from_number` as `{from_number}` so a phone call can still find its row if the model omits `call_id`. The model is not asked for the number.

`request_human` keeps its pre-call webhook to `$PUBLIC_BASE_URL/v1/bolna/pre-handoff`. That is the web-demo desk join. Leave it.

**Transfer call** (native Bolna tool, not one of the 21):

| Field | Value |
|---|---|
| When | Only if `{channel}` is `phone`, and the caller asks for a person or the emergency steps say to reach a person |
| Destination | `TRANSFER_TO_NUMBER` in `.env`, an Indian mobile that a teammate will answer. Not the Vobiz number. |
| Pre-tool message | "Let me get someone from the desk." |
| Hindi pre-tool, if the editor shows a language tab | "मैं आपको डेस्क से जोड़ रही हूँ। एक क्षण रुकिए।" |

The live agent does not have Transfer call yet, because `TRANSFER_TO_NUMBER` is empty. Put a teammate's Indian mobile in `.env` and re-run `python3 agent/configure_bolna.py`. Do not use the Vobiz number. Until then, a phone caller who asks for a person has no tool to dial.

Leave these tools off: Cal.com availability, Cal.com book appointment, web search, knowledge base. Patient data and fees are live reads. Bolna's knowledge base still answers when retrieval fails.

## 5. Extractions tab

Category **Clinic call**, model `gpt-4.1-mini`. The script creates it and these objective fields: Intent, Language, Verified, Booking made, Emergency.

Call summary is the platform toggle, not a sixth field. `set_disposition` remains the console's source of truth.

## 6. What we use, and what we leave

Use, because a judge can see or hear it:

- Custom functions against our API, with pre-call lines
- Inbound caller lookup and `{from_number}`
- Multilingual English and Hindi, sponsor models (Deepgram, Sarvam, Kalpa)
- Vobiz inbound number
- Native transfer to a person
- Execution webhook into the desk
- Call summary and extractions on Bolna's own execution page
- Office ambient noise
- Web Call SDK for the mock phone, key kept on the server

Leave, on purpose:

- Knowledge base and web search
- Cal.com
- IVR (Vobiz does not run it)
- Speech-to-speech models
- Batch campaigns and workflows
- 140-series numbers
- A graph agent. Static nodes for the 112 and 14416 lines are the pilot, not this submit.

## 7. What to submit

Form: [bolna.ai/symphony/buildathon](https://www.bolna.ai/symphony/buildathon). The form needs your own name, WhatsApp, and city. This repo cannot send it.

Paste this for the idea:

> Deskie is a phone help desk for a small clinic. Bolna runs the voice: English, Hindi, and Hinglish, on a Vobiz number and in the browser. Our API is the clinic. Twenty-one tools book arrival windows, check identity, and refuse anything unsafe, including another patient's report. The desk console joins the web call; a phone call transfers to a person. We sell it as overflow answering for a 2 to 5 doctor clinic, at about ₹5.52 a minute of Bolna list price.

Record two minutes, in this order: hours with no verification, book a visit and hear the fee from the tool, switch to Hindi, family phone refuses the other person's report, emergency line says 112 and 108, then transfer or desk join. Dial the Vobiz number if the tunnel is up. Otherwise record the mock phone and say the number is live for the interview.

Before the 5–7 Nov interview, call the Vobiz number yourself once and place one outbound call to a teammate with `POST https://api.bolna.ai/call`.
