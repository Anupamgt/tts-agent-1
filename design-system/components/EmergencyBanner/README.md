# EmergencyBanner

The red banner that appears on every console screen when the agent flags a possible medical emergency or self-harm risk on a call; it is the only solid-red element in the product.

- Provide: `kind` (`medical` | `self_harm`), `time`, `number` (full, so staff can call), optional `snippet` (what the caller said), `agentNote` (what the agent did), `isNew`, `onAcknowledge`, `onCallBack`, and optional `title`, `ackLabel`, `callLabel`.
- Place it at the top of every screen, above the top bar's content, sticky. It is not dismissible: it leaves only when a staff member acknowledges it, and the acknowledgement is logged with their name. It also shows on the locked desk screen.
- `isNew` pulses the icon once a second until acknowledged; under reduced motion it stays still. Pair a new alert with the console's alert sound.
- The snippet renders as plain text in quotes, labelled "Caller said". It is never a link, a button or HTML, whatever the caller said.
- Keep it short: title, time, one line of what was said, one line of what the agent did, two buttons. Details live in the call record.
- Several alerts stack, newest on top. After acknowledgement the item moves to the alerts list on `emergency-soft`.
- Never reuse this red for anything else: not a cancelled session, not a failed payment, not a late doctor.
