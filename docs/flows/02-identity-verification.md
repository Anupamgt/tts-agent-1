# 02 - Identity verification

## What needs verification

| Action | Verification | Why |
|---|---|---|
| Hours, address, fees, holidays, doctor schedule | None | Public information |
| "Is Dr X running late today" | None | About the doctor, not a patient |
| Book a new visit | Name and phone collected, matched to an existing record if one exists | Needs the right file, but reveals nothing |
| View, reschedule or cancel a booking | Verified patient (two identifiers) | Reveals appointment details |
| Message or refill request for the doctor | Verified patient | Medical context |
| Anything read out about a patient's history | Not in v1 | No access to medical records |

India does not use HIPAA; the equivalent obligations come from the DPDP Act. The two-identifier rule is kept because it works and is easy to explain.

## Verification flow

```mermaid
flowchart TD
    V0["An action needs verification"] --> V1["Ask:<br/>'Who is the visit for? Please say the full name<br/>and date of birth.'"]
    V1 --> V2["match_patient with name and date of birth<br/>(fuzzy on spelling, Hindi / English names)"]
    V2 --> V3{"Result"}

    V3 -->|"one match"| V4["Read back the spelling of the name<br/>only, never other details"]
    V4 --> V5{"Caller confirms?"}
    V5 -->|"yes"| V6
    V5 -->|"no"| V8
    V3 -->|"two or more matches"| V7["Ask for a second identifier:<br/>last 4 digits of the registered mobile"]
    V7 --> V7b{"Matches exactly one?"}
    V7b -->|"yes"| V6
    V7b -->|"no"| V8
    V3 -->|"no match"| V8

    V8{"Attempts used"}
    V8 -->|"fewer than 2"| V9["'I could not find that. Could you spell the name<br/>or say the date of birth again?'"]
    V9 --> V2
    V8 -->|"2 used"| V10["Do not say which detail was wrong"]
    V10 --> V11{"What does the caller want?"}
    V11 -->|"a new booking"| N["Register as new patient: booking only<br/>(03)"]
    V11 -->|"existing booking or message"| V12["Offer staff callback to verify<br/>create_callback priority P3"]

    V6["Verified for this patient, this call only"] --> V13{"Caller is the patient<br/>or calling for them?"}
    V13 -->|"the patient"| OK(["Continue with the action"])
    V13 -->|"a relative or friend"| V14["Limited mode"]
    V14 --> OK

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    class V6,OK,N agent;
    class V12 human;
```

## Rules

- Verification lasts for this call and this patient. If the caller switches to a different patient (a mother booking for herself, then her son), verify again.
- A shared number is normal. A number linked to several patients is expected, not a warning sign. The agent never lists the names on file.
- Limited mode (caller is not the patient): may book, reschedule, cancel and leave a message for the doctor. May hear only the booking details they need. Refill requests are logged but marked "requested by a relative". This is an assumption to confirm with the clinic.
- Never confirm or deny that a person is a patient of the clinic to an unverified caller.
- After two failed attempts, the agent stays neutral ("I could not match those details") and offers a human, instead of letting the caller keep guessing.
- Name matching is phonetic as well as exact: "Sharma", "Sarma" and the Devanagari spelling should reach the same record. The read-back of the spelling is the safety net.
- Log every verification attempt (success, fail, number) in the console for audit.
