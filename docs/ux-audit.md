# Deskie UX audit (Phase 2)

Date: 2026-11-10. Scope: `console/` (staff console + demo phone) and `site/` (public site). No code was changed. The design baseline is in [`design-system/CURRENT.md`](../design-system/CURRENT.md).

## Method and limits

- **Static code review** of `console/public/{index,phone}.html`, `console.css`, `js/app.js`, `site/*`, plus the API routes that back the console. Contrast ratios were **computed** from the CSS values, not eyeballed.
- **Not yet done:** rendering the screens in a browser at 375px / landscape / 200% text / reduced motion. Findings that depend on rendering are marked *(verify)*. That pass belongs at the start of Phase 3.
- Only the `ui-ux-pro-max` skill is installed in this session. `design-system`, `ui-styling`, `brand` and `banner-design` are not available, so they were not applied.

## Personas (derived from the repo, please correct)

You left the persona slots as placeholders, so I took them from `design-system/README.md` and the flow docs. Tell me if any are wrong; the ranking would shift.

| ID | Who | Device and context | Top tasks walked |
|---|---|---|---|
| **P1** | Receptionist | 1366-1440px desktop (sometimes a tablet) at a bright, busy front desk; interrupted every ~30s; keyboard shortcuts `/` and `W`; shared 4-digit PIN | Acknowledge an emergency and call back; mark arrived / send in; add a walk-in; work the callback list; collect a fee and mark it paid; approve a refund |
| **P2** | Doctor / assistant | 360-390px phone in the consult room, one hand, gloves-off but hurried | Sign in with PIN; Call next; pause / end session; mark arrived (assistant) |
| **P3** | Patient or family member (and the clinic owner evaluating) | Budget Android, patchy network, English/Hindi, first visit | Land on the site; call the number; talk to it in the browser; send an enquiry; watch the demo |

## Screens and flows in scope

**Console** (`#hash` routes): sign-in (staff pick + PIN pad) -> lock screen (auto-lock 3 min, receptionist) -> `#today` (doctor columns, queue, arrival windows) · `#bookings` (day/week calendar, drag to move) · `#callbacks` · `#calls` · `#payments` (fees, refunds) · `#messages` (tickets, outbox, refill requests) · `#patients` · `#settings` · `#summary` · `#waiting` (waiting-room display) · doctor view (`#doctor`, "Call next"). Overlays: booking drawer (create / walk-in / edit), confirm modal, move-booking, refund approve/reject/change, refill approve/decline, call-confirm, history, switch-user sheet, account popover, emergency banner (pre- and post-login), toast.
**Demo phone** (`/phone`): pick a persona, grant mic, talk, hang up.
**Public site** (`/`): hero, facts, guide, demo video, FAQ, enquiry form, Sign in, Call, "Talk in browser".

Main flows: emergency -> acknowledge -> callback · arrival -> send in -> consult · walk-in booking (+ fee) · fee collection · refund decision · callback outcome · refill decision · language switch · enquiry.

## Findings, ranked by severity x persona frequency

| # | Finding | Persona | Screen | Severity | Evidence | Proposed fix | Visual-identity impact |
|---|---|---|---|---|---|---|---|
| 1 | **"Mark paid" / "Collect cash" only changes browser state.** The API endpoint exists but is never called, and the 8s poll overwrites local state, so a recorded payment silently reverts. No confirmation, no undo, no success/failure feedback. | P1 | Booking drawer, Payments | **Critical** | `console/public/js/app.js:2210-2215` (local-only mutation); `api/app/routes.py:658` (`/api/payments/{id}/mark-paid`, unused by console); `app.js:2811, 2839` (poll replaces state) | Call the endpoint through `liveSend` like `arrive` (`app.js:1866`). Confirm modal stating amount and method (reuse the generic `confirm` modal, `app.js:1720`). Show the server result via the existing toast. Keep the optimistic value until the server answers. | none |
| 2 | **Desk PIN `2468` is hard-coded in shipped browser JS** and is the default `DESK_PIN` on both servers. Anyone who opens DevTools can log in as the desk. *Security, outside pure UX, but it gates every money and patient action.* | P1, P2, P3 | All (login) | **Critical** | `app.js:2818, 2828`; `console/public/js/data.js:9`; `api/app/config.py:49`; `server/src/config.js:31` | Remove the auto-login from `pull()` and use the real sign-in session. Make `DESK_PIN` required outside demo mode. Needs your decision on how demo mode should authenticate. | none |
| 3 | **A dropped connection is invisible.** `pull()` failures set `syncOk=false` but nothing renders it; `state.live` is never reset, so the green "Live API" pill stays on and stale arrivals/callbacks look current. | P1, P2 | Top bar, Today, Callbacks | **High** | `app.js:2835` (`.catch` only sets flag); `app.js:2805-2806` (`live` set true, never false); pill at `app.js:796`; the only sync banner is `app.js:873-875` and is hidden when `live` | Track last-success time. After 2 missed polls show an `attention` banner ("Offline, last update 2 min ago") and mark the pill. Disable write buttons or queue with a visible "will sync" state. Uses existing `.banner` + attention tokens. | minor (new banner instance, existing tokens) |
| 4 | **The 8-second poll steals focus mid-typing.** `applyLive()` calls `render()` without `keepFocus`, replacing all of `#app` every 8s. The callback note textarea and filters lose the cursor; the "nothing moves under the cursor" rule in the design README is broken. | P1 | Callbacks, Calls, Search, Settings | **High** | `app.js:2811` (`render()` bare) vs `render({ keepFocus: true })` used elsewhere (`app.js:2555, 2779`); `app.js:1006` (`#cbnote`, not `data-live`); `app.js:2839` | Use `render({ keepFocus: true })` and skip or defer when an input/textarea/select has focus (`uiBusy()` at `app.js:2636` already exists, reuse it). | none |
| 5 | **Dialogs never take or trap focus.** Modals/drawers declare `role="dialog" aria-modal="true"` but no code moves focus in, traps Tab, or returns it on close. Keyboard users keep tabbing the page behind a refund approval. | P1 (keyboard), screen-reader users | All modals and drawers | **High** | `app.js:1610, 1623, 1720-1776` (dialogs); the only `.focus()` calls are `app.js:1836` and `2587` | On open: focus the heading or first control, trap Tab within, restore focus on close. Add `aria-labelledby` where missing (`1623, 1720, 1728, 1736` lack it). Escape already works (`app.js:2586`). | none |
| 6 | **Patient cards cannot be opened from the keyboard.** The card is `<article data-act="open-booking">` with no `tabindex`/role. The `Enter` handler (`app.js:2591`) never fires because focus cannot land there. Only booked/arrived cards carry a button. | P1 (keyboard / AT) | Today queue | **High** | `app.js:613` (article), `610-611` (buttons only for booked/arrived); `console.css:193-194` (hover-only affordance) | Add a real "Open" button or make the card a focusable `role="button"` with Enter/Space. Keep the card styling. | none |
| 7 | **Buttons are 40px tall on phones.** `.bn-btn` is `control-md` at every width; the README promises `control-lg` (48px) on phones and 44px minimum. Pause, Start session, End session, Mark arrived, Send in, Acknowledge all fall short. | P2 | Doctor view, Today (phone) | **High** | `console.css:100-106`; no override in `:627-668`; `bn-btn-lg` used once (`app.js:685`) | `@media (max-width:560px) { .bn-btn { height: var(--control-lg); } }` (existing token). | none |
| 8 | **Eight items in the phone bottom bar.** At `min-width: 72px` each, the strip is ~576px on a 375px screen, so Payments, Messages, Patients and Settings sit off-screen in a sideways-scrolling strip with no cue. | P1 (phone/tablet), P2 | All (<=900px) | **High** | `console.css:633-647`; `app.js:185-194` (8 `NAV` entries) | Keep 4 primary tabs plus "More" (the `.rail-more` button pattern already exists, `console.css:638`, `app.js:773`). | none (existing components) |
| 9 | **Sign-in, browser-call and enquiry all depend on one ephemeral `trycloudflare.com` host.** If the quick tunnel restarts, the public site's Sign in, `/phone`, `/api/enquiries` and brand assets all dead-end. | P3, staff | Site hero, contact form | **High** | `site/config.js:2`; `site/vercel.json:4-8`; fallback `site/index.html:23` points at `127.0.0.1:8001` | Move to a stable hostname (named tunnel or env-driven rewrite). Needs your input on hosting. | none |
| 10 | **"Clear after in-person check" lifts a verification lockout with one tap.** No confirmation, no record of who confirmed, no undo. It re-enables phone identity checks after 5 failures. | P1 | Callbacks detail | Medium | `app.js:1003` (button), `2274-2278` (immediate state change; audit text only) | Confirm modal naming the patient and what is being re-enabled; include the acting user in the audit line. | none |
| 11 | **Truncated names and chip explanations are hover-only.** Patient names ellipsise with the full name only in a `title`; the doctor chip's explanation is also `title`-only. Touch and keyboard users cannot read it. | P1, P2 | Today cards, doctor chip | Medium | `app.js:614` + `console.css:183`; `app.js:573` | Let names wrap to two lines, or show the full name in the drawer header (already opens). Expose chip detail in the drawer/visible caption. | minor |
| 12 | **Continuous animations ignore reduced motion.** Only the emergency pulse is gated. The live dot pulses forever, and new items slide in. | P1, P2 | Top bar, chips, activity strip | Medium | gated: `console.css:226-229`; not gated: `336-347`, `391-399` | Wrap those in `@media (prefers-reduced-motion: no-preference)` exactly like the emergency pulse. | none |
| 13 | **Enquiry form can be double-submitted and gives a generic error.** The Send button stays enabled during the request; failures do not say what to fix. Input is preserved on failure (good). | P3 | Site contact | Medium | `site/app.js:15-31`; `site/index.html:119-120` | Disable the button and set `aria-busy` while sending; keep the message in the existing `role="status"` note. | none |
| 14 | **Demo phone does not announce state.** "Deskie is listening / thinking", and the transcript, update plain nodes with no live region. The page also has no heading structure for the persona buttons and 40px buttons. | P3 | `/phone` | Medium | `phone.html:19-21, 42-43, 86-92` | `aria-live="polite"` on status and log; give the persona group a label; use the phone-size button height from #7. | none |
| 15 | **Demo video has no captions or poster.** | P3 (Hindi/English, Deaf, muted playback) | Site demo | Medium | `site/index.html:66-70` (`poster=""`, no `<track>`) | Add a WebVTT captions track (new text asset, no restyle). | none |
| 16 | **Phone site hides every section link.** At <=900px `.nav-links` is `display:none` with no menu, so Guide/Demo/Questions/Contact are only reachable by scrolling. | P3 | Site header | Medium | `site/styles.css:194`; `site/index.html:17-22` | Keep "Demo" and "Contact" visible, or add a disclosure menu in the existing pill style. | minor |
| 17 | **Fonts come from Google at runtime even though the files are bundled.** Extra third-party request, layout shift when it fails or is slow (fallback is Segoe UI), and the demo phone loads no fonts at all. | P3, P1 on patchy network | All | Medium | `console/public/index.html:11-13`; `site/index.html:8-10`; unused `design-system/fonts/*.woff2`; `phone.html` has no font link | Add `@font-face` pointing at the bundled Anek files (same typeface). Site's Outfit needs a file we do not have, so it would need your approval to self-host. | none (same fonts) |
| 18 | **Mic page loads a third-party script with no integrity pin.** | P3 | `/phone` | Medium | `phone.html:12` | Add an SRI hash or vendor the file (vendoring = new asset; ask first). | none |
| 19 | **Language toggle hides behind "Account" on phones.** The rail footer (language, lock, sign out) is `display:none` under 900px and reappears only in the account popover. Hindi is a first-class feature. | P1 | Account popover | Low | `console.css:637`; `app.js:745-751, 773` | Keep the toggle in the popover but label the button "Account and language" or surface it in the top bar. | minor |
| 20 | **Callback rows are `role="button"` containing real buttons**, and Space does not activate them. | P1 (AT) | Callbacks | Low | `app.js:986-994`; `app.js:2591` (Enter only) | Make the row a plain container with an explicit "Open" button, or handle Space and drop nested controls. | none |
| 21 | **Public copy drifts from the product.** FAQ says staff add records "under Records", but the console has no such screen. Hours and fee are typed into the page rather than read from the clinic data the FAQ claims to use. | P3 | Site FAQ / guide | Low | `site/index.html:85, 47, 57-58`; NAV has no "Records" (`app.js:185-194`) | Correct the sentence. Decide whether hours/fee should come from the API. | none |
| 22 | **Off-scale sizes in dense controls.** Mobile nav labels are 11px; segmented buttons and counters are 36px tall. | P1, P2 | Bottom nav, counters | Low | `console.css:641, 645, 319, 367` | Raise to the 12px `caption` size and `touch-min` where tappable. | none |
| 23 | **Shortcuts (`/` search, `W` walk-in) are undocumented** except in a hover-only `title`. | P1 | Top bar | Low | `app.js:800, 2587-2590` | Show the hint as visible text in the search placeholder or a help line. | none |
| 24 | **Token copy and font fallback can drift.** Tokens are re-typed in `console.css`; the fallback stack differs from `tokens.json`. | maintainers | n/a | Low | `console.css:2-51, 47-48` | Load `tokens.css` or add a check that compares them. | none |
| 25 | **`scroll-behavior: smooth` ignores reduced motion.** | P3 | Site | Low | `site/styles.css:14` | Gate in a `prefers-reduced-motion: no-preference` query. | none |

## What already works (keep as is)

- All documented text pairings hold: ink-muted 6.17:1 on canvas, accent 6.70:1, white on emergency 6.57:1, site muted text 7.8-8.9:1.
- Visible, token-based focus ring on every control; destructive session actions (End / Cancel session) go through a confirm modal; emergency uses `role="alert"`, shape + word + colour; walk-in and refund forms show inline errors and keep input; PIN field is numeric and masked; `html lang` follows the language toggle; switches are real checkboxes with `role="switch"`; the site form uses wrapped labels, a honeypot and a `role="status"` note and keeps input on failure.

## Top findings to review before I change anything

1. **#1 Mark paid is not saved.** A cashier can believe a fee is recorded and it vanishes in <=8 seconds.
2. **#2 Hard-coded desk PIN.** Security rather than UX, but it undermines everything else.
3. **#3 Silent offline** and **#4 focus theft**: the two things most likely to hurt a receptionist during a busy hour.
4. **#5 / #6** keyboard access: dialogs do not trap focus and patient cards cannot be reached.
5. **#7 / #8** the phone layout: 40px buttons and an 8-item nav strip.
6. **#9** a temporary tunnel URL that the whole public site depends on.

## Questions for you before Phase 3

1. Are P1-P3 right? (Especially: is the doctor on a phone and the receptionist on desktop?)
2. #2: should demo mode keep a shared PIN, or should I make sign-in the only path?
3. #9 and #17/#18: may I touch hosting config and vendor/self-host files, or are those off limits?
4. Do you want the public site fixed too, or the console only?
5. OK to treat #1-#9 as the first batch of small commits?

## Status after Phase 3 (first batch)

Checked in a browser at 1366px, 375px and 360px with the console in sample mode, and the site at 375px. Contrast was recomputed earlier; no colour, font, radius, spacing or icon was changed and no token was added. An independent review found four defects in the first pass; all four are fixed.

| # | Status | What changed |
|---|---|---|
| 1 | Fixed | Mark paid and Collect cash confirm first, call the API in live mode, report success or failure. Limitation: the API stores no payment method, so a cash collection on a UPI-link payment is recorded only as paid. |
| 3 | Fixed | After two failed polls the pill and a banner say the connection is lost, with the last good time and Retry. |
| 4 | Fixed | The poll waits while a field or dialog is in use and keeps focus on buttons. |
| 5 | Fixed | Dialogs take focus, trap Tab (emergency banner stays reachable), are labelled, and return focus. |
| 6, 20 | Fixed | Patient and caller names are real buttons; callback rows are plain containers. |
| 7, 22 | Fixed | 48px controls and 44px rows at 560px and below, 12px nav labels. |
| 8 | Fixed | Four tabs plus a More sheet on phones. |
| 10 | Fixed | Clearing a lockout asks first and records who did it. |
| 11 | Fixed | Names wrap instead of truncating. |
| 12, 25 | Fixed | Live-dot, slide-in and smooth scroll respect reduced motion. |
| 13 | Fixed | Enquiry button is disabled while sending. |
| 14 | Fixed | Demo-call status and transcript are announced. |
| 16 | Fixed | Site section links wrap to a second row on phones. |

Also fixed after the review: **#17** console and demo-phone fonts are served from `/fonts` (same Anek files), **#21** the "Records" sentence on the site.

Not done: **#2** hard-coded desk PIN (the PIN pad checks PINs for every role, including admin codes, against `console/public/js/data.js`, and the shared server login is what the doctor and assistant live views use; fixing it properly needs per-staff server authentication, not a patch), **#9** temporary tunnel host (needs a real stable hostname), **#18** script integrity (jsDelivr's `.min.js` is generated on the fly and is not in the npm package, so no verifiable hash was available offline; a wrong hash would break the call page), **#15** captions (needs real timings and a transcript), the site's Outfit font (no font file in the repo), and the Low items #19, #23, #24. Known gap: the assistant role can still collect and mark fees paid, as before.
