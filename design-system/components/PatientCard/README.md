# PatientCard

One booking inside an arrival window: who the patient is, where the booking stands, and the tags the desk needs (priority, any doctor, source, fee, booked by a relative).

- Provide: `name`, `patientId` (new IDs grouped "482 915 6", existing clinic IDs exactly as printed), optional `age`, `status`, `statusNote` ("5:48 pm", "Delay SMS 1/2"), `priority`, `anyDoctor`, `source` (`agent` | `walk_in` | `console`), `relative`, `fee` (`{state: 'due' | 'paid', amount}`), `note`, one `action` (`{label, onClick}`) and `lang="hi"` with the matching `*Label` props for Hindi.
- Status treatments follow the console's status vocabulary:
  - `held`: dashed outline, no shadow, "Held by agent". The agent is booking right now; the hold ends after 90 seconds.
  - `booked`: the plain white card.
  - `arrived` and `in_consult`: the strongest cards (`info` badge; `ok` border while with the doctor).
  - `done`, `no_show`, `rescheduled`: sunken and muted. `cancelled`: also struck through.
- A priority visit adds the violet Priority badge and a `priority` border. It is never red and never uses `!` marks.
- Show money as "Fee due ₹700" (`attention`) or "Paid ₹700" (`ok`). A waiver or refund belongs on the booking timeline, not on the card.
- No symptoms, diagnoses or medicines on a card, ever. One action per card at most; everything else lives in the booking drawer.
- Names truncate with an ellipsis; give the full name as hover text where the layout is tight.
