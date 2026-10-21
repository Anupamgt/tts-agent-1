# Help desk console mockup

Hi-fi mockup of the staff console, built from `docs/design/claude-design-handoff.md`
on the Bolnai Helpdesk design system (snapshot in `ds/bolnai/`, same files as
`/design-system`). Live canvas: https://claude.ai/artifact/SPFsRYwSKy4C2X94xprAZh

## Who it is designed for

- **Simran, front-desk receptionist (primary).** She runs the desk alone in the
  5–8 pm session with three doctors seeing patients, and is interrupted every
  30 seconds. In two seconds she needs to know: is anything urgent, how late is
  each doctor (and is that number live), who is here and waiting, and who she
  owes a call.
- **Dr Sharma, on his phone in the cabin (secondary).** Glances for two seconds
  between patients, uses one thumb, does not open menus.
- **In the background:** the clinic owner (approves refunds and fee waivers) and
  the hackathon judges (the five demo moments decide which states are shown).

## Files

| File | Screen |
|---|---|
| `Main.dc.html` | 1 · Today (live queue) |
| `Doctor.dc.html` | 2 · Doctor view (Call next works in Play) |
| `DoctorStates.dc.html` | 2 · Doctor view states: just tapped, no one waiting, paused and offline, Hindi |
| `Emergency.dc.html` | 3 · Emergency alert (Acknowledge works in Play) |
| `Callbacks.dc.html` | 4 · Callbacks with detail panel |
| `Calls.dc.html` | 5 · Calls list and call detail |
| `TodayStates.dc.html` | Running 60+ min late, doctor absent, session ended, refund approval, empty, loading and error lists, alerts, staff away |
| `TopBar.dc.html`, `Rail.dc.html`, `TodayBody.dc.html` | Shared parts, imported by the screens |
| `canvas.json` | Canvas index: board positions, sizes, notes |
| `ds/bolnai/` | Design system copy: tokens, component bundle, fonts |

The `.dc.html` files are Claude Design canvas sources. They render inside the
canvas (which supplies `support.js` and React), not as standalone pages.

## Notes

- Invented to fill the screens: Ritu Malhotra, Ishaan Rao, Arjun Nair, Amit Rao,
  Dev Bansal, patient ages, and the ₹6.40 call cost.
- All Hindi text needs a native speaker's review before launch.
- Not built yet: booking drawer, cabin-assistant variant, sign-in, lock screen
  and roles (brief section 9b), Bookings, Payments, Messages, Patients, Settings.
