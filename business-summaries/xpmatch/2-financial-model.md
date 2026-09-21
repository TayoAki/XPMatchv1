# XPMatch — Financial Model

Last updated: Sunday, Sep 21, 2026
Companion to `1-business-summary.md`. Every projection line traces to an assumption row below.
Month 1 = October 2026, the month Stripe billing goes live. Year 1 = M1–M12, Year 2 = M13–M24, Year 3 = M25–M36.

**Basis.** Accrual for the P&L: annual Plus plans are recognised at $4.08/month over twelve months.
Cash collection differs — annual plans are billed upfront — so the cash-flow rows below use cash
receipts. Trip Pass is recognised at purchase (60-day access; the timing difference is immaterial).

**Tag key.** **[V]** Verified — a document, invoice, statement or screenshot exists.
**[E]** Estimated — grounded in a named comparable, quote or published benchmark.
**[A]** Assumed — nobody knows yet; every [A] row appears on the Validation Scorecard.

> **Founder inputs are defaults.** Nine founder-side inputs (ownership, hours, entity, capital,
> spend to date, owner compensation, revenue to date, other businesses, non-competes) were not
> supplied. Section 0 states the default used for each. All nine are tagged **[A]** and none has
> been upgraded. Replace them before this document is shown to a lender or a partner.

---

## 0. Founder-side defaults (all [A])

| # | Input | Default used | Effect if wrong |
|---|---|---|---|
| 1 | Ownership | XPMatch, Inc.; Tayo Aki 70% (product, sales, delivery), second founder "Faven" 30% (part-time) | Changes nothing in the P&L; changes who signs an LOI |
| 2 | Founder hours | Tayo 40 h/wk launch → 25 h/wk steady state; Faven 10 h/wk → 5 h/wk | Drives the founder-replacement add-back (−$26,000/yr) |
| 3 | Entity | Delaware C-corp, incorporated Sep 2026 (Terms of Service effective Sep 16, 2026 name "XPMatch, Inc.") | Franchise tax and filing costs, ~$500/yr, immaterial |
| 4 | Founder cash available | $25,000, no outside capital, no lender conversation held | Sets the starting cash line; see Section 5 |
| 5 | Spent to date | $3,500 — domains, Google/OpenRouter/Railway/Resend during the build, design, ToS/Privacy drafting | Sunk; excluded from capital required, disclosed as founder contribution |
| 6 | Owner compensation | $0 through M12; $4,000/mo M13–M24; $8,000/mo M25–M36 | Largest SDE add-back; see Section 4 |
| 7 | Revenue to date | $0. No billing integration exists in the codebase | If revenue exists, Gate 1 is already passed and this model is wrong at the start |
| 8 | Other businesses | None sharing staff, cash or customers | Clean books assumption |
| 9 | Non-competes / prior-employment IP | None | A travel-sector non-compete would be material |

---

## 1. Assumptions

### Demand and pricing

| Assumption | Value | Tag | Source | Used in |
|---|---|---|---|---|
| Plus annual price | $49.00/yr | [E] | Anchored to Layla $49.99/yr, TripIt Pro $49/yr, Wanderlog Pro $39.99/yr (`docs/COMPETITOR_LANDSCAPE.md`, read Sep 2026) | Plus revenue |
| Plus monthly price | $7.99/mo | [E] | Layla $9.99/mo, priced below it deliberately | Plus revenue |
| Trip Pass price | $19 / 60 days | [A] | No competitor sells this shape; StayMatch's $10 day pass is the nearest | Trip Pass revenue |
| Advisor seat price | $49/seat/mo | [E] | Travefy $39–59/mo, Tern $39/seat/mo | Seat revenue |
| Concierge price | $249 average ($149 / $249 / $399 tiers) | [E] | AAA planning fees $250–1,500 international; flat-tier itinerary sellers $97–497 | Concierge revenue |
| New free signups, M1 → M36 | 100 → 1,500 → 3,900 → 6,300 per month; 7,970 in Y1 | [A] | No channel has produced a signup yet | Every consumer line |
| Free → paid within 30 days | 4% Y1, 5% Y2, 6% Y3 | [E] | RevenueCat State of Subscription Apps 2026: travel trial conversion 4.1% median | Plus + Trip Pass volume |
| Trip Pass share of paid conversions | 55% | [A] | Judgement: lower friction at the "Turn into a trip" moment | Revenue mix |
| Annual share of Plus conversions | 50% Y1, 60% Y2, 65% Y3 | [A] | Plan targets ≥60% by M12; modelled one year slower | Revenue recognition, churn |
| Plus monthly churn | 12%/mo | [E] | RevenueCat: travel monthly first renewal ~53%, decaying thereafter | Plus subscriber rollforward |
| Plus annual renewal at 12 months | 45% | [E] | RevenueCat: travel annual renewal ~40%; +5pts for the taste profile that improves with use | Plus subscriber rollforward |
| Advisor seat churn | 5%/mo Y1–Y2, 3%/mo Y3 | [A] | Plan targets ≤5% by M12, ≤3% by M24 | Seat rollforward |
| Advisor seat gross adds | 2/mo at M3 rising to 33/mo at M36 | [A] | Outbound has not been run; the LAPS plan targets 1–2 sales/week by week 12 | Seat revenue |
| Concierge trips per month | 2 at M1 → 10 at M12 → 25 at M24 → 30 at M36; 82 in Y1 | [A] | Founder-led sales, none booked yet | Concierge revenue |
| Trips created per month | 20% of new signups + 12% of paying accounts | [A] | Plan targets 35% first-session trip creation; modelled at 20% | Affiliate revenue |
| Affiliate revenue per trip | $1.50 Y1, $3.00 Y2, $4.00 Y3 | [A] | **Pessimistic attach case (≈5% on stays), not the plan's 15% target.** Booking.com pays 4% on stays, Expedia up to 4.8%, activity partners 8% | Affiliate revenue |

### Cost of goods

| Assumption | Value | Tag | Source | Used in |
|---|---|---|---|---|
| COGS per free active user | $0.20/mo | [E] | `docs/COGS.md` free-tier cap, enforced by catalog-only cards and 40 lookups/day | User COGS |
| COGS per paying consumer | $2.00/mo | [E] | `docs/COGS.md` post-catalog range $1.40–2.00; cap $3.00 | User COGS |
| COGS per advisor seat (incl. clients) | $4.00/mo | [E] | `docs/COGS.md` advisor cap $6.00; modelled at the plan's estimate | User COGS |
| Free-base monthly decay | 20% | [A] | No cohort data exists | Active-user count |
| Concierge API cost | $5.00/trip | [E] | `docs/COGS.md` per-action pricing | Concierge COGS |
| Concierge human review | 1.5 h/trip; founder unpaid to M14, then $35/h contractor from M15 | [E] | Plan's SOP time; $25–35/h stated hiring range | Concierge COGS, SDE add-back |
| Payment processing | 2.9% + $0.30 per transaction | [V] | Stripe published US pricing | Processing COGS |

### Operating

| Assumption | Value | Tag | Source | Used in |
|---|---|---|---|---|
| Hosting (Railway + Postgres) | $25/mo Y1, $150/mo Y2, $400/mo Y3 | [E] | `docs/COGS.md` current $20–25/mo | Opex |
| Software subscriptions | $150/mo Y1, $400/mo Y2, $600/mo Y3 | [E] | Resend, error monitoring, analytics, CRM | Opex |
| Cold-email infrastructure | $150/mo from M1 | [E] | 2 secondary domains, 4 inboxes, sending tool | Opex |
| Part-time concierge reviewer | $1,500/mo from M15 | [A] | Plan's hiring trigger is >20 trips/mo | Opex |
| Support contractor | $1,500/mo from M25 | [A] | Scale assumption | Opex |
| Marketing | $0 to M3; $400→$1,200/mo ramp in Y1; $2,000/mo Y2; $4,000/mo Y3 | [A] | Creator payouts at $1–2 per activated signup (Mindtrip pays $1); $500 paid-social test | Opex |
| One-time costs, M1 | $3,850 — app-specific ToS/Privacy $2,000, landing pages and brand $1,500, trademark filing $350 | [A] | `docs/BETA_READINESS.md` names the required Privacy Policy app section | Capital, SDE add-back |
| Owner salary | $0 / $48,000 / $96,000 by year | [A] | Default 6 | Opex, SDE add-back |
| Founder-replacement cost | −$26,000/yr (second founder, 10 h/wk at $50/h) | [E] | Market rate for part-time ops/support | SDE (negative add-back) |

**Tag counts across this section: [V] 1 · [E] 17 · [A] 20.** Verified share: **3%.**

---

## 2. Year-1 Monthly Projection

| Line | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 | **Y1** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| New signups | 100 | 150 | 220 | 300 | 400 | 500 | 650 | 800 | 950 | 1,100 | 1,300 | 1,500 | **7,970** |
| Plus subs — annual | 1 | 2 | 4 | 7 | 11 | 15 | 21 | 28 | 37 | 47 | 58 | 72 | **72** |
| Plus subs — monthly | 1 | 2 | 4 | 6 | 9 | 12 | 17 | 22 | 28 | 34 | 42 | 50 | **50** |
| Advisor seats | 0 | 0 | 2 | 5 | 9 | 13 | 19 | 24 | 29 | 36 | 42 | 49 | **49** |
| Concierge trips | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 8 | 9 | 10 | 10 | 10 | **82** |
| *Revenue* | | | | | | | | | | | | | |
| Plus annual | 4 | 9 | 17 | 28 | 43 | 61 | 85 | 115 | 150 | 190 | 238 | 293 | **1,233** |
| Plus monthly | 7 | 17 | 31 | 49 | 72 | 99 | 134 | 175 | 223 | 275 | 335 | 403 | **1,820** |
| Trip Pass | 42 | 63 | 92 | 125 | 167 | 209 | 272 | 334 | 397 | 460 | 543 | 627 | **3,331** |
| Advisor seats | 0 | 0 | 98 | 240 | 424 | 648 | 909 | 1,158 | 1,443 | 1,763 | 2,067 | 2,404 | **11,155** |
| Concierge | 498 | 747 | 996 | 1,245 | 1,494 | 1,743 | 1,992 | 1,992 | 2,241 | 2,490 | 2,490 | 2,490 | **20,418** |
| Affiliate | 0 | 0 | 0 | 0 | 0 | 157 | 205 | 253 | 302 | 351 | 416 | 481 | **2,165** |
| **Total revenue** | 551 | 836 | 1,234 | 1,688 | 2,200 | 2,918 | 3,597 | 4,028 | 4,755 | 5,529 | 6,089 | 6,698 | **40,123** |
| *Cost of goods sold* | | | | | | | | | | | | | |
| API, model & hosting per user | 24 | 55 | 105 | 170 | 253 | 352 | 475 | 615 | 773 | 947 | 1,142 | 1,359 | **6,268** |
| Concierge delivery | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 40 | 45 | 50 | 50 | 50 | **410** |
| Payment processing | 19 | 29 | 43 | 60 | 78 | 104 | 129 | 147 | 174 | 203 | 227 | 252 | **1,465** |
| **Gross profit** | 498 | 737 | 1,066 | 1,433 | 1,838 | 2,427 | 2,954 | 3,226 | 3,763 | 4,329 | 4,671 | 5,038 | **31,980** |
| *Operating expenses* | | | | | | | | | | | | | |
| Advertising & marketing | 0 | 0 | 0 | 400 | 500 | 600 | 700 | 800 | 900 | 1,000 | 1,100 | 1,200 | **7,200** |
| Contractors & staff | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| Software, hosting & sending | 325 | 325 | 325 | 325 | 325 | 325 | 325 | 325 | 325 | 325 | 325 | 325 | **3,900** |
| Owner salary | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| **Net operating profit** | 173 | 412 | 741 | 708 | 1,013 | 1,502 | 1,929 | 2,101 | 2,538 | 3,004 | 3,246 | 3,513 | **20,880** |
| One-time costs | 3,850 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **3,850** |
| Net cash flow | -3,636 | 469 | 821 | 812 | 1,147 | 1,662 | 2,130 | 2,339 | 2,807 | 3,299 | 3,581 | 3,881 | **19,312** |
| **Cumulative cash** | 21,364 | 21,833 | 22,654 | 23,465 | 24,612 | 26,273 | 28,404 | 30,743 | 33,550 | 36,849 | 40,430 | 44,312 | **44,312** |

Cumulative cash opens at the $25,000 founder capital. The cash low point is **M1 at $21,364**, a
drawdown of **$3,636** against opening capital — the business never goes cash-negative because the
concierge line sells from month one at 98% contribution margin and no owner salary is drawn.
**That early profitability is an artefact of unpaid founder labour, not of the cost structure.**

---

## 3. Three-Year Projection

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Revenue | $40,123 | $190,673 | $427,320 |
| Growth YoY | — | +375% | +124% |
| Cost of goods sold | $8,143 | $59,342 | $131,447 |
| **Gross profit** | **$31,980** | **$131,331** | **$295,873** |
| Gross margin | 80% | 69% | 69% |
| Advertising & marketing | $7,200 | $24,000 | $48,000 |
| Contractors & staff | $0 | $15,000 | $36,000 |
| Software, hosting & sending | $3,900 | $8,400 | $13,800 |
| Owner salary | $0 | $48,000 | $96,000 |
| Total operating expenses | $11,100 | $95,400 | $193,800 |
| **Net operating profit** | **$20,880** | **$35,931** | **$102,073** |
| Owner add-backs (net) | −$26,455 | +$20,635 | +$70,000 |
| **SDE** | **−$5,575** | **$56,566** | **$172,073** |
| SDE margin | −14% | 30% | 40% |
| Exit-month ARR run-rate | $80,379 | $275,875 | $548,932 |

**Growth drivers.** Year 1: concierge trips sold by hand (51% of revenue) plus the first 49 advisor
seats. Year 2: advisor outbound matures (seats become the largest line at 34% of revenue) and the
consumer funnel compounds. Year 3: seat count reaches 405 and the paid consumer base reaches 1,695.

**Revenue mix**

| Stream | Y1 | Y2 | Y3 |
|---|---|---|---|
| Concierge | 51% | 32% | 19% |
| Advisor seats | 28% | 34% | 41% |
| Trip Pass | 8% | 9% | 9% |
| Affiliate | 5% | 12% | 14% |
| Plus (annual + monthly) | 8% | 13% | 17% |

---

## 4. SDE Add-backs — Detail

SDE assumes a single owner-operator who does the work one founder does today. Owner salary is added
back. The **second** founder's unpaid 10 h/week is subtracted, because a buyer would have to pay
someone for it.

| Add-back | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Net operating profit | $20,880 | $35,931 | $102,073 |
| + Owner salary and payroll taxes | $0 | $48,000 | $96,000 |
| + Owner benefits | $0 | $0 | $0 |
| + Interest, depreciation, amortisation | $0 | $0 | $0 |
| + One-time costs (legal, brand, trademark) | $3,850 | $0 | $0 |
| + Personal expenses through the business | $0 | $0 | $0 |
| − Replace second founder (10 h/wk @ $50/h) | −$26,000 | −$26,000 | −$26,000 |
| − Replace unpaid founder concierge review (Y1 82 trips, Y2 26 trips in M13–M14, × 1.5 h @ $35/h) | −$4,305 | −$1,365 | $0 |
| **SDE** | **−$5,575** | **$56,566** | **$172,073** |

**Year-1 SDE is negative.** The business produces $20,880 of net operating profit in Year 1 and
still returns −$5,575 of SDE, because two founders working unpaid are worth more than the profit
they generate. This is the single most important number in the document: it says Year 1 is not a
business yet, it is a funded experiment.

---

## 5. Capital Required

| Line | Amount |
|---|---|
| One-time build costs (legal, landing pages, trademark) | $3,850 |
| Initial inventory | $0 |
| Cash low point (M1 drawdown against opening capital) | $3,636 |
| Working-capital buffer (3 × month-12 operating expenses) | $4,575 |
| **Business capital required** | **$12,061** |

The business is cheap to start. The founders are not.

| Line | Amount |
|---|---|
| Business capital required | $12,061 |
| Founder personal runway (12 months unpaid × $4,000/mo) | $48,000 |
| **Total cash the founders must hold** | **$60,061** |
| Founder cash available [A] | $25,000 |
| **Shortfall** | **$35,061** |

Already sunk and excluded above: **$3,500** of founder contribution during the build.

**Financing.** Bootstrapped, revenue-first. No lender has been approached, so no loan is presented
as the plan. SBA 7(a) terms in comparable packages required a 35–40% equity injection and are
stricter for startups than for acquisitions; a pre-revenue applicant with no trading history would
not qualify today. Tagged **[A]**.

---

## 6. Financial Quickview (source of truth)

| | | Tag |
|---|---|---|
| Startup capital required (business) | $12,061 | [E] |
| Total cash founders must hold (incl. 12-month runway) | $60,061 | [A] |
| Months to first revenue | 1 | [E] |
| Months to breakeven (cash) | 2 | [E] |
| Year-1 revenue (projected) | $40,123 | [A] |
| Year-3 revenue (projected) | $427,320 | [A] |
| Year-3 SDE (projected) | $172,073 | [A] |
| Year-3 SDE margin | 40% | [A] |
| Founder hours / week (launch → steady state) | 50 → 30 | [A] |
| Target exit multiple (SDE) | 3.2x | [E] |
| Implied Year-3 valuation | $550,635 | derived |
| Financing path | Bootstrapped, revenue-first | — |
| Facts Verified / Estimated / Assumed | 1 / 17 / 20 | — |

### Choosing 3.2x

Comparable packages priced between 1.9x and 4.2x SDE. The top of that band went to a vertical SaaS
with 0.6% monthly churn, 96% contracted annual revenue and 70%+ margins; the bottom to a small SaaS
with flat revenue and a departing team. XPMatch at Year 3 sits in the middle: 69% gross margin and a
41%-of-revenue subscription seat line argue upward, while four things pull down — a single founder
who still runs sales, a concierge line that is 20% of revenue and does not transfer, cost dependence
on Google Places and OpenRouter pricing neither founder controls, and 14% of revenue from affiliate
attach rates that have never been measured. 3.2x.

**This is materially below `docs/BUSINESS_PLAN.md` §1**, which targets a $2.0–2.7M sale. That figure
applies a 3–4x multiple to *ARR*, not SDE. At a 40% SDE margin the two methods cannot both hold:
3.2x SDE is $551K, while 3.5x ARR would be $1.9M. Marketplace comparables reach 3–4x ARR only when
SDE margin approaches 70–80%. Reconciling the two requires either a materially leaner cost structure
or a revenue mix weighted much harder toward advisor seats. This is the largest single disagreement
between this model and the business plan.

---

## 7. Sensitivity

Year-3 SDE at base, 30% worse and 30% better, ranked by swing.

| Assumption | −30% | Base | +30% | Swing |
|---|---|---|---|---|
| Advisor seat adds per month | $125,782 | $172,073 | $218,365 | $92,583 |
| COGS per paid user per month | $200,870 | $172,073 | $143,276 | $57,594 |
| Free → paid conversion rate | $146,872 | $172,073 | $197,274 | $50,402 |
| Free signup volume | $148,187 | $172,073 | $195,959 | $47,772 |
| Concierge trips per month | $153,675 | $172,073 | $190,471 | $36,796 |
| Affiliate revenue per trip | $155,010 | $172,073 | $189,136 | $34,126 |

No single 30% miss makes Year-3 SDE negative, which is the one genuinely reassuring result in this
file. **Advisor seat adds dominate** — a 30% miss costs $46K of Year-3 SDE, more than the entire
concierge line contributes. Seat acquisition is row 1 of the Validation Scorecard.

Note the COGS row runs the other way: a 30% *overrun* on cost per user costs $29K of Year-3 SDE.
The catalog work that took COGS from ~$10 to $1.40–2.00 per active user is what makes the consumer
tier viable at all; losing it would not be survivable at these prices.

---

## 8. Change log

| Date | Change | Why |
|---|---|---|
| Sep 21, 2026 | Initial model | First build, founder inputs defaulted |
