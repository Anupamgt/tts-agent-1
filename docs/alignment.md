# Alignment checklist

Purpose: make sure everyone means the same thing before building. Each row points to the exact place in the flows where the decision lives, so you can read the diagram, say "yes" or "change it", and move on. Node IDs (like `B10`) are the box names inside the Mermaid diagrams.

## How to review in about 30 minutes

1. Read `flows/README.md` (decisions, settings table and tool list): 5 min.
2. Read `00-call-router` main diagram, then the interrupt diagram: 5 min.
3. Walk the three flows that carry the most risk: `01 A` (emergency), `03` (booking and part P), `09` (day of operations): 15 min.
4. Skim `06` (handoff) and `07` (outbound): 5 min.
5. Go through section A below and mark each open row Agree / Change / Defer.

## A. Decisions

Status: **Decided** (you confirmed it), **Proposed** (my default, not yet confirmed), **Open** (needs an input).

| # | Decision | Status | What it says now | Look here | Still to answer |
|---|---|---|---|---|---|
| 1 | Arrival windows and doctor choice | **Decided** | Named-doctor or specialist bookings stay with that doctor; if the doctor runs late, patients wait. General check-ups and "any doctor" follow-ups roll over to another pool doctor (A1 to A2) | `03` B2, NM, AD, FU, B21; `09` D6, D7, X3, X4 | 1a. Roll over only when the doctor is **absent**, or also when **running late**? (flows assume both). 1b. Two doctors of the same specialty: pool them? |
| 2 | Unsold priority places released to regular booking | Proposed | 2 hours before the session | `03` part P rules; settings table | Agree? |
| 3 | What "urgent" means | **Decided** | A paid priority visit: extra fee, seen before regular patients. Emergencies are separate and never booked | `01` term table and part B; `03` part P (P4, P5, P10); `09` A3b, D8p | 3a. Fee per doctor (amounts). 3b. Pay at the desk (demo) or UPI link? 3c. Refund rule when the doctor is absent or very late. 3d. Agree that the agent mentions priority only when asked, or when regular places are full? |
| 4 | Emergency script wording and numbers | Open | 112 and 108, plus a mental-health helpline | `01` A (E1, SH) | Clinic sign-off on the script and numbers |
| 5 | Medical advice boundary | Proposed | Always declined; offer visit or callback | `01` C (M1-M4) | Agree? |
| 6 | Verification | **Decided** | Name + patient ID from the card; name + date of birth if the ID is not known. IDs are digits with a check digit | `02` V1-V7c | 6a. Does the partner clinic already print patient IDs? What format? |
| 7 | Relatives calling for a patient | **Decided** | Limited mode: book, change, cancel, leave a message | `02` V13, V14 | None |
| 8 | Staff-on-desk switch and transfer | Proposed | Console switch decides transfer vs callback | `06` H2 | Agree? |
| 9 | Callback priorities and targets | Proposed | P1 15 min (emergency, self-harm); P2 2 h or before the session ends (same-day requests); P3 next session | `06` table | Agree? |
| 10 | Refill requests | Proposed | Logged only; doctor decides; "visit required" list | `05` M3-M6 | Agree? |
| 11 | Reports and lab results | Proposed | Never read aloud; point to the clinic's own channel | `05` P0-P7 | Agree? |
| 12 | Delay messages | **Decided** | At most 2 SMS. After that the visit moves to the doctor's next available slot and the patient is told once (SMS, plus a call if it moves to another day). Arrived patients are never moved; priority visits are never moved to another day without staff | `09` D8-D11; `04` T4-T8 | 12a. My reading of "next available": later **today** if the shifted session still fits them, otherwise the **next session**. Right? |
| 13 | "Next patient" signal | **Decided** | Hybrid: planned schedule by default; the doctor (phone or tablet in the cabin) or an assistant outside the cabin taps "Call next" to correct it | `09` N1-N7 | 13a. What did "a 30 minute window for each patient" mean? (see note below) |
| 14 | Walk-ins | Proposed | Added in console, counted against the current window; staff may sell a priority place | `09` A5-A11 | Agree? |
| 15 | Doctor absent / session cancelled | Proposed | Any-doctor: moved to another pool doctor. Named: moved to the same doctor's next slot with SMS and a call. Priority: staff decide | `09` X0-X8; `07` | Agree? |
| 16 | New patient data collected | Proposed | Name, age or date of birth, confirmed phone; patient ID created and sent by SMS | `03` B15; `02` rules | Agree? |
| 17 | Reminder policy | Proposed | Evening before, inside 9 am to 9 pm; consent at booking; 2 retries | `07` O1, O2, RT | Agree? |
| 18 | Backend or calendar failure | Proposed | Never retry a write blindly; check first; fall back to callback | `08` F6-F11 | Agree? |
| 19 | Languages | **Decided** | English, Hindi, Hinglish; others get a callback offer | `00` rules; `08` edge cases | None |
| 20 | Call recording and AI disclosure | Proposed | Disclosed at the start of every call | `00` G | Agree? |

**Note on 13a.** "Set a 30 minute window for each patient" can mean two different things, and they change the build:

- **Reading 1 (what the flows assume):** the 30-minute window stays a shared arrival window of 4 patients. The schedule fallback assumes each patient takes the planned consult time (30 / 4 = 7.5 min), and taps correct it.
- **Reading 2:** each patient gets their own 30-minute slot, so capacity becomes 1 per window. That suits long consultations (specialists), but a general OPD would see only 6 patients in a 3-hour session.

Capacity and consult time are per-doctor settings, so both readings work in the schema. The question is which one the demo clinic uses.

## B. Caveats you should hold in mind

### Platform (Bolna): from its documentation, not yet tested
- No Google Calendar integration (only Cal.com). Booking is custom function calls to our backend.
- The backend must be reachable from the internet; Bolna calls it from three fixed IP addresses. A sleeping laptop means no bookings.
- Behaviour when a transferred call is not answered is not documented. Test it.
- Webhook retry behaviour and tool-call time limits are not documented. Design for duplicates (the schema stores Bolna's execution ID as a unique key) and for slow responses (filler line while waiting).
- Emergency detection happens in the prompt and the model, not through a built-in keyword interrupt. Treat it as a tested feature, not a given.
- Indian phone numbers need compliance approval before they work; lead time is not stated. Apply early.
- Language switching is automatic, but each language needs its own voice and transcriber, and system messages need translating or callers hear English mid-call.

### From the latest decisions
- **Priority visits:**
  - Selling a fee on a call to someone who may be unwell can look like upselling. The flows mention priority only when asked or when regular places are full, never in reply to symptoms. Keep that rule.
  - With payment at the desk, a priority booker who does not turn up blocks a priority place for free. A UPI link fixes that but adds a payment provider. If links go in SMS, the link domain must be registered with the DLT template.
  - Refunds need a rule before launch (doctor absent, or so late the patient leaves).
- **Rollover (any-doctor):** patients may be surprised to see a different doctor. They are told by SMS each time; a message that arrives late is the main risk.
- **Moving visits after 2 delay messages:** someone who misses the SMS may still turn up. That is why moves to another day also get a call, and why arrived patients are never moved.
- **Schedule-only estimates cannot see delays.** Without taps, the system assumes the doctor is on time. It sends no automatic delay SMS and the agent says it has no live update, but the feature only works if someone taps. The best fix is making "Call next" replace something the doctor already does, such as a bell or calling names.
- **Patient IDs over the phone:** digits only and a check digit make them speakable, but elderly callers may not have the card. The date-of-birth fallback will be used often.

### Product and operations
- Arrival windows are new to patients. The agent needs one plain sentence explaining them every time, and the clinic must stick to arrival order (priority first).
- Walk-ins are normal at Indian clinics. They compete with booked patients for the same time, and the flows only handle them if staff enter them.
- Elderly and low-literacy callers: slow speech, name spelling, IDs, dates of birth and mixed languages are where speech recognition fails first. Plan real-voice testing, not just team members.
- Shared phone numbers are normal. The schema supports several patients per number; the flows never list names.
- Doctors editing their personal calendars is allowed (read as busy time), but edits to the clinic bookings calendar are not synced back in v1.

### Safety and legal (not legal advice; the clinic should have a lawyer review)
- No agent catches every emergency. The 112/108 line, the over-triggering design, and a large test set reduce the risk; they do not remove it. The clinic must sign off on the script.
- Patient data is personal data under India's DPDP Act (consent, purpose limits, retention, breach reporting within 72 hours under the 2025 rules; most obligations phase in over 18 months). A retention period for recordings and transcripts must be set.
- Outbound calls and SMS: service messages still need DLT registration and consent. Production reminders likely need a 160-series number. The demo avoids this by calling only team numbers.
- Recording: disclose it on every call and decide how long recordings are kept.
- Medical-device or telemedicine rules are not triggered by this scope because the agent gives no clinical advice. That stops being true if scope drifts toward symptom triage. Dropping the doctor's "urgent criteria" list in favour of paid priority moves the design further from triage.

### Technical honesty
- Everything in `docs/flows` is a design, not tested behaviour. No part has run against a real clinic or real callers.
- The delay formula and all default numbers are guesses to be tuned with real data.
- The schema's rules are tested (`db/tests/schema.test.mjs`, 54 checks on an in-process Postgres). The backend jobs that use them (delay check, rollover, auto-move) are not written yet.
- Correction from earlier planning: a time-range exclusion constraint only stops double booking for one-patient slots. With multi-patient windows the schema uses a capacity trigger with a row lock.

## C. Inputs needed from the partner clinic

| Input | Used in |
|---|---|
| Doctors, specialties, weekly session times | schedule templates, `03` B2 |
| Which doctors can stand in for each other (pools) | `03` AD; `09` D7, X4 |
| Average consultation length per doctor, and patients per session | window size, capacity, schedule fallback (`09` N3) |
| Priority fee per doctor, payment method, refund rule | `03` part P; `09` D8q, X6 |
| Do patient cards with IDs exist? ID format | `02` V1-V5 |
| Share of walk-ins vs phone bookings | capacity, priority places |
| How bookings are taken today (register, app, none) | migration, `03` |
| Fee list, address, parking, holidays, services | info flow (`05`) |
| "Visit required" medicine list | `05` M5 |
| Staff phone number(s), desk hours, who answers the console | `06` H2; settings |
| Who taps "Call next": doctor, cabin assistant, or receptionist; is there a bell or display today? | `09` N1 |
| Current call volume, peak hours, estimated missed calls | success metrics, cost |
| How reports are shared (portal, WhatsApp, pickup) | `05` P2 |
| Sender name for SMS; company documents if DLT registration is for production | SMS |
| Consent wording and recording policy | `00` G, `07` |
| Name of the person who reviews emergency alerts | `01` A |

## D. Inputs needed from you

| Input | Why |
|---|---|
| Hackathon: submission deadline, team size and roles, what judges score | decides what is real and what is mocked |
| Whether a real clinic is available for the demo, and whether calls can be recorded | demo plan |
| Bolna account, credits, and a phone number (apply for compliance approval now) | blocks all call testing |
| Google Workspace account and Calendar API credentials | calendar mirror |
| SMS provider choice for the demo (or a mock outbox) | `send_sms` |
| Where the backend runs during the demo (tunnel vs deployed copy) | reliability |
| The sub-questions in section A: 1a, 1b, 3a-3d, 6a, 12a, 13a | flows and backend jobs depend on them |
| Edge cases you want covered ("we'll define later") | `08` table is a starter list |
| GTM direction: cloud vs hosted DB, pricing model | later; does not block the build |

## E. Decisions I made for you (change any of these)

- Greeting never uses the patient's name.
- The agent never says "urgent" to callers; it says "priority visit".
- A priority visit is mentioned only when the caller asks to be seen first, or when regular places are full, and never in reply to symptoms.
- Priority bookings need a clear "yes" to the fee on the call; the time of that "yes" is stored.
- Priority visits are never moved to another day by the system; staff decide.
- Patients who have arrived are never moved.
- Follow-ups: the agent asks "same doctor as last time, or any doctor?"
- A patient ID is never read aloud after date-of-birth verification; it is sent by SMS to the registered number.
- Pharmacy field dropped from refills.
- Same-day routine bookings stop 30 minutes before the window.
- Expired holds are released automatically after 90 seconds.
- Hindi SMS templates are separate Unicode templates.
- Outbound calls in the demo go only to team phones.
