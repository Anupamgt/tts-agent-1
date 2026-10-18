# 04 - Reschedule, cancel, booking status, doctor delay

## Find the booking first

```mermaid
flowchart TD
    S0(["Caller wants to change, cancel or check a visit"]) --> S1["02 Verification"]
    S1 --> S1a{"Verified?"}
    S1a -->|"no"| S1b["Callback to verify<br/>(02 outcome)"]
    S1a -->|"yes"| S2["get_booking_status<br/>upcoming bookings for this patient"]
    S2 --> S3{"How many upcoming?"}
    S3 -->|"none"| S4["'I do not see an upcoming visit.'<br/>offer to book one (03)"]
    S3 -->|"one"| S6
    S3 -->|"several"| S5["List by day and doctor, ask which one"]
    S5 --> S6{"What does the caller want?"}
    S6 -->|"reschedule"| RS
    S6 -->|"cancel"| CN
    S6 -->|"just check"| ST

    RS(["Reschedule"])
    CN(["Cancel"])
    ST(["Status"])
```

## Reschedule

```mermaid
flowchart TD
    R0["Reschedule chosen"] --> R1{"Visit window already started<br/>or is within 30 min?"}
    R1 -->|"yes"| R1a["Explain; offer to cancel and book new,<br/>or a staff callback"]
    R1 -->|"no"| R2["Ask the new preferred day and time"]
    R2 --> R3["get_available_windows"]
    R3 --> R4{"Window available?"}
    R4 -->|"no"| R4a["Offer nearest alternatives or keep the old visit"]
    R4a --> R5
    R4 -->|"yes"| R5["Offer at most 2 windows"]
    R5 --> R6{"Takes one?"}
    R6 -->|"no, 3 rounds used"| R6a["Keep the old booking, offer callback"]
    R6 -->|"yes"| R7["Read back the new date and window"]
    R7 --> R8{"Confirms?"}
    R8 -->|"no"| R5
    R8 -->|"yes"| R9["reschedule_booking<br/>old window released only after the new one is secured"]
    R9 --> R10{"Result"}
    R10 -->|"ok"| R11["send_sms 'rescheduled'<br/>confirm, close"]
    R10 -->|"conflict or error"| R12["Old booking stays, re-offer or callback"]

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    class R9,R11 agent;
```

## Cancel

```mermaid
flowchart TD
    C0["Cancel chosen"] --> C1["Read back: patient, doctor, date, window"]
    C1 --> C2["'Shall I cancel this visit?'"]
    C2 --> C3{"Confirms?"}
    C3 -->|"no"| C3a(["Keep the booking, ask if anything else"])
    C3 -->|"yes"| C4["cancel_booking<br/>window released immediately"]
    C4 --> C5["send_sms 'cancelled'"]
    C5 --> C6{"A fee was paid,<br/>or the doctor asked for this follow-up?"}
    C6 -->|"yes"| C7["Paid: refund as a patient cancellation (10 part D),<br/>say the amount the policy gives.<br/>Follow-up: mention the doctor wanted this visit.<br/>Offer to rebook now; flag in console for staff"]
    C6 -->|"no"| C8["'Would you like to book another day?'"]
    C7 --> C8
    C8 -->|"yes"| BK(["03 Booking"])
    C8 -->|"no"| C9(["Close"])

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    class C4,C5 agent;
```

Cancelling is never made hard: no penalty talk, no pressure. Late cancellations are only noted for the clinic's records.

## Status and "is the doctor running late"

```mermaid
flowchart TD
    T0["Caller asks about timing"] --> T1{"Asking about their own booking<br/>or about the doctor today?"}
    T1 -->|"doctor today"| T3
    T1 -->|"own booking"| T2["Read: doctor, day, arrival window<br/>any-doctor: the doctor it is with right now"]
    T2 --> T3{"Is the visit today?"}
    T3 -->|"no"| T9(["Close, anything else?"])
    T3 -->|"yes"| T4["get_doctor_delay"]
    T4 --> T5{"Session status"}
    T5 -->|"not started yet"| T6["'Dr X begins at 10. No delay so far.'"]
    T5 -->|"running"| T7{"Estimated delay"}
    T7 -->|"under 20 min"| T7a["'Running on time.'<br/>give the window"]
    T7 -->|"20 min or more"| T7b["'About 30 minutes behind.<br/>Your new window is 11 to 11:30.'"]
    T5 -->|"paused or doctor absent"| T8["Say staff are updating,<br/>offer reschedule or callback"]
    T5 -->|"schedule only<br/>(no live tap for 30+ min)"| T8b["'I do not have a live update from the doctor's room.<br/>By the schedule, your window is 11 to 11:30.'<br/>offer a staff callback (P2) if they need certainty"]
    T6 --> T9
    T7a --> T9
    T7b --> T9
    T8 --> T9
    T8b --> T9

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    class T6,T7a,T7b agent;
    class T8,T8b human;
```

Rules:

- The doctor's delay is public and needs no verification; only the caller's own booking details do.
- The agent states an estimate as an estimate ("about 30 minutes"), never a promise.
- When the estimate is schedule-only (nobody has tapped "Call next" for 30 minutes), the agent says it has no live update instead of claiming the doctor is on time. A wrong delay answer is worse than none.
- If the system has already moved the visit (delay cap or doctor absent, see 09), the agent reads the new window and doctor, and offers to change it.
- Priority visits are rescheduled like any other visit when the caller asks; the fee carries over to the new date.
