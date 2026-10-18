# 02 - Identity verification

Decided: the main check is **name + patient ID** (printed on the patient card). If the caller does not know the ID, **name + date of birth** finds it. Relatives get **limited mode**.

## What needs verification

| Action | Verification | Why |
|---|---|---|
| Hours, address, fees, holidays, doctor schedule | None | Public information |
| "Is Dr X running late today" | None | About the doctor, not a patient |
| Book a new visit | Existing patient: verified. New patient: name, age or date of birth, phone; a patient ID is created | Needs the right file, but reveals nothing |
| View, reschedule or cancel a booking | Verified | Reveals appointment details |
| Message or refill request for the doctor | Verified | Medical context |
| Anything read out about a patient's history | Not in v1 | No access to medical records |

India does not use HIPAA; the equivalent obligations come from the DPDP Act.

## Verification flow

```mermaid
flowchart TD
    V0["An action needs verification"] --> V1["'Please tell me the patient's full name<br/>and the patient ID on the card.'"]
    V1 --> V2{"Caller has the patient ID?"}

    V2 -->|"yes"| V3["Read the ID back in groups of 2 or 3 digits<br/>'Is that 12 34 567?'"]
    V3 --> V3b{"Confirmed, and the check digit is valid?"}
    V3b -->|"no"| V3c["Ask for the ID once more, digit by digit"]
    V3c --> V3
    V3b -->|"yes"| V4["match_patient with name + patient ID"]
    V4 --> V5{"ID exists and the name matches it?"}
    V5 -->|"yes"| V9
    V5 -->|"no"| V8

    V2 -->|"no, does not know it"| V6["'No problem. What is the date of birth?'"]
    V6 --> V7["match_patient with name + date of birth<br/>(fuzzy on spelling, Hindi / English names)"]
    V7 --> V7b{"Result"}
    V7b -->|"one match"| V7c["Offer to SMS the patient ID<br/>to the registered number for next time"]
    V7c --> V9
    V7b -->|"two or more matches"| V7d["Second check: last 4 digits<br/>of the registered mobile"]
    V7d --> V7e{"Exactly one now?"}
    V7e -->|"yes"| V7c
    V7e -->|"no"| V8
    V7b -->|"no match"| V8

    V8{"Attempts used"}
    V8 -->|"fewer than 2"| V8a["'I could not find that. Could you say it again,<br/>or spell the name?'"]
    V8a --> V1
    V8 -->|"2 used"| V10["Stay neutral: never say which detail was wrong"]
    V10 --> V11{"What does the caller want?"}
    V11 -->|"a new booking"| N["Register as new patient: booking only<br/>new patient ID created (03)"]
    V11 -->|"existing booking or message"| V12["Offer staff callback to verify<br/>create_callback priority P3"]

    V9["Verified for this patient, this call only"] --> V13{"Caller is the patient<br/>or calling for them?"}
    V13 -->|"the patient"| OK(["Continue with the action"])
    V13 -->|"a relative or friend"| V14["Limited mode"]
    V14 --> OK

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    class V9,OK,N agent;
    class V12 human;
```

## Rules

- **Patient ID format:** digits only, so it can be spoken in English, Hindi or mixed, with a final check digit. For example, `123456` plus check digit `6` gives `1234566`. The check digit catches most single misheard digits and swapped neighbours before the database is even asked. If the clinic already has IDs with letters or slashes, the system matches on the digits in them and the read-back includes the letters.
- **New patients** get a patient ID the moment the agent creates their record. It goes into the booking SMS, and staff write it on the card at the first visit.
- **The ID is never read aloud** to someone who verified by date of birth. It is sent by SMS to the registered number instead, so it reaches the patient's own phone.
- **Name and ID must agree.** A valid ID with a different name is a failed attempt (it may belong to another family member). The agent does not reveal whose ID it is.
- Verification lasts for this call and this patient. If the caller switches to a different patient (a mother booking for herself, then her son), verify again.
- A shared number is normal. The agent never lists the names linked to a number.
- **Limited mode** (decided): a relative or friend may book, reschedule, cancel and leave a message for the doctor, and hears only the booking details they need. Refill requests from a relative are logged with a "requested by a relative" flag.
- Never confirm or deny that a person is a patient of the clinic to an unverified caller.
- Log every attempt (method, result) in the console for audit.
