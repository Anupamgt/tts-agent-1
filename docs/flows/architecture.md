# System architecture

```mermaid
flowchart TB
    caller["Patient caller<br/>any phone, any language"]
    staff["Clinic staff phone<br/>receives live transfers"]
    bolna["Bolna voice agent (cloud)<br/>number, STT, LLM, voice, language switching"]
    api["Backend API (public URL)<br/>tools, webhooks, reminder scheduler"]
    pg[("Postgres<br/>source of truth")]
    gcal["Google Calendar<br/>mirror + doctor busy time"]
    console["Admin console<br/>human in the loop"]

    caller <--> bolna
    bolna -->|transfer call| staff
    bolna -->|lookup, tool calls, webhooks| api
    api -->|outbound calls| bolna
    api <--> pg
    api <--> gcal
    api <--> console
```

Notes (from Bolna docs, checked Oct 2026):
- Bolna calls the backend from three fixed IPs; the endpoint must be publicly reachable (tunnel or deployment).
- Google Calendar has no built-in Bolna integration (only Cal.com), so booking tools are custom function calls.
- Inbound caller lookup: Bolna sends the caller number to the backend and injects the returned JSON into the prompt.
- The Transfer Call tool forwards to a phone number; what happens when nobody answers is undocumented, so the backend needs a "staff on desk" check and a callback fallback.
