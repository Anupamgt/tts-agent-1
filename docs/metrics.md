# Success metrics (summary)

The full model, with the metric tree drawing, the clinic value model, targets by stage and sources, is the doc "Bolnai success metrics model": https://claude.ai/artifact/FSXF4LNjKg5znEgeg6adgx (22 Oct 2026). All targets are proposals until the pilot measures the baseline.

## North star

**Saved calls per clinic per week:** inbound calls the desk could not take (forwarded on busy or no answer, or outside desk hours) that end in the right outcome. A booking made, changed or cancelled, an info answer, a message or refill request taken, a connected transfer, or a callback closed by its due time all count. Emergencies are counted under safety, never as volume. A repeat call from the same number about the same thing within 24 hours cancels the first.

**Save rate** = saved calls / calls the desk could not take. Targets: 60% pilot, 70% design partners, 75% paid launch.

Saved calls = calls the desk could not take x answer rate x resolution rate.

## Clinic value

Rupees recovered = answered calls x resolved x booking share x show rate x lost share x fee. On the working assumptions (80% resolved, 50% bookings, 75% show, 50% would have been lost, Rs 500 fee), a Clinic-tier clinic using 400 of its 500 calls recovers about Rs 30,000 a month for Rs 9,999. The lost share is the biggest unknown; the baseline measures it from the clinic's call log for 2 weeks before go-live.

## Safety limits (block a release)

Emergency routing 100%; zero medical advice; zero refill rule breaks; zero details to unverified callers; wrong bookings under 1%; wrong information zero on the test set and under 1% in the weekly audit.

## What the product needs for this

| Need | Where it lands |
|---|---|
| Why the call reached Bolnai (busy, no answer, after hours, all calls, web) on every call | `calls` table; telephony forward reason |
| Call reviews table for the weekly 50-call audit | Database |
| "Agent error" reason on booking changes | `booking_changes` |
| Clinic trial and go-live dates; usage per 4-minute block, emergencies excluded | Database, billing |
| Per-turn timing from Bolna | Call webhook |
| Daily metrics view per clinic | Database view feeding the console day summary |
| Test sets: emergency (100+ calls), red team, every flow branch | Test harness, run before the demo and every release |
