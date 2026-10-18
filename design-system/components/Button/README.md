# Button

The console's buttons: secondary by default, one primary per view for the step the screen is for, quiet for low-stakes links, danger only for steps that cancel or give money back.

- Provide: `children` (the label), optional `variant` (`primary` | `secondary` | `quiet` | `danger`), `size` (`lg` on phones, in the emergency banner and on the doctor view), `icon` (a glyph name), `lang="hi"` for a Hindi label, and the usual button props (`onClick`, `disabled`, `type`).
- Labels are verbs in sentence case that say what happens: "Confirm booking", "Call back", "Mark arrived". Never "OK", "Submit" or "Yes".
- `danger` is red outline, never a red fill: a solid red fill means an emergency and nothing else. Destructive steps (cancel a booking, approve a refund) open a confirm step that names what will happen and to whom.
- A disabled button needs a reason nearby (a caption under it, or a tooltip on the wrapper), for example "Refund needs a second admin".
- Height is `control-md` (40px) on desktop and `control-lg` (48px) on phones, so every button meets `touch-min`.
