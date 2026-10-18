# Clinic appointment flow: today vs with the agent

## Today (typical clinic)

```mermaid
flowchart TB
    a["Receptionist answers<br/>missed when desk is busy"] --> b["Checks register, gives a time<br/>fixed, rarely kept"]
    b --> c["Writes name in register<br/>no confirmation"]
    c --> d["Nothing until the visit<br/>no reminder or delay notice"]
    d --> e["File made at arrival<br/>fee, vitals, queue"]
    e --> f["Doctor sees patients in arrival order"]
    f --> g["Follow-up: patient calls again"]
```

## With the agent and console

```mermaid
flowchart TB
    a["Agent answers every call<br/>English, Hindi, Hinglish"] --> b["Offers an arrival window<br/>live capacity + urgent pool"]
    b --> c["Creates provisional record<br/>confirmation SMS"]
    c --> d["Reminder and delay updates<br/>window shifts if doctor runs late"]
    d --> e["Staff check in via console<br/>file completed, fee, walk-ins added"]
    e --> f["Doctor sees patients in order<br/>urgent cases first"]
    f --> g["Follow-up booked at checkout<br/>agent reminds before it"]
```

## Scheduling model (arrival windows + live updates)

- Each doctor session is split into arrival windows (default 30 min, 4 patients, 1 urgent place; editable per doctor).
- Caller hears a window, e.g. "come between 10:00 and 10:30".
- Staff tap "next patient" in the console; the system compares actual pace with plan and estimates delay.
- Past a threshold (proposed: 20 min), later windows get a shifted-window SMS (proposed cap: 2 delay messages per patient).
- Urgent tiers: emergency (never booked, 112/108 + alert), urgent same-day (earliest urgent place, else urgent callback), routine (next window).
- Unused urgent places are released for routine booking before the session (proposed: 2 hours before; doctor can change).
