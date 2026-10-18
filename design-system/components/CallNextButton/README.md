# CallNextButton

The doctor view's one big button: it shows who is next and, when tapped, marks the current patient done and calls the next one, which is the live signal that keeps every arrival estimate honest.

- Provide: `nextName` and `nextMeta` (ID, arrival time, "priority" when it applies) from the session queue, `onClick`, optional `footer` ("Last called 5:51 pm"), `label`, `nextLabel`, `emptyText` and `lang="hi"`.
- Use it only on the doctor or assistant phone view, full width, with `space-6` around it. One per screen.
- The button is `call-next` (128px) tall and set in the `call-next` style, so it can be hit without looking. Do not shrink it, add a second button beside it, or put an undo inside it; put "Undo last call" as a quiet Button below, live for 30 seconds.
- With no `nextName` the button is disabled and `emptyText` shows ("No patients waiting"). Priority patients come first in the queue; say so in `nextMeta`, never with red.
- Each tap writes a queue event (who, when, from which device); the console's delay estimate switches from schedule-only to live after the first tap.
