# CallbackRow

One row of the callback queue: priority mark, who called and from where, why they need a person, when the callback is due, and a Call button.

- Provide: `priority` (`P1` | `P2` | `P3`), `caller`, `number`, `language` (`EN`, `HI`, `Hinglish`), `verified`, `reason`, `dueText` ("due by 7:30 pm", "overdue 4 min"), `overdue`, `dueSoon`, `isNew`, `differsFromCaller`, `onCall`, and `lang="hi"` when the reason is in Hindi.
- Sort the queue by priority, then by due time. The priority column is always first so the `!!!` / `!!` / `!` marks line up.
- `overdue` tints the row `emergency-soft`, turns the due badge red and makes Call the primary button. `dueSoon` turns the due badge `attention`. A P1 keeps its solid red mark only while new or overdue.
- `differsFromCaller` shows a "Different number" badge; the Call action must then confirm both numbers ("Call +91 … ? The patient called from +91 …") before dialling.
- The reason is an AI summary or the caller's words: render it as plain text, one line in the list, the full call in the call drawer. No symptoms beyond what the reason needs; never test results.
- Below 720px the row stacks: mark and caller on top, reason and due underneath.
