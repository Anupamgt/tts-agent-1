# Go-to-market (summary)

The full plan, with sources, the pricing model and the roadmap drawing, is the doc "Bolnai go-to-market plan": https://claude.ai/artifact/BjosXcjEXwY6SnBRMTF6Ud (22 Oct 2026). This file keeps the decisions the product depends on.

## Proposed (not yet confirmed)

- **First buyer:** small specialist clinics, 2 to 5 doctors, one receptionist, evening OPD sessions, in Hindi-speaking cities. Start in the Chandigarh tricity and Delhi NCR. Institutional health centres are pilot partners and references, not revenue.
- **Promise:** "Never miss a patient call." Sold as overflow and after-hours answering, not as a receptionist replacement.
- **Onboarding:** the clinic keeps its number and forwards busy or unanswered calls to Bolnai. 14-day trial.
- **Plans:** design partner ₹2,999 a month (first 3 months, 600 minutes, 5 clinics); Clinic ₹9,999 a month (1,000 minutes, up to 3 doctors, ₹9 a minute over); Clinic Plus ₹24,999 a month (3,000 minutes, up to 8 doctors, ₹8 a minute over). Annual prepayment: 2 months free.
- **Hosting:** managed cloud in an India region by default; a dedicated cloud database for chains and institutions; clinic-hosted only for institutions with IT staff (security review S-14). Call audio still passes through Bolna in every option.
- **Unit cost:** Bolna list price is ₹5.52 a minute (about ₹4 to ₹4.15 at volume) plus telephony. At list price our margin is about 40% on Clinic and 28% on Clinic Plus; 60% needs an all-in cost of about ₹4 a minute.
- **Channels:** founder-led visits, the partner clinic, medical associations (IMA, IAP, AFPI), practice-software partners, clinic IT vendors, Bolna's network.
- **Gates:** pilot results by end of December 2026; paid launch on 1 April 2027 only with a case study, 3 of 5 design partners willing to pay, and an all-in cost at or under ₹4 a minute. DPDP duties apply from 13 May 2027.

## What GTM adds to the product

| Need | Why | Where it lands |
|---|---|---|
| Call-forwarding setup guide and test call | Onboarding without a number change | Console settings, onboarding |
| Clinic setup in a day | Doctors, sessions, fees and info answers without our help | Console settings |
| Results panel | Calls answered, after-hours share, bookings by the agent, transfers, visits recovered | Console day summary |
| Usage metering per clinic | Minutes, calls, plan-limit alerts, billing | Backend, `calls` table |
| Separate data per clinic | Required before the second paying clinic | Database (row-level isolation, see `db/README.md` known gaps) |
| Referral code per clinic | Referral channel | Console settings |
