# Operating system: running XPMatch without a person as the bottleneck

Written September 21, 2026. Third of three documents (`docs/COMPETITOR_LANDSCAPE.md`,
`docs/REVENUE_MODEL.md`, this one). The parent plan is `docs/BUSINESS_PLAN.md`.

**The rule.** Every recurring job in the business is one of three things: automated inside the
product, run by an AI agent on a schedule with a human touching only the exceptions, or written as a
procedure a contractor can run from the document alone. Anything that fails all three is a bottleneck
and goes on the list in section 2 until it is fixed.

**What stays human.** Sales calls until a closer is hired, gate decisions, money (refunds above a
threshold, payouts, pricing), guarantees, hiring, and approving key rotations. Everything else is
designed to run without the founder.

---

## 1. How the business runs on a normal day

| Time | What happens | Who or what does it |
| --- | --- | --- |
| Continuous | Sign-ups, quizzes, packages, trips, bookings, payments, trial emails | The product, Stripe, Resend |
| 06:00 | Production smoke test runs; failures page the founder | Scheduled test run against production |
| 07:00 | Cost and health digest: Google SKU counts, model spend, errors, uptime | Scheduled report |
| 08:00 | Support inbox triaged; replies drafted from the help content; known categories auto-answered | AI agent, human reviews exceptions |
| 09:00 | Concierge queue: new orders have a draft board built; QA checklist opened | Product automation, then a reviewer |
| 10:00 | Outbound: yesterday's replies triaged, follow-ups queued, today's sends prepared | AI agent drafts, human approves until a variant earns it |
| Daily | One content piece drafted from real activity; posted after approval | AI agent, founder approves |
| Monday | LAPS scoreboard, kill or scale variants, weekly metrics report | Scheduled report, founder reads |
| Monthly | Books closed, payouts run, data room refreshed, keys and access reviewed | Scheduled jobs, founder signs off |

The founder's day: sales calls, exception queue, gate decisions. Under ten hours a week of delivery.

---

## 2. Bottleneck audit

| Founder-dependent today | System that replaces it | Status | Effort |
| --- | --- | --- | --- |
| Taking money | Stripe billing, portal, dunning | Build | 3–4 days |
| Answering support and bug reports | Support inbox with AI drafts; bug reports already reach `/admin` | Build on existing | 2 days |
| Building concierge trips | Draft board built automatically from the intake; QA by a reviewer with a checklist | Build | 3 days + SOP |
| Knowing costs and health | Digest from Google SKU counts, OpenRouter, Railway, error tracker | Part built: `/admin` counts Google calls by SKU (`docs/COGS.md` §9); the digest and the other sources remain | 1 day |
| Finding leads and writing outreach | Weekly list build, sequences, reply triage | Buy + build | 1 week |
| Publishing content | Drafts from activity, approval queue, scheduled posting | Build + buy | 2 days |
| Shipping code safely | CI with the unit and e2e suites, preview deploys, release checklist | Exists partly | 1 day |
| Watching the deploy | Health checks, uptime monitor, alerts | Buy | Hours |
| Paying creators and refunds | Payout ledger and monthly payout run; refund rules in the portal | Build | 2 days |
| Reporting to a buyer | Monthly data-room export | Build | 1 day |

---

## 3. The systems

### 3.1 Revenue and billing

- **Purpose:** take money for every offer without a person in the loop.
- **Components:** Stripe Checkout and Billing for Trip Pass, Plus (annual default, 14-day trial),
  Advisor seats, Concierge payments; customer portal for upgrades, pauses and cancellations; Smart
  Retries for failed cards; Stripe Tax; webhooks that set entitlements in Postgres.
- **Automated:** checkout, invoices, dunning, pause and cancel, refunds within policy (self-serve
  within 7 days of a Trip Pass with an empty board), entitlement changes.
- **Human exceptions:** refunds above $100, chargebacks, advisor invoices on custom terms.
- **Cost:** 2.9% + $0.30 per payment, Stripe Tax 0.5%.

### 3.2 Acquisition

- **Outbound engine (advisors).** Weekly lead list built by an agent from the advisor directory and
  LinkedIn criteria in the ICP canvas; enrichment through a data tool; sequences in a cold-email
  platform on separate sending domains; replies triaged by an agent into interested, objection,
  not-now and unsubscribe; drafts for the founder; calendar link for booking. Human approves every send
  until a variant earns 5% replies over 200 sends, then approved variants auto-send.
- **Creators and referrals.** Unique links, attribution stored on the account, an activation-based
  payout ledger, monthly payouts.
- **Programmatic destination pages.** A scheduled job renders package pages for the top cities from
  the catalog with our own text; Google fields refresh within the 30-day window when a page is viewed.
- **Lifecycle email.** Resend sequences triggered by product events: welcome, first package tips,
  trial ending, pre-trip (7 days out), post-trip ratings, win-back.
- **Content.** One draft a day generated from real activity (packages built, swaps, taste insights),
  founder approves in a queue, scheduler posts.
- **Human exceptions:** partnership calls, replies flagged as objections, anything legal.

### 3.3 Onboarding

- **Purpose:** first matched package in under 60 seconds with nobody involved.
- **Components:** three-question quiz, package-first landing, event tracking (quiz done, package
  shown, swap, lock, trip created, member joined), a funnel on `/admin`, the advisor guided first
  proposal.
- **Human exceptions:** none. A drop in activation triggers a review, not a manual step.

### 3.4 Fulfillment

- **Product.** Already automated: catalog-first resolution, packages, the board, routed legs, shared
  trips. Cost caps per tier and the daily lookup budget protect margin without anyone watching.
- **Concierge pipeline.** Intake form → the app builds the draft board (packages for each destination,
  swaps to the client's answers, scheduled stops, legs, confirmations attached) → a reviewer opens the
  QA checklist (every place checked against its live listing, one line per day, closures and hours) →
  delivery email with the share link and a call slot → post-trip rating request → case-study prompt.
  SLA timer on the queue; a breach at 36 hours alerts the founder.
- **Capacity rule.** Above 20 trips a month, a part-time reviewer runs the checklist; the SOP is the
  training manual. Above 60, a second reviewer.
- **Advisor delivery.** Self-serve; the playbook page answers how-to questions; support handles the
  rest.
- **Human exceptions:** QA failures, client changes after delivery, refunds.

### 3.5 Support

- **Components:** one inbox (shared mailbox or a small help desk), bug reports from the sidebar (built),
  a help center generated from `docs/USER_FLOWS.md`, an agent that drafts replies from the help
  content and the account's state, canned answers for the ten most common questions, a status page.
- **Automated:** first response within minutes for known categories; ticket tagging; bug reports filed
  as issues with the screenshot attached.
- **Human exceptions:** anything about money, anything the agent tags as unsure, angry customers.
- **Targets:** first response under 1 hour automated, human resolution within one business day.

### 3.6 Reliability and cost control

- **Components:** Railway health check and deploy alerts, an uptime monitor with paging, error
  tracking, a daily production smoke test (sign in, quiz, package, trip, book click), Google Cloud
  budget alerts and per-SKU quotas, OpenRouter spending limit, a cost-per-active-user tile on `/admin`,
  Postgres backups verified monthly, a key and access inventory with rotation dates.
- **Automated:** detection and paging, cost caps, backups, the smoke test.
- **Human exceptions:** incidents (runbook in section 5), rotation approvals.

### 3.7 Data and reporting

- **Components:** product events in Postgres, `/admin` tiles (activation funnel, paying accounts,
  MRR, churn, hit rate, package keep and trip rates, cost per active user, LAPS, revenue per trip from
  affiliate reconciliation), a Monday report emailed automatically, a monthly data-room export.
- **Automated:** all of it. The founder reads; nobody compiles.

### 3.8 Retention

- **Components:** annual-first pricing, pause instead of cancel in the portal, pre-trip and post-trip
  sequences, "next trip for you" from the scored inspiration, member invites in "Turn into a trip",
  win-back 30 days before the next likely trip window, profile progress on the home page.
- **Automated:** every touch. A churn spike triggers a review.

### 3.9 Engineering and release

- **Components:** GitHub Actions running lint, typecheck, unit and e2e suites on every push; preview
  deploys; Railway deploys from `main` only after checks pass; feature flags for paywalls and
  experiments; AI coding sessions with tests for every change; a release checklist that runs itself
  (secret scan, suites, build, deploy status).
- **Human exceptions:** merging to `main`, rollback decisions.

### 3.10 Finance, legal and compliance

- **Components:** Stripe as the ledger of record, a bookkeeping tool synced to Stripe and the bank,
  Stripe Tax, terms and privacy policy with the data deletion promise, a deletion endpoint, an
  affiliate disclosure, advisor terms, a contractor agreement template, an IP assignment for every
  contributor, the monthly close as a checklist.
- **Automated:** invoices, taxes, sync, monthly reports.
- **Human exceptions:** filing, contracts, anything a lawyer should read.

### 3.11 People and hiring triggers

| Role | Trigger | Scope |
| --- | --- | --- |
| Part-time concierge reviewer | > 20 trips a month | Runs the QA checklist; $25–35 an hour |
| Support contractor | > 50 tickets a week or human resolution slipping past a day | Works the exception queue |
| Closer for advisors | > $20k MRR or the founder's calls exceed 10 a week | Owns LAPS from appointment to sale |
| Second reviewer | > 60 trips a month | Same SOP |

AI agents handle research, drafting, code, triage and reporting throughout; a human owns calls,
delivery accountability, guarantees and gate decisions.

---

## 4. Automation calendar

| Cadence | Job | Runs on |
| --- | --- | --- |
| Continuous | Billing, entitlements, lifecycle email, activation events, cost caps | Product, Stripe, Resend |
| Daily 06:00 | Production smoke test | Scheduled test run |
| Daily 07:00 | Cost and health digest | Scheduled job |
| Daily 08:00 | Support triage and drafts | Scheduled agent session |
| Daily 09:00 | Concierge draft builds and SLA check | Product job |
| Daily 10:00 | Outbound reply triage and follow-up queue | Scheduled agent session |
| Daily | Content draft into the approval queue | Scheduled agent session |
| Weekly Monday | LAPS scoreboard, metrics report, variant kill-or-scale proposal | Scheduled report + agent |
| Weekly | Lead list refresh and trigger-event scan | Scheduled agent session |
| Weekly | Destination page refresh for viewed pages | Product job |
| Monthly | Close the books, creator payouts, data-room export, backup restore test, key and access review | Scheduled jobs + founder sign-off |
| Quarterly | Gate review and decision document | Founder, with an agent-prepared brief |

The scheduled agent sessions can run as Routines in the same environment that builds the app; each one
reads its SOP, does the work, and leaves a short report and an exception list.

---

## 5. Procedure library

| Procedure | Owner | Status |
| --- | --- | --- |
| Concierge build, QA checklist, delivery, post-trip | Reviewer | To write with the queue |
| Support macros and escalation rules | Support | To write from the help center |
| Refund and pause policy | Founder | To write with billing |
| Incident runbook: red deploy, sign-in down, Places or model outage, cost spike | Founder | To write; partly in `docs/BETA_READINESS.md` |
| Key rotation and access inventory | Founder | To write; the rotation list exists in `docs/BETA_READINESS.md` |
| Deploy and rollback | Engineering | Exists in practice; to document |
| Weekly LAPS review and CAOS log | Founder | Template in `docs/BUSINESS_PLAN.md` |
| Creator payout run | Founder | To write with the ledger |
| Monthly close and data-room refresh | Founder | To write |
| Advisor onboarding and playbook | Support | To write with the workspace |

---

## 6. Tool stack and monthly cost

| Area | Tool | Cost (approximate) |
| --- | --- | --- |
| Billing | Stripe | 2.9% + $0.30 per payment; Tax 0.5% |
| Email | Resend | $20 |
| Hosting | Railway | $20–40 |
| Analytics | PostHog or product events on `/admin` | $0–50 |
| Errors and uptime | Sentry, Better Stack | $0–50 |
| Support | Shared inbox or a small help desk | $0–50 |
| Outbound | Cold-email platform, enrichment, sending domains | $100–200 |
| Scheduling | Cal.com | $0 |
| Content | Scheduler | $10 |
| Bookkeeping | Accounting tool synced to Stripe | $0–30 |
| Passwords and access | Password manager with shared vaults | $10 |
| **Total** | | **$200–500 a month plus payment fees** |

---

## 7. Build order (90 days)

| Weeks | Systems | Why this order |
| --- | --- | --- |
| 1–2 | Billing; concierge queue; uptime and error alerts; smoke test; cost digest | Money in, nothing breaks silently |
| 3–4 | Support inbox with drafts; lifecycle email; activation events and funnel | Customers are answered and onboarded without the founder |
| 5–8 | Outbound engine; creator ledger; Monday report; procedure library v1 | Sales and reporting run on a schedule |
| 9–12 | Advisor workspace; content queue; data-room export; backup test; access inventory | The seat product and buyer-readiness |

---

## 8. What "no bottleneck" looks like to a buyer

A buyer's diligence checklist, kept current from month 12:

- Every system above has an owner (a person or a scheduled job) and a document.
- The founder can take two weeks off with revenue, support and delivery unchanged; test it once a
  quarter.
- Metrics are exported monthly without manual work; cohort retention, CAC by channel and revenue per
  trip are reproducible from the database.
- Access inventory lists every key, who holds it and when it last rotated; no key lives in a chat log
  or a repo.
- Contracts: advisor terms, creator terms, contractor agreements with IP assignment, affiliate program
  agreements, privacy policy with the deletion promise.
- The codebase has tests that run on every push, a deploy that rolls back in one step, and docs that a
  new engineer can build from in a day.
