# 01 - Safety and urgency

Three separate things, kept apart on purpose:

1. **Emergency**: someone may be in danger now. Never booked. 112 / 108 first.
2. **Urgent, same day**: wants to be seen today. Handled with the doctor's criteria list or a human, never by the agent's judgement.
3. **Medical advice**: always declined, then pivoted to a visit or a nurse callback.

## A. Emergency and self-harm

```mermaid
flowchart TD
    A["Caller turn contains a possible red flag"] --> B{"What kind of signal?"}

    B -->|"Medical: chest pain, trouble breathing,<br/>heavy bleeding, unconscious, fits,<br/>stroke signs, poisoning, serious injury,<br/>pregnancy bleeding, baby not responding"| C{"Happening now,<br/>to someone with the caller?"}
    B -->|"Self-harm or suicide"| SH

    C -->|"yes"| E1
    C -->|"clearly in the past"| P["Treat as routine or urgent<br/>continue to urgency check B"]
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

    SH["Calm, caring line, no lecturing<br/>'If you are in immediate danger call 112.'<br/>Give a mental-health helpline"]
    SH --> SH2["flag_emergency<br/>transfer to staff if on desk,<br/>else callback P1"]

    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class E1,E2,E6,E7,SH,SH2 safety;
```

Rules:

- The agent never books a visit from an emergency path, and never says whether something "sounds serious" or "is probably fine".
- A keyword list is only the minimum. The model also judges intent: "my mother is not waking up" has no keyword and still counts. Tune the whole path to over-trigger rather than miss one.
- Third-person reports count the same as first-person ones.
- Past-tense mentions ("I had chest pain last month, I want a follow-up") are not emergencies, but if the agent cannot tell, it asks once and treats silence as an emergency.
- Test set: build at least 40 phrasings across English, Hindi and Hinglish, with negatives, and require every emergency case to trigger.
- Open item: confirm the helpline numbers to read out before launch (112 national emergency, 108 ambulance in most states, a mental-health helpline such as Tele-MANAS 14416).

## B. Same-day urgent triage (non-emergency)

```mermaid
flowchart TD
    U0["Caller wants a visit<br/>for today, or mentions pain, fever, 'urgent'"] --> U1["Ask the one fixed question:<br/>'Does this need to be seen today?'"]
    U1 --> U2{"Answer"}
    U2 -->|"no"| R["Routine booking flow (03)"]
    U2 -->|"yes"| U3
    U2 -->|"not sure"| U3
    U3["check_urgent_criteria with the caller's own words<br/>against the doctor's list"]
    U3 --> U4{"Result"}

    U4 -->|"match"| U5["get_available_windows: urgent places today"]
    U5 --> U6{"Urgent place free?"}
    U6 -->|"yes"| U7["Offer the earliest urgent window<br/>then book (03 from details step)"]
    U6 -->|"no"| U8
    U4 -->|"no_match or unclear"| U8

    U8["'I will ask our staff to call you within 15 minutes.<br/>Or I can book the earliest regular visit.'"]
    U8 --> U9{"Caller choice"}
    U9 -->|"staff callback"| U10["create_callback priority P1<br/>send_sms 'callback queued'"]
    U9 -->|"regular booking"| R
    U9 -->|"both"| U10
    U10 --> R2{"Also want the regular booking?"}
    R2 -->|"yes"| R
    R2 -->|"no"| Z(["Confirm, close"])

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    class U7,R agent;
    class U10 human;
```

Rules:

- The doctor owns the urgent criteria list (default list shipped, edited at onboarding). Examples: fever in a child under 2, pain after a procedure, wound that is bleeding but controlled, a missed critical medicine.
- The agent only compares what the caller said to the list. When the match is unclear, it hands the decision to a person.
- Staff can override any outcome from the console, including turning a routine booking into an urgent one.
- Unused urgent places are released for routine booking before the session (proposed: 2 hours).

## C. "What should I take?" and other medical advice

```mermaid
flowchart TD
    M0["Caller asks for advice, a dose, a diagnosis,<br/>or 'is this serious'"] --> M1["Say once: 'I cannot give medical advice,<br/>but the doctor can help.'"]
    M1 --> M2{"Any red-flag content?"}
    M2 -->|"yes"| EM["Emergency flow (A)"]
    M2 -->|"no"| M3["Offer: book a visit, or a nurse / doctor callback"]
    M3 --> M4{"Caller choice"}
    M4 -->|"book"| U0["Urgency question (B), then booking"]
    M4 -->|"callback"| M5["create_callback priority P2<br/>reason: medical question"]
    M4 -->|"neither"| M6["Repeat 112 / 108 for emergencies, close politely"]
    M4 -->|"keeps pushing for advice"| M7["Same line once more, then transfer (06)"]

    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class EM safety;
```
