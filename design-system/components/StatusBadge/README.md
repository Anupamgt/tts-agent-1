# StatusBadge

A short status word with an icon, used on patient cards, callback rows and tables; the tone says what kind of status it is and the word and icon say it again, so nothing depends on colour alone.

- Provide: `children` (one to three words, money as "₹700"), `tone`, optional `icon` (overrides the tone's default; `null` hides it) and `lang="hi"`.
- Tones and what they mean, with nothing else:
  - `neutral`: plain facts (Booked, Any doctor, Via agent, Walk-in, Done).
  - `held`: a dashed outline for an agent hold that is not yet a booking.
  - `info`: the patient is here (Arrived).
  - `ok`: finished well (Paid, With doctor, SMS delivered).
  - `attention`: needs a look soon (Fee due, Due soon, Schedule only, SMS failed).
  - `priority`: a paid priority visit. Violet, never red.
  - `emergency`: a solid red fill, only for an emergency. Never use it for a form error, a cancellation or a late doctor.
- Do not invent new tones or colour a badge by hand. If a status does not fit, it is probably `neutral` with a clearer word.
- Hindi badges use `hi-label` (no letter-spacing) and must be reviewed by a native speaker before going live.
