# 11 - Prescription refills

**Rule (Oct 2026):** only the patient's own doctor decides a refill. The agent takes the request and nothing more: it never screens, advises, approves or hints at the outcome. Bolnai never writes, stores or sends a prescription; the doctor issues it.

This replaces the refill part of `05`, where the agent asked how the patient felt and checked a "visit required" medicine list. That put the AI in a clinical role, the list missed brand names, and any desk user could mark a refill approved (security review S-20).

## Why: the rules this follows

Not legal advice; the clinic's doctors and advisor should confirm.

| Rule (India) | What it means here |
|---|---|
| AI and machine-learning platforms "cannot counsel or prescribe any medicine"; AI may support the doctor, who makes the final decision (Telemedicine Practice Guidelines 2020) | The agent asks no clinical questions and makes no medicine judgement. It never says a medicine needs a visit, is fine, or is approved |
| A refill without a visit is the doctor's **follow-up teleconsultation**: the same doctor, within **6 months** of an in-person consultation, for the same condition. A different condition counts as a first consult; after 6 months an in-person visit is needed | The console shows the last in-person visit with that doctor. The database refuses an approval without a completed visit with the same doctor in the last 180 days |
| Phone, audio or text follow-ups can renew medicines already started in person. The prohibited list (**Schedule X** and **NDPS** narcotic and psychotropic drugs) can never be prescribed by teleconsultation. Tramadol has been an NDPS psychotropic since 2018; benzodiazepines such as chlordiazepoxide are NDPS psychotropics too | The doctor confirms "not Schedule X / NDPS" before approving. These go to "Ask the patient to visit" |
| The doctor prescribes only with enough information; if an examination is needed, the teleconsult stops and the patient is seen in person | "Call the patient first" and "Ask the patient to visit" are always available to the doctor |
| The prescription carries the doctor's registration number and signature (a digital signature is allowed). The patient gets a copy; it goes to a pharmacy only with the patient's explicit consent | The doctor issues it from their own pad or e-prescription. Bolnai's SMS only says the doctor has responded, and states that it is not a prescription. No pharmacy routing in v1 |
| Teleconsultation for a minor needs an identified adult | A child's refill is taken only from a registered parent or guardian (enforced in the database) |
| Signing credentials stay with the doctor and are never shared or delegated (NMC advisory, 13 Oct 2026, on remote authentication of records; the same principle applies here) | Each doctor uses their own account, re-enters a PIN to approve, and nobody else can decide a refill. A shared desk login can never approve |
| Controlled lists change: an August 2026 draft moves zopiclone, gabapentin, carisoprodol and flupentixol into Schedule H1 | No hard-coded medicine list anywhere in the agent |

## A. Agent: taking the request

```mermaid
flowchart TD
    R0["Caller asks for a medicine refill<br/>(their own or a family member's)"] --> R1["02 Verification"]
    R1 --> R1a{"Verified?"}
    R1a -->|"no"| R1b["No request taken.<br/>'A staff member will call the patient's<br/>registered number.' create_callback P3"]
    R1a -->|"yes"| R2{"Who is asking?"}

    R2 -->|"the patient"| R4
    R2 -->|"a relative, patient is an adult"| R3["Limited mode (02):<br/>flag 'requested by a relative'"]
    R2 -->|"for a child under 18"| R2a{"Caller is the registered<br/>parent or guardian?"}
    R2a -->|"no"| R2b["'The parent or guardian on the child's<br/>record needs to call.' Offer callback (P3)"]
    R2a -->|"yes"| R3g["Flag 'guardian'"]
    R3 --> R4
    R3g --> R4

    R4{"Request already open,<br/>or 30-day limit reached?"}
    R4 -->|"already open"| R4a["'Your request is already with the doctor.'<br/>No new ticket"]
    R4 -->|"limit reached"| R4b["No ticket. create_callback P3,<br/>tag 'frequent refill requests'"]
    R4 -->|"neither"| R5["Ask only:<br/>1. the medicine name, read from the strip or bottle<br/>2. which doctor prescribed it (default: last doctor seen)<br/>3. about how many days of medicine are left"]

    R5 --> R6{"Caller volunteers new symptoms,<br/>side effects or feeling worse?"}
    R6 -->|"emergency words"| E["01 A emergency script"]
    R6 -->|"yes"| R6a["No advice: 'The doctor should hear about that<br/>directly.' Offer a visit (03) or a same-day callback (P2).<br/>Flag 'new symptoms mentioned'"]
    R6 -->|"no"| R7
    R6a --> R7

    R7{"2 days or less left?"}
    R7 -->|"yes"| R7a["Flag 'runs out soon', create_callback P2:<br/>'If the doctor cannot reply before you run out,<br/>please come in or call us.'"]
    R7 -->|"no"| R8
    R7a --> R8

    R8["create_message_ticket (refill):<br/>patient, doctor, medicine as said, days left,<br/>caller's words, relative / guardian / symptom flags"]
    R8 --> R9["'Dr X will look at this. You will get an SMS on the<br/>registered number when the doctor has responded.<br/>I cannot approve medicines myself.'<br/>SMS refill_received to the registered number"]
    R9 --> R10(["Back to router"])

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class R3,R3g,R4a,R5,R9 agent;
    class R1b,R2b,R4b,R7a,R8 human;
    class E,R6a safety;
```

## B. Doctor: deciding in the console

```mermaid
flowchart TD
    D0["Refill ticket arrives in the console"] --> D1{"Who opens it?"}
    D1 -->|"receptionist, assistant, admin,<br/>or another doctor"| D1a["Sees 'Refill request · Dr Sharma · status' only.<br/>No medicine name. Can mark it seen and chase it,<br/>never decide it"]
    D1 -->|"the patient's own doctor"| D2["Sees: patient, age, who asked (patient, relative, guardian),<br/>medicine as the caller said it, days left, flags,<br/>last in-person visit with this doctor, last 5 refill requests"]

    D2 --> D3{"In-person visit with this doctor<br/>in the last 6 months?"}
    D3 -->|"no"| D3a["Approve disabled:<br/>'Needs an in-person visit (last seen 14 Feb)'"]
    D3a --> V
    D3 -->|"yes"| D4{"Doctor's judgement: same condition,<br/>enough information, allowed by teleconsult<br/>(not Schedule X / NDPS)?"}

    D4 -->|"not sure"| C["Call the patient first<br/>(the doctor's own teleconsult,<br/>on the registered number)"]
    C --> D4
    D4 -->|"needs to be seen"| V["Ask the patient to visit<br/>status visit_requested<br/>SMS refill_visit_needed, booking offered"]
    D4 -->|"no refill, no visit needed"| DE["Decline with a note for the desk<br/>status declined<br/>doctor or desk calls the patient"]
    D4 -->|"yes"| P["Doctor issues the prescription themselves:<br/>signed, with registration number<br/>(own pad left at the desk, or own e-prescription<br/>sent to the patient's registered number)"]

    P --> A["Approve: re-enter PIN, tick the three checks,<br/>choose how it was issued. Status approved"]
    A --> N{"How was it issued?"}
    N -->|"collect at the desk"| N1["SMS refill_collect to the registered number.<br/>The desk hands it over on the patient card"]
    N -->|"doctor sent it to the patient"| N2["SMS refill_doctor_reply<br/>to the registered number"]

    classDef human fill:#eef1fb,stroke:#534ab7;
    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class D2,C,P,A,N1,N2,DE human;
    class D1a,D3a,V safety;
```

## Who can do what

| Action | Agent | Receptionist | Cabin assistant | Patient's own doctor | Other doctor | Admin |
|---|---|---|---|---|---|---|
| Take a refill request | yes (verified caller) | yes | no | yes | no | yes |
| See the medicine name | the caller's own words only, during the call | no | no | yes | no | no |
| Mark seen, chase, call the patient back | no | yes | no | yes | no | yes |
| Approve, decline, ask to visit | **never** | no | no | **yes** | no | no |
| Change the medicine or the caller's words | no | no | no | no | no | no |

The database enforces the last two rows and the doctor-only decision (`db/schema.sql`, `enforce_refill_rules`). The console and API must also enforce the rest (S-06, S-20).

## Rules

- **The agent is a note-taker here.** It asks the three practical questions and nothing clinical. It does not suggest alternatives, over-the-counter medicines or doses, and it never says "approved", "should be fine" or "ready by". It may read back the medicine name the caller just said, to confirm spelling; it never volunteers a medicine name from any record.
- **No list in the agent.** Whether a medicine can be renewed without a visit is the doctor's decision. A list in the agent goes stale, misses brand names, and tells drug-seekers which words to avoid.
- **The doctor's checks are recorded.** An approval stores who decided, when, the last in-person visit date, the three confirmations (same condition, enough information, not Schedule X / NDPS) and how the prescription was issued. The database refuses an approval missing any of them.
- **Messages carry no medicine names** and always go to the patient's registered number, never a number given on the call. Every refill SMS says the doctor has responded; the received SMS says it is not a prescription.
- **Desk handover:** a prescription left at the desk is handed over against the patient card and a name check. A relative collecting it needs the card.
- **Running out:** 2 days or less left (setting) makes a same-day P2 callback, so a patient on insulin or seizure medicine is not left waiting until the next session. The agent still gives no advice; the 112 / 108 line applies as always.
- **Abuse signals shown to the doctor:** requests from relatives, unverified lines, repeat or early requests (last 5 requests listed), and the caller's own words, labelled "Caller said". A line like "the doctor already said yes" is just text: it never changes a status.
- **Limits:** one open refill request per patient, at most 4 per 30 days (setting); beyond that, a staff callback.
- **Approvals need the doctor present:** a PIN re-entry on approve, short sessions and remote sign-out on doctor phones (S-06), so a lost phone cannot approve refills.
- **Not in v1:** sending prescriptions to pharmacies (would need the patient's explicit consent and their choice of pharmacy), storing prescriptions, generating e-prescriptions, and tracking quantities for early-refill alerts.

## Sources

- Telemedicine Practice Guidelines 2020 summaries: [MediaNama](https://www.medianama.com/2020/03/223-summary-india-telemedicine-guidelines/), [PSA Legal FAQ](https://psalegal.com/telemedicine-guidelines-2020-faq/), [AIIMS telemedicine FAQ](https://aiims.edu/images/pdf/notice/FAQ_Telemedicine.pdf), [Khaitan & Co](https://www.khaitanco.com/sites/default/files/2021-08/Ergo_31032020.pdf), [Mondaq](https://www.mondaq.com/india/healthcare/915292/legal-and-regulatory-framework-for-digital-health-telemedicine-practice-guidelines)
- Tramadol under NDPS (2018): [Mondaq](https://mondaq.com/india/food-and-drugs-law/701838/government-declares-tramadol-a-psychotropic-substance-to-curb-its-abuse-and-trafficking)
- Chlordiazepoxide as an NDPS psychotropic, and pharmacy record duties: [Punjab and Haryana High Court, CWP-26127-2026](https://www.livelaw.in/pdf_upload/2026/09/02/18-697567.pdf)
- Draft Schedule H1 additions (Aug 2026): [Medical Dialogues](https://medicaldialogues.in/amp/news/industry/pharma/health-ministry-proposes-tighter-prescription-monitoring-for-4-cns-drugs-178041)
- NMC advisory on remote authentication (13 Oct 2026): [Medical Dialogues](https://medicaldialogues.in/health-news/nmc/nmc-issues-advisory-for-doctors-on-remote-authentication-of-medical-records-via-digital-signatures-181173)
