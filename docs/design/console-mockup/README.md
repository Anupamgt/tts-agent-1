# Help desk console mockup

Hi-fi mockup of the staff console, built from `docs/design/claude-design-handoff.md`
on the Synopsis design system (`ds/synopsis/tokens.json`).

Source files for the Claude Design canvas:

| File | Screen |
|---|---|
| `Main.dc.html` | 1 · Today (live queue) |
| `Doctor.dc.html`, `DoctorStates.dc.html` | 2 · Doctor view and its states |
| `Emergency.dc.html` | 3 · Emergency alert |
| `Callbacks.dc.html` | 4 · Callbacks |
| `Calls.dc.html` | 5 · Calls and call detail |
| `TodayStates.dc.html` | Running late, doctor absent, session ended, empty callbacks, alerts |
| `TodayBody.dc.html`, `TopBar.dc.html`, `Rail.dc.html` | Shared parts |
| `canvas.json` | Canvas index (board positions and sizes) |

Not built yet: booking drawer, cabin-assistant variant, Bookings, Payments,
Messages, Patients, Settings. Some rows are invented to show states
(Amit Rao, Dev Bansal, Ishaan Rao, ages, call durations).
