# PriorityMark

The callback and alert priority mark: P1 `!!!`, P2 `!!` on the attention fill, P3 `!` on neutral, borrowing the exclamation-mark convention of medical alarm displays so the level reads without colour.

- Provide: `level` (`P1` | `P2` | `P3`) and, for P1, `quiet` once it is acknowledged and not overdue. The mark carries its own screen-reader label ("P1, high priority").
- What the levels mean (callback targets are clinic settings):
  - P1: emergency or self-harm flagged on a call. Staff call back within 15 minutes. Solid `emergency` fill while new or overdue; `quiet` (emergency text on `emergency-soft`) once acknowledged and on time.
  - P2: wants to be seen today and nothing is free, upset caller, medical question, failed transfer, failed booking, delay call not reached. Within 2 hours, or before today's session ends.
  - P3: messages, verification help, reports, billing, non-patient calls. Next working session.
- Use it at the start of a callback row or alert, always in the same column, so the eye can run down the list. CallbackRow sets `quiet` for you.
- This is not the paid priority visit. A priority visit is a StatusBadge with `tone="priority"` (violet); never put `!` marks on a booking.
