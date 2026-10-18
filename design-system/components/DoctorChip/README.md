# DoctorChip

One doctor's session at a glance: name, how far behind the plan they are, and whether that number is live (from Call next taps) or only from the schedule.

- Provide: `name`, `delayMin`, `basis` (`live` | `schedule`), `status` (`planned` | `started` | `paused` | `ended` | `cancelled`), optional `startsAt` for planned sessions, `threshold` (the clinic's late threshold, 20 min by default) and `title` for the hover text ("No tap from the cabin for 32 min").
- Use it at the top of each doctor column on Today, in the top bar's doctor strip, and on the doctor view.
- States:
  - On time or a little late, live: white chip, `ok` dot, "+10 min · live".
  - Late at or over the threshold: the `attention` fill with `ink` text. This is the moment delay messages start going out.
  - Schedule only: `attention-soft` with a dashed `attention-ink` border and a clock, because the number is a guess. Say so; never show a schedule-only estimate as if it were live.
  - Paused, ended or cancelled: grey, no basis.
- Delay is always "+25 min" with tabular figures; never a red chip, however late. Lateness is attention, not an emergency.
