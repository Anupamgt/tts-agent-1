# Alignment checklist

Purpose: make sure everyone means the same thing before building. A single sign-off table of every open proposal (37 rows, with an Agree / Change / Defer pick per row) is in the review doc "Bolnai: audit fixes, sign-offs and GTM readiness" (https://claude.ai/artifact/CSNg5JdQzoGJrws7Kru3i6, 22 Oct 2026); this file stays the source the flows point to.

**29 Oct 2026:** every Open and Proposed row below was decided on your instruction ("complete the scope with respect to the compliance of Indian regulators and what makes the most sense according to the build"). The reasons, the rules behind them and the sign-offs still needed are in `docs/decision-log.md` (D-01 to D-36) and the doc "Bolnai scope decisions and audit trail" (https://claude.ai/artifact/QuWJEoAzZ5Xv3dvh1NiQAM). Each row points to the exact place in the flows where the decision lives, so you can read the diagram, say "yes" or "change it", and move on. Node IDs (like `B10`) are the box names inside the Mermaid diagrams.

## How to review in about 30 minutes

1. Read `flows/README.md` (decisions, settings table and tool list): 5 min.
2. Read `00-call-router` main diagram, then the interrupt diagram: 5 min.
3. Walk the flows that carry the most risk: `01 A` (emergency), `03` (booking and part P), `09` (day of operations), `10` (payments and refunds), `11` (prescription refills): 25 min.
4. Skim `06` (handoff) and `07` (outbound): 5 min.
5. Go through section A below and mark each open row Agree / Change / Defer.

## A. Decisions

Status: **Decided** (you confirmed it), **Decided (D-xx)** (decided on 29 Oct 2026 on your instruction; see the decision log), **needs sign-off** (the build follows it, and a named person confirms it before any real patient call).

| # | Decision | Status | What it says now | Look here | Still to answer |
|---|---|---|---|---|---|
| 1 | Arrival windows and doctor choice | **Decided** | Named-doctor or specialist bookings stay with that doctor; if the doctor runs late, patients wait. General check-ups and "any doctor" follow-ups roll over to another pool doctor (A1 to A2), both when the doctor is absent and when running late (1a, decided) | `03` B2, NM, AD, FU, B21; `09` D6, D7, X3, X4 | 1b decided: pool when the caller names no doctor (D-24) |
| 2 | Unsold priority places released to regular booking | **Decided (D-22)** | 2 hours before the session | `03` part P rules; settings table | None |
| 3 | What "urgent" means | **Decided** | A paid priority visit: extra fee, seen before regular patients, offered only by specialists and super-specialists. Emergencies are separate and never booked | `01` term table and part B; `03` part P; `09` A3b | 3d decided: only when asked or when regular places are full, never in reply to symptoms (D-22) |
| 3+ | Fees, payment and refunds | **Decided** (structure) | Clinic can set an appointment fee per doctor. Fees are agreed on the call and paid by a UPI link sent as a WhatsApp follow-up, or cash at the desk. If the doctor is not available: offer rescheduling first; if the patient persists, partial or full refund | `10` parts A, B, C (doctor not available), D (patient cancels); `03` B17f; `09` X5-X12, D14 | 3e to 3g decided: refund shares (D-18), admin approval never by the requester (D-19), unpaid link switches to desk payment (D-20) |
| 4 | Emergency script wording and numbers | **Decided (D-01), needs sign-off** | Call 112 now, or 108 for an ambulance; self-harm or distress: Tele-MANAS 14416. Never a transfer to 112 | `01` A (E1, SH) | Clinic signs off the exact wording |
| 5 | Medical advice boundary | **Decided (D-02)** | Always declined; offer visit or callback | `01` C (M1-M4) | None |
| 6 | Verification | **Decided** | Name + patient ID from the card; name + date of birth if the ID is not known. New IDs are digits with a check digit; existing IDs are kept and matched without punctuation; institution clinics can also match on the card holder's institute ID + relation | `02` V1-V7c and rules | 6a: not needed for the demo (fictional cards); collect a clear copy at partner onboarding |
| 7 | Relatives calling for a patient | **Decided** | Limited mode: book, change, cancel, leave a message | `02` V13, V14 | None |
| 8 | Staff-on-desk switch and transfer | **Decided (D-26)** | Console switch decides transfer vs callback | `06` H2 | None |
| 9 | Callback priorities and targets | **Decided (D-26)** | P1 15 min (emergency, self-harm); P2 2 h or before the session ends (same-day requests); P3 next session | `06` table | None |
| 10 | Prescription refills | **Decided** (doctor only; Oct 2026) | The agent only takes the request (medicine as read from the strip, doctor, days left) and asks nothing clinical. Only the patient's own doctor decides, after an in-person visit with them in the last 6 months, never for Schedule X / NDPS drugs. The doctor issues the prescription; Bolnai only sends "the doctor has responded" to the registered number. Enforced in the schema | `11` parts A and B; `security/threat-model.md` S-20 | 10a decided (D-04); records kept 3 years (D-05). 10b: doctors at the partner clinic sign off on the flow |
| 11 | Reports and lab results | **Decided (D-03)** | Status only after full verification; values never read aloud; never to a relative | `05` P0-P7 | None |
| 12 | Delay messages | **Decided** | At most 2 SMS. After that the agent calls and asks what the patient wants: keep the place, move to the next free slot (later today or next session), or cancel with a refund if they paid. Arrived patients are never moved | `09` D8-D17; `04` T4-T8 | Fallback decided (D-27). In the pilot, staff place the "ask" call (D-15) |
| 13 | "Next patient" signal | **Decided** | Hybrid: planned schedule by default; the doctor (phone or tablet in the cabin) or an assistant outside the cabin taps "Call next" to correct it | `09` N1-N7 | 13a decided: shared windows of 4; a specialist can be set to 1 per window (D-23) |
| 14 | Walk-ins | **Decided (D-25)** | Added in console, counted against the current window; staff may sell a priority place | `09` A5-A11 | None |
| 15 | Doctor absent / session cancelled | **Decided** (with 3+) | Any-doctor: moved to another pool doctor. Named and priority: call offering the doctor's next slots; if the patient wants the money back, refund (10 part C) | `09` X0-X12; `07`; `10` C | None |
| 16 | New patient data collected | **Decided (D-11)** | Name, age or date of birth, confirmed phone; patient ID created and sent by SMS. Never Aadhaar, ABHA, address or a detailed reason | `03` B15; `02` rules | None |
| 17 | Reminder policy | **Decided (D-15)** | Pilot: SMS the evening before, inside 9 am to 9 pm, consent at booking. No automated outbound calls until the calling number is registered under TRAI's rules; the call tree applies after that | `07` intro, O1, O2, RT | Telephony provider confirms the number series |
| 18 | Backend or calendar failure | **Decided (D-28)** | Never retry a write blindly; check first; fall back to callback | `08` F6-F11 | None |
| 19 | Languages | **Decided** | English, Hindi, Hinglish; others get a callback offer | `00` rules; `08` edge cases | None |
| 20 | Call recording and AI disclosure | **Decided (D-07)** | First sentence of every call; a caller who objects gets a desk callback. Wording in `docs/privacy-notice.md` | `00` G | None |
| 21 | Security and abuse controls | **Decided (D-29, D-20, D-09, D-08)** | Full list in `docs/security/threat-model.md`. Already enforced in the database: random patient IDs, one hold per call, 3 upcoming visits per patient, 4 agent bookings per number per day, Indian numbers only for outbound contact, admin approval for refunds (not by the requester), named waivers, append-only audit log. Design rules: per-call verified session on the server, authenticated agent API, lockout after 5 failed checks, change SMS to the registered number, no payment details on calls | `security/threat-model.md`; `02` rules; `06` rules; `07` O5; `10` rules | 21a limits kept (D-29); 21b admin only with a reason (D-20); 21c audio 30 d, transcripts 180 d, access logs 1 y, refill records 3 y (D-09); 21d notice drafted in `docs/privacy-notice.md`, clinic and lawyer review |
| 22 | Agent architecture and hallucination controls | **Decided (D-34 to D-36, 29 Oct)** | Buildathon: one Bolna conversation agent calling the backend's tools; no RAG for clinic facts or patient data; the prompt allows facts only from tool results, success only on `ok: true`, and fixed safety lines word for word; the AI and recording disclosure is Bolna's fixed welcome message. Pilot: a Bolna graph agent with pre-recorded (static) stages for the emergency, self-harm, medical-decline, disclosure and refill-received lines; a backend safety monitor that can force the emergency stage and flags agent sentences with numbers, medicines or diagnosis words that no tool returned; tools limited per stage. Evidence bar: every blocker case passes across at least 300 runs before the pilot | `agent/`; `docs/decision-log.md`; `docs/metrics.md` safety limits; `docs/evals/` | Clinic signs off the recorded lines with the emergency script (D-01) |

**Note on 13a.** "Set a 30 minute window for each patient" can mean two different things, and they change the build:

- **Reading 1 (what the flows assume):** the 30-minute window stays a shared arrival window of 4 patients. The schedule fallback assumes each patient takes the planned consult time (30 / 4 = 7.5 min), and taps correct it.
- **Reading 2:** each patient gets their own 30-minute slot, so capacity becomes 1 per window. That suits long consultations (specialists), but a general OPD would see only 6 patients in a 3-hour session.

Capacity and consult time are per-doctor settings, so both readings work in the schema. The question is which one the demo clinic uses.

**Note on 1b.** Say the clinic has two child specialists, Dr Kaur and Dr Gill, and a caller asks for "a child specialist" without naming either. The agent books the one with the earliest window, Dr Kaur. Then Dr Kaur is held up:

- **Not pooled (current rule):** the booking is pinned to Dr Kaur, so the patient waits for her, even if Dr Gill is free in the next room.
- **Pooled:** "a child specialist" is treated like "any doctor" within paediatrics, so the patient moves to Dr Gill and gets an SMS.

Either way, a caller who names Dr Kaur always stays with Dr Kaur, and a follow-up still asks "same doctor as last time?". Recommendation: pool when the caller did not name a doctor. They asked for a skill, not a person, and the clinic gets fewer idle specialists. It only matters if the clinic has two doctors of the same specialty.

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
  - With cash at the desk, a priority booker who does not turn up blocks a priority place for free. UPI links reduce that; the "payment needed to keep the booking" setting closes it, at the cost of losing callers who would have paid in cash.
- **Payments add three outside dependencies:**
  - A **WhatsApp Business account** (through Meta or a provider) with approved utility templates for the payment link, reminder, receipt and refund update, plus the patient's agreement to receive WhatsApp messages. Template approval takes time; apply early.
  - A **payment gateway** that issues UPI payment links and refunds, with its own business KYC. For the demo, use its test mode so no real money moves.
  - If a link goes by **SMS** instead, the link's domain must be registered with the DLT template.
- **Refunds move money, so a person approves them by default.** The agent only raises the request with the amount the clinic's policy gives. The database refuses refunds that would add up to more than was paid.
- **Asking the patient after 2 delay messages** costs an outbound call per affected patient, and unreachable patients still need a default. The fallback keeps their place if it still fits today, and otherwise holds the next free slot.
- **Rollover (any-doctor):** patients may be surprised to see a different doctor. They are told by SMS each time; a message that arrives late is the main risk.
- **The sample patient slip** looks like a campus health centre's OPD slip (institute ID, relation such as "self", doctor, booking date and time). It was not committed to the repo because it holds personal details. If the partner is an institution health centre, check whether fees and priority visits apply there at all.
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
- Patient data is personal data under India's DPDP Act (notice, purpose limits, security, breach reporting to the Board within 72 hours; most duties from 13 May 2027). Until then the SPDI Rules treat health information as sensitive. Retention periods are now set (D-09), the clinic is the data fiduciary and Bolnai its processor (D-06), and CERT-In's 6-hour incident reporting applies to Bolnai today (D-13).
- Outbound calls and SMS: under TRAI's 2025 amendment, service calls and messages are commercial communication on registered headers and number series, and robo calls need advance notice to the operator. The pilot therefore sends reminders by SMS and makes no automated outbound calls until the number is registered (D-15). The demo calls only team numbers.
- Recording: disclose it on every call and decide how long recordings are kept.
- Medical-device rules are not triggered because the agent gives no clinical advice. That stops being true if scope drifts toward symptom triage. Dropping the doctor's "urgent criteria" list in favour of paid priority moves the design further from triage.
- **Telemedicine rules do apply to refills.** A refill decided without a visit is the doctor's follow-up teleconsultation under the Telemedicine Practice Guidelines 2020: same doctor, in-person visit within 6 months, same condition, never Schedule X / NDPS drugs, a signed prescription with the registration number, and AI may not counsel or prescribe. Flow `11` and the schema follow this; the clinic's doctors must still sign it off.

### Technical honesty
- Everything in `docs/flows` is a design, not tested behaviour. No part has run against a real clinic or real callers.
- The delay formula and all default numbers are guesses to be tuned with real data.
- The schema's rules are tested (`db/tests/schema.test.mjs`, 72 checks on an in-process Postgres). The backend jobs that use them (delay check, rollover, delay-choice calls, payment links, refunds) are not written yet.
- Correction from earlier planning: a time-range exclusion constraint only stops double booking for one-patient slots. With multi-patient windows the schema uses a capacity trigger with a row lock.

## C. Inputs needed from the partner clinic

| Input | Used in |
|---|---|
| Doctors, specialties, weekly session times | schedule templates, `03` B2 |
| Which doctors can stand in for each other (pools) | `03` AD; `09` D7, X4 |
| Average consultation length per doctor, and patients per session | window size, capacity, schedule fallback (`09` N3) |
| Priority fee per specialist, appointment fee per doctor, refund shares | `03` part P; `10` |
| WhatsApp Business number, payment gateway account (or test mode for the demo) | `10` parts A, B |
| Patient card or slip: a clear photo with personal details covered (ID format, institute ID, relation) | `02` V1-V5 |
| Share of walk-ins vs phone bookings | capacity, priority places |
| How bookings are taken today (register, app, none) | migration, `03` |
| Fee list, address, parking, holidays, services | info flow (`05`) |
| Doctors' sign-off on the refill flow, and how they issue prescriptions today (pad, e-prescription, app) | `11` part B |
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
| ~~The remaining sub-questions in section A~~ decided 29 Oct 2026 (decision log) | none |
| Payment gateway and WhatsApp provider choice for the demo | `create_payment_link`, WhatsApp templates |
| Edge cases you want covered ("we'll define later") | `08` table is a starter list |
| GTM direction: cloud vs hosted DB, pricing model | later; does not block the build |

## E. Decisions I made for you (change any of these)

- Greeting never uses the patient's name.
- The agent never says "urgent" to callers; it says "priority visit".
- A priority visit is mentioned only when the caller asks to be seen first, or when regular places are full, and never in reply to symptoms.
- Priority bookings need a clear "yes" to the fee on the call; the time of that "yes" is stored.
- Rescheduling is offered at most twice before a refund; once the patient asks for their money back, the agent stops offering.
- Refunds need staff approval by default; the agent never promises more than the policy gives.
- An unpaid UPI link gets one reminder, then the booking switches to "pay at the desk" (unless the clinic requires payment to keep it).
- No patient is moved without being asked, except when they cannot be reached (then their place is kept, or the next free slot is held for them).
- Patients who have arrived are never moved.
- Follow-ups: the agent asks "same doctor as last time, or any doctor?"
- A patient ID is never read aloud after date-of-birth verification; it is sent by SMS to the registered number.
- Pharmacy field dropped from refills; Bolnai never sends prescriptions to pharmacies in v1 (that would need the patient's explicit consent).
- Refill outcomes go out as SMS only, with no medicine name, and the received SMS says it is not a prescription.
- Same-day routine bookings stop 30 minutes before the window.
- Expired holds are released automatically after 90 seconds.
- Hindi SMS templates are separate Unicode templates.
- Outbound calls in the demo go only to team phones.
- Refill approvals need the doctor's PIN every time; a declined refill creates a P3 callback for the desk.
- Messages addressed to a doctor are answered only by that doctor; the desk answers report questions.
- Desk bookings reach 7 days ahead; a booking records whether it was a walk-in or a phone call to the desk.
- An acknowledged emergency stays as a red chip in the console's top bar until its P1 callback is closed.
- Demo patients use fixed IDs (Asha 482 915 6, Rohan 736 204 9); Kabir is 8 everywhere.
