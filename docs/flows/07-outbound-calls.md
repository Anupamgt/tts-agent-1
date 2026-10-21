# 07 - Outbound calls

## What gets called

| Call | Trigger | Default timing |
|---|---|---|
| Reminder | Booking exists | Evening before, inside the call window (and a morning SMS) |
| Delay update | Estimated delay passes the threshold | When the shift is decided (SMS first; call only if the patient is within an hour of leaving) |
| Delay choice | Two delay messages already sent and the doctor is still slipping (09 D10) | Straight away: keep the place, move to the next free slot, or cancel |
| Reschedule offer | Doctor absent or session cancelled (09 X5), or staff ask | Straight away; patient picks a slot or asks for a refund (10) |
| Payment follow-up | Caller chose UPI on the call (10 part B) | WhatsApp message with the link, not a call; one reminder |
| Doctor changed | An any-doctor visit moved to another pool doctor | SMS only; a call only if it is less than an hour before the window |
| Callback result | Staff resolved a message or question | After staff mark it ready |
| Refill outcome | The patient's own doctor decided a refill (11) | SMS only, to the registered number, no medicine name. The agent never calls with a refill outcome |
| Follow-up reminder | Doctor set a follow-up date at checkout | Evening before |

In the demo, outbound calls go only to numbers the team controls.

## Decision tree

```mermaid
flowchart TD
    O0(["Scheduler picks a due outbound call"]) --> O1{"Patient has agreed to reminders<br/>and is not marked opted out?"}
    O1 -->|"no"| O1a["Do not call, send nothing,<br/>log skipped"]
    O1 -->|"yes"| O2{"Inside 9 am to 9 pm IST<br/>and clinic call window?"}
    O2 -->|"no"| O2a["Reschedule to the next allowed time"]
    O2 -->|"yes"| O3["Place the call<br/>variables: first name, doctor, date, window"]
    O3 --> O4{"Call outcome"}

    O4 -->|"no answer or busy"| RT
    O4 -->|"voicemail or machine"| VM["Leave no medical or booking details.<br/>Only: clinic name and 'please call us back'"]
    VM --> RT
    O4 -->|"answered"| O5["'Hello, this is an automated assistant.<br/>May I speak with NAME?'<br/>(clinic name only after they confirm: S-12)"]

    O5 --> O6{"Right person?"}
    O6 -->|"wrong person or not available"| O6a["Share nothing, ask for a good time,<br/>end politely; log 'not reached'"]
    O6a --> RT
    O6 -->|"yes, speaking"| O7["Say the clinic name, then the message:<br/>doctor, date, window (reminder)<br/>or the change (delay, reschedule)<br/>never ask for payment details"]

    O7 --> O8{"Caller reaction"}
    O8 -->|"confirms or fine"| O9["Mark confirmed, close"]
    O8 -->|"cannot come, or wants a different slot"| O10["Offer reschedule now<br/>paid visits: or a refund (10 part D)"]
    O10 --> BK(["04 Reschedule flow, already verified by the outbound identity check"])
    O8 -->|"wants to cancel"| CN(["04 Cancel flow"])
    O8 -->|"has a question"| O11["Answer from clinic info or offer inbound-style handling (00)"]
    O8 -->|"asks for a person"| HO(["06 Handoff"])
    O8 -->|"asks not to be called again"| OPT["Mark opted out immediately,<br/>confirm, send nothing further"]

    RT{"Retries left?<br/>(max 2, 2 hours apart, inside window)"}
    RT -->|"yes"| O2a
    RT -->|"no"| FB["Send the approved SMS instead<br/>mark 'unreached' in console"]

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    class O3,O7,O9 agent;
    class FB,OPT human;
```

## Rules

- Identity before content: the agent says nothing about a visit until the person says they are the patient (or the number's registered contact for that patient).
- No health information on voicemail or to a wrong person, ever. The message contains no reason for the visit.
- The agent opens by saying it is automated, same as inbound.
- Calling hours are enforced twice: Bolna's calling guardrails (9 am to 9 pm IST) and the scheduler. A caller's requested callback time outside the window is rejected, not rounded.
- Compliance for production: reminders to patients are service calls; they are expected to need a 160-series number registered through DLT, and a consent line captured at booking ("May we remind you by call and SMS?"). Not needed for the demo.
- Every outbound call writes the same webhook data as an inbound one, tagged with its reason, so the console shows one timeline per patient.
