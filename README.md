# bolnai-helpdesk

Voice AI phone help desk for a local clinic (Bolna + admin console + Google Calendar + Postgres).

- `docs/prd/TECHNICAL_PRD.md` - local prototype runtime (Bolna web call, LiveKit, Kafka, traces, handoff)
- `docs/scope.md` - agreed scope and open questions
- `docs/flows/` - architecture, clinic flow today vs with agent, and the detailed decision trees (00 to 11, start at `docs/flows/README.md`)
- `docs/alignment.md` - decisions to confirm (with pointers into the flows), caveats, and inputs needed
- `docs/design/claude-design-handoff.md` - console UI brief for Claude Design (users, screens, states, sample data, kickoff prompt)
- `design-system/` - snapshot of the "Bolnai Helpdesk" design system (live copy: https://claude.ai/artifact/Tjkq5Qy2Ac4VLZWS7eWuRk): `tokens.json` (source), generated `tokens.css`, React components (`components/bundle.js` as `window.Bolnai`, `bundle.css`, `index.d.ts`), per-component guidelines and previews, Anek fonts (SIL OFL 1.1). Regenerate CSS with `node design-system/build-tokens-css.mjs`
- `docs/security/threat-model.md` - security and abuse review: findings, fixes, status, and what is not yet covered
- `db/` - demo Postgres schema, seed data, tests and notes
- `docs/research/` - hospital help desk research (final report + four source notes)
