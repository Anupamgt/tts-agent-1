# Alignment checklist

Purpose: make sure everyone means the same thing before building. Each row points to the exact place in the flows where the decision lives, so you can read the diagram, say "yes" or "change it", and move on. Node IDs (like `B10`) are the box names inside the Mermaid diagrams.

## How to review in about 30 minutes

1. Read `flows/README.md` (the settings table and the tool list): 5 min.
2. Read `00-call-router` main diagram, then the interrupt diagram: 5 min.
3. Walk the three flows that carry the most risk: `01 A` (emergency), `03` (booking), `09` (day of operations): 15 min.
4. Skim `06` (handoff) and `07` (outbound): 5 min.
5. Go through section A below and mark each row Agree / Change / Defer.

## A. Decisions to confirm

| # | Decision | Proposed default | Look here | If this is wrong |
|---|---|---|---|---|
| 1 | Arrival windows instead of fixed times or tokens | 30 min windows, 4 patients, 1 urgent place | `03` B10, B16; `09` D4 | Patients and clinic misunderstand what was promised |
| 2 | Urgent places released to routine booking | 2 hours before the session | `01` B (U5-U8); settings table | Empty urgent places on quiet days, or no urgent place for a late caller |
| 3 | Who defines "urgent" | Doctor-edited list; agent only matches the caller's words, unclear goes to a human | `01` B (U3, U4) | Agent seen as triaging; liability |
| 4 | Emergency script wording and numbers | 112 and 108, plus a mental-health helpline | `01` A (E1, SH) | Wrong number read to someone in danger |
| 5 | Medical advice boundary | Always declined; offer visit or callback | `01` C (M1-M4) | Agent drifts into advice |
| 6 | Identifiers for verification | Full name plus date of birth; mobile last 4 as second check | `02` V1, V7 | Many callers (especially elderly) do not give a date of birth reliably |
| 7 | Relatives calling for a patient | Limited mode: book, change, cancel, leave a message | `02` V13, V14 | Privacy complaints, or the agent is useless for family callers |
| 8 | Staff-on-desk switch and transfer | Console switch decides transfer vs callback | `06` H2 | Callers wait on a ringing phone nobody answers |
| 9 | Callback priorities and targets | P1 15 min, P2 2 h, P3 next session | `06` table | Staff overload or missed urgent callbacks |
| 10 | Refill requests | Logged only; doctor decides; "visit required" list | `05` M3-M6 | Unsafe refills, or clinic distrust |
| 11 | Reports and lab results | Never read aloud; point to the clinic's own channel | `05` P0-P7 | Wrong disclosures |
| 12 | Delay updates | Threshold 20 min, max 2 SMS per patient | `09` D4-D9; `04` T4-T8 | SMS spam, or silent lateness |
| 13 | Who taps "next patient" | Receptionist (not yet confirmed) | `09` D2, W1 | The whole delay feature quietly stops working |
| 14 | Walk-ins | Added in console, counted against the current window | `09` A5-A11 | Windows overbook; delay estimates drift |
| 15 | Doctor absent / session cancelled | Staff action, bulk reschedule offers by outbound call, SMS fallback | `09` X0-X5; `07` | Patients turn up for a cancelled session |
| 16 | New patient data collected | Name, age or DOB, confirmed phone, nothing medical | `03` B15 | Too much data (privacy) or too little (cannot find the file) |
| 17 | Reminder policy | Evening before, inside 9 am to 9 pm; consent at booking; 2 retries | `07` O1, O2, RT | Calls outside hours or without consent |
| 18 | What the agent does when the backend or calendar fails | Never retry a write blindly; check first; fall back to callback | `08` F6-F11 | Double bookings or lost bookings |
| 19 | Languages | English, Hindi, Hinglish; others get a callback offer | `00` rules; `08` edge cases | Callers in other languages hit a dead end |
| 20 | Call recording and AI disclosure | Disclosed at the start of every call | `00` G | Compliance and trust |

## B. Caveats you should hold in mind

### Platform (Bolna) - from its documentation, not yet tested
- No Google Calendar integration (only Cal.com). Booking is custom function calls to our backend.
- The backend must be reachable from the internet; Bolna calls it from three fixed IP addresses. A sleeping laptop means no bookings.
- Behaviour when a transferred call is not answered is not documented. Test it.
- Webhook retry behaviour and tool-call time limits are not documented. Design for duplicates (the schema stores Bolna's execution ID as a unique key) and for slow responses (filler line while waiting).
- Emergency detection happens in the prompt and the model, not through a built-in keyword interrupt. Treat it as a tested feature, not a given.
- Indian phone numbers need compliance approval before they work; lead time is not stated. Apply early.
- Language switching works automatically for 11 Indian languages, but each language needs its own voice and transcriber configured, and system messages (hang-up, tool-call fillers) need translating or callers hear English mid-call.

### Product and operations
- The delay feature depends on a person tapping "next patient". If nobody does, estimates go stale. The console warns after 30 minutes, but a human habit is the real dependency.
- Arrival windows are new to patients. The agent needs one plain sentence explaining them every time, and the clinic must stick to arrival order.
- Walk-ins are normal at Indian clinics. They compete with booked patients for the same time, and the flows only handle them if staff enter them.
- Elderly and low-literacy callers: slow speech, name spelling, dates of birth and mixed languages are where speech recognition fails first. Plan real-voice testing, not just team members.
- Shared phone numbers are normal. The schema supports several patients per number; the flows never list names.
- Doctors editing their personal calendars is allowed (read as busy time), but edits to the clinic bookings calendar are not synced back in v1.

### Safety and legal (not legal advice; the clinic should have a lawyer review)
- No agent catches every emergency. The 112/108 line, the over-triggering design, and a large test set reduce the risk; they do not remove it. The clinic must sign off on the script.
- Patient data is personal data under India's DPDP Act (consent, purpose limits, retention, breach reporting within 72 hours under the 2025 rules; most obligations phase in over 18 months). A retention period for recordings and transcripts must be set.
- Outbound calls and SMS: service messages still need DLT registration and consent. Production reminders likely need a 160-series number. The demo avoids this by calling only team numbers.
- Recording: disclose it on every call and decide how long recordings are kept.
- Medical-device or telemedicine rules are not triggered by this scope because the agent gives no clinical advice. That stops being true if scope drifts toward symptom triage.

### Technical honesty
- Everything in `docs/flows` is a design, not tested behaviour. No part has run against a real clinic or real callers.
- The delay formula and all the default numbers are guesses to be tuned with real data.
- Earlier in planning I said a time-range exclusion constraint could stop double booking. That is only true for one-patient slots. With multi-patient windows the schema uses a capacity trigger with a row lock instead (`db/schema.sql`, tested).

## C. Inputs needed from the partner clinic

| Input | Used in |
|---|---|
| Doctors, specialties, weekly session times | schedule templates, `03` B2 |
| Average consultation length and patients per session | window size, capacity, delay formula (`09` D4) |
| Share of walk-ins vs phone bookings | urgent places, capacity |
| How bookings are taken today (register, app, none) | migration, `03` |
| Fee list, address, parking, holidays, services | info flow (`05`) |
| Urgent criteria list (from the doctor) | `01` B |
| "Visit required" medicine list | `05` M5 |
| Staff phone number(s), desk hours, who answers the console | `06` H2; settings |
| Who taps "next patient" | `09` |
| Current call volume, peak hours, estimated missed calls | success metrics, cost |
| How reports are shared (portal, WhatsApp, pickup) | `05` P2 |
| Languages callers actually use | `00`, voice setup |
| Sender name for SMS; company documents if DLT registration is for production | SMS |
| Consent wording and recording policy | `00` G, `07` |
| Name of the person who reviews emergency alerts | `01` A |

## D. Inputs needed from you

| Input | Why |
|---|---|
| Hackathon: submission deadline, team size and roles, what judges score | decides what is real and what is mocked |
| Whether a real clinic is available for the demo, and whether calls can be recorded for the demo | demo plan |
| Bolna account, credits, and a phone number (apply for compliance approval now) | blocks all call testing |
| Google Workspace account and Calendar API credentials | calendar mirror |
| SMS provider choice for the demo (or a mock outbox) | `send_sms` |
| Where the backend runs during the demo (tunnel vs deployed copy) | reliability |
| Answers to section A, especially rows 1, 3, 6, 7, 12, 13 | the schema and API depend on them |
| Edge cases you want covered ("we'll define later") | `08` table is a starter list |
| GTM direction: cloud vs hosted DB, pricing model | later; does not block the build |

## E. Decisions I made for you (change any of these)

- Greeting never uses the patient's name.
- Relative callers get limited mode.
- Pharmacy field dropped from refills.
- Same-day routine bookings stop 30 minutes before the window.
- Expired holds are released automatically after 90 seconds.
- Hindi SMS templates are separate Unicode templates.
- Outbound calls in the demo go only to team phones.
