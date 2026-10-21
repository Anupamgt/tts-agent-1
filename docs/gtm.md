# Go-to-market (summary)

The full plan, with sources, the pricing model and the roadmap drawing, is the doc "Bolnai go-to-market plan": https://claude.ai/artifact/BjosXcjEXwY6SnBRMTF6Ud (22 Oct 2026). This file keeps the decisions the product depends on.

## Proposed (not yet confirmed)

- **First buyer:** small specialist clinics, 2 to 5 doctors, one receptionist, evening OPD sessions, in Hindi-speaking cities. Start in the Chandigarh tricity and Delhi NCR. Institutional health centres are pilot partners and references, not revenue.
- **Promise:** "Never miss a patient call." Sold as overflow and after-hours answering, not as a receptionist replacement.
- **Onboarding:** the clinic keeps its number and forwards busy or unanswered calls to Bolnai. 14-day trial.
- **What we charge by:** a monthly plan sized by the number of doctors, with an allowance of answered calls. A call counts per 4-minute block, so long calls count double. Not per minute (bill shock) and not per booking (yet).
- **Tiers (GST extra, margins at 2.5 minutes a call, at Bolna list / at a ₹4-a-minute target):**

  | Tier | For | Price a month | Answered calls | Over the allowance | Margin |
  |---|---|---|---|---|---|
  | Starter | 1 doctor | ₹3,999 | 200 | ₹20 a call | 25% / 50% |
  | Clinic | 2 to 4 doctors | ₹9,999 | 500 | ₹20 a call | 25% / 50% |
  | Clinic Plus | 5 to 8 doctors | ₹19,999 | 1,000 | ₹20 a call | 25% / 50% |
  | Enterprise | Chains, hospitals, campus health centres | From ₹40,000 per location | Committed volume | Agreed rate | Negotiated |

  Every tier gets English, Hindi and Hinglish calls, bookings into arrival windows, info answers, SMS confirmations, emergency handling (never counted), the doctor phone view, and messages and refill requests to the doctor. Clinic and up add priority visits, fees, UPI links and refunds, and any-doctor pooling. Console seats: 2, 5, 10, unlimited. Outbound reminder calls: add-on on Starter and Clinic, 500 a month on Clinic Plus.
- **Add-ons:** reminder calls ₹6 each; WhatsApp at Meta's charge; extra language ₹1,999 a month once supported; dedicated cloud ₹25,000 setup + ₹5,000 a month; clinic-hosted database ₹40,000 setup + ₹3,000 a month (institutions with IT staff only); DLT registration help at cost.
- **Past the allowance:** SMS to the clinic admin at 80% and 100%; calls still answered in full at ₹20 each up to a cap the clinic sets (default 25% over); past the cap the agent takes a message or books a callback instead of a full booking. Emergency calls are never counted, capped or shortened. No rollover in v1.
- **Discounts and terms:** design partners ₹2,999 a month for 3 months (5 clinics), then 30% off the first year; annual prepayment 2 months free; partner association members 15% off the first year; one free month per paying referral; 10% off from the third location; 14-day trial, up to 100 calls, forwarding only, no card.
- **Hosting:** managed cloud in an India region by default; a dedicated cloud database for chains and institutions; clinic-hosted only for institutions with IT staff (security review S-14). Call audio still passes through Bolna in every option.
- **Unit cost:** Bolna list price is ₹5.52 a minute (about ₹4 to ₹4.15 at volume) plus telephony. At 2.5 minutes a call that is about ₹15 a call at list and ₹10 at a ₹4-a-minute target, so every tier's margin is 25% at list and 50% at target.
- **Channels:** founder-led visits, the partner clinic, medical associations (IMA, IAP, AFPI), practice-software partners, clinic IT vendors, Bolna's network.
- **Gates:** pilot results by end of December 2026; paid launch on 1 April 2027 only with a case study, 3 of 5 design partners willing to pay, and an all-in cost at or under ₹4 a minute. DPDP duties apply from 13 May 2027.

## What GTM adds to the product

| Need | Why | Where it lands |
|---|---|---|
| Call-forwarding setup guide and test call | Onboarding without a number change | Console settings, onboarding |
| Clinic setup in a day | Doctors, sessions, fees and info answers without our help | Console settings |
| Results panel | Calls answered, after-hours share, bookings by the agent, transfers, visits recovered | Console day summary |
| Usage metering per clinic | Answered calls counted per 4-minute block, emergency calls excluded, SMS at 80% and 100%, clinic-set cap, billing | Backend, `calls` table, console settings |
| Short-call mode past the cap | Agent takes a message or books a callback instead of a full booking | Agent prompt, tool server |
| Tier limits | Doctors, console seats, priority visits and pooling by tier | Backend, console settings |
| Separate data per clinic | Required before the second paying clinic | Database (row-level isolation, see `db/README.md` known gaps) |
| Referral code per clinic | Referral channel | Console settings |
