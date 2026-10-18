# 10 - Fees, payments and refunds

Decided:

- **Priority visits** are offered for **specialists and super-specialists** only.
- The clinic can also set a **required appointment fee** per doctor.
- Patients pay by **UPI link sent on WhatsApp after the call**, or in **cash at the desk**. The clinic chooses which methods it accepts.
- **If the doctor is not available**, the agent first offers rescheduling. If the patient still wants their money back, a **partial or full refund** is processed by the clinic's rule.

The agent never moves money. It explains fees, records the patient's agreement, triggers the payment link, and raises refund requests. Staff approve refunds in the console (setting `refund_needs_approval`, on by default).

## A. Fees at booking (called from 03 after the caller confirms the read-back, B17f and P5)

```mermaid
flowchart TD
    F0(["Caller confirmed the booking details (03)"]) --> F1{"Fees on this visit?"}
    F1 -->|"none"| OK(["agreed: back to 03 create_booking"])
    F1 -->|"appointment fee, priority fee, or both"| F2["State each fee and the total, plainly:<br/>'Dr Kaur's appointment fee is Rs 200.<br/>The priority visit is Rs 500 extra. Total Rs 700.'"]
    F2 --> F3{"Clear yes to the amount?"}
    F3 -->|"no to the priority fee only"| F3a["Drop priority; offer a regular place (03 B6)"]
    F3 -->|"no to the appointment fee"| F3b["Offer another doctor without a fee<br/>(only if they did not name this doctor),<br/>or a staff callback"]
    F3b --> NO(["declined: back to 03, release the hold"])
    F3a --> NO
    F3 -->|"yes"| F4["Record the yes: time, amounts, call ID"]
    F4 --> F5{"How would you like to pay?<br/>(only methods the clinic accepts)"}
    F5 -->|"UPI"| F6{"Is this number on WhatsApp?"}
    F6 -->|"yes"| F7["Ask permission for WhatsApp:<br/>'I will send a payment link on WhatsApp after this call.<br/>It works for 30 minutes.'"]
    F6 -->|"no"| F6a{"Clinic allows links by SMS?"}
    F6a -->|"yes"| F7s["Link by SMS after the call<br/>(link domain registered with the DLT template)"]
    F6a -->|"no"| F8
    F5 -->|"cash at the desk"| F8["'Please pay Rs X at the desk when you arrive.'"]
    F7 --> OK2(["agreed: back to 03 create_booking<br/>payment method saved on the booking"])
    F7s --> OK2
    F8 --> OK2

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    class F4,F7,F7s,F8 agent;
```

## B. After the call: payment link follow-up

```mermaid
flowchart TD
    L0(["Booking saved with UPI chosen"]) --> L1["create_payment_link for the total<br/>WhatsApp 'payment_link' template with the booking details"]
    L1 --> L2{"Gateway result"}
    L2 -->|"paid"| L3["Mark paid, WhatsApp 'payment_received'"]
    L2 -->|"failed"| L4["New link once"]
    L4 --> L2
    L2 -->|"link expired unpaid (30 min)"| L5{"Reminders sent?"}
    L5 -->|"none yet"| L6["One reminder with a fresh link<br/>WhatsApp 'payment_reminder'"]
    L6 --> L2
    L5 -->|"one already"| L7{"Clinic requires payment<br/>to keep the booking?"}
    L7 -->|"no (default)"| L8["Booking stays; switches to 'pay at the desk'<br/>console shows 'fee due'"]
    L7 -->|"yes"| L9["Release the booking, send 'cancelled'<br/>staff see it in the console"]
```

## C. Doctor not available (parallel tree, clinic-caused)

Starts when the doctor is absent or the session is cancelled (09 X5). It also starts when the patient cancels after the delay-choice call (09 D14). It runs for every affected booking; the refund branch only exists if something was paid.

```mermaid
flowchart TD
    C0(["Doctor not available for this visit"]) --> C1{"Any-doctor booking and another<br/>pool doctor is free today?"}
    C1 -->|"yes"| C1a["Move to that doctor (09)<br/>fees stay with the visit; send 'doctor changed'"]
    C1 -->|"no"| C2["Agent calls the patient (07),<br/>or tells them if they call in (04)"]
    C2 --> C3["Offer rescheduling first:<br/>'Dr Kaur is not available today. I can book you on Thursday,<br/>5 to 5:30. Your payment carries over.'"]
    C3 --> C4{"Patient choice"}
    C4 -->|"takes a new slot"| C5["Reschedule; fees move to the new visit<br/>send 'rescheduled'"]
    C4 -->|"different time"| C4a{"Offers made so far"}
    C4a -->|"one"| C3b["Offer one more set of slots"]
    C3b --> C4
    C4a -->|"two"| C6
    C4 -->|"wants the money back"| C6{"Anything paid?"}
    C6 -->|"no"| C7["Cancel, send 'cancelled'<br/>(unpaid link closed)"]
    C6 -->|"yes"| C8["request_refund: clinic-caused share<br/>(default 100%)"]
    C8 --> C9["Tell the patient what happens next:<br/>'Our staff will refund Rs X to your UPI account.<br/>It usually takes a few working days.'<br/>Cash payers: collect it at the desk"]
    C9 --> C10["Staff approve in the console<br/>(can change the amount, with a note)"]
    C10 --> C11{"Paid by"}
    C11 -->|"UPI"| C12["Refund through the payment gateway"]
    C11 -->|"cash"| C13["Cash refund at the desk, marked by staff"]
    C12 --> C14["WhatsApp 'refund_update'"]
    C13 --> C14
    C2 --> C15["Not reached after retries"]
    C15 --> C16["Hold the doctor's next free slot for them<br/>send 'slot kept'; staff callback P2"]

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    class C3,C5,C8,C9 agent;
    class C10,C12,C13,C16 human;
```

## D. Patient cancels a paid visit (04)

```mermaid
flowchart TD
    D0(["Verified caller cancels a visit with a paid fee"]) --> D1["Offer rescheduling once; payment carries over"]
    D1 --> D2{"Reschedules?"}
    D2 -->|"yes"| D3["04 reschedule"]
    D2 -->|"no"| D4{"How long before the window?"}
    D4 -->|"24 hours or more"| D5["request_refund: full"]
    D4 -->|"less than 24 hours"| D6["request_refund: late-cancellation share<br/>(default 50%)"]
    D5 --> D7["Say the amount and that staff will process it<br/>then staff approval as in C10 onwards"]
    D6 --> D7
```

No-shows get no refund request. Staff can still grant a goodwill refund from the console.

## Rules

- **Fees are read out before booking**, with the total, and the booking needs a clear yes to that amount. The time, the amounts and the call ID are stored. The database refuses an agent booking with a fee but no recorded yes or no payment method.
- **WhatsApp needs permission.** The agent asks before sending anything on WhatsApp, and the answer is stored as consent. WhatsApp business messages use pre-approved templates (utility category), separate from SMS DLT templates.
- **Links go only to the number on the booking**, never to a number read out on the call, and never in a voicemail.
- **One reminder** for an unpaid link. After that, the fee is collected at the desk, unless the clinic requires payment to keep the booking.
- **Rescheduling is offered at most twice** before a refund. Once the patient asks for the money back, the agent stops offering.
- **The agent never says a refund is done.** It says a request has been raised, gives the clinic's usual timeline, and staff approve. The database refuses refunds that would add up to more than was paid.
- **Refund rules** (proposed values, clinic to confirm; all are settings):

  | Reason | Default |
  |---|---|
  | Doctor absent, session cancelled, or patient cancels after the delay-choice call | Full refund |
  | Patient cancels 24+ hours before | Full refund |
  | Patient cancels within 24 hours | 50% |
  | No-show | None (staff may grant goodwill) |

  Keeping part of the fee when the clinic itself cancelled is likely to cause complaints, and may not be allowed under India's consumer protection rules. The clinic should get that checked.
- **Demo:** payment gateway in test mode and WhatsApp messages shown in the console outbox, as with SMS. No real money moves.
