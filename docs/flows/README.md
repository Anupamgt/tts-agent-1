# Call flows and decision trees

Read in this order. Every file is a Mermaid diagram plus the rules the diagram cannot show.

| # | File | Covers |
|---|---|---|
| 00 | [call-router](00-call-router.md) | Call start, greeting, language, intent routing, global interrupts |
| 01 | [safety-and-urgency](01-safety-and-urgency.md) | Term definitions (emergency vs priority visit), emergency and self-harm handling, same-day requests, "no medical advice" pivot |
| 02 | [identity-verification](02-identity-verification.md) | Name + patient ID, date-of-birth fallback, family callers, failed checks |
| 03 | [appointment-booking](03-appointment-booking.md) | New booking: named vs any-doctor, windows, holds, read-back; part P priority booking with fee consent |
| 04 | [reschedule-cancel-status](04-reschedule-cancel-status.md) | Reschedule, cancel, check booking, "is the doctor late" |
| 05 | [info-messages-out-of-scope](05-info-messages-out-of-scope.md) | Clinic info, messages and refill requests, reports, billing, wrong-number calls |
| 06 | [human-handoff-and-callbacks](06-human-handoff-and-callbacks.md) | Transfer, no-staff fallback, callback queue and priorities |
| 07 | [outbound-calls](07-outbound-calls.md) | Reminders, delay updates, reschedule offers, retries, privacy |
| 08 | [error-handling](08-error-handling.md) | Speech failures, silence, tool and calendar failures, dropped calls |
| 09 | [day-of-operations](09-day-of-operations.md) | Check-in, walk-ins, "Call next", delay estimate, asking the patient after 2 delay messages, doctor absent |
| 10 | [payments-and-refunds](10-payments-and-refunds.md) | Appointment and priority fees, UPI link on WhatsApp or cash, unpaid links, refund tree |

## Conventions

- Rounded boxes are start/end points. Diamonds are decisions. Boxes marked with an arrow to a number point to another file.
- Red nodes are safety paths. Teal nodes are things the agent resolves itself. Purple nodes need a human or the console.
- Tool names (`lookup_caller`, `get_available_windows`, ...) are the backend endpoints the Bolna agent calls as custom function calls. They are a working vocabulary for the API spec, not final names.

## Tools the agent calls

| Tool | Purpose |
|---|---|
| `lookup_caller` | Before the call: patients linked to the caller's number (count only goes into the prompt) |
| `match_patient` | Find a patient by name + patient ID, or by name + date of birth (fuzzy on spelling); checks the ID's check digit first |
| `get_clinic_info` | Hours, holidays, address, fees, doctor schedule, priority fee per doctor |
| `get_available_windows` | Open arrival windows for one doctor or a whole pool, with priority places shown separately |
| `hold_window` | Reserve a window for a short time while details are collected |
| `create_booking` / `reschedule_booking` / `cancel_booking` | Write to Postgres (named or any-doctor, routine or priority with fee consent); the calendar mirror is updated afterwards |
| `get_booking_status` | Upcoming bookings for a verified patient |
| `get_doctor_delay` | Current estimated delay and session status |
| `create_message_ticket` | Message or refill request for the doctor, shown in the console |
| `create_callback` | Callback request with priority and preferred time |
| `flag_emergency` | Console alert with a transcript snippet |
| `create_payment_link` | UPI link for an agreed fee, sent as a WhatsApp follow-up (SMS fallback) |
| `request_refund` | Refund request with the amount the clinic's policy gives; staff approve in the console |
| `send_sms` | Send an approved DLT template |
| `transfer_call` | Bolna Transfer Call tool |

Backend jobs (not called by the agent): delay check and window shifting, pool reassignment, delay-choice calls after the message cap, priority place release, hold cleanup, payment-link expiry and reminders, payment and refund webhooks, outbound scheduler.

## Decided

| Topic | Decision |
|---|---|
| Doctor choice | Named or specialist bookings stay with that doctor and wait if the doctor runs late. General check-ups and "any doctor" follow-ups roll over to another doctor in the pool, when the doctor is absent or running late (03, 09) |
| "Urgent" | Means a paid priority visit (seen before regular patients), offered only by specialists and super-specialists. Emergencies are separate (01) |
| Fees and payment | Clinic can set an appointment fee per doctor. Fees are agreed on the call, paid by UPI link on WhatsApp or cash at the desk (10) |
| Refunds | Doctor not available: offer rescheduling first; if the patient still wants the money back, partial or full refund (10) |
| Verification | Name + patient ID; name + date of birth if the ID is not known (02) |
| Relatives | Limited mode (02) |
| Delay messages | At most 2; after that the agent asks the patient: keep the place, move to the next free slot, or cancel (09) |
| "Next patient" | Hybrid: schedule-based by default, corrected by the doctor's or assistant's "Call next" taps (09) |

## Settings (editable per clinic or doctor; proposed values unless marked decided)

| Setting | Value |
|---|---|
| Window length / capacity / priority places | 30 min / 4 patients / 1 priority place (proposed) |
| Priority fee | Set per doctor, specialists only; empty means no priority visits (clinic to give amounts) |
| Appointment fee | Set per doctor; empty means none |
| Payment | UPI link on WhatsApp (valid 30 min, one reminder) or cash at the desk (decided); unpaid links keep the booking and switch to desk payment (proposed) |
| Refunds | Patient cancels 24 h+ before: full; later: 50%; clinic-caused: full; staff approve (proposed values) |
| Priority places released to regular booking | 2 hours before the session (proposed) |
| Planned consult time for the schedule fallback | Window length / capacity, so 7.5 min (proposed; per-doctor override) |
| Hold on a window while booking | 90 seconds |
| Same-day routine booking cutoff | window must start 30+ min from now |
| Delay SMS threshold | doctor 20+ min behind |
| Delay SMS cap | 2 per patient per visit (decided) |
| After the cap | Call and ask the patient: keep, move or cancel. Not reached: keep their place if it still fits today, otherwise hold the next free slot and text them (decided; fallback proposed) |
| "Call next" watchdog | console warning after 30 min without a tap; estimate becomes "schedule only" |
| Max offer rounds per booking | 3 |
| Verification attempts | 2 |
| P1 callback target (emergency, self-harm) | staff call back within 15 min |
| Standard callback target | next business session, same day if before 6 pm |
| Outbound call window | 9 am to 9 pm IST (also enforced by Bolna guardrails) |
| Outbound retries | 2, at least 2 hours apart, inside the call window |
