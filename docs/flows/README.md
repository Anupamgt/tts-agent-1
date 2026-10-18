# Call flows and decision trees

Read in this order. Every file is a Mermaid diagram plus the rules the diagram cannot show.

| # | File | Covers |
|---|---|---|
| 00 | [call-router](00-call-router.md) | Call start, greeting, language, intent routing, global interrupts |
| 01 | [safety-and-urgency](01-safety-and-urgency.md) | Emergency and self-harm handling, same-day urgent triage, "no medical advice" pivot |
| 02 | [identity-verification](02-identity-verification.md) | What needs verification, family callers, failed checks |
| 03 | [appointment-booking](03-appointment-booking.md) | New booking: window selection, holds, conflicts, read-back |
| 04 | [reschedule-cancel-status](04-reschedule-cancel-status.md) | Reschedule, cancel, check booking, "is the doctor late" |
| 05 | [info-messages-out-of-scope](05-info-messages-out-of-scope.md) | Clinic info, messages and refill requests, reports, billing, wrong-number calls |
| 06 | [human-handoff-and-callbacks](06-human-handoff-and-callbacks.md) | Transfer, no-staff fallback, callback queue and priorities |
| 07 | [outbound-calls](07-outbound-calls.md) | Reminders, delay updates, reschedule offers, retries, privacy |
| 08 | [error-handling](08-error-handling.md) | Speech failures, silence, tool and calendar failures, dropped calls |
| 09 | [day-of-operations](09-day-of-operations.md) | Check-in, walk-ins, "next patient", delay estimate, doctor absent |

## Conventions

- Rounded boxes are start/end points. Diamonds are decisions. Boxes marked with an arrow to a number point to another file.
- Red nodes are safety paths. Teal nodes are things the agent resolves itself. Purple nodes need a human or the console.
- Tool names (`lookup_caller`, `get_available_windows`, ...) are the backend endpoints the Bolna agent calls as custom function calls. They are a working vocabulary for the API spec, not final names.

## Tools the agent calls

| Tool | Purpose |
|---|---|
| `lookup_caller` | Before the call: patients linked to the caller's number (count only goes into the prompt) |
| `match_patient` | Find a patient by name and date of birth, with fuzzy matching on spelling |
| `get_clinic_info` | Hours, holidays, address, fees, doctor schedule |
| `check_urgent_criteria` | Compare the caller's stated reason against the doctor's urgent list: match, no_match, unclear |
| `get_available_windows` | Open arrival windows for a doctor and date range, with urgent places shown separately |
| `hold_window` | Reserve a window for a short time while details are collected |
| `create_booking` / `reschedule_booking` / `cancel_booking` | Write to Postgres; the calendar mirror is updated afterwards |
| `get_booking_status` | Upcoming bookings for a verified patient |
| `get_doctor_delay` | Current estimated delay and session status |
| `create_message_ticket` | Message or refill request for the doctor, shown in the console |
| `create_callback` | Callback request with priority and preferred time |
| `flag_emergency` | Console alert with a transcript snippet |
| `send_sms` | Send an approved DLT template |
| `transfer_call` | Bolna Transfer Call tool |

## Proposed settings (all editable per clinic or doctor; none confirmed yet)

| Setting | Proposed default |
|---|---|
| Window length / capacity / urgent places | 30 min / 4 patients / 1 |
| Urgent places released to routine booking | 2 hours before the session |
| Hold on a window while booking | 90 seconds |
| Same-day routine booking cutoff | window must start 30+ min from now |
| Delay SMS threshold | doctor 20+ min behind |
| Delay SMS cap | 2 per patient per visit |
| Staff alert for big delay | 60+ min |
| "Next patient" watchdog | console warning after 30 min without a tap |
| Max offer rounds per booking | 3 |
| Verification attempts | 2 |
| Urgent callback target | staff call back within 15 min |
| Standard callback target | next business session, same day if before 6 pm |
| Outbound call window | 9 am to 9 pm IST (also enforced by Bolna guardrails) |
| Outbound retries | 2, at least 2 hours apart, inside the call window |
