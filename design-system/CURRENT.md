# Deskie: design system as it actually exists in code

Extracted on 2026-11-10 by reading the shipped files. This is the source of truth for any UX fix: **reuse these values, do not restyle.** Where this file disagrees with `README.md` or `tokens.json`, this file reflects what users actually see.

## 1. Stack (detected, not assumed)

| Surface | Path | Stack | Notes |
|---|---|---|---|
| Staff console | `console/public/` | Vanilla JS, no framework, no build step. `js/app.js` (2,841 lines) renders HTML strings into `#app` via `innerHTML`. Delegated `click`/`change`/`input`/`keydown` handlers on `document.body`. | Served by `console/server.js` (Node, no deps) and by Vercel (`console/vercel.json`, SPA rewrite). Hash routing (`#today`, `#bookings`...). |
| Demo phone | `console/public/phone.html` | Static HTML + inline script, `livekit-client@2.15.7` from jsDelivr | Browser-to-agent voice call. Reuses `console.css`. |
| Public site | `site/` | Static HTML/CSS/JS, no build | Separate visual system (dark, green, Outfit). Deployed to Vercel; API calls rewritten to a tunnel host (`site/vercel.json`). |
| API | `api/` (FastAPI), `server/` (Node) | Not UI | Context only. |
| Design docs | `design-system/` | `tokens.json` -> `build-tokens-css.mjs` -> `tokens.css`; `components/bundle.{js,css}` (React 18 UMD) + per-component `preview.html` | **`tokens.css` and `bundle.*` are not loaded by any shipped page.** |

No `package.json` for the console beyond `"start": "node server.js"`. No linter, formatter or UI test runner is configured. Existing tests: `server/test/*.test.mjs` (`node --test`), `api/tests` (pytest), `db/tests/schema.test.mjs`. None cover the UI.

## 2. Where tokens really live

`console/public/console.css` lines 2-51 holds a hand-copied `:root` block (identical values to `tokens.json` for colour, space, radius, size, shadow). `console/public/index.html` loads **only** `/console.css` plus Google Fonts. So:

- `design-system/tokens.css` is generated but unused.
- `design-system/fonts/*.woff2` (Anek Latin/Devanagari, OFL) are bundled but unused; the console fetches the same families from `fonts.googleapis.com` (`index.html:13`). `phone.html` loads no fonts at all.
- Font fallback differs: `console.css:47-48` ends `"Segoe UI", sans-serif`; `tokens.json` ends `"Noto Sans", system-ui, sans-serif`.

## 3. Colour (console, light only)

| Token | Value | Role | Measured contrast |
|---|---|---|---|
| `canvas` | `#edf2f4` | Page background | |
| `surface` | `#ffffff` | Cards, panels, inputs, drawers | |
| `surface-sunken` | `#e2e9ec` | Wells, table headers, done cards | |
| `line` | `#cbd5da` | Decorative hairlines | 1.49:1 on surface (decorative by design) |
| `line-strong` | `#738590` | Control borders, dashed "unsettled" | 3.83:1 on surface |
| `ink` | `#13232b` | Primary text | 14.3:1 on canvas |
| `ink-muted` | `#4a5c66` | Secondary text | 6.17 canvas, 5.67 sunken, 5.73 neutral-soft |
| `accent` | `#0a5c70` | Interactive colour, primary button | 6.70 on canvas; white on accent 7.56 |
| `accent-strong` | `#074657` | Hover/pressed | |
| `accent-soft` | `#d8eaf0` | Selected row, current window, info badge | accent on it 6.10 |
| `on-accent` | `#ffffff` | Text on accent | |
| `focus-ring` / `link` | `{accent}` | Alias | |
| `emergency` | `#b42318` | Emergencies only | white on it 6.57; on emergency-soft 5.59 |
| `emergency-soft` | `#fde8e6` | Acknowledged alert, overdue callback row | |
| `on-emergency` | `#ffffff` | | |
| `attention` | `#e8a317` | Late doctor chip, P2 mark (always with `ink` text) | ink on it 7.43; **2.17 vs surface (never used alone)** |
| `attention-ink` | `#7a4a00` | Attention text/icons | 6.63 on attention-soft |
| `attention-soft` | `#fdf0d5` | Attention badge/banner background | |
| `ok` | `#2f8a63` | Live dot | 3.77 vs canvas (non-text, always beside text) |
| `ok-ink` / `ok-soft` | `#14603e` / `#dcf1e6` | Done, paid, live | 6.41 |
| `priority` / `priority-soft` / `on-priority` | `#6b3d9b` / `#efe6f8` / `#fff` | Paid priority visit | 6.27 |
| `neutral-soft` | `#e3eaee` | Neutral badges, nav counts | ink 13.25 |

Result: every text pairing the docs claim as >= 4.5:1 was recomputed and holds. The documented numbers are accurate. No dark theme and no `prefers-color-scheme` handling in the console.

Hard-coded colours outside tokens: `rgba(19,35,43,0.35)` scrim (`console.css:439`), `rgba(47,138,99,*)` live-dot pulse (`:338, :344-346`). Both derive from `ink` / `ok`.

### Public site palette (separate system, `site/styles.css:1-11`)

`--bg #050505`, `--ink #f4f7f4`, `--muted #a3aea3` (8.87 on bg, 8.09 on card, 7.81 on contact panel), `--green #82db82` (12.0 on bg), `--green-deep #14301a`, `--card #101410`, `--line rgba(130,219,130,.22)`. Button text `#071207` on green 11.3:1. Dark only. Raw hex used directly; no shared tokens with the console.

## 4. Type

- Console families: **Anek Latin** (English) + **Anek Devanagari** (Hindi), weights 400-800, loaded from Google Fonts. `html[lang=hi]` switches body to 16/26 (`console.css:64`); `document.documentElement.lang` is set on every render (`app.js` `view()`).
- Scale (`console.css:71-84`): `heading-lg` 24/30 600, `heading` 18/24 600, `body` 15/22 400, `body-strong` 15/22 600, `label` 13/18 500 (+.01em), `caption` 12/16 400, `figure-lg` 28/32 600, `call-next` 32/36 700; Hindi: `hi-heading` 19/28, `hi-body` 16/26, `hi-label` 14/22, `hi-caption` 13/20, `hi-call-next` 28/40. Tabular figures via `.bn-num`.
- Sizes below the scale already in use: **11px** on the mobile bottom nav (`console.css:641, 645`); 12px `.live-pill`, `.pill`, `.settings-group`.
- Site: **Outfit** 400-700 (Google Fonts), body 17/1.5, h1 `clamp(46px,6vw,72px)`, h2 `clamp(36px,5vw,56px)`, kicker 13px uppercase .14em.

## 5. Space, radius, shadow, size

- Space (4px scale): 4 / 8 / 12 / 16 / 24 / 32 / 48 (`--space-1..7`). Ad-hoc values also present: 2px, 6px, 10px, 52px, 56px, 76px, 84px.
- Radius: `sm 4`, `md 6`, `lg 10`, `pill 999`. Site: 12 / 18 / 22 / 28 / 999.
- Shadow: `raised` (cards, top bar), `overlay` (drawer, menus, emergency banner). Site: one `0 24px 80px` shadow.
- Sizes: `control-md 40`, `control-lg 48`, `touch-min 44`, `call-next 128`, `place 14`. Off-token heights: chips and counters/segmented buttons 36px, live pill 28px, PIN keys 52px, staff rows 56px.
- Breakpoints (console): 1180 (3 -> 2 doctor columns), **900** (sidebar -> fixed bottom nav; single column), 720 (callback row grid), 560 (timeline). Site: 900.
- Focus: 2px `surface` gap + 3px `focus-ring` box-shadow on `a, button, input, select, textarea, .bn-btn, .bn-callnext-btn` (`console.css:90-98`); on red banner `on-emergency` ring (`:119-121`). The site defines none (browser default).

## 6. Components (class vocabulary in `console.css`)

`bn-btn` (+ `-primary`, `-quiet`, `-danger`, `-lg`, `-onred`, `-onred-solid`), `bn-badge` (+ `-info/-ok/-attention/-priority/-emergency/-held`), `bn-prio` (P1/P2/P3 marks), `bn-chip` (doctor status), `bn-window` / `bn-places` / `bn-place`, `bn-card` (patient card; `-held` dashed, status variants), `bn-emergency` (+ `emergency-wrap`, `p1-chip`, `emerg-chip`), `bn-cbrow` (callback row), `bn-switch`, `bn-callnext` / `bn-callnext-btn`, `banner` (+ `-quiet`, `-sync`), `panel`, `table.data`, `tabs`, `seg`, `drawer`, `modal`, `toast`, `cal` / `cal-cell`, `pill`, `bubble`, `rec`, `stat`, `settings-*`, `pad` (PIN keypad), `signin` / `lock` cards.

## 7. Icons

Inline SVG set drawn in `app.js` `GLYPH` (16px, stroke `currentColor`, 1.6 width, round caps/joins, class `bn-glyph`): check, clock, alert, up, phone, pause, arrow, cal, grid, list, rupee, msg, user, gear, search, lock. Always beside a text label, aria-hidden. `README.md` names Lucide as the future set; **code does not use Lucide.** No emoji in UI.

## 8. Dark / light

Console: light only. Site: dark only. No theme switch anywhere.

## 9. Brand, banners, hero, imagery

- Logo: `console/public/brand/*` is byte-identical to `brand/deskie/*` (only `build_logo.py` and `index.html` exist solely in `brand/`). Console uses `deskie-logo.svg` (sign-in 200px, rail 168px) and `deskie-mark.svg` (22px, top bar, `alt=""`). Favicons 16/32/180/512 are wired in both HTML heads.
- Public site: **text wordmark "Deskie" in Outfit**, not the SVG logo. Hero is type plus a CSS dotted background (`.dots`, `aria-hidden`); no hero or banner image exists.
- "Banners" in this product are UI components: the red `bn-emergency` bar and the `.banner` status strips. No raster or illustrated banners.
- Imagery: none in the app. `demo/launch/*` (mp4 frames/shots) is marketing; `demo.mp4` is copied into the site only at deploy time (`scripts/deploy_deski.sh:104`).

## 10. Motion

| Animation | Where | Gated by `prefers-reduced-motion`? |
|---|---|---|
| Emergency icon pulse (1s, infinite until acked) | `console.css:226-229` | **Yes** |
| Live dot pulse (1.6s, infinite) | `console.css:336-347` (`.live-pill i`, `.bn-chip.is-ticking`) | No |
| Activity item slide-in 0.35s | `console.css:391-399` | No |
| `scroll-behavior: smooth` | `site/styles.css:14` | No |

## 11. Drift and inconsistencies worth knowing (not changed)

1. Docs say tokens are consumed from `tokens.css`; code duplicates them by hand (risk of silent drift).
2. Fonts are bundled locally but fetched from Google; `phone.html` loads none.
3. Docs recommend Lucide; code uses its own glyphs.
4. Docs say controls are 48px on phones; CSS never switches (`.bn-btn` stays 40px at all widths).
5. Console and public site share a name but no tokens, font or palette. This is a visual-identity decision for the owner, not a UX defect; fixes must not merge them.
6. Skills requested for this task: only `ui-ux-pro-max` is installed here. `design-system`, `ui-styling`, `brand` and `banner-design` are not in this session's skill list, so their guidance was not applied; the repo's own `design-system/README.md` and `brand/` were used as the equivalents.
