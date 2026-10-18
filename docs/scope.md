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
  - **Any-doctor** bookings (general check-ups, flexible follow-ups) roll over to another doctor in the pool when the assigned doctor is not available.
- **"Urgent" means a paid priority visit**: an extra fee to be seen before regular patients. The fee is read out and agreed on the call; payment at the desk in the demo. Genuine emergencies are separate: never booked, 112/108 script and a console alert.
- **Verification**: patient name + patient ID from the card; name + date of birth if the ID is not known. Patient IDs are digits with a check digit. Relatives get limited mode.
- **Delays**: at most 2 delay SMS per visit; after that the visit moves to the doctor's next available slot and the patient is told once. Patients who have arrived are never moved.
- **"Next patient" signal is hybrid**: the planned schedule by default, corrected by the doctor's or assistant's "Call next" taps.
- SMS: demo DLT templates (service implicit): booking confirmed, priority confirmed, patient ID, reminder, delay update, doctor changed, rescheduled, cancelled, callback queued. Hindi versions need separate Unicode templates.
- Agent never diagnoses or gives medical advice; discloses it is an AI at call start.
- No access to medical records in v1. If needed later, a narrow MCP tool returning single fields, after caller verification, with access logging.
- Demo: predefined flow plus edge cases (edge cases to be defined later).

## Open questions
See `docs/alignment.md` section A for the full list. The ones raised by the latest decisions:
- Rollover trigger for any-doctor bookings: only when the doctor is absent, or also when running late?
- Priority visits: fee per doctor, payment method, refund when the doctor is absent or very late.
- What "a 30 minute window for each patient" means in decision 13 (see alignment).
- Specialists with two or more doctors of the same specialty: pool them or not?
- DLT entity for demo vs production (partner clinic to decide at onboarding).
- Hosting and pricing options (cloud vs hosted DB) for GTM.

## Compliance notes
- Outbound calls in India: 9am to 9pm IST, DND, TRAI rules; production reminders likely need a 160-series number with DLT registration. Demo outbound calls go to team phones only.
- Patient data falls under India's DPDP Act.
- Priority fees: the caller's agreement to the fee is recorded with the call. If payment links are sent by SMS later, the link domain must be registered with the DLT template.
