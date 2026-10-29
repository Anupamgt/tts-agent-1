# 01 - Safety and same-day requests

Words matter here, so the terms are fixed:

| Term | Meaning in this project |
|---|---|
| **Emergency** | Someone may be in danger now (heart attack signs, breathing trouble, heavy bleeding...). Never booked. 112 / 108 first. Part A. |
| **Priority visit** | What the clinic calls "urgent": the patient pays an extra fee to be seen before regular patients. A product, not a medical judgement. Booked in 03 part P. |
| **Same-day request** | Caller wants to be seen today but there is no emergency signal. Part B. |
| **Medical advice** | Always declined, then pivoted to a visit or a callback. Part C. |

The agent never says "urgent" to callers. It says "priority visit", so nobody thinks the agent has judged how sick they are.

## A. Emergency and self-harm

```mermaid
flowchart TD
    A["Caller turn contains a possible red flag"] --> B{"What kind of signal?"}

    B -->|"Medical: chest pain, trouble breathing,<br/>heavy bleeding, unconscious, fits,<br/>stroke signs, poisoning, serious injury,<br/>pregnancy bleeding, baby not responding"| C{"Happening now,<br/>to someone with the caller?"}
    B -->|"Self-harm or suicide"| SH

    C -->|"yes"| E1
    C -->|"clearly in the past"| P["Not an emergency<br/>continue the normal flow"]
    C -->|"unclear"| C2["Ask once:<br/>'Is this happening right now?'"]
    C2 -->|"yes"| E1
    C2 -->|"no, it was earlier"| P
    C2 -->|"no answer or still unclear"| E1

    E1["Fixed script in the caller's language:<br/>'Please call 112 or 108 right now.'"]
    E1 --> E2["flag_emergency<br/>console alert with snippet and caller number"]
    E2 --> E3{"Caller says they are calling<br/>or already have help?"}
    E3 -->|"yes"| E4["Short close, offer a staff callback later<br/>end call"]
    E3 -->|"no or unsure"| E5{"Staff on desk right now?"}
    E5 -->|"yes"| E6["transfer_call to staff<br/>say the 112 / 108 line once more"]
    E5 -->|"no"| E7["Repeat 112 / 108 once<br/>create_callback priority P1<br/>stay on the line until the caller hangs up"]

    SH["Calm, caring line, no lecturing<br/>'If you are in immediate danger call 112.'<br/>Give Tele-MANAS: 14416,<br/>free, any time of day"]
    SH --> SH2["flag_emergency<br/>transfer to staff if on desk,<br/>else callback P1"]

    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class E1,E2,E6,E7,SH,SH2 safety;
```

Rules:

- The agent never books a visit from an emergency path, never offers a priority visit to someone in an emergency, and never says whether something "sounds serious" or "is probably fine".
- A keyword list is only the minimum. The model also judges intent: "my mother is not waking up" has no keyword and still counts. Tune the whole path to over-trigger rather than miss one.
- Third-person reports count the same as first-person ones.
- Past-tense mentions ("I had chest pain last month, I want a follow-up") are not emergencies, but if the agent cannot tell, it asks once and treats silence as an emergency.
- Test set: build at least 40 phrasings across English, Hindi and Hinglish, with negatives, and require every emergency case to trigger.
- Numbers (decided 29 Oct 2026, D-01 in `docs/decision-log.md`): 112 national emergency, 108 ambulance (most states), and for self-harm or distress Tele-MANAS 14416 (also 1800-891-4416), the free 24x7 national tele mental health line. The agent never tries to transfer a caller to 112. The clinic still signs off the exact wording before any real patient call.

## B. Same-day request (no emergency signal)

The doctor-defined "urgent criteria" list from the earlier draft is gone. The agent no longer sorts callers by how sick they sound; it only offers what is available.

```mermaid
flowchart TD
    U0["Caller wants to be seen today or as soon as possible<br/>no emergency signal"] --> U1["get_available_windows for today<br/>named doctor, or every doctor in the pool"]
    U1 --> U2{"Regular place left today?"}
    U2 -->|"yes"| U3["Offer the earliest regular window<br/>(03, step B10)"]
    U2 -->|"no"| U4{"Priority place left today,<br/>and this doctor offers priority?"}
    U4 -->|"yes"| U5["Say once, neutrally:<br/>'Regular visits today are full. A priority visit is<br/>available for Rs X extra, or I can ask our staff to call you.'"]
    U4 -->|"no"| U6["'Today is full. I can book the earliest visit tomorrow,<br/>or ask our staff to call you.'"]
    U5 --> U7{"Caller choice"}
    U7 -->|"priority visit"| PR["03 part P: priority booking"]
    U7 -->|"staff callback"| CB
    U7 -->|"another day"| NX["03 booking for the next day"]
    U6 --> U8{"Caller choice"}
    U8 -->|"tomorrow"| NX
    U8 -->|"staff callback"| CB
    CB["create_callback priority P2<br/>reason: wants to be seen today<br/>due before today's session ends"]
    CB --> CB2["send_sms 'callback queued'<br/>staff decide whether to fit them in"]

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    class U3,NX,PR agent;
    class CB,CB2 human;
```

Rules:

- A priority visit is mentioned only when the caller asks to be seen first, or when regular places on the requested day are full. It is never offered as a reply to symptoms, and it is mentioned once, without pressure.
- If the caller describes symptoms getting worse while talking, the global emergency check (00) runs on that turn, as on every turn.
- Staff can squeeze a same-day caller in from the console. The agent does not promise that they will.

## C. "What should I take?" and other medical advice

```mermaid
flowchart TD
    M0["Caller asks for advice, a dose, a diagnosis,<br/>or 'is this serious'"] --> M1["Say once: 'I cannot give medical advice,<br/>but the doctor can help.'"]
    M1 --> M2{"Any red-flag content?"}
    M2 -->|"yes"| EM["Emergency flow (A)"]
    M2 -->|"no"| M3["Offer: book a visit, or a doctor callback"]
    M3 --> M4{"Caller choice"}
    M4 -->|"book"| BK["03 booking (B above if they want today)"]
    M4 -->|"callback"| M5["create_callback priority P2<br/>reason: medical question"]
    M4 -->|"neither"| M6["Repeat 112 / 108 for emergencies, close politely"]
    M4 -->|"keeps pushing for advice"| M7["Same line once more, then transfer (06)"]

    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class EM safety;
```
