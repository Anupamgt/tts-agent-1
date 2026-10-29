# bolnai-helpdesk

Voice AI phone help desk for a local clinic (Bolna + admin console + Google Calendar + Postgres).

- `docs/prd/TECHNICAL_PRD.md` - local prototype runtime (Bolna web call, LiveKit, Kafka, traces, handoff)
- `docs/scope.md` - agreed scope and open questions
- `docs/gtm.md` - go-to-market decisions the product depends on (full plan: https://claude.ai/artifact/BjosXcjEXwY6SnBRMTF6Ud)
- `docs/metrics.md` - success metrics: north star (saved calls), drivers, safety limits, targets by stage (full model: https://claude.ai/artifact/FSXF4LNjKg5znEgeg6adgx)
- `docs/flows/` - architecture, clinic flow today vs with agent, and the detailed decision trees (00 to 11, start at `docs/flows/README.md`)
- `docs/alignment.md` - decisions (all decided as of 29 Oct 2026) (with pointers into the flows), caveats, and inputs needed
- `docs/decision-log.md` - audit trail of the 29 Oct 2026 scope and compliance decisions (D-01 to D-33) and the pilot gate checklist (full doc: https://claude.ai/artifact/QuWJEoAzZ5Xv3dvh1NiQAM)
- `docs/privacy-notice.md` - draft call opening line and privacy notice for the clinic and its lawyer
- `docs/design/claude-design-handoff.md` - console UI brief for Claude Design (users, screens, states, sample data, kickoff prompt)
- `design-system/` - snapshot of the "Bolnai Helpdesk" design system (live copy: https://claude.ai/artifact/Tjkq5Qy2Ac4VLZWS7eWuRk): `tokens.json` (source), generated `tokens.css`, React components (`components/bundle.js` as `window.Bolnai`, `bundle.css`, `index.d.ts`), per-component guidelines and previews, Anek fonts (SIL OFL 1.1). Regenerate CSS with `node design-system/build-tokens-css.mjs`
- `docs/security/threat-model.md` - security and abuse review: findings, fixes, status, and what is not yet covered
- `db/` - demo Postgres schema, seed data, tests and notes
- `docs/research/` - hospital help desk research (final report + four source notes)
