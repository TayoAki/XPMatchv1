# XPMatch — Twelve-P Review

Run date: Sunday, Sep 21, 2026 · Framework: *Own or Be Owned* twelve Ps, via the `own-run` skill
Stage: **pre-launch** — production software, zero commercial validation
Branch: **idea** for everything commercial; **existing business** only for the software asset

> **Two disclosures before anything else.**
> 1. **The twelve `own-*` specialist skills are not installed in this session.** Only the `own-run`
>    orchestrator was supplied. Every diagnosis below is therefore a **provisional diagnostic built
>    from `references/p-map.md`**, not the output of the specialist method for that P. Where a
>    specialist would go deeper, the row says so.
> 2. **The source PDF (*Own or Be Owned*, 314 pages) was not attached.** The p-map's page citations
>    could not be checked against it. No book anecdote is presented here as verified evidence.
>
> No official Owner Score is calculated — the book's questionnaire is not supplied, and inventing a
> score from a different rubric would misrepresent it. The 0–4 scale below is this suite's own
> evidence-based maturity scale, with **unassessed** and **not yet applicable** as distinct states.

---

## 1. Business Brief

| Field | Value |
|---|---|
| Business | XPMatch, Inc. — taste-matched travel planning |
| Stage | Pre-launch. Production app; **$0 revenue, 0 customers, no billing integration** |
| Customer | (A) self-planners taking 2+ leisure trips a year; (B) independent travel advisors, 0–3 years in the profession |
| Problem | Generic itineraries and 40 open tabs; advisors rebuild the same proposal for every client |
| Offer | Free · Trip Pass $19/60d · Plus $49/yr or $7.99/mo · Concierge $149–399 · Advisor seat $49/mo |
| Currency / geography | USD, United States first |
| Owner path | Cash-flow positive by month 12; sellable by month 24 to a financial buyer |
| Constraints | $25,000 founder cash [A]; 12 months with no owner draw [A]; ~50 founder hours/week combined [A] |
| Tools actually available | Railway, Postgres, Google Places, OpenRouter, Resend, GitHub. **No Stripe, no CRM, no bookkeeping, no error monitoring, no scheduler** |
| Current bottleneck | **No mechanism to accept payment**, compounded by zero first-party demand evidence |
| Team | Two founders [A]. No founder agreement, no vesting, no employees, no contractors |
| Last review | This document |

## 2. Evidence ledger

| ID | Evidence | Type | Source | Date / period |
|---|---|---|---|---|
| E1 | Production application: onboarding, taste match, package builder, trip boards, maps, admin | Verified (first-party) | `README.md`, repository at `4320c89` | Sep 21, 2026 |
| E2 | Cost per active user $1.40–2.00/month after the place catalog, down from ~$10 | User-reported, first-party | `docs/COGS.md` | Sep 2026 |
| E3 | Competitor pricing: Layla $49.99/yr · Wanderlog Pro $39.99/yr · TripIt Pro $49/yr · Travefy $39–59/mo · Tern $39/seat/mo | Verified (public pages, cited) | `docs/COMPETITOR_LANDSCAPE.md`, `docs/REVENUE_MODEL.md` | read Sep 2026 |
| E4 | 78% of travel advisors charge a planning fee; fees $100–1,500 | Verified (published) | Travel Institute via Creo Proposals; AAA | 2026 |
| E5 | 37% of US travellers used AI to plan travel (2,001 adults); 43% of affluent travellers | Verified (published) | Allianz Mar–Apr 2026; Deloitte 2026 | Spring 2026 |
| E6 | Fora: 15,000+ advisors, 97% new to the profession, $1B valuation | Verified (published) | Skift, Fora newsroom | Jul 2026 |
| E7 | Expedia acquired Layla | Verified (published) | Expedia IR | Jul 31, 2026 |
| E8 | Travel subscription benchmarks: 4.1% median trial conversion; ~40% annual renewal; ~53% monthly first renewal | Verified (published) | RevenueCat State of Subscription Apps | 2026 |
| E9 | Three-year projection: Y1 $40,123 → Y3 $427,320; Y3 SDE $172,073; Y1 SDE −$5,575 | Derived calculation | `2-financial-model.md`, `2-financial-model.xlsx` | Sep 21, 2026 |
| E10 | Postgres runs one instance, one volume, **no backups**; API keys pasted in chat remain unrotated | Verified (first-party) | `docs/BETA_READINESS.md` items 2 and 5 | Sep 20, 2026 |
| E11 | No billing integration exists in the codebase | Verified (first-party) | Repository search; `docs/BUSINESS_PLAN.md` §6.5 | Sep 21, 2026 |
| E12 | Zero paying customers, zero paid pilots, zero booked discovery calls, zero waitlist | Verified (absence, first-party) | `docs/BUSINESS_PLAN.md` §2 gate table | Sep 21, 2026 |
| — | Community sizes, SEO head-term volumes, seasonality amplitude, support load per customer, name clearance | **Unknown — collection tasks, not zeros** | — | — |

**Not evidence:** no customer interview, transcript, pre-order, letter of intent or testimonial exists for
XPMatch. Nothing in E3–E8 is evidence that *this* product will be bought; it is evidence that the
category transacts. Desk research is not customer validation.

## 3. Twelve-P diagnosis

Maturity: 0 = evidence confirms absent · 1 = ad hoc / owner-dependent · 2 = defined and trialled ·
3 = repeatable, measured, delegated · 4 = sustained through exceptions and owner absence ·
**n/a** = not yet applicable at this stage · **?** = unassessed (not the same as 0).

| # | P | Finding | Evidence | Maturity | Validation readiness | Impact | Key missing input |
|---|---|---|---|---|---|---|---|
| 1 | **Pricing** | Five offers priced against verified competitor anchors with per-offer margin math. Never spoken aloud to a buyer; no quote, discount or capacity history exists | E3, E4, E9 | 1 | Medium | High | One real price conversation with a named buyer |
| 2 | **Persona** | Three segments documented with pain language, trigger events, watering holes and disqualifiers — but the pain language is transcribed from competitor reviews and industry reports, not from XPMatch's own buyers | E4, E6, E12 | 1 | Medium | High | 10 interviews per segment, recorded |
| 3 | **Problem** | Purchase intent for the *deliverable* is real and off-platform. First-party evidence that these buyers will pay **XPMatch**: none. The founders' own method classifies this as a research-slot signal, not a purchase-intent cluster | E4, E5, E12 | 1 | **Low** | **Existential** | 3 paid pilots, or 10 consistent discovery calls |
| 4 | **Product** | The strongest P. Working production software with the unit-cost problem solved (E2). But time-to-first-value is unmeasured, no user outside the team has completed the flow, and 8 pre-beta blockers are open | E1, E2, E10 | 2 build / 0 measured delivery | Medium-High | Medium | First-value telemetry on real accounts |
| 5 | **Profit** | Unit economics modelled to SDE with sensitivity. Against that: no way to collect money, no business bank account, no bookkeeping, Year-1 SDE −$5,575, and a **$35,061 capital shortfall** against the plan's requirement | E9, E11, E12 | 1 | Low | **Existential** | The founders' real cash position, in writing |
| 6 | **Pitch** | No proof assets, no case studies, no recorded calls, no CRM, no proposal template. Two cold offer lines drafted. Evidence confirms the capability is absent | E12 | 0 | Low | High | One delivered client to write up |
| 7 | **People** | Two founders with **no founder agreement and no vesting**, no decision-rights table, no role scorecards. Planned hires at M15 and M25 are unfunded under the shortfall | E12, [A] defaults | 0 | n/a | High | Executed founder agreement |
| 8 | **Promote** | Channels named, sequenced and given a dated kill rule — genuinely better than most pre-launch plans. Zero attributed signups, no permissioned list, no channel tested | E12 | 1 | Medium | Medium | One 4-week channel test with referrer tracking |
| 9 | **Process** | `docs/OPERATING_SYSTEM.md` assigns every recurring job to automation, an agent or an SOP, and the concierge SOP is written at 5 steps / 90 minutes. Never executed once | E1 | 1 | Medium | Medium | One real concierge delivery, timed |
| 10 | **Predicament** | Bottleneck confirmed by data, not symptom: no payment mechanism blocks all five revenue lines at once. Continuity risk is concrete and known — **one database instance, one volume, no backups, and unrotated keys** | E10, E11 | 0 | n/a | **Existential (asset loss)** | Nothing. The fix is known and overdue |
| 11 | **Path** | Explicit, dated and measurable: cash-positive M12, sellable M24, financial buyer as base case. Two contradictions: a year of product build preceded any selling, and the exit arithmetic is ~4× apart from this review's model | E9 | 2 | n/a | High | Reconciliation of the ARR-multiple and SDE-multiple views |
| 12 | **Protect** | Nothing defined. No stated owner priorities, no intended hours, no adviser or continuity register, no decision authority if a founder is unavailable — while the plan assumes twelve unpaid months | none | ? unassessed | n/a | Medium-High | Owner-stated priorities and a personal floor |

**Causal reading.** The apparent problem is "no sales". It is not a Pitch problem. Two upstream
causes produce it: **Profit** (there is no mechanism to accept money — E11) and **Problem** (no
first-party evidence anyone will pay — E12). Fixing Pitch, Promote or Persona before those two
would build sales machinery pointed at an unvalidated buyer with no way to transact. Equally,
Product scores highest and is *not* where effort should go: more software does not move any of the
three existential rows.

**A cash emergency is not averaged away.** Rows 5 and 10 carry existential impact and row 3 carries
existential validation risk. No composite score is offered, because averaging twelve rows would
hide exactly those three.

---

## 4. The two priorities

**Active: Profit and Problem.** Ten Ps go to the backlog in section 7 with one workflow card each.

| | Why this one | What would change the choice |
|---|---|---|
| **Profit** | Existential and immediate. There is no mechanism to accept money (E11), so all five revenue lines are blocked by one missing integration. Beneath that sits a **$35,061 shortfall** against the plan's own requirement — the plan is not executable as written, and no other work changes that | If the founders' real cash covers the twelve unpaid months, this drops to a two-week build task and **Persona** takes the slot |
| **Problem** | Existential to the thesis. Every revenue figure rests on desk research (E3–E8) and zero first-party evidence (E12). The cheapest test that can kill or confirm the whole plan lives here, and it produces the first cash while doing it | If three paid pilots close in two weeks, this converts to **Pitch** — turning a proven sale into a repeatable one |

**Why not the others.** *Product* scores highest and is the wrong place to spend: more software moves
none of the three existential rows. *Pitch*, *Promote* and *Persona* are all downstream of a validated
problem and a working checkout — building them first aims sales machinery at an unvalidated buyer who
cannot pay. *Path* has a real contradiction to resolve but it is a two-hour analysis, not a workstream,
and it is listed in the 30-day review.

**One dependency task, not a third workstream.** `docs/BETA_READINESS.md` items 2 and 5 — rotate the
API keys exposed during the build, and turn on Postgres backups (E10) — are folded into Priority 1 as
week-0 work. One database instance with one volume and no backups means a single failure destroys the
asset the entire cash plan is built on. This is protecting the subject of the workstream, not a covert
extra initiative. It is hours of work, not days.

### Acceptance criteria and stop conditions

| Priority | Accountable owner | Time / budget cap | Acceptance criteria | What stops or changes it |
|---|---|---|---|---|
| Profit | Tayo (unassigned finance owner for the weekly brief) | 6 days of build + $80/mo tooling | Stripe live and a real charge settled; business bank + bookkeeping open; backups on and keys rotated; a written answer on the runway gap | Founders' combined cash under $40,000 → cut to concierge-only and keep day jobs |
| Problem | Tayo | 3 weeks, $300 (sending infrastructure) | 3 concierge pilots paid **or** 10 discovery calls with consistent pain language and a named budget holder | Fewer than 2 pilots sold after 3 weeks of asking → willingness to pay is not there at this price; re-run against segment B only |

---

## 5. Priority 1 — Profit

### 5.1 Artifact: 13-week cash view

Allocated from months 1–3 of `2-financial-model.md` (M1 → weeks 1–4, M2 → weeks 5–8, M3 → weeks 9–13).
Concierge cash lands on delivery weeks; subscription and affiliate cash is spread evenly within its
month; one-time costs land in week 1. **The weekly split is an allocation assumption [A], not a
forecast of any particular week.**

| Wk | Concierge cash | Other cash | Total in | COGS | Opex | One-time | Net | Cash at week end |
|---|---|---|---|---|---|---|---|---|
| 1 | $0 | $23 | $23 | $13 | $81 | $3,850 | −$3,921 | $21,079 |
| 2 | $249 | $23 | $272 | $13 | $81 | — | $178 | $21,256 |
| 3 | $0 | $23 | $23 | $13 | $81 | — | −$71 | $21,185 |
| 4 | $249 | $23 | $272 | $13 | $81 | — | $178 | $21,363 |
| 5 | $249 | $36 | $286 | $25 | $81 | — | $180 | $21,542 |
| 6 | $0 | $36 | $36 | $25 | $81 | — | −$70 | $21,473 |
| 7 | $249 | $36 | $286 | $25 | $81 | — | $180 | $21,652 |
| 8 | $249 | $36 | $286 | $25 | $81 | — | $180 | $21,832 |
| 9 | $249 | $64 | $313 | $34 | $65 | — | $214 | $22,046 |
| 10 | $249 | $64 | $313 | $34 | $65 | — | $214 | $22,260 |
| 11 | $0 | $64 | $64 | $34 | $65 | — | −$35 | $22,225 |
| 12 | $249 | $64 | $313 | $34 | $65 | — | $214 | $22,439 |
| 13 | $249 | $64 | $313 | $34 | $65 | — | $214 | $22,653 |

**Lowest week-end cash: $21,079 in week 1.** Closing cash at week 13: **$22,653**. The business does
not run out of money in the first quarter — but it earns $2,798 of cash in thirteen weeks while the
founders draw nothing. That is the whole finding: this is not a cash-flow problem yet, it is a
**runway** problem that arrives in month 12.

### 5.2 Artifact: owner-pay scenarios against the shortfall

| Scenario | Owner draw | Cash needed over 12 months | Against $25,000 available | Verdict |
|---|---|---|---|---|
| Plan as written | $0 for 12 months | $60,061 (incl. $48,000 personal runway) | **−$35,061** | Not executable |
| Both founders keep income elsewhere | $0, part-time build | $12,061 business only | **+$12,939** | Executable; halve the concierge ramp and Year-1 revenue |
| One founder full-time, one employed | $0 for the full-timer | ~$36,061 | **−$11,061** | Executable only with ~$11k more, or a slower month 1–6 |
| Raise the gap from a partner | $0 | $60,061 | Covered | Dilutes; contradicts the financial-buyer exit thesis |

**Decision required from the founders, not from this document.** Scenario 2 is the only one that needs
no new money, and it costs roughly half of Year-1 revenue — which, at $40,123, is a cheaper price than
it looks.

### 5.3 Dependency task — week 0 asset protection

| Task | Source | Effort | Why it blocks everything |
|---|---|---|---|
| Turn on Postgres volume backups in Railway | E10, `BETA_READINESS.md` #5 | Minutes | One instance, one volume, no backups: a single failure destroys the product |
| Rotate OpenRouter, both Google and Resend keys; redeploy after the browser key | E10, `BETA_READINESS.md` #2 | ~1 hour | Keys pasted in chat during the build are live in production |
| Restrict Google keys by domain and API; set spend caps | `BETA_READINESS.md` #3, #4 | ~1 hour | Worst-day exposure is ~$45 with no cap in the app |

---

## 6. Priority 2 — Problem

### 6.1 Artifact: pain ledger (structure, unfilled)

**This table is empty on purpose.** No XPMatch interview has been conducted, so filling it now would
be fabrication. Every row must carry a source ID pointing at a real recording, transcript or written
reply. Rows E4–E6 of the evidence ledger tell you the category transacts; they may not be copied here.

| ID | Pain in the buyer's words | Segment | Source (recording / transcript ID, date) | Consequence of waiting 30 days | Current workaround | What they spend on it today | Budget holder | Verbatim or paraphrase? |
|---|---|---|---|---|---|---|---|---|
| P-01 | | | | | | | | |
| P-02 | | | | | | | | |

**Kill rule for the ledger:** after 10 completed calls per segment, if fewer than 6 rows share the same
pain *and* name a budget holder, the segment has no concentrated problem and the offer is being sold to
a market that does not feel it yet.

### 6.2 Artifact: discovery interview guide

Ask about the last trip they planned, not about XPMatch. Never describe the product before question 8.

1. Walk me through the last trip you planned. Start from the moment you decided to go.
2. Where did you get stuck, and how long were you stuck there?
3. What did you have open when you were deciding where to eat?
4. What did you end up doing — and were you happy with it afterwards?
5. Have you ever paid anyone to help with a trip? What did you pay, and what did you get?
6. *(Advisors)* Walk me through building a proposal for a new client. How long, and which parts repeat?
7. *(Advisors)* What do you charge as a planning fee, and what do clients say about it?
8. *If something produced a stay, three things to do and three restaurants matched to you in under a minute — what would make that worth paying for, and what would make it worthless?*
9. What would have to be true for you to pay $19 for one trip? $49 for a year? $49 a month for your practice?
10. Who else should I talk to?

**Recording rule:** ask permission, record, and file the transcript with an ID before the call ends.
An unrecorded call produces an impression, not evidence.

### 6.3 Artifact: paid-test plan with decision thresholds

| Test | Segment | Mechanism | Cost | Window | Pass | Kill |
|---|---|---|---|---|---|---|
| T1 — Concierge founding clients | A | Sell 3 trips at a founding price to the founders' own network. Money first, delivery after | $0 | Weeks 1–3 | 3 sold, all delivered inside 48 h | Fewer than 2 sold after 3 weeks of asking |
| T2 — Advisor free-first-proposal | B | 400 sends/week to Fora-directory advisors; free first proposal; seat starts on the second client link | $300 | Weeks 3–9 | ≥5% reply and ≥2 seats started | <2% reply after list, deliverability and copy fixes |
| T3 — Paywall price test | A | $19 vs $29 Trip Pass at "Turn into a trip", 50/50, first 400 signups | $0 | Weeks 4–10 | Either arm converts ≥2% | Both arms <1% → the offer, not the price, is wrong |

**Evidence hierarchy, enforced.** A paid pilot outranks a verbal commitment with a price, which
outranks a booked call, which outranks a waitlist signup, which outranks a like. Nothing below the
third rung counts toward a pass.

### 6.4 Workflow cards

Both cards are filled in full at `workflows/` and are **status: designed** — nothing has been
configured, scheduled or run.

| Card | P | What it does | Status |
|---|---|---|---|
| [`profit-weekly-brief.yaml`](workflows/profit-weekly-brief.yaml) | Profit | Weekly: reconcile Stripe and bank against the Year-1 monthly plan, recompute cost per active user from Google SKU counts and OpenRouter spend, raise exceptions, draft a finance brief | designed |
| [`problem-discovery-pipeline.yaml`](workflows/problem-discovery-pipeline.yaml) | Problem | On each new transcript or written reply: extract source-linked pains, urgency, payer and spend into pain-ledger rows; flag contradictions; propose follow-ups; never update the brief without passing the quality gate | designed |

---

## 7. Workflow backlog — the other ten Ps

One card each, not ten projects. These are **not** started; they are specified so that when a P becomes
active the design already exists.

| P | Workflow opportunity | Trigger | Primary output | Blocked on |
|---|---|---|---|---|
| Pricing | Paywall price-test tracker | Each paywall impression | Conversion by arm, by moment, with significance | Stripe live |
| Persona | Lead fit classifier | New advisor lead | Fit score against explicit criteria + evidence + unknowns; human decides | An ICP with first-party evidence |
| Product | First-value telemetry | Account events | Funnel: quiz done → package shown → swap/lock → trip created, with time-to-first-value | Activation events instrumented |
| Pitch | Proposal assembler | Qualified opportunity | Draft proposal from approved proof, claim-checked, routed to the sales owner | One delivered client to cite |
| People | Role scorecard + interview rubric builder | Role opens | Outcome scorecard, consistent questions, review packet. No automated hire/reject | A funded hiring decision |
| Promote | Channel attribution digest | Weekly | Signups and activation by referrer, CAC by channel, kill/scale call | Referral codes shipped |
| Process | Concierge delivery runner | Concierge order paid | Intake validated, draft board built from the catalog, QA checklist opened | Concierge order form |
| Predicament | Exception monitor | Weekly or threshold breach | Queue, concentration and cash exceptions linked to a candidate constraint | Telemetry to watch |
| Path | Initiative vs path check | New initiative or quarterly | KEEP / PAUSE / STOP with evidence against the documented path | — (runnable today) |
| Protect | Protected-time guard | Calendar request | Compare against protected blocks; draft a response; route exceptions | Owner-stated boundaries |

---

## 8. Cadence

**Next 7 days** — owners named; dates proposed, not scheduled.

| # | Action | Owner | Proposed by |
|---|---|---|---|
| 1 | Turn on Postgres backups; rotate all four keys; restrict Google keys and set spend caps | Tayo | Sep 24, 2026 |
| 2 | Write down each founder's real available cash and pick a scenario from §5.2 | Both founders | Sep 25, 2026 |
| 3 | Ship Stripe billing, the three paywall moments and the concierge order form | Tayo | Oct 3, 2026 |
| 4 | Ask 10 people in the founders' network to buy a concierge trip (T1) | Tayo | Oct 5, 2026 |
| 5 | Open business banking and bookkeeping | unassigned [finance owner] | Oct 5, 2026 |
| 6 | Buy two sending domains, set SPF/DKIM/DMARC, start warm-up (T2) | Tayo | Oct 5, 2026 |
| 7 | Execute a founder agreement with vesting | Both founders | Oct 20, 2026 |

**30-day evidence review (proposed Oct 21, 2026).** Did T1 sell? What do the first pain-ledger rows
say, and do they agree with `docs/BUSINESS_PLAN.md` §5? Is cost per active user inside $2.00? Reconcile
the ARR-multiple and SDE-multiple exit views (Path). Outcome metric: **paid pilots closed**.
Countermetric: **founder hours spent per dollar collected**.

**90-day reassessment (proposed Dec 21, 2026).** Re-diagnose all twelve. Scale/stop: 3–5 paying
clients and one repeatable channel → proceed and promote Pitch to active. Under 2% reply with no
pilots → kill the advisor segment and re-run against segment C. Re-run `/business-summary` in Update
mode and compare actuals to the Year-1 monthly plan.

**These dates are text, not reminders.** No scheduler has been configured. Say the word and I will set
a recurring check-in with the tooling available in this session.

---

## 9. Execution receipt

| What | State | Evidence |
|---|---|---|
| Twelve-P diagnosis | **Done** — provisional, from `p-map.md` | §3 above |
| Business Brief and evidence ledger | **Done** | §1, §2 |
| 13-week cash view | **Done**, derived from the verified model | §5.1; reconciles to `2-financial-model.xlsx` |
| Owner-pay scenarios | **Done** | §5.2 |
| Pain ledger | **Structure only, deliberately empty** | §6.1 — no interview exists to fill it |
| Interview guide, paid-test plan | **Done** | §6.2, §6.3 |
| Two workflow cards | **Designed.** Not drafted, dry-run tested, configured or live | `workflows/*.yaml` |
| Trial on supplied data | **Blocked.** Exact missing input: one recorded discovery call or one settled Stripe charge | — |
| Backlog for the other ten Ps | **Done** | §7 |
| Scheduled reminders | **Not created.** Dates above are proposals | — |

**What did not run, and why.** The Problem pipeline cannot be trialled: there is no transcript to feed
it, and generating a synthetic one would put invented customer language into a ledger meant to hold
only real quotes. The Profit brief cannot be trialled: there is no Stripe account, no bank feed and no
accounting export. Both become runnable the week Stripe goes live and the first call is recorded.

**Remaining access needs:** Stripe (read), business bank (read), Google Cloud billing (read),
OpenRouter usage (read), a transcript store, and a scheduler. None is connected in this session.

**To resume:** re-run `own-run` after the 30-day review with the first pain-ledger rows and the first
Stripe settlement attached, and it will re-diagnose against real evidence instead of defaults.
