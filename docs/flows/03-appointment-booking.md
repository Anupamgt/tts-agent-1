# 03 - Appointment booking (new visit)

```mermaid
flowchart TD
    B0(["Caller wants to book"]) --> B1{"Clinic open for<br/>the requested day?"}
    B1 -->|"holiday or closed"| B1a["Say so, offer the next open day"]
    B1a --> B2
    B1 -->|"open, or no day given yet"| B2

    B2{"More than one doctor?"}
    B2 -->|"no"| B4
    B2 -->|"yes"| B3["Ask doctor or specialty<br/>'any doctor' means earliest across all"]
    B3 --> B4

    B4["Ask visit type: first visit, follow-up, other"]
    B4 --> B5{"Mentions pain, fever,<br/>'today', 'urgent'?"}
    B5 -->|"yes"| URG["01 B: urgency question"]
    B5 -->|"no"| B6

    B6["Ask preferred day and time of day<br/>understand 'kal', 'parso', 'Monday', 'this week'"]
    B6 --> B7{"Same doctor already booked<br/>for this person that day?"}
    B7 -->|"yes"| B7a["Offer to reschedule that one instead (04)"]
    B7 -->|"no"| B8

    B8["get_available_windows<br/>doctor, date range"]
    B8 --> B9{"Windows on the<br/>requested day?"}
    B9 -->|"yes"| B10
    B9 -->|"no"| B9a{"Windows in the<br/>next 7 days?"}
    B9a -->|"yes"| B9b["Offer the 2 nearest, say the day"]
    B9b --> B10
    B9a -->|"no"| W["Offer the waitlist or a staff callback<br/>create_callback priority P3"]

    B10["Offer at most 2 windows<br/>'Monday, between 10 and 10:30, or 11 to 11:30?'"]
    B10 --> B11{"Caller reply"}
    B11 -->|"takes one"| B12
    B11 -->|"wants other time or day"| B11a{"Rounds used"}
    B11a -->|"fewer than 3"| B6
    B11a -->|"3 used"| W
    B11 -->|"no thanks"| B11b(["Close politely, offer to call back"])

    B12["hold_window for 90 s"] --> B13{"Hold granted?"}
    B13 -->|"no, just taken"| B13a["'That one was just taken.'"]
    B13a --> B8
    B13 -->|"yes"| B14

    B14{"Patient known and verified?"}
    B14 -->|"no, existing patient"| V["02 Verification"]
    B14 -->|"no, new patient"| B15["Collect: full name, age or date of birth,<br/>confirm the phone number<br/>nothing medical"]
    B14 -->|"yes"| B16
    V --> B16
    B15 --> B16

    B16["Read back: patient name, doctor,<br/>day and date, arrival window<br/>'Is that right?'"]
    B16 --> B17{"Caller confirms?"}
    B17 -->|"yes"| B18["create_booking"]
    B17 -->|"fix something"| B17a["Correct the detail, read back again"]
    B17a --> B16
    B17 -->|"cancel"| REL["Release the hold"]
    REL --> B11b

    B18 --> B19{"Result"}
    B19 -->|"ok"| B20["send_sms 'booking confirmed'<br/>say what the SMS contains<br/>mirror to calendar in the background"]
    B19 -->|"conflict"| B19a["Hold lost, re-offer (back to B8)"]
    B19 -->|"error"| B19b["'I could not complete that right now.'<br/>create_callback priority P2, confirm callback"]
    B20 --> B21["Tell them: arrive in the window,<br/>patients are seen in arrival order,<br/>we will text if the doctor is late"]
    B21 --> B22(["Back to router: anything else?"])

    classDef agent fill:#e1f5ee,stroke:#0f6e56;
    classDef human fill:#eef1fb,stroke:#534ab7;
    classDef safety fill:#fde8e8,stroke:#a32d2d;
    class B18,B20,B21 agent;
    class W,B19b human;
    class URG safety;
```

## Rules

- The agent offers a window, never a promised clock time. It says what a window means once, in plain words: "come any time in this half hour; patients are seen in the order they arrive."
- Maximum two options per offer, maximum three offer rounds. After that, a person takes over; endless back-and-forth wastes the caller's time.
- Same-day routine bookings are only offered for windows that start at least 30 minutes from now (proposed).
- A hold lasts 90 seconds (proposed). If the caller hangs up during the hold, the window is released and the console logs an "abandoned booking" with the number, so staff can call back if they wish.
- The booking writes to Postgres first, and the database constraint on windows stops double-booking. The Google Calendar mirror runs afterwards; if the calendar call fails, the booking still stands and the mirror retries (see 08).
- No medical details are collected for a booking. The visit type and, at most, a short reason category go into the record.
- Read-back always uses the spoken date form, and reads the arrival window as a range.
- A doctor on leave, in the middle of a delay flagged as 60+ minutes, or with a cancelled session does not appear in the window results at all.
