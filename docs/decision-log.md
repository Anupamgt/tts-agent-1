# Decision log

The full audit trail, with the rules each decision rests on and their sources, is the doc "Bolnai scope decisions and audit trail": https://claude.ai/artifact/QuWJEoAzZ5Xv3dvh1NiQAM. This file is the repository copy that the flows and schema point to.

- **Decided by:** Claude, on Anupam's instruction of 29 Oct 2026, 16:19 IST: "complete the scope with respect to the compliance of Indian regulators and what makes the most sense according to the build".
- **Tests, in order:** (1) an Indian rule decides it; (2) the option that keeps patients safer; (3) what fits the build (buildathon submit 31 Oct, finale 20 Nov; backend as of commit 72f9415), then the pilot. If none separates the options, the proposed default stands.
- **Statuses:** Decided; Decided, needs sign-off (the build follows it now, and a named person confirms it before any real patient call); Deferred.
- Not legal advice.

Numbers in brackets are rows of `docs/alignment.md`.

| ID | Decision | Chosen | Why (rule or build) | Status | Lands in |
|---|---|---|---|---|---|
| D-01 | Emergency script (4) | Call 112 now, or 108 for an ambulance; said at once, repeated once; staff alerted; P1 callback in 15 min. Self-harm or distress: calm line + Tele-MANAS 14416. Never a transfer to 112 | 112/108 cover the first cities; Tele-MANAS is free and 24x7; DPDP s.7(f) covers the data use in a medical emergency | Needs sign-off: clinic | `flows/01` part A |
| D-02 | Medical advice (5) | Always declined; visit or callback offered | Telemedicine Practice Guidelines 2020: AI may not counsel or prescribe | Decided | `flows/01` part C |
| D-03 | Reports (11) | Status only, after full verification, never values, never to a relative | Health data is sensitive (SPDI Rules until 13 May 2027); a wrong-person disclosure is a breach | Decided | `flows/05` |
| D-04 | Refill defaults (10a) | All defaults kept (desk collection or doctor sends; no pharmacy; guardian for children; 2 days = same-day callback; 1 open, 4 per 30 days; PIN per approval) | Telemedicine follow-up and pharmacy-consent rules | Needs sign-off: doctors | `flows/11`, schema |
| D-05 | Refill and doctor-message records | Kept 3 years | Teleconsultation log duty; no outpatient period set, 3-year indoor period borrowed | Needs sign-off: lawyer | schema `refill_record_retention_days` |
| D-06 | Data roles | Clinic = data fiduciary; Bolnai = processor under a written contract; no own use, no model training | DPDP s.8(2) | Needs sign-off: lawyer | `privacy-notice.md`, threat model S-07 |
| D-07 | Call opening (20) | Automated assistant + recording disclosed in the first sentence; desk on request; objectors get a desk callback | DPDP s.7(a) needs the purpose stated; IT Rules 2026 AI labelling points the same way | Decided | `privacy-notice.md` section 1 |
| D-08 | Privacy notice (21d) | Spoken line + SMS link to the full notice | DPDP notice duty (May 2027); SPDI privacy policy now; link whitelisted on DLT | Needs sign-off: clinic, lawyer | `privacy-notice.md` |
| D-09 | Retention (21c) | Audio 30 d; transcripts and trace text 180 d; access/audit logs 1 y; refill records 3 y; payments per the clinic's accountant | DPDP Rule 6(1)(e) logs 1 year; CERT-In 180 days of logs in India | Needs sign-off: lawyer | schema, threat model S-07 |
| D-10 | Children's data | Fourth Schedule health-services exemption; guardian rule kept for refills | DPDP Rules Fourth Schedule Part A | Decided | threat model S-17 |
| D-11 | New patient data (16) | Name, age or DOB, confirmed phone; never Aadhaar, ABHA, address or detailed reason | DPDP purpose limitation | Decided | `flows/03` B15 |
| D-12 | Where data lives | Buildathon: Mac Mini, fictional data only. Real data: India-region managed hosting, encrypted backups, Bolna India residency | S-14; CERT-In logs in India | Decided | `deploy-mac-mini.md`, S-14 |
| D-13 | Incidents | Bolnai tells the clinic and CERT-In within 6 h; clinic tells patients without delay and the Board within 72 h | CERT-In Directions 2022; DPDP Rule 7 | Decided | threat model, runbook to write |
| D-14 | Inbound number | Clinic forwards busy, unanswered and after-hours calls to a Bolna Indian number; KYC applied for now | No number change for patients | Decided | GTM |
| D-15 | Reminders and outbound calls (17) | Pilot: SMS reminders only; no automated outbound calls until the number series and robo-call notice are confirmed. Buildathon: team phones only | TRAI TCCCPR (Feb 2025 amendment) | Decided | `flows/07`, schema `reminder_channel` |
| D-16 | SMS registration | Clinic is the DLT principal entity with its own header; English + Hindi Unicode templates; links and callback numbers whitelisted | TCCCPR; CTA whitelisting since Oct 2024 | Decided | scope, `flows/07` |
| D-17 | WhatsApp | Utility templates only after opt-in at booking; mock outbox in the buildathon | Meta policy; DPDP consent | Decided | `flows/10` |
| D-18 | Refund shares (3e) | Clinic-caused 100%; cancel 24 h+ ahead 100%; later 50%; no-show 0; read out before the fee is agreed | Terms told before payment | Decided | `flows/10`, settings |
| D-19 | Refund approval (3f) | Admin approves every refund, never the requester; refund to the original payment | S-04 | Decided | `flows/10`, schema |
| D-20 | Unpaid links, waivers (3g, 21b) | One reminder, then pay at desk; waivers by admin with a reason | Traceable money | Decided | `flows/10`, schema |
| D-21 | Who holds money | Clinic's own gateway; Bolnai never holds money; buildathon mocks links, refunds policy-only | Out of payment-aggregator rules; matches the backend | Decided | `flows/10`, `api/` |
| D-22 | Priority visits (2, 3d) | Release 2 h before; offered only when asked or regular places full, never after symptoms | No upselling to unwell callers; no triage | Decided | `flows/03` part P |
| D-23 | 30-minute window (13a) | Shared window of 4; per-doctor capacity can be 1 | Matches schema and console | Decided | `flows/03`, `09` |
| D-24 | Same-specialty pooling (1b) | Pool when no doctor is named | Fewer idle specialists | Decided | `flows/03` |
| D-25 | Walk-ins (14) | Desk entry against the current window; priority place may be sold | Matches the console | Decided | `flows/09` |
| D-26 | Desk switch, callbacks (8, 9) | Switch decides transfer vs callback; P1 15 min, P2 2 h or session end, P3 next session | No caller sent to an empty desk | Decided | `flows/06` |
| D-27 | Unreachable after 2 delay SMS (12) | Keep place if it fits today, else hold next free slot and text; pilot: staff place the ask call | No silent moves; D-15 | Decided | `flows/09`, `07` |
| D-28 | Failure handling (18) | Never retry a write blindly; check, then callback | No double bookings | Decided | `flows/08` |
| D-29 | Abuse limits (21a) | 3 upcoming / 4 agent bookings per number per day / lockout after 5 | Already enforced | Decided | schema |
| D-30 | Remaining defaults | Alignment section E and the review doc's voice, design, console and demo-data rows kept | Build already follows them | Decided | alignment E |
| D-31 | Buildathon cut | Fictional clinic, web call and demo phone, mock outbox, mocked payments, team phones only, gold-set evals | No real data before contracts | Decided | `docs/evals/`, deploy |
| D-32 | Pilot gate | Compliance checklist (below) done before the first real patient call | Duties attach on the first real call | Decided | this file |
| D-33 | Out of v1 | ABHA linking, prescriptions to pharmacies, automated outbound calls until D-15 clears, other languages | Each adds a consent or registration step | Deferred | scope |

## Pilot gate checklist (D-32)

1. Processor contract (DPA) signed between the clinic and Bolnai (D-06).
2. Privacy notice reviewed and live; opening line in the agent prompt (D-07, D-08).
3. Emergency script signed off by the clinic (D-01); refill flow signed off by its doctors (D-04).
4. India-region managed hosting with encrypted, tested backups; Bolna India residency on (D-12).
5. Nightly purge job for recordings, transcripts and trace text; access logs kept 1 year (D-09).
6. Incident runbook with contacts: clinic and CERT-In within 6 hours (D-13).
7. Bolna Indian number KYC done; clinic forwarding tested (D-14).
8. DLT: clinic registered as principal entity, header and English + Hindi templates approved, links whitelisted (D-16).
9. WhatsApp templates approved and opt-in captured at booking, if payments are live (D-17).
10. Reminders running on SMS; automated outbound calls off (D-15).
11. Gold-set safety cases pass: emergency, no advice, no unverified disclosure (`docs/metrics.md` safety limits).
12. Per-clinic data isolation before a second clinic goes live (`db/README.md` known gaps).
