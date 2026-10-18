# WindowBlock

One arrival window in a doctor's column: its time (and the shifted time when the doctor is late), how many places are taken, and the patient cards inside it.

- Provide: `label` (planned window, "5:30–6:00 pm"), optional `shifted` ("5:55–6:25 pm"), `capacity` (default 4), `priorityPlaces`, `taken`, `priorityTaken`, `note`, `isNow`, and PatientCards as `children`.
- The places row is the window's fill at a glance: `accent` squares are taken, white squares with a `line-strong` border are free, violet circles are priority places (filled when sold, `priority-soft` when free). Teal and violet are close in lightness, so priority places differ by shape too; keep them circles. The row also reads as "3/4" in text and carries a full screen-reader label.
- When the doctor is late, show the planned time struck through, an arrow, then the shifted time. Never overwrite the planned time: patients were told it.
- `isNow` tints the window `accent-soft`. Only one window per doctor is "now".
- Priority places appear only for doctors with a priority fee (specialists). General doctors never show violet squares.
- Capacity is a clinic setting. If the clinic chooses one patient per window, pass `capacity: 1`; the block still works.
- Use "arrival window" in anything a patient sees. Staff screens may say "window"; never "slot" or "token" to patients.
