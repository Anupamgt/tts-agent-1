# 09 - Day-of operations (console side)

Decided:

- **"Next patient" is hybrid.** The system assumes the planned schedule by default. The doctor (from a phone or tablet in the cabin) or an assistant outside the cabin taps "Call next" to correct it with real timing.
- **Delay messages stop at 2.** After that, the patient is moved to the doctor's next available slot and told once.
- **Patients who have arrived wait.** The system never moves them.

## Patient arrives

```mermaid
flowchart TD
    A0(["Patient arrives at the desk"]) --> A1{"Has a booking today?"}
    A1 -->|"yes"| A2["Staff open the record<br/>search by patient ID, name or phone"]
    A2 --> A3["Complete the file: fee, vitals if taken,<br/>confirm details, write the patient ID on the card"]
    A3 --> A3b{"Priority visit?"}
    A3b -->|"yes"| A3c["Collect the priority fee, mark paid"]
    A3b -->|"no"| A4
    A3c --> A4
    A4["Tap 'Arrived'<br/>queue order: priority first, then arrival order"]
    A1 -->|"no booking"| A5["Tap 'Add walk-in'<br/>name, phone, reason category"]
    A5 --> A6{"Current window has space?"}
    A6 -->|"yes"| A7["Counts against the window,<br/>agent sees fewer places"]
    A6 -->|"no"| A8{"Staff choice"}
    A8 -->|"squeeze in"| A9["Over-capacity flag, delay estimate rises"]
    A8 -->|"next window"| A10["Walk-in placed in next window with space"]
    A8 -->|"priority, patient pays the fee"| A11["Takes a priority place"]
    A7 --> A4
    A9 --> A4
    A10 --> A4
    A11 --> A4
    A4 --> A12{"Arrived outside their window?"}
    A12 -->|"early"| A13["Stays in queue; seen in order within the session"]
    A12 -->|"late, window over"| A14["Staff decide: seat in the next window,<br/>or rebook"]
    A12 -->|"in window"| A15(["In queue"])
    A13 --> A15
    A14 --> A15
```

## The "next patient" signal (hybrid)

```mermaid
flowchart TD
    N0(["Session running"]) --> N1{"Who signals the next patient?"}
    N1 -->|"doctor taps 'Call next'<br/>on phone or tablet"| N2["Live signal (best)"]
    N1 -->|"assistant outside the cabin taps 'Next'"| N2
    N1 -->|"receptionist taps 'Next'"| N2
    N1 -->|"nobody taps"| N3["Schedule fallback: each patient assumed<br/>to take the planned consult time<br/>estimate marked 'schedule only'"]
    N2 --> N4["Record who went in and when<br/>optional: show the next name or patient ID<br/>on a waiting-room screen"]
    N4 --> N5["Estimate marked 'live'<br/>rolling average consult time updated"]
    N3 --> N6{"No tap for 30 min?"}
    N6 -->|"yes"| N7["Console warning<br/>no automatic delay SMS from a schedule-only estimate<br/>agent tells callers it has no live update"]
    N6 -->|"no"| N0
    N5 --> D0(["Delay check below"])

    classDef human fill:#eef1fb,stroke:#534ab7;
    class N2,N7 human;
```

The "Call next" button should do something the doctor already needs, such as calling the next patient in by name or number on a screen. A clinic bell gives the system nothing. A button that replaces the bell gives it real timing for free.

## Delay check and what happens to each booking

```mermaid
flowchart TD
    D0(["Live estimate updated"]) --> D1["Estimated delay = projected start of the next<br/>unfinished window minus its planned start"]
    D1 --> D2{"Delay 20+ min and 15+ min<br/>change since the last notice?"}
    D2 -->|"no"| D0
    D2 -->|"yes"| D3["Shift the later windows"]
    D3 --> D4["For each affected booking"]
    D4 --> D5{"Patient already arrived?"}
    D5 -->|"yes"| D5a["Never moved: they wait<br/>agent answers live if they call"]
    D5 -->|"no"| D6{"Booking type"}

    D6 -->|"any doctor"| D7{"Another pool doctor has a place<br/>at or before the shifted time?"}
    D7 -->|"yes"| D7a["Move to that doctor<br/>send_sms 'doctor changed'"]
    D7 -->|"no"| D8
    D6 -->|"named doctor"| D8
    D6 -->|"priority"| D8p{"Can still be seen today?"}
    D8p -->|"yes"| D5a
    D8p -->|"no"| D8q["Console alert: staff decide<br/>rebook, keep, or refund the fee"]

    D8{"Delay messages already sent<br/>for this visit?"}
    D8 -->|"0 or 1"| D9{"Shifted window still inside<br/>today's session?"}
    D9 -->|"yes"| D9a["send_sms 'delay update' with the new window"]
    D9 -->|"no"| D10
    D8 -->|"2"| D10["Move to the doctor's next available window<br/>(later today if it fits, else the next session;<br/>any-doctor: any pool doctor)"]
    D10 --> D11["send_sms 'rescheduled'<br/>outbound call if it moved to another day (07)<br/>no more delay messages for this visit"]

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    class D7a,D9a,D10,D11 agent;
    class D8q human;
```

## Doctor absent, session changes, end of day

```mermaid
flowchart TD
    X0["Doctor cannot attend or session shortened"] --> X1["Staff mark session cancelled or shortened<br/>reason stays internal"]
    X1 --> X2["Console lists affected bookings"]
    X2 --> X3{"Booking type"}
    X3 -->|"any doctor"| X4["Move to another pool doctor today if there is room<br/>send_sms 'doctor changed'"]
    X4 --> X4b{"Room found?"}
    X4b -->|"no"| X5
    X4b -->|"yes"| X8
    X3 -->|"named doctor"| X5["Move to the same doctor's next available window<br/>send_sms 'rescheduled' + outbound call (07)"]
    X3 -->|"priority"| X6["Staff decide: rebook as priority,<br/>or refund the fee"]
    X5 --> X8["Rebooked, cancelled, or still open<br/>shown per patient"]
    X6 --> X8
    X1 --> X7["Windows of that session disappear<br/>from the agent immediately"]

    Y0(["End of session"]) --> Y1["Unarrived bookings marked no-show<br/>after the window ends plus 30 min"]
    Y1 --> Y2["Unpaid priority fees and unused places logged"]
    Y2 --> Y3["Day summary: calls handled, booked, transferred,<br/>callbacks open, emergencies flagged, SMS sent, auto-moves"]
    Y3 --> Y4["Open callbacks and unreached patients carry over to tomorrow"]

    classDef human fill:#eef1fb,stroke:#534ab7;
    class X1,X6,Y1 human;
```

## Console screens this implies

| Screen | Main contents |
|---|---|
| Live queue | Today's windows, who has arrived (priority marked), who is with the doctor, "Call next" button, delay estimate with "live" or "schedule only" |
| Doctor view | Single big "Call next" button and the next patient's name or ID; works on a phone |
| Bookings | Calendar-style view by doctor and window; named vs any-doctor; create, move, cancel; payment status |
| Callbacks | Priority-sorted queue with transcript snippet, caller number, reason, verification status |
| Messages and refills | Tickets for the doctor to approve or answer |
| Emergency alerts | Latest flags, with a clear acknowledge action |
| Calls | Every call with transcript, language, tags, outcome, recording link |
| SMS outbox | Sent and failed messages, template used |
| Settings | Windows, capacity, priority places and fee per doctor, release time, doctor pools, staff-on-desk switch, clinic info, thresholds |
