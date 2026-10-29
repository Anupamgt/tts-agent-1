# Scope notes (v1 draft, agreed so far)

Status: working draft from planning chat, Oct 2026. The decision log with pointers into the flows is `docs/alignment.md`.

## Goal
Phone help desk voice agent for a real local clinic, shipped end to end for a hackathon: inbound and outbound calls, an admin/help-desk console as human in the loop, Google Calendar for bookings.

## Decisions so far
- Voice stack: Bolna (single multilingual agent). Languages: English, Hindi, Hinglish.
- Database: Postgres (local for dev, behind a tunnel or deployed; cloud/hosted options are a later GTM discussion).
- Calendar: Postgres is source of truth, bookings mirrored to a separate Google Calendar, doctors' personal busy time read as unavailable (hybrid option 4).
- Bookings use arrival windows.
  - **Named-doctor** bookings (by name or specialist) stay with that doctor; if the doctor runs late, the patient waits.
  - **Any-doctor** bookings (general check-ups, flexible follow-ups) roll over to another doctor in the pool when the assigned doctor is absent or running late.
- **"Urgent" means a paid priority visit**, offered only by specialists and super-specialists: an extra fee to be seen before regular patients. Genuine emergencies are separate: never booked, 112/108 script and a console alert.
- **Fees and payment**: a clinic can set an appointment fee per doctor. Fees are read out and agreed on the call, then paid by a UPI link sent as a WhatsApp follow-up, or cash at the desk.
- **Refunds**: if the doctor is not available, rescheduling is offered first; if the patient still wants the money back, a partial or full refund is processed (staff approve by default).
- **Verification**: patient name + patient ID from the card; name + date of birth if the ID is not known. New IDs are digits with a check digit; existing and institutional IDs are kept. Relatives get limited mode.
- **Delays**: at most 2 delay SMS per visit; after that the agent asks the patient whether to keep the place, move to the next free slot, or cancel. Patients who have arrived are never moved.
- **"Next patient" signal is hybrid**: the planned schedule by default, corrected by the doctor's or assistant's "Call next" taps.
- SMS: demo DLT templates (service implicit): booking confirmed, priority confirmed, patient ID, reminder, delay update, doctor changed, slot kept, rescheduled, cancelled, callback queued. Hindi versions need separate Unicode templates.
- WhatsApp (utility templates, need Meta approval): payment link, payment reminder, payment received, refund update.
- Agent never diagnoses or gives medical advice; discloses it is an AI at call start.
- No access to medical records in v1. If needed later, a narrow MCP tool returning single fields, after caller verification, with access logging.
- Demo: predefined flow plus edge cases (edge cases to be defined later).

## Decided on 29 Oct 2026 (was open)
Every open question was decided on Anupam's instruction; the reasons and rules are in `docs/decision-log.md` (D-01 to D-33) and the doc "Bolnai scope decisions and audit trail" (https://claude.ai/artifact/QuWJEoAzZ5Xv3dvh1NiQAM).
- The 30-minute window is a shared arrival window of 4 patients; a specialist can be set to 1 (D-23).
- Same-specialty doctors are pooled when the caller names no doctor (D-24).
- Refund shares, admin approval and unpaid links: D-18 to D-20. Bolnai never holds patient money (D-21).
- Payment gateway and WhatsApp for the demo: mocked (policy-only refunds, mock outbox) (D-21, D-17, D-31). Pick the gateway and WhatsApp provider at pilot onboarding.
- Patient slip: not needed for the demo, which uses fictional cards; collect a clear copy at partner onboarding.
- DLT: the clinic registers as the principal entity with its own header (D-16).
- Hosting and pricing: managed cloud in an India region by default (D-12; `docs/gtm.md`).

## Build scope
- **Buildathon (submit 31 Oct, finale 20 Nov):** fictional Demo Family Clinic on the Mac Mini, web call and demo phone, mock SMS and WhatsApp outbox, mocked payments and policy-only refunds, outbound calls only to team phones, gold-set evals. No real patient data (D-31).
- **Pilot:** starts only when the 12-item pilot gate checklist in `docs/decision-log.md` is done (D-32). Reminders by SMS; no automated outbound calls until the number is registered (D-15).
- **Out of v1:** ABHA linking, prescriptions to pharmacies, automated outbound calls until D-15 clears, languages beyond English, Hindi and Hinglish (D-33).

## Compliance (decided 29 Oct 2026; not legal advice)
- **DPDP Act 2023 and Rules 2025** (most duties from 13 May 2027): the clinic is the data fiduciary and Bolnai its processor under a written contract (D-06); notice drafted in `docs/privacy-notice.md` (D-08); access logs kept 1 year (D-09); breach notice to patients without delay and to the Board within 72 hours (D-13). A child's data is processed under the Fourth Schedule's health-services exemption (D-10). Until 13 May 2027 the SPDI Rules treat health information as sensitive.
- **Telemedicine Practice Guidelines 2020:** no advice or prescribing by the agent (D-02); refills only by the patient's own doctor (flow 11, D-04); refill records kept 3 years (D-05).
- **TRAI TCCCPR (Feb 2025 amendment):** service calls and SMS are commercial communication on registered headers and number series; robo calls need advance notice; links and callback numbers in SMS are whitelisted on DLT. Pilot reminders by SMS only (D-15, D-16). Outbound calls 9 am to 9 pm IST.
- **CERT-In Directions 2022:** Bolnai reports incidents within 6 hours and keeps system logs 180 days in India (D-09, D-13).
- **Emergencies:** 112, 108, and Tele-MANAS 14416 for self-harm or distress; the clinic signs off the script (D-01).
- Priority fees: the caller's agreement to the fee is recorded with the call. Payment links go by WhatsApp; an SMS link needs its domain whitelisted on DLT.
