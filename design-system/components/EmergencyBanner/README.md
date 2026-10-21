# EmergencyBanner

The red banner that appears on every console screen when the agent flags a possible medical emergency or self-harm risk on a call; it is the only solid-red element in the product.

- Provide: `kind` (`medical` | `self_harm`), `time`, `number` (full, so staff can call), `language`, `verified`, optional `snippet` (what the caller said), `steps` (what the agent did and what staff must do next), `isNew`, `onAcknowledge`, `onCallBack`, `openHref` or `onOpenCall`, and optional `title`, `lang` and labels (`ackLabel`, `callLabel`, `openLabel`, `callerLabel`, `quoteLabel`, `callAckNote`).
- It is segmented so it reads in two seconds, top to bottom:
  1. **Head:** icon, `!!!`, what happened, and the time pinned right ("6:11 pm · 1 min ago").
  2. **Number to call:** large, a `tel:` link, with the language and whether the caller was verified.
  3. **Caller said:** the snippet in a white box, plain text in quotes. It is never a link, a button or HTML, whatever the caller said. The Open call link sits under it, to see the whole call.
  4. **Actions:** Acknowledge, Call back, and the note "Call back also acknowledges". (Without a snippet, Open call joins the actions.)
  5. **Steps:** one tile per step. `done` and `failed` (what the agent did) sit on `emergency-soft`; `next` (what staff must do, with its due time) is white so the eye lands on it. Each tile leads with its word and icon, so nothing depends on colour. Pass them in order: done, failed, next.
- **Call back also acknowledges.** It calls `onCallBack`, then `onAcknowledge({ via: 'call_back' })`, so the sound stops and the log records who, when, and that they called back. Acknowledge calls `onAcknowledge({ via: 'acknowledge' })`. Open call does not acknowledge. Set `callAcknowledges={false}` only where a screen has a reason to keep them separate.
- If the callback goes to a different number than the caller's (`differs_from_caller`), return `false` from `onCallBack`, show the "Call +91 … ? The patient called from +91 …" confirm, and acknowledge with `via: 'call_back'` only when staff confirm.
- Place it at the top of every screen, above the top bar's content, sticky. It is not dismissible: it leaves only when a staff member acknowledges it (or calls back), and the acknowledgement is logged with their name. It also shows on the locked desk screen.
- `isNew` pulses the icon once a second until acknowledged; under reduced motion it stays still. Pair a new alert with the console's alert sound.
- Keep the content short: one line of what was said, one line per step. Details live in the call record.
- Several alerts stack, newest on top. After acknowledgement the item moves to the alerts list on `emergency-soft`, with who acknowledged, when, and whether they called back.
- `agentNote` still works for older screens: it shows as a single "Done" tile.
- Below 560px the blocks stack in the same order and the buttons go full width.
- Never reuse this red for anything else: not a cancelled session, not a failed payment, not a late doctor.
