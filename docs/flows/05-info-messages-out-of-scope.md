# 05 - Clinic info, messages, and out-of-scope requests

## Clinic information

```mermaid
flowchart TD
    I0["Caller asks about the clinic"] --> I1{"Topic"}
    I1 -->|"hours or holidays"| I2["get_clinic_info: opening hours,<br/>today and next closure"]
    I1 -->|"address or directions"| I3["Address, landmark, parking<br/>offer to send it by SMS"]
    I1 -->|"fees"| I4["Consultation fee from the list"]
    I1 -->|"doctors and days"| I5["Doctor, specialty, session days and times"]
    I1 -->|"services, tests, vaccines"| I6["Answer from the clinic's service list"]
    I1 -->|"something not in the list"| I7["'I do not have that information.'<br/>offer a staff callback (P3)"]
    I2 --> I8
    I3 --> I8
    I4 --> I8
    I5 --> I8
    I6 --> I8
    I8{"Wants to book now?"}
    I8 -->|"yes"| BK(["03 Booking"])
    I8 -->|"no"| I9(["Back to router"])

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    class I2,I3,I4,I5,I6 agent;
```

Answers come only from the clinic's own information (knowledge base and `get_clinic_info`). If it is not there, the agent says it does not know and never guesses, especially on fees and test availability.

## Message or refill request for the doctor

```mermaid
flowchart TD
    M0["Caller wants to leave a message,<br/>or asks for a medicine refill"] --> M1["02 Verification"]
    M1 --> M1a{"Verified?"}
    M1a -->|"no"| M1b["Offer staff callback to verify (P3)"]
    M1a -->|"yes"| M2{"Type of request"}

    M2 -->|"refill"| M3["Ask: medicine name as on the strip,<br/>how long since the last visit,<br/>any change in how they feel?"]
    M3 --> M4{"Caller mentions new symptoms,<br/>side effects, or feeling worse?"}
    M4 -->|"yes"| M4a["Do not log as a plain refill.<br/>01 C: no medical advice, offer visit or nurse callback"]
    M4 -->|"no"| M5{"Medicine on the clinic's<br/>'visit required' list?"}
    M5 -->|"yes (controlled or restricted)"| M5a["'The doctor needs to see you for this.'<br/>offer booking (03)"]
    M5 -->|"no"| M6
    M2 -->|"question for the doctor"| M7["Take the message in the caller's words,<br/>read back a short summary"]
    M2 -->|"report question"| RP["Reports flow below"]
    M7 --> M6
    M6["create_message_ticket<br/>type, patient, medicine or message, caller's words,<br/>verified status, relative flag"]
    M6 --> M8["Tell the caller:<br/>who will review it and when,<br/>and how they will hear back (call or SMS)"]
    M8 --> M9(["Back to router"])

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class M3,M7 agent;
    class M6,M8 human;
    class M4a safety;
```

Rules:

- The agent cannot approve a refill. It records the request; the doctor decides in the console.
- Every ticket tells the caller a realistic reply time. If the clinic has not set one, the default is "within the next working session".
- The pharmacy question from the US draft is dropped; Indian refills are normally collected from any pharmacy. Add it back if a partner clinic wants it.
- A refill request from a relative is logged with a "requested by a relative" flag so the doctor can decide whether to contact the patient directly.

## Reports and lab results

```mermaid
flowchart TD
    P0["Caller asks about a report or test result"] --> P1["Never read values or findings aloud"]
    P1 --> P2{"Does the clinic share reports<br/>by portal, WhatsApp, or pickup?"}
    P2 -->|"yes"| P3["Say how, and when the report is usually ready"]
    P2 -->|"no or not sure"| P4["Offer a staff callback (P3)"]
    P3 --> P5{"Asks what the result means?"}
    P4 --> P5
    P5 -->|"yes"| P6["01 C: no medical advice, offer visit or doctor callback"]
    P5 -->|"no"| P7(["Back to router"])
```

## Billing and payment questions

Billing disputes, payment plans, refunds and insurance claims go to a human: transfer when staff are on desk, otherwise a callback (06). Simple facts such as the consultation fee are answered by the info flow above.

## Out-of-scope calls

```mermaid
flowchart TD
    O0["Caller is not a patient request"] --> O1{"Type"}
    O1 -->|"sales or marketing call"| O2["Polite decline, end call, tag 'sales' in console"]
    O1 -->|"wrong number"| O3["Say this is the clinic, ask if they need the clinic, else end"]
    O1 -->|"job or vendor enquiry"| O4["Take name and number, create_callback P3,<br/>tag 'non-patient'"]
    O1 -->|"police, insurer, lab, courier"| O5["Transfer to staff if on desk,<br/>else callback P3"]
    O1 -->|"abusive or prank"| O6["One calm warning, then end call, tag 'abusive'"]
    O1 -->|"asks about another person's visit"| O7["Do not confirm anything.<br/>Offer verification path (02)"]
```
