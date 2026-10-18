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

## Open questions
See `docs/alignment.md` section A for the full list. The ones raised by the latest decisions:
- What "a 30 minute window for each patient" means in decision 13 (see alignment).
- Specialists with two or more doctors of the same specialty: pool them or not? (explained in alignment, note 1b)
- Refund shares, staff approval, and what happens to an unpaid UPI link.
- Payment gateway and WhatsApp Business provider for the demo.
- A clearer copy of the patient slip (ID format).
- DLT entity for demo vs production (partner clinic to decide at onboarding).
- Hosting and pricing options (cloud vs hosted DB) for GTM.

## Compliance notes
- Outbound calls in India: 9am to 9pm IST, DND, TRAI rules; production reminders likely need a 160-series number with DLT registration. Demo outbound calls go to team phones only.
- Patient data falls under India's DPDP Act.
- Priority fees: the caller's agreement to the fee is recorded with the call. If payment links are sent by SMS later, the link domain must be registered with the DLT template.
