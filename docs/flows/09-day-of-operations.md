# 09 - Day-of operations (console side)

This is where arrival windows become real: someone has to tell the system when patients arrive and when the doctor takes the next one. The agent depends on it for every delay answer.

## Patient arrives

```mermaid
flowchart TD
    A0(["Patient arrives at the desk"]) --> A1{"Has a booking today?"}
    A1 -->|"yes"| A2["Staff open the provisional record<br/>(search by name or phone)"]
    A2 --> A3["Complete the file: fee, vitals if taken,<br/>confirm details"]
    A3 --> A4["Tap 'Arrived'<br/>added to the queue for their window"]
    A1 -->|"no booking"| A5["Tap 'Add walk-in'<br/>name, phone, reason category"]
    A5 --> A6{"Current window has space?"}
    A6 -->|"yes"| A7["Counts against the window,<br/>agent sees fewer places"]
    A6 -->|"no"| A8{"Staff choice"}
    A8 -->|"squeeze in"| A9["Over-capacity flag, delay estimate rises"]
    A8 -->|"next window"| A10["Walk-in placed in next window with space"]
    A8 -->|"mark urgent"| A11["Moves to the front, takes an urgent place"]
    A7 --> A4
    A9 --> A4
    A10 --> A4
    A11 --> A4
    A4 --> A12{"Arrived outside their window?"}
    A12 -->|"early"| A13["Stays in queue; seen in arrival order within the session"]
    A12 -->|"late, window over"| A14["Staff decide: seat in the next window,<br/>or rebook"]
    A12 -->|"in window"| A15(["In queue"])
    A13 --> A15
    A14 --> A15
```

## Doctor's session and delay updates

```mermaid
flowchart TD
    D0(["Session day"]) --> D1["Staff tap 'Session started' with the real start time"]
    D1 --> D2["Doctor takes next patient:<br/>staff tap 'Next patient'"]
    D2 --> D3["System records consult start and end times<br/>rolling average consult time per doctor"]
    D3 --> D4["Estimated delay =<br/>projected start of the next unfinished window<br/>(now + patients ahead x average consult time)<br/>minus its planned start"]
    D4 --> D5{"Delay at or above 20 min<br/>and 15+ min change since the last notice?"}
    D5 -->|"no"| D2
    D5 -->|"yes"| D6["Shift the later windows in the system"]
    D6 --> D7["For each affected patient who has not arrived:<br/>under the 2-message cap?"]
    D7 -->|"yes"| D8["send_sms 'delay update' with the new window"]
    D7 -->|"no"| D9["No message; the agent still answers if they call"]
    D6 --> D10{"Delay at or above 60 min?"}
    D10 -->|"yes"| D11["Console alert for staff:<br/>'Offer reschedule to affected patients?'"]
    D11 --> D12{"Staff approve?"}
    D12 -->|"yes"| D13["Outbound calls offering reschedule (07)<br/>SMS fallback"]
    D12 -->|"no"| D2
    D10 -->|"no"| D2

    D2 --> W1{"No 'Next patient' tap<br/>for 30 min during session?"}
    W1 -->|"yes"| W2["Console warning,<br/>delay estimate marked stale,<br/>no automatic delay SMS<br/>agent tells callers it is checking"]
    W1 -->|"no"| D2

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    class D6,D8,D13 agent;
    class D1,D2,D11,W2 human;
```

## Doctor absent, session changes, end of day

```mermaid
flowchart TD
    X0["Doctor cannot attend or session shortened"] --> X1["Staff mark session cancelled or shortened<br/>and set the reason (internal)"]
    X1 --> X2["Console lists affected bookings"]
    X2 --> X3["Bulk action: offer reschedule"]
    X3 --> X4["Outbound call per patient (07)<br/>with SMS fallback for unreached"]
    X4 --> X5["Rebooked, cancelled, or still open<br/>shown per patient in the console"]
    X1 --> X6["Window results for that session disappear<br/>from the agent immediately"]

    Y0(["End of session"]) --> Y1["Unarrived bookings marked no-show after the window ends plus 30 min"]
    Y1 --> Y2["Unused urgent places and capacity logged"]
    Y2 --> Y3["Day summary: calls handled, booked, transferred,<br/>callbacks open, emergencies flagged, SMS sent"]
    Y3 --> Y4["Open callbacks and unreached patients carry over to tomorrow"]

    classDef human fill:#eef1fb,stroke:#534ab7;
    class X1,X3,Y1 human;
```

## Console screens this implies

| Screen | Main contents |
|---|---|
| Live queue | Today's windows, who has arrived, who is with the doctor, "Next patient" button, delay estimate |
| Bookings | Calendar-style view by doctor and window; create, move, cancel; provisional vs completed files |
| Callbacks | Priority-sorted queue with transcript snippet, caller number, reason, verification status |
| Messages and refills | Tickets for the doctor to approve or answer |
| Emergency alerts | Latest flags, with a clear acknowledge action |
| Calls | Every call with transcript, language, tags, outcome, recording link |
| SMS outbox | Sent and failed messages, template used |
| Settings | Windows, capacity, urgent places and release time, urgent criteria list, staff-on-desk switch, clinic info, thresholds |
