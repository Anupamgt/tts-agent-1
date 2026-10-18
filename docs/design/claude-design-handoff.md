# Help desk console: design handoff for Claude Design

Status: v1 brief, Oct 2026. Source of truth for behaviour is `docs/flows/` and `db/schema.sql` in this repo; this brief translates them into screens. Anything marked *open* is not decided yet: design it so it can go either way.

---

## 0. Kickoff prompt (paste this into Claude Design with this file attached)

> Design the staff console for a voice-AI phone help desk at a small Indian clinic. An AI agent answers the clinic's phone in English, Hindi and Hinglish, books visits, and hands anything it cannot do to the staff through this console. Use the attached brief: it lists the users, every screen with its data and states, the status vocabulary, formatting rules and fictional sample data.
>
> Start with the five P0 screens in section 5: Today (desktop, 1440 wide), Doctor view (phone, 390 wide), the emergency alert, Callbacks, and Call detail. Use the sample data in section 11 so the screens look real. Show the important states for each screen (empty, live, warning). Keep it calm, fast to scan, and usable by a receptionist who is being interrupted every 30 seconds. After P0, continue with the P1 screens.

---

## 1. What we are building

- A clinic gets more calls than one receptionist can answer while also handling the queue at the desk. An AI voice agent (built on Bolna) now answers every call: clinic info, booking, rescheduling, cancelling, messages for the doctor, and emergencies (it tells the caller to ring 112 / 108 and alerts staff).
- **This console is the human in the loop.** Staff see what the agent did, finish what it could not, run the waiting room, and approve anything involving money.
- It is a hackathon project that must work end to end for a real clinic, so the demo runs on realistic data and real flows.
- Bookings are **arrival windows**, not exact times. For example, "come between 5:00 and 5:30 pm" holds 4 patients, seen in arrival order. **Priority visits** (a paid extra) are seen first.

## 2. Who uses it, and where

| User | Device | Context | Top tasks |
|---|---|---|---|
| Receptionist (main user) | Desktop or laptop at the front desk, 1366×768 to 1920×1080 | Constant interruptions, patients at the counter, phone ringing, often bright room | Check patients in, add walk-ins, watch delays, return callbacks, take transfers, collect fees |
| Doctor | Own phone (Android, mid-range), in the cabin | Between patients, one hand, a few seconds of attention | Tap "Call next"; see who is next; pause |
| Cabin assistant (if the clinic has one) | Phone or tablet outside the doctor's cabin | Calls patients in | Tap "Next"; see the queue for one doctor |
| Clinic admin or owner | Desktop | Occasional | Settings, fees, refunds approval, day summary |

Staff are bilingual (English and Hindi), comfortable with WhatsApp, not with complex software. *Open:* is the console UI English only, or does it need a Hindi toggle? Design labels short enough to translate.

## 3. Design principles

1. **Glanceable.** The receptionist looks for two seconds and goes back to the patient. Doctor status, delay and "what needs me now" must read at a glance.
2. **One tap for the common action.** Arrive, Call next, Call back, Approve. Rare actions can sit behind a menu.
3. **Safety is unmissable.** An emergency alert interrupts everything until someone acknowledges it. Nothing else in the UI uses the same red.
4. **Honest states.** Show whether the delay estimate is **live** (from real taps) or **schedule only** (a guess). Show when something failed (SMS, calendar sync, payment) and what happens next.
5. **The agent's work is visible.** Anything created by the agent is labelled ("via agent"), with a link to the call and transcript.
6. **Money needs a person.** Refunds and fee waivers always show amount, reason and who approved.
7. **No medical detail on screen.** Only a short reason category ("follow-up", "general check-up"). Transcripts open on purpose, not in lists.
8. **Calm by default.** Most of the day is routine. Reserve colour for status and alerts.

## 4. Navigation and global elements

Left rail (desktop) / bottom tabs (phone):

`Today` · `Bookings` · `Callbacks` · `Calls` · `Payments` · `Messages` · `Patients` · `Settings`

Global top bar on every desktop screen:

- Clinic name, today's date, current time.
- **Staff on desk** switch (on: the agent transfers calls to the desk phone; off: it books callbacks instead). It must be very visible, since leaving it on while nobody is at the desk strands callers.
- **Doctor chips:** one per doctor in session, showing name, status and delay, e.g. `Dr Sharma · +25 min · live`, `Dr Verma · on time · schedule only ⚠`.
- **Search:** patient ID, name or phone.
- **Counters:** open P1 / P2 callbacks, refunds awaiting approval, failed messages.
- **Emergency banner:** see screen 3.

## 5. Screens

Priority: **P0** = needed for the demo, **P1** = needed for real use, **P2** = nice to have.

### Screen 1 · Today (live queue) · P0 · desktop

Purpose: the receptionist's home screen during a session.

Layout suggestion: one column per doctor in session (2–4 columns). Each column is a timeline of arrival windows with patient cards inside.

Per doctor column header:
- Doctor name, specialty, session time (5:00–8:00 pm), session status (planned / started / paused / ended / cancelled)
- Delay estimate with basis: `+25 min · live` or `on time · schedule only`. If there has been no "Call next" tap for 30+ min, show a warning ("No update from the cabin for 32 min").
- Now with doctor: patient name, since when
- Actions: Start session, Pause, Call next (desk fallback), Mark session cancelled (opens the doctor-absent flow)

Per window block (e.g. 5:30–6:00 pm, shifted to 5:55–6:25 pm):
- Planned time and shifted time if the delay shift applied
- Places: 3/4 taken, priority place 1/1 (only for specialists), priority place released (if unsold)
- Patient cards

Patient card:
- Name, patient ID (small), age
- Badges: `Priority`, `Any doctor`, `Via agent` / `Walk-in` / `Console`, `Relative booked`, `Fee due ₹700` / `Paid`
- Status: booked → arrived (with arrival time) → in consult → done; or no-show, cancelled, rescheduled
- Delay messages sent: 0/2, 1/2, 2/2; "Delay call: chose to keep place" / "unconfirmed"
- Primary action changes with status: `Arrived` → `Send in` → (done automatically on next Call next)

Also on this screen:
- `+ Walk-in` button: name, phone, reason category, doctor or any; place in the current window, the next window, or a priority place (with fee). If the window is full, show "squeeze in (over capacity)" as an explicit choice.
- Waiting-room order panel per doctor: priority first, then arrival order (this is the `session_queue` view).
- Strip of today's agent activity: "Agent booked Rohan Mehta for 6:30–7:00 pm (2 min ago)".

States: before session (no arrivals, all booked), running, running with big delay (60+ min, prompt: "Offer reschedule to affected patients?"), doctor absent (column greyed, affected bookings listed with status of each outreach call), session ended (no-shows marked).

### Screen 2 · Doctor view · P0 · phone

Purpose: the doctor taps one button between patients, which gives the system real timing.

- Huge `Call next` button (most of the lower half).
- Next patient: name, age, visit type, `Priority` badge, waiting time. Optional: patient ID.
- Now with you: name + timer.
- Remaining today: count, plus estimated finish time.
- Small actions: Pause session, Resume, End session.
- Confirmation feedback after tap (patient name shown big for 2 seconds). Optional: the waiting-room screen announces the name or number.
- States: no one waiting ("No patients waiting. 2 booked later."), paused, poor network (tap queued, "will sync").

Same screen in a cabin-assistant variant: shows the full queue for one doctor and a `Next` button.

### Screen 3 · Emergency alert · P0 · global

Trigger: the agent detected a possible emergency or self-harm signal on a call. It already told the caller to ring 112 / 108.

- Full-width red banner across every screen plus a sound, until acknowledged.
- Content: type (Medical / Self-harm), time, caller number (full, tap to call), short transcript snippet, whether the agent transferred the call to the desk, whether a P1 callback was created.
- Actions: `Acknowledge` (records who and when), `Call back now`, `Open call`.
- After acknowledgement: moves to an Alerts list with acknowledged-by and time.
- Never shows anything that looks like a diagnosis.

### Screen 4 · Callbacks · P0 · desktop

Purpose: people the clinic must call back, sorted by priority then waiting time.

| Priority | Meaning | Target |
|---|---|---|
| P1 | Emergency, self-harm | within 15 min |
| P2 | Wants to be seen today and nothing is free, upset caller, medical question, failed transfer, failed booking, delay-call not reached | within 2 h, or before today's session ends |
| P3 | Messages, verification help, reports, billing, non-patient | next working session |

Each row: priority chip, time left to target (turns amber, then red when overdue), caller name if verified, number (full, tap to call), reason in one line, language (EN / HI / Hinglish), verified or not, "via agent" with link to the call.

Detail panel: transcript snippet, what the caller wanted, preferred time window, previous attempts. Actions: `Calling…` (marks in progress), outcome (`Reached`, `No answer`, `Wrong number`), note, `Book for them` (opens booking drawer prefilled).

States: empty ("No callbacks. Nice."), overdue items, two no-answer attempts (shows "SMS sent").

### Screen 5 · Calls and call detail · P0 · desktop

Calls list: time, direction (in / out), caller (name if verified, else number), language, intent (booking, change, cancel, info, message, priority, emergency…), outcome (resolved, transferred, callback, emergency, abandoned), duration, tags (sales, non-patient, silent, abusive), "via outbound job" for reminders and delay-choice calls. Filters by outcome and intent.

Call detail:
- Header: caller, number, verified as whom (or "not verified"), relative mode, language, duration, cost.
- Transcript as a chat (agent vs caller), with tool events inline as small system rows: "Checked windows for Dr Kaur", "Held 6:00–6:30 pm", "Booked", "Fee agreed ₹700 at 5:41 pm", "Transfer attempted: no answer".
- What the call produced: booking (link), callback, message ticket, refund request, emergency alert.
- Recording player (if recording is on).
- Summary (2–3 lines, generated).

### Screen 6 · Booking drawer: create, edit, check in · P0 · desktop

One side drawer used from Today, Bookings, Callbacks and Patients.

Create / edit:
- Patient: search by ID, name, phone; or new patient (name, age or date of birth, phone). New patients get an ID shown immediately.
- Doctor choice: **a named doctor** or **any doctor** (pool, e.g. "General check-up"). For follow-ups: "same doctor as last time?"
- Window picker: day tabs, windows with places left, priority places shown separately for specialists.
- Priority toggle (specialists only), shows fee.
- Fees summary: appointment fee + priority fee = total; payment method: UPI link on WhatsApp / cash at desk; staff-only option `Waive fee` (requires a reason).
- Requested by relative (checkbox).

Check-in (from Today):
- Confirm details, mark file complete, show the patient ID to write on the card.
- If a fee is due: `Collect cash` or `Show UPI QR` → mark paid.
- `Arrived` button.

Timeline at the bottom of every booking: created (by agent / console), fee agreed, link sent, paid, delay messages, doctor changed (A1 → A2), delay-choice call outcome, rescheduled, cancelled, refund. This is the `booking_changes` log plus payments.

### Screen 7 · Bookings calendar · P1 · desktop

Day / week view. Rows = doctors, columns = arrival windows. Each cell shows `3/4` with a priority marker. Click a cell to list patients; drag a booking to move it (asks for confirmation and whether to notify the patient). Filters: doctor, pool, booking source, unpaid fees. Shows holidays and cancelled sessions. A banner appears if the Google Calendar mirror is out of sync ("4 bookings not synced, retrying").

### Screen 8 · Payments and refunds · P1 · desktop

Tabs: `Due` · `Links sent` · `Paid` · `Refunds`.

- Payment row: patient, doctor, visit date, amount, fee type (appointment / priority), method (UPI link / cash), state (link sent, expires in 12 min / paid / expired / failed), reminders sent (0/1).
- Refund requests: patient, amount requested, policy reason ("Doctor unavailable: full", "Cancelled 6 h before: 50%"), requested by (agent on call / staff), linked call. Actions: `Approve`, `Change amount` (needs a note), `Reject` (needs a note). After approval: processed by gateway, or "hand cash at desk".
- Hard rule visible in the UI: you cannot refund more than was paid. Show "₹700 paid · ₹0 refunded so far".

### Screen 9 · Messages and refills for the doctor · P1 · desktop and phone

Tickets the agent created: type (refill / message / report question), patient, "requested by relative" flag, caller's words, medicine name for refills, created time. Doctor actions: `Approve refill`, `Decline` (with note), `Reply`, `Ask patient to visit` (opens booking). After a decision, the patient gets a call or SMS (shown as the outcome).

### Screen 10 · Patients · P1 · desktop

Search by patient ID (digits are enough; `HC/2026/0412` also matches `20260412`), name, or phone. Profile: name, ID, age, phones (with relation: self, parent, child…), institute card-holder ID and relation if the clinic uses them, consents (reminder calls, SMS, WhatsApp, recording) with dates, upcoming and past visits, calls, callbacks. No medical records.

### Screen 11 · Messages outbox · P2

All SMS and WhatsApp messages: time, patient, channel, template (booking confirmed, delay update, payment link…), status (queued, sent, delivered, failed), rendered text. `Retry` on failures. In the demo, this is where messages "arrive", because no real SMS or WhatsApp is sent.

### Screen 12 · Settings · P2

Sections:
- **Clinic:** name, address, hours, holidays, info answers (hours, address, fees, parking, payment, refunds) in English and Hindi.
- **Doctors:** specialty, tier (general / specialist / super-specialist), weekly sessions, window length, capacity, priority places, priority fee (specialists only), appointment fee, planned consult time, pools.
- **Payments and refunds:** accepted methods, link validity (30 min), reminders (1), "payment required to keep the booking", refund shares (24 h+ full, under 24 h 50%, clinic-caused full), refund approval required.
- **Delays:** SMS threshold (20 min), max delay messages (2), "Call next" watchdog (30 min).
- **Calls:** staff transfer number, outbound call hours (9 am–9 pm), retries.
- **Staff:** users and roles.

Each number shows its default and a one-line explanation.

### Screen 13 · Day summary · P2

End-of-day card set: calls handled by agent / transferred / callbacks, bookings made by agent vs console vs walk-in, no-shows, average delay per doctor, delay messages sent, auto-moves, fees collected (UPI / cash), refunds, emergencies flagged. Open items carried to tomorrow.

### Screen 14 · Waiting-room display · P2 · TV or tablet

"Now calling: **Rohan Mehta** · Dr Sharma · Cabin 2". Next 3 names (or patient numbers, if the clinic prefers privacy). Doctor delay note. Large type, readable at 4 metres, English with Hindi line.

## 6. Status vocabulary (use the same labels and colours everywhere)

Never rely on colour alone: pair it with a label or icon.

| Object | Values | Treatment |
|---|---|---|
| Booking status | held (agent is booking, 90 s) · booked · arrived · in consult · done · no-show · cancelled · rescheduled | held = dashed outline; arrived and in consult = strongest; done = muted; no-show / cancelled = struck or faded |
| Priority | routine · **priority** | Priority badge, distinct from alerts (not red) |
| Booking mode | named doctor · any doctor | Small "Any doctor" tag; show "moved from Dr Sharma" when rolled over |
| Source | via agent · console · walk-in · system | Small source tag; agent items link to the call |
| Delay basis | live · schedule only | "schedule only" always shows a warning style |
| Payment | not required · due · link sent · paid · waived · partially refunded · refunded · expired · failed | Money states in one consistent family |
| Refund | requested · approved · rejected · processed · failed | Requested = needs action |
| Callback | P1 · P2 · P3 · open · in progress · done · unreachable | P1 uses the alert red only when overdue or new |
| Session | planned · started · paused · ended · cancelled | |
| Message | queued · sent · delivered · failed | failed = actionable |
| Emergency | new · acknowledged | the only full-red element in the product |

Words to use: "priority visit", never "urgent". "Arrival window", not "slot" or "token", in anything the patient sees. Staff may see "token number" if the clinic wants one at the desk; it equals the queue position.

## 7. Formatting rules

- Time: `5:30 pm` (12-hour, lower-case am/pm). Windows: `5:00–5:30 pm`. Shifted: `5:30–6:00 pm → 5:55–6:25 pm`.
- Date: `Mon, 19 Oct`. Relative where helpful: "2 min ago", "in 12 min".
- Money: `₹700`, Indian digit grouping (`₹1,50,000`).
- Phone: `+91 98111 11111`.
- Patient ID: new IDs are 7 digits, shown in groups `100 001 7`; existing clinic IDs exactly as printed (`HC/2026/0412`).
- Names: Latin script by default; long names truncate with full name on hover.
- Language tags: `EN`, `HI`, `Hinglish`.
- Sentence case everywhere. Short labels (staff may switch to Hindi later).

## 8. Privacy in the UI

- No diagnoses, symptoms, medicines or test results anywhere except a refill ticket's medicine name (for the doctor).
- Transcripts and recordings open on purpose (a click), never in list previews beyond a one-line snippet.
- Phone numbers: full where staff need to call (callbacks, alerts, patient profile); partly hidden in long lists (`+91 98••• ••111`).
- The waiting-room display can show patient numbers instead of names (clinic setting).
- Every refund, fee waiver and patient-record view is logged (show "who and when" on the item).

## 9. Real-time behaviour and system states

- Today, Callbacks, Alerts and Payments update live as calls happen. New items slide in with a short highlight; nothing jumps under the user's cursor (insert above, keep scroll).
- Show when the agent is on a call right now ("Agent: 2 calls in progress"), optional.
- Banners (stackable, dismissible except emergency): emergency (red, sticky), "No update from Dr Verma's cabin for 32 min", "Calendar out of sync", "3 messages failed", "Offline: changes will sync".
- Every list needs designed empty, loading and error states.

## 10. Demo moments to prototype (the story the judges see)

1. **Hinglish booking:** a caller books Dr Kaur (specialist) with a priority visit. Today shows a held card (dashed), then booked with `Priority`, `Via agent`, `Fee due ₹700`. The outbox shows the WhatsApp payment link; minutes later it turns `Paid`.
2. **Emergency:** a caller says their father has chest pain. The red banner appears on every screen with a transcript snippet; the receptionist acknowledges and taps Call back.
3. **Running late:** the doctor taps Call next on the phone; Dr Sharma's chip moves to `+25 min · live`; later windows shift; patient cards show `Delay SMS 1/2`. After the 2nd message a delay-choice call happens; the card shows the patient's choice.
4. **Doctor absent:** staff cancel Dr Verma's session. Any-doctor patients move to Dr Sharma (`moved from Dr Verma`); others get calls; one asks for money back → refund request appears in Payments for approval.
5. **After hours:** staff-on-desk is off; a caller asks for a person → P2 callback appears with the reason and transcript.

## 11. Sample data (fictional; use for all mocks)

Clinic: Demo Family Clinic, 12 Example Road, Chandigarh. Today: Mon, 19 Oct, time 6:10 pm.

Doctors in session today (5:00–8:00 pm, 30-minute windows, 4 places):

| Doctor | Specialty | Pool | Priority fee | Appointment fee | Now |
|---|---|---|---|---|---|
| Dr Sharma | General medicine | General check-up | none | none | +25 min · live, with Rohan Mehta since 6:02 pm |
| Dr Verma | General medicine | General check-up | none | none | on time · schedule only (no tap for 32 min) |
| Dr Kaur | Paediatrics (specialist) | none | ₹500 | ₹200 | +10 min · live |

Patients (all fictional):

| Name | Patient ID | Phone | Notes |
|---|---|---|---|
| Asha Rani | 100 001 7 | +91 98111 11111 | shares phone with Rohan |
| Rohan Mehta | 100 002 5 | +91 98111 11111 | relation: child |
| Meera Iyer | HC/2026/0412 | +91 98222 22222 | institute card holder EMP-1042, self |
| Kabir Iyer (8) | HC/2026/0413 | +91 98222 22222 | dependant of EMP-1042, child |
| Sunil Kumar | 100 003 3 | +91 98333 33333 | walk-in |
| Fatima Shaikh | 100 004 1 | +91 98444 44444 | any-doctor general check-up |
| Gurpreet Singh | 100 005 8 | +91 98555 55555 | P2 callback: wants to be seen today |
| Neha Joshi | 100 006 6 | +91 98666 66666 | refund requested ₹700 (Dr Kaur unavailable Thursday) |

Bookings for Today screen:
- Dr Sharma 5:30–6:00 pm (shifted to 5:55–6:25 pm): Rohan Mehta (in consult, via agent), Asha Rani (arrived 5:48 pm), Sunil Kumar (walk-in, arrived 6:05 pm), 1 place free.
- Dr Sharma 6:00–6:30 pm (shifted 6:25–6:55 pm): Fatima Shaikh (any doctor, booked, delay SMS 1/2).
- Dr Kaur 6:00–6:30 pm: Kabir Iyer (priority, booked by relative Meera, appointment ₹200 + priority ₹500 = ₹700 paid by UPI), 3 regular places free.
- Dr Verma 6:30–7:00 pm: 2 booked, 2 free.

Callbacks: Gurpreet Singh P2 (due by 7:30 pm, Hinglish, verified); unknown number P3 (verification failed twice, wants to change a booking); P1 acknowledged at 5:21 pm (emergency, medical).

Calls today: 31 handled by the agent, 4 transferred, 3 callbacks created, 1 emergency flagged.

## 12. Responsive and accessibility targets

- Desktop: 1366×768 minimum, designed at 1440×900; must still work at 1920×1080 with 3–4 doctor columns.
- Phone (doctor view, cabin assistant, quick checks): 360–390 px wide.
- Touch targets 44 px minimum; the Call next button much larger.
- Contrast WCAG AA; readable in a bright room; numerals large for times, delays, amounts.
- Keyboard shortcuts on desktop for the top actions (search, walk-in, arrived) are a plus.

## 13. Open questions that affect the UI

- **Capacity model (13a):** shared 30-minute windows of 4 patients (assumed here) or one patient per 30 minutes. The window block must work for both (show places as `n/4` or a single slot).
- **Same-specialty pooling (1b):** if yes, "Any paediatrician" appears as a pool option for specialists too.
- **Unpaid UPI link (3g):** keep the booking and switch to "pay at desk" (assumed) or release the place.
- **Console language:** English only, or a Hindi toggle.
- **Brand:** none yet. Either neutral and clinical, or the existing "Synopsis" design system. Decide before visual polish.
- **Token numbers at the desk:** does the clinic want a printed token number (equal to the queue position) on the slip?

## 14. Out of scope for this console

- A patient-facing app or website (patients use the phone line, SMS and WhatsApp).
- Medical records, prescriptions, billing beyond appointment and priority fees.
- Agent configuration (prompts, voices); that lives in Bolna.
- Multi-clinic administration.

## 15. Source documents in the repo

| Topic | File |
|---|---|
| Scope and decisions | `docs/scope.md`, `docs/alignment.md` |
| Call flows (agent side) | `docs/flows/00` to `08` |
| Day-of operations (console side) | `docs/flows/09-day-of-operations.md` |
| Fees, payments, refunds | `docs/flows/10-payments-and-refunds.md` |
| Data model and statuses | `db/schema.sql`, `db/README.md` |
| Sample data | `db/seed.sql` |
