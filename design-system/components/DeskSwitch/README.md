# DeskSwitch

The "Staff on desk" switch in the top bar: on means the phone agent may transfer callers to the desk phone; off means callers are offered a callback instead.

- Provide: `on`, `onChange(on)`, and optional `label`, `onText`, `offText`, `lang="hi"`.
- Place it once, in the top bar, visible on every console screen. It is a real checkbox with `role="switch"`, so it works with the keyboard (Space) and screen readers.
- Off is not an error: the switch turns `attention-soft` with an `attention-ink` border so a returning receptionist sees at a glance that calls are going to the callback queue.
- The text under the label always says what the agent will do now ("Calls transfer to the desk phone" / "Callers are offered a callback"), not just "On" or "Off".
- Every change is written to the audit log with the staff member's name. Turning it off while a transfer is ringing does not drop the call.
