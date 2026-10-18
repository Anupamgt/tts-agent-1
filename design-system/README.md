Bolnai Helpdesk is the staff console beside a clinic's AI phone agent: the receptionist's Today board, the doctor's Call next screen, callbacks, emergency alerts, payments and settings. It is used at a bright, busy front desk by people who are interrupted every 30 seconds, so everything here is calm, plain and fast to scan. Build every screen from these tokens and components; when something is missing, compose it from them rather than inventing new colours or sizes.

## Name and logo

- There is no logo yet. Set the product name "Bolnai" in plain type (`body-strong`, `ink`), never drawn as a mark.
- The clinic's own name leads: in the top bar show the clinic name in `heading` and "Bolnai" after it in `caption`, `ink-muted` ("Demo Family Clinic · Bolnai"). Patients never see "Bolnai"; the agent speaks for the clinic.

## Content fundamentals

- Write the way a good receptionist talks: short, plain, calm. Say what happened and what to do next. "Dr Sharma is running 25 min late. 6 patients told." Not "Alert! Delay detected."
- Sentence case everywhere: titles, buttons, badges, table headers. No exclamation marks in copy (the `!` marks belong to PriorityMark only). No emoji.
- Address staff as "you" when a sentence needs a subject; the product never says "I". Name people: "Approved by Priya at 6:12 pm", not "Approved by admin".
- Buttons are verbs that say what happens: "Confirm booking", "Call back", "Mark arrived", "Approve refund". Never "OK", "Submit", "Yes".
- Fixed words, used everywhere:
  - "priority visit" (paid, specialists only), never "urgent"
  - "emergency" only for someone who may be in danger now
  - "arrival window" in anything a patient sees, never "slot" or "token"
  - "held by agent", "booked", "arrived", "in consult", "done", "no-show", "cancelled", "rescheduled"
  - "live" and "schedule only" for how a delay was worked out
  - "callback", "via agent", "walk-in", "any doctor", "booked by relative"
- Formats:
  - Time `5:30 pm` (12-hour, lower-case am/pm); window `5:00–5:30 pm` (en dash); shifted `5:30–6:00 pm → 5:55–6:25 pm`.
  - Date `Mon, 19 Oct`; relative where it helps: "2 min ago", "in 12 min".
  - Money `₹700` with Indian grouping `₹1,50,000`; no decimals unless paise matter.
  - Phone `+91 98111 11111`; in long lists partly hidden `+91 98••• ••111`.
  - Patient ID: new IDs are 7 digits in groups `482 915 6`; existing clinic IDs exactly as printed (`HC/2026/0412`).
  - Language tags `EN`, `HI`, `Hinglish`.
- Privacy is a content rule: no diagnoses, symptoms, medicines or test results on cards, rows or banners. A caller's words appear only as plain text labelled "Caller said" or "AI summary", never as links or buttons.

### Hindi

- Hindi UI text is supported from day one. Mark Hindi text with `lang="hi"` and set it in the Hindi styles: `hi-heading`, `hi-body`, `hi-body-strong`, `hi-label`, `hi-caption`. Every component takes `lang="hi"` and switches for you.
- Hindi styles are one pixel larger with much taller lines (`hi-body` 16/26 against `body` 15/22) so matras above and below the headline never collide. Do not tighten them.
- Never letter-space Devanagari (it breaks the headline), never italicise or underline it for emphasis; use `hi-body-strong` instead.
- Keep digits Western (0–9) in Hindi screens, so times, IDs and amounts match the SMS, the slip and what the agent reads out.
- Use everyday Hindi that the desk already speaks, with common English loan words where they are what people say ("SMS", "UPI", "डॉक्टर", "फ़ीस"). Every Hindi string needs a native speaker's review before launch.

## Visual foundations

### Colour

- The page is `canvas` (a cool grey-blue tint, never white) so white `surface` cards stand out without heavy borders. Wells inside a panel are `surface-sunken`; neutral badges sit on `neutral-soft`.
- Text is `ink`; secondary text (IDs, ages, timestamps) is `ink-muted`. Both pass 4.5:1 on `canvas`, `surface`, `surface-sunken` and `neutral-soft`.
- `accent` (deep teal-blue) is the one interactive colour: primary buttons, links, selected tabs, taken places in an arrival window. Hover is `accent-strong`; selected rows and the current window are `accent-soft`. Text on an accent fill is `on-accent`.
- Status colours mean one thing each:
  - `emergency` red is for emergencies only: the EmergencyBanner, a new or overdue P1 mark, an overdue callback's due badge. Use it as a solid fill with `on-emergency` text, or as text on `surface` / `emergency-soft`. Never for form errors, cancellations, late doctors or decoration.
  - `attention` amber is for things to look at soon (a doctor 20+ min late, a P2 mark). It is too light to be a mark on its own (2.2:1), so it always carries `ink` text. For attention text and icons use `attention-ink` on `attention-soft` or `surface`.
  - `priority` violet is the paid priority visit: badge text on `priority-soft`, a filled priority place, a card border. It is a product, not an alarm, so it is never red.
  - `ok` green is for small marks (the live dot); `ok-ink` on `ok-soft` for done, paid and in consult.
- Never rely on colour alone. Every status carries a word or an icon; priorities carry `!!!` / `!!` / `!`; held bookings are dashed; schedule-only delays have a dashed border and a clock.
- Red and green never sit side by side as a pair told apart by hue: the solid `emergency` fill and the light `ok-soft` tint differ in lightness by 5.6:1, so they stay distinct for colour-blind staff.
- `priority` violet and `accent` teal are equally dark, so where both appear as marks (taken places in a window) the priority place is also a different shape: a circle among squares.
- Decorative hairlines are `line` (below 3:1, so never the only carrier of meaning). Control borders, free places and dashed outlines are `line-strong` (3.8:1 on `surface`, at least 3.1:1 on every other ground).
- One light theme for now. Do not hard-code colours; a dark or high-contrast theme can be added later only through tokens.

### Type

- One family pair: Anek Latin for English and Anek Devanagari for Hindi, both variable (100–800), drawn by Ek Type in Mumbai to sit together. The `sans` stack falls back to Anek Devanagari for `₹`, which Anek Latin lacks.
- Console styles: `heading-lg` for screen titles and the next patient on the doctor view; `heading` for panel and column headers and the emergency title; `body` and `body-strong` for text and names; `label` for badges, chips, dense buttons and table headers; `caption` for IDs, ages, timestamps and helper text; `figure-lg` for big numbers; `call-next` (in Hindi `hi-call-next`) only for the Call next button.
- Every number that can change or line up (times, delays, amounts, counts, IDs) uses tabular figures: add `bn-num` (`font-variant-numeric: tabular-nums`). Anek's default figures are proportional and jump as they update.
- Weights: 400 for reading, 500 for labels, 600 for names and headings, 700 only for Call next, 800 only for the `!` marks.

### Space and layout

- Spacing is a 4px scale: `space-1` 4 (icon to label), `space-2` 8 (between badges and chips), `space-3` 12 (inside cards and cells, between cards), `space-4` 16 (inside panels; phone gutter), `space-5` 24 (between sections; desktop gutter), `space-6` 32 (above titles; around Call next), `space-7` 48 (empty states, sign-in).
- Design desktop at 1440×900; it must hold at 1366×768 and spread to 3–4 doctor columns at 1920. The doctor and assistant views are phone screens at 360–390px.
- Controls are `control-md` (40px) on desktop and `control-lg` (48px) on phones; every tap target is at least `touch-min` (44px). The Call next button is `call-next` (128px) tall.
- Layered density: the list shows one line per item; details open in a drawer on purpose. Never expand transcripts or recordings inline in a list.
- Live updates insert above and keep scroll; nothing moves under the cursor.

### Shape, borders and shadows

- Radii: `radius-sm` (4) for badges, marks and places; `radius-md` (6) for buttons, inputs, chips and cards; `radius-lg` (10) for panels, windows, drawers, the emergency banner and Call next; `radius-pill` only for the desk switch and status dots.
- Cards are white with a `line` border and `shadow-raised`. `shadow-overlay` is for drawers, menus and the emergency banner only. No other shadows, no gradients, no coloured left-border accents.
- Dashed borders mean "not settled yet": a held booking, a schedule-only estimate.

### States

- Keyboard focus is a 2px gap in `surface`, then a solid 3px `focus-ring` (`accent`): 6.7:1 on `canvas`, 7.6:1 on `surface`. On the red banner the ring is `on-emergency`. Never remove it.
- Hover darkens a fill (`accent` to `accent-strong`) or tints a plain control (`surface-sunken`, `accent-soft`).
- Disabled controls go to `surface-sunken` with `ink-muted` text and say why nearby.
- Every list has an empty, a loading and an error state, written in the same plain voice ("No callbacks waiting").

### Motion

- Almost none. The one animation is the new emergency icon pulsing once a second until acknowledged, and it stops under `prefers-reduced-motion`.
- New items may slide in with a short highlight (`accent-soft` fading out over 1–2 s). No bouncing, no decorative transitions, and no spinner shown for more than a second without text saying what is loading.

## Iconography

- Icons are simple 16px stroke glyphs drawn in `currentColor` (1.6px stroke, round caps and joins), always next to a word, never alone as the only label. The bundle ships a small interim set through `Glyph`: check, clock, alert, up, phone, dot, pause, arrow.
- These glyphs are a stand-in, not a chosen icon system. For the full console use Lucide (ISC licence), at 16px with a 1.5–1.75 stroke to match.
- No emoji, no illustrations, no photographs of people or medical scenes.

## Components

`components/bundle.js` exposes `window.Bolnai` and expects React 18 on the page; `components/bundle.css` styles it and uses only these tokens. Group by job:

- Actions: `Button`, `CallNextButton`, `DeskSwitch`
- Status: `StatusBadge`, `PriorityMark`, `DoctorChip`
- Queue: `WindowBlock`, `PatientCard`
- Alerts: `EmergencyBanner`, `CallbackRow`

Each component's README says what to pass it and when to use it. Compose screens (Today, doctor view, callbacks, payments) from these; when a new piece is needed, build it from the same tokens and add it here.

## Fonts

Anek Latin and Anek Devanagari by Ek Type, SIL Open Font License 1.1, served from `fonts/` as variable woff2 files.
