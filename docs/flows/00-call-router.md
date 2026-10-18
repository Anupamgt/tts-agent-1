# 00 - Call router

## Main flow

```mermaid
flowchart TD
    S(["Call connects"]) --> L["lookup_caller<br/>how many patients are linked to this number"]
    L --> G["Generic greeting, no names<br/>clinic name, 'I am an automated assistant', recording notice"]
    G --> W{"Caller replies within 5 s?"}
    W -->|"no"| W2["Repeat greeting once in Hindi and English"]
    W2 --> W3{"Reply now?"}
    W3 -->|"no"| W4(["Say goodbye and hang up<br/>log as silent call"])
    W3 -->|"yes"| ASK
    W -->|"yes"| ASK["'How can I help you today?'<br/>language follows the caller automatically"]
    ASK --> INT{"What does the caller want?"}

    INT -->|"clinic info"| R5["05 Info"]
    INT -->|"book a new visit"| R3["03 Booking"]
    INT -->|"priority visit, be seen first"| R3
    INT -->|"wants to be seen today"| R1b["01 B: same-day request"]
    INT -->|"change or cancel a visit"| R4["04 Reschedule / cancel"]
    INT -->|"check my booking"| R4
    INT -->|"is the doctor running late"| R4
    INT -->|"message or refill for the doctor"| R5
    INT -->|"reports or lab results"| R5
    INT -->|"billing or payment"| R6["06 Handoff"]
    INT -->|"asks what to take or what is wrong"| R1["01 Pivot: no medical advice"]
    INT -->|"asks for a person"| R6
    INT -->|"sales call, wrong number, other"| R5
    INT -->|"unclear"| CL["Ask one clarifying question<br/>offer 3 choices: book, change, other"]

    CL --> CL2{"Understood now?"}
    CL2 -->|"yes"| INT
    CL2 -->|"no"| R6

    R5 --> WRAP
    R3 --> WRAP
    R4 --> WRAP
    R1 --> WRAP
    R1b --> WRAP
    WRAP{"Anything else?"}
    WRAP -->|"yes"| INT
    WRAP -->|"no"| CLOSE["Short goodbye<br/>SMS already sent if a booking changed"]
    CLOSE --> E(["Call ends<br/>webhook logs transcript, outcome, tags to console"])

    classDef ref fill:#eef1fb,stroke:#534ab7;
    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class R5,R3,R4,R6,R1b ref;
    class R1 safety;
```

## Global interrupts (checked on every caller turn, in this order)

```mermaid
flowchart LR
    T["Caller says something"] --> E1{"1. Emergency or<br/>self-harm signal?"}
    E1 -->|"yes"| X1["01 Emergency flow<br/>overrides everything"]
    E1 -->|"no"| E2{"2. Asks for a human?"}
    E2 -->|"yes"| X2["06 Handoff"]
    E2 -->|"no"| E3{"3. Distress or anger?"}
    E3 -->|"yes"| X2
    E3 -->|"no"| E4{"4. Not understood<br/>twice in a row?"}
    E4 -->|"yes"| X2
    E4 -->|"no"| E5["Continue the current flow"]

    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class X1 safety;
```

## Rules the diagrams do not show

- The agent never greets by name. Anyone can pick up a phone, and the caller is unverified until 02 passes. The number lookup only tells the agent whether to expect family members.
- Barge-in: the caller can interrupt at any time. The agent stops, listens, and does not repeat the whole sentence.
- Language: switching is automatic between English and Hindi, and Hinglish is treated as one mode. The agent mirrors the caller's mix and does not announce a switch. A single borrowed English word does not change language.
- Dates and numbers are always spoken in natural form ("Monday, twenty-sixth October", phone numbers in groups of two or three digits), never read as raw digits.
- Distress and anger are judged by what the caller does: says they are upset, repeats the same request three times, swears, or shouts. They are not judged by an automatic mood score.
- The "STT failure" count in step 4 resets after any successfully understood turn.
