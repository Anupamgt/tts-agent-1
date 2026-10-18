# Scope notes (v1 draft, agreed so far)

Status: working draft from planning chat, Oct 2026. Open items are marked.

## Goal
Phone help desk voice agent for a real local clinic, shipped end to end for a hackathon: inbound and outbound calls, an admin/help-desk console as human in the loop, Google Calendar for bookings.

## Decisions so far
- Voice stack: Bolna (single multilingual agent). Languages: English, Hindi, Hinglish.
- Database: Postgres (local for dev, behind a tunnel or deployed; cloud/hosted options are a later GTM discussion).
- Bookings: arrival windows with live delay updates and a reserved urgent pool (see flows/clinic-flow-today-vs-agent.md).
- Calendar: Postgres is source of truth, bookings mirrored to a separate Google Calendar, doctors' personal busy time read as unavailable (hybrid option 4).
- SMS: demo DLT templates (service implicit): booking confirmed, reminder, delay update, rescheduled, cancelled, callback queued. Hindi versions need separate Unicode templates.
- Agent never diagnoses or gives medical advice; discloses it is an AI at call start; emergency phrases trigger a fixed 112/108 script and a console alert.
- No access to medical records in v1. If needed later, a narrow MCP tool returning single fields, after caller verification, with access logging.
- Demo: predefined flow plus edge cases (edge cases to be defined later).

## Open questions
- Urgent criteria list: doctor-edited default list at onboarding (proposed).
- Walk-ins counted against window capacity via console (proposed).
- Urgent-place release rule and timing (proposed: 2 hours before session).
- Delay threshold (20 min?), delay SMS cap (2?), who taps "next patient", behaviour when doctor is 60+ min late or absent.
- Window defaults: 30 min / 4 patients / 1 urgent.
- DLT entity for demo vs production (partner clinic to decide at onboarding).
- Hosting and pricing options (cloud vs hosted DB) for GTM.
- Schema definition (next step).

## Compliance notes
- Outbound calls in India: 9am to 9pm IST, DND, TRAI rules; production reminders likely need a 160-series number with DLT registration. Demo outbound calls go to team phones only.
- Patient data falls under India's DPDP Act.
