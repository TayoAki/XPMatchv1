# XPMatch — Seven Revenue Paths, Validated

Prepared Tuesday, Sep 22, 2026 · Companion to `1-business-summary.md` and `2-financial-model.md`
Research: live web search and Firecrawl, Sep 22, 2026. Every external figure is cited in §11.

## How to read this

**Your arithmetic is correct on all seven paths.** Every multiplication checks out to the dollar. So
this document does not "correct your math" — it tests the **inputs** the math rests on, against
published prices and against the volumes your own three-year model produces.

Each path gets: the arithmetic check, which inputs are verified and which are assumed, the **binding
constraint** (the one thing that decides the outcome), corrected math where a published figure
contradicts an assumption, and a **prediction grid** so you can run your own numbers rather than take
mine.

Tags: **[V]** verified against a cited public source · **[E]** estimated from a named comparable ·
**[A]** assumed, no evidence yet.

---

## 1. Bottom line

| | |
|---|---|
| Paths where the arithmetic is wrong | **0 of 7** |
| Paths where a **cited comparable contradicts the assumption** | **3** — paths 4, 6, 7 |
| Paths where the **rate** is overstated | **2** — path 3 (+45%), path 6 (5.0×) |
| Paths that **cannot run until another path produces volume** | **3** — paths 2, 3, 5 |
| Sum of all seven as stated | **$8,150,000** |
| Sum of my grounded cases | **$1,179,274** |
| Gap | **6.9×** |

The gap is not sloppiness. It comes from three specific things, and each is fixable by changing an
input rather than abandoning a path:

1. **Two prices are set above what the cited comparable actually charges.** Path 7 assumes $15/month
   citing Wanderlog Pro, which sells at **$39.99/year — $3.33/month** [V]. Path 6 assumes $15,000 net
   per campaign, but the industry fee basis is **10–25% of campaign budget** [V], so $15,000 net
   implies a **$75,000 campaign**, not a $15,000 one.
2. **One rate is above what the partners publish.** Path 3 assumes an 8% blended take. Stays pay 4–6%
   and activities 8% [V]; a realistic basket blends to **5.0–6.5%**.
3. **Three paths are priced as if the audience already exists.** Paths 2, 3 and 5 all need booked
   volume or a preference dataset that only paths 1, 4 or 7 can produce. They are **downstream**, not
   parallel.

---

## 2. Scorecard — all seven ranked

Ranked by **grounded revenue ÷ effort to first dollar**, not by headline size.

| # | Path | You claimed | Grounded | Binding constraint | Can start today? | Evidence |
|---|---|---|---|---|---|---|
| 4 | **Group / corporate planning** | $750,000 | $180,000 | Founder hours — it is a services P&L | **Yes** | Real market verified; cited comparable is wrong |
| 1 | **White-label DMO** | $1,200,000 | $216,000 | Reaching ~20 of the ~240 DMOs with budget | Yes, 6–18mo cycle | Price band plausible; GuideGeek got to 30 |
| 7 | **Premium membership** | $1,800,000 | $330,000 | **Price** — $180/yr is 3.6× the category top | Yes | Comparable contradicts the price |
| 6 | **Creator campaigns** | $600,000 | $60,000 | Fee basis is % of budget, not flat | Yes | 5.0× overstated on like-for-like |
| 3 | **Booking commissions** | $1,600,000 | $189,274 | Booked trip volume | No — needs users | Rate overstated 45% |
| 5 | **Data / analytics SaaS** | $1,200,000 | $144,000 | **Data supply**, not demand | No — needs a panel | Category real, pricing opaque |
| 2 | **Revenue share** | $1,000,000 | $60,000 | Proving incrementality to a sophisticated partner | No — needs volume + attribution | Weakest evidence of the seven |

## 3. The structural problem: these seven do not add up

Summing them to $8.15M **double-counts the same volume and the same buyer**:

- **Paths 2, 3 and 5 all monetise the same trips.** A trip that produces a booking commission (3) is
  the same trip inside the attributed GMV of a revenue-share deal (2), and the same trip whose
  preference data you would sell (5). Counting it three times triples one unit of demand.
- **Paths 1 and 5 sell to the same buyer out of the same budget line.** Both target DMOs. A
  destination paying you $5,000/month for a white-label planner is *less* likely, not more, to also
  pay $2,000/month for analytics — it is one vendor line item in one budget.
- **Paths 4 and 6 are agency businesses.** They consume founder hours per unit of revenue and do not
  compound. They also do not transfer to a buyer, which matters given the month-24 exit thesis.

A defensible combined number counts each unit of demand once. With two founders, roughly **fifty
working hours a week between you [A]**, and no revenue today, the realistic question is not "what do
all seven produce" but **"which two"** — the same conclusion the twelve-P review reached for different
reasons.

---

## 4. Path 1 — White-label enterprise concierge (DMOs)

> *Annual SaaS contracts for a branded XPMatch embedded on the client's site. $1,500–$20,000+/month.
> 20 clients at $5,000/month = $1.2M ARR.*

**Arithmetic: PASS.** 20 × $5,000 × 12 = $1,200,000. ✓

### What the research supports

| Input | Status | Finding |
|---|---|---|
| $1,500–20,000/mo price band | **[V] supported** | Consistent with mid-market vertical SaaS. Simplified.Travel and mTrip sell white-label DMO/agency itinerary tools; neither publishes pricing ("Book a Demo"), which is itself the signal — this is a negotiated enterprise sale |
| DMO budget headroom | **[V] partly** | DMOs allocate **15–28% of marketing budget to website, SEO, content and CRM**. For a $60k/yr contract to be ≤20% of that line, the DMO needs a **web budget ≥$300k**, implying a **$1.1–2.0M+ total marketing budget** |
| Market size | **[V]** | **~2,400 DMOs globally** (2021). Only the top tier clears a $1M+ marketing budget — call it **120–240 organisations** |
| Budget direction | **[V] favourable** | **41% of DMOs increased digital spend in 2026**, 41% flat, 13% cut |
| Proof the model works | **[V]** | GuideGeek (Matador Network) monetises precisely this way — white-label AI licensed to DMOs — and reached **30+ partners** |

### The binding constraint

**20 clients is 8–17% of every DMO on earth with the budget to buy this.** GuideGeek reached ~30 — and
it came with a media brand, 1.5M users and editorial credibility. XPMatch would be approaching them
with zero reference customers.

Two things the claim does not price: the **white-label build does not exist** in the codebase
(multi-tenant theming, client admin, SSO, SLAs, a security review), realistically **6–10 weeks**; and
DMO procurement runs on **annual budget cycles with RFPs**, so a deal signed in month 3 may not bill
until month 12.

### Corrected math

Nothing to correct — the price band and the model are sound. What moves is **client count and ramp**.

### Prediction grid

| Clients \ Price | $1.5k/mo | $3k/mo | $5k/mo | $8k/mo | $12k/mo |
|---|---|---|---|---|---|
| **3** | $54,000 | $108,000 | $180,000 | $288,000 | $432,000 |
| **6** | $108,000 | $216,000 | $360,000 | $576,000 | $864,000 |
| **10** | $180,000 | $360,000 | $600,000 | $960,000 | $1,440,000 |
| **15** | $270,000 | $540,000 | $900,000 | $1,440,000 | $2,160,000 |
| **20** | $360,000 | $720,000 | $1,200,000 | $1,920,000 | $2,880,000 |

**Grounded case: 6 clients × $3,000/mo = $216,000 ARR** by end of year 2 [A]. Your 20 × $5,000 is the
year-4–5 case if the first six land and reference well.

**Verdict: strongest strategic path of the seven.** 90%+ margin, recurring, and it is exactly the
asset an advisor platform or OTA buys. Slow to start, compounds hard.

---

## 5. Path 2 — Revenue-share on attributed incremental bookings

> *5%–25% of attributed incremental revenue. $10M attributed GMV × 10% take = $1M.*

**Arithmetic: PASS.** $10,000,000 × 0.10 = $1,000,000. ✓

### What the research supports

| Input | Status | Finding |
|---|---|---|
| 5–25% take on performance deals | **[E] plausible** | No published rate card exists for this structure — it is bilaterally negotiated. OTA commission context: **15–30% supplier commission**, so a 10% share of *incremental* is not unreasonable as a share of the partner's own margin |
| $10M attributed GMV | **[A] unsupported** | At a $940 basket this is **10,638 bookings** — **0.7× every trip your Year-3 model plans** (14,644), all converting and all accepted as incremental |
| "Incremental" being accepted | **[A] the real risk** | Sophisticated partners (LHW, Travelpass) run **holdout tests**. Typical accepted incrementality is well under 100% |

### The binding constraint

**The word "incremental" is doing all the work, and it is the hardest word in travel partnerships.**
You are asking a partner to agree that a booking would not have happened without you. That requires
attribution infrastructure you do not have, a methodology they accept, and usually a holdout group
that mechanically reduces the number you get paid on.

At 30% accepted incrementality — a fair planning assumption — your $10M attributed becomes **$3M
payable**, and 10% of that is **$300,000**, not $1M.

### Prediction grid

| Attributed GMV \ Incrementality accepted (at 10% take) | 20% inc | 30% inc | 50% inc | 100% inc |
|---|---|---|---|---|
| **$1M** | $20,000 | $30,000 | $50,000 | $100,000 |
| **$2M** | $40,000 | $60,000 | $100,000 | $200,000 |
| **$5M** | $100,000 | $150,000 | $250,000 | $500,000 |
| **$10M** | $200,000 | $300,000 | $500,000 | $1,000,000 |

**Grounded case: 1 partner, $2M attributed, 30% incrementality accepted, 10% take = $60,000** [A].

**Verdict: weakest evidence of the seven, and the one I would defer longest.** It is not a bad model
— it is a model that requires you to already be big enough that a partner will negotiate. Revisit
once path 3 is running and you can show a booking curve.

---

## 6. Path 3 — Booking marketplace commissions

> *5%–25% of booking value. $20M GMV × 8% blended take = $1.6M.*

**Arithmetic: PASS.** $20,000,000 × 0.08 = $1,600,000. ✓ **The rate is not.**

### What the research supports

| Partner | Published affiliate rate | Status |
|---|---|---|
| Viator | **8%** on completed bookings, 30-day attribution | [V] |
| GetYourGuide | **8%** affiliate (separate from the 20–30% they charge suppliers) | [V] |
| Booking.com | **4–8% of net sale** depending on programme; your own `REVENUE_MODEL.md` records **~4% of stay value** | [V] |
| Expedia | **up to 4.8%** on hotels | [V] |

**The 5–25% band in your note conflates two different things.** The 20–30% figures are what OTAs
charge *suppliers* to list. What a *referrer* earns is the affiliate rate: **4–8%**. You are the
referrer.

### Corrected math

A realistic trip basket — 3-night stay ~$700 plus two activities at $120 — blends like this:

| Stay rate | Basket | Commission | **Blended** |
|---|---|---|---|
| 4% | $940 | $47.20 | **5.02%** |
| 5% | $940 | $54.20 | **5.77%** |
| 6% | $940 | $61.20 | **6.51%** |

**Blended realistic range: 5.0–6.5%. You assumed 8% — a 45% overstatement.** Hotels are most of the
basket by value and pay the *lowest* rate; only an activity-heavy mix approaches 8%.

At $20M GMV and 5.5%: **$1,100,000**, not $1,600,000.

Then the volume: $20M ÷ $940 = **21,277 booked trips**, which is **1.5× every trip your Year-3 model
plans** — and that model assumes only a fraction ever convert to a booking.

### Prediction grid

| Booked trips/yr \ Blended rate (basket $940) | 4.0% | 5.0% | 5.5% | 6.5% | 8.0% |
|---|---|---|---|---|---|
| **5000** | $188,000 | $235,000 | $258,500 | $305,500 | $376,000 |
| **10000** | $376,000 | $470,000 | $517,000 | $611,000 | $752,000 |
| **21277** | $800,015 | $1,000,019 | $1,100,021 | $1,300,025 | $1,600,030 |
| **40000** | $1,504,000 | $1,880,000 | $2,068,000 | $2,444,000 | $3,008,000 |

**Grounded case: 14,644 Year-3 trips × 25% booking attach × $940 × 5.5% = $189,274** [A].

**Verdict: the best economics of the seven (near-100% margin, no delivery cost) and the cheapest to
switch on — 1–2 days of links.** But it is a **multiplier on volume you do not have**, not a
standalone path. Ship it early precisely because it costs nothing to run while volume builds.

---

## 7. Path 4 — Corporate / group planning

> *$25–$100 per attendee/night plus supplier commissions and package margin.
> 100 group trips averaging $7,500 net revenue = $750,000.*

**Arithmetic: PASS.** 100 × $7,500 = $750,000. ✓

### The cited comparable does not support the model

**Pilot is free.** It charges no planning fee and monetises through hotel bookings. Citing Pilot's
"corporate retreat and group-trip customers" as evidence for a **$25–100 per attendee/night planning
fee** points at a company that has decided not to charge one.

The *real* market does support paid planning, just from different players:

| Benchmark | Figure | Status |
|---|---|---|
| Mid-tier corporate retreat, all-in | **$400–700 per person per night** | [V] |
| Executive / premium offsite | **$750–1,200 per person per night** | [V] |
| Multi-day offsite, total | **$3,500–6,500 per person** | [V] |
| Lean domestic, no flights | **$1,000–1,800 per person** | [V] |

Your $25–100 pp/night is **4–12% of the all-in trip cost** — a credible planning-fee ratio, and
comfortably below the 78%-of-advisors-charge-a-fee norm already in your business plan.

### Does $7,500 net per trip hold?

At $62.50 pp/night (midpoint), $7,500 needs **120 attendee-nights** — e.g. **40 people × 3 nights**,
or 20 people × 6 nights. That is a *large* corporate retreat. A more typical 20-person, 3-night
offsite yields **60 attendee-nights = $3,750**, plus booking margin.

### The binding constraint

**Founder hours.** This is a services business. At even 20 hours per group trip, 100 trips is
**2,000 hours — a full FTE beyond the founders**, and realistically two once you add sales and
corporate procurement. The $750,000 is revenue, not profit: after delivery labour expect
**40–60% gross margin**, so roughly **$300–450k**.

### Prediction grid (revenue before delivery labour)

| Group trips/yr \ Net fee per trip | $2.5k | $4.5k | $7.5k | $10k |
|---|---|---|---|---|
| **25** | $62,500 | $112,500 | $187,500 | $250,000 |
| **50** | $125,000 | $225,000 | $375,000 | $500,000 |
| **100** | $250,000 | $450,000 | $750,000 | $1,000,000 |
| **150** | $375,000 | $675,000 | $1,125,000 | $1,500,000 |

**Grounded case: 40 trips × $4,500 net = $180,000 revenue, ~$90,000 gross profit** [A].

**Verdict: the fastest path to a real dollar, and the one I would start this month.** It needs no
users, no volume and no integration — just a buyer. It is the same motion as your concierge offer,
sold to companies instead of individuals, at 10–30× the ticket. Its weakness is that it does not
compound and does not transfer to an acquirer.

---

## 8. Path 5 — Data and analytics SaaS

> *$500–$10,000+/month per client. 50 clients at $2,000/month = $1.2M ARR.*

**Arithmetic: PASS.** 50 × $2,000 × 12 = $1,200,000. ✓

### What the research supports

| Input | Status | Finding |
|---|---|---|
| The category is real | **[V]** | Data Appeal and Mabrian sell destination intelligence to European DMOs; Data Appeal **acquired 70% of Mabrian for ~€3.7M** |
| $500–10,000/mo pricing | **[E]** | Neither publishes pricing — enterprise "contact us". The band is plausible for the category but **unverified** |
| 50 clients | **[A]** | Out of ~2,400 DMOs globally, the same pool path 1 targets |

**That €3.7M acquisition price is the most useful number here.** It says the *category leader* in
destination intelligence was worth single-digit millions for a 70% stake. A $1.2M ARR analytics line
would make XPMatch a meaningful fraction of the whole category — from a standing start, against
incumbents with card-spend and mobility data.

### The binding constraint

**Data supply, not demand.** You cannot sell aggregated preference trends without a panel. Your
Year-3 model produces ~62,400 cumulative signups and 1,695 paying users. That is a thin dataset for
destination-level demand forecasting, and a DMO comparing it against Mabrian — who sell mobility and
spend data across whole countries — will notice.

There is also a **channel conflict with path 1**: both sell to DMOs, out of the same budget line. A
destination paying $5,000/month for your planner is *less* likely to add $2,000/month for analytics,
not more. Realistically this is an **upsell on path 1's installed base**, not a separate 50 clients.

### Prediction grid

| Clients \ Price | $750/mo | $1.5k/mo | $2k/mo | $4k/mo |
|---|---|---|---|---|
| **8** | $72,000 | $144,000 | $192,000 | $384,000 |
| **15** | $135,000 | $270,000 | $360,000 | $720,000 |
| **25** | $225,000 | $450,000 | $600,000 | $1,200,000 |
| **50** | $450,000 | $900,000 | $1,200,000 | $2,400,000 |

**Grounded case: 8 clients × $1,500/mo = $144,000 ARR**, and not before year 3 [A].

**Verdict: real, but strictly downstream.** Reframe it as a **$1,000–2,000/month attach on path 1
clients** rather than a standalone 50-client business. That version is credible and needs no new
sales motion.

---

## 9. Path 6 — Managed creator campaigns

> *$2,000–$50,000+ per campaign plus 10%–25% management fee.
> 40 campaigns × $15,000 net revenue = $600,000.*

**Arithmetic: PASS.** 40 × $15,000 = $600,000. ✓ **The fee basis is the problem.**

### What the research supports

| Benchmark | Figure | Status |
|---|---|---|
| Nano creators | **$20–100 per post** | [V] |
| Micro creators | **$100–5,000** | [V] |
| Macro creators | **$5,000–10,000+** | [V] |
| Luxury hospitality campaigns | **$5,000–50,000+ per campaign** plus hosted stays | [V] |
| Mainstream hospitality / airlines | **$500–10,000 per campaign** | [V] |
| Management fee | **10–25% of campaign spend** | [V] — matches your own note |

### The error

You have the fee percentage right and the **fee base wrong**. A "$15,000 campaign" is the
**budget** — most of which goes to creators. At a 20% management fee, a $15,000 campaign nets you
**$3,000**.

> **40 campaigns × $3,000 = $120,000, not $600,000 — a 5.0× overstatement.**

To net $15,000 per campaign at 20% you need a **$75,000 campaign budget**. That is top-tier DMO and
luxury-brand money, and running 40 of them a year is a staffed agency, not a side line.

### Prediction grid (net fee to XPMatch, not campaign budget)

| Campaigns/yr \ Net fee to XPMatch | $1.5k | $3k | $7.5k | $15k |
|---|---|---|---|---|
| **10** | $15,000 | $30,000 | $75,000 | $150,000 |
| **20** | $30,000 | $60,000 | $150,000 | $300,000 |
| **40** | $60,000 | $120,000 | $300,000 | $600,000 |
| **60** | $90,000 | $180,000 | $450,000 | $900,000 |

**Grounded case: 20 campaigns × $3,000 net = $60,000** [A].

**Verdict: the weakest economics of the seven and the one I would cut.** Low margin, headcount-driven,
does not compound, does not transfer to a buyer. There *is* a smarter version: your business plan
already proposes paying creators **$1–2 per activated signup** (Mindtrip pays $1). That makes creators
an **acquisition channel feeding path 7** rather than a revenue line — same relationships, and it
builds the asset instead of renting out your time.

---

## 10. Path 7 — Premium consumer membership

> *$8–$30/month. 10,000 paying users × $15/month = $1.8M ARR.*

**Arithmetic: PASS.** 10,000 × $15 × 12 = $1,800,000. ✓ **The price is not achievable.**

### What the market actually charges

| Product | Price | Effective monthly | Status |
|---|---|---|---|
| **Wanderlog Pro** — *your cited comparable* | **$39.99/year** | **$3.33/mo** | [V] |
| Layla annual | $49.99/year | $4.17/mo | [V] |
| TripIt Pro | $49.00/year | $4.08/mo | [V] |
| Layla monthly | $9.99/mo | $9.99/mo | [V] |
| **Your assumption** | **$180/year** | **$15.00/mo** | [A] |

**$15/month is $180/year — 3.6× the highest annual price anywhere in the category, and 4.5× the
comparable you cited.** Wanderlog Pro bundles an AI assistant, route optimisation, booking deals and
Gmail scanning for $39.99/year. Nobody in consumer travel planning sustains $180/year.

### The compounding error

Against your own Year-3 model (1,695 paying consumers at ~$49/year):

- 10,000 paying is **5.9× the user count**
- $180/year is **3.7× the price**
- Together: **a 22× uplift on the Plus line**

At a defensible price, 10,000 paying members is **10,000 × $49 = $490,000** — real money, and a
quarter of the claim.

### Prediction grid

| Paying members \ Effective annual price | $39/yr | $49/yr | $79/yr | $120/yr | $180/yr |
|---|---|---|---|---|---|
| **1695** | $66,105 | $83,055 | $133,905 | $203,400 | $305,100 |
| **3000** | $117,000 | $147,000 | $237,000 | $360,000 | $540,000 |
| **6000** | $234,000 | $294,000 | $474,000 | $720,000 | $1,080,000 |
| **10000** | $390,000 | $490,000 | $790,000 | $1,200,000 | $1,800,000 |

**Grounded case: 6,000 paying × $55/yr effective = $330,000** [A] — a small premium to the category
justified by the taste profile, not a 3.6× one.

**Verdict: the right long-term engine, at a quarter of the assumed price.** $30/month is defensible
only for a genuinely different product — concierge access bundled in, or member-only inventory. If you
want the $15–30 tier to exist, it has to carry **human delivery**, which makes it your Concierge offer
on a subscription, not a software tier.

---

## 11. What I would actually do

The twelve-P review picked **Profit** and **Problem**. Read against these seven paths, that holds, and
it sequences them:

| When | Path | Why |
|---|---|---|
| **Now** | **4 — group/corporate** | Only path needing no users, no volume, no integration. Same motion as concierge, 10–30× the ticket. Produces cash *and* the first case studies |
| **Now (1–2 days)** | **3 — booking links** | Costs nothing to run, near-100% margin, compounds silently with every trip. Switch it on and forget it |
| **Months 2–9** | **1 — DMO white-label** | Start the 6–18 month procurement cycle now; it is the only path a strategic buyer pays a premium for |
| **Months 6–18** | **7 — membership at $49–79/yr** | The engine, priced where the market actually is |
| **Year 2–3** | **5 — analytics as an attach on path 1** | Not a separate 50-client business |
| **Deferred** | **2 — revenue share** | Revisit once path 3 gives you a booking curve to negotiate with |
| **Cut** | **6 — creator campaigns as a service** | Convert to a $1–2/activated-signup acquisition channel feeding path 7 |

**Realistic combined, counting each unit of demand once:** roughly **$700k–900k by end of year 3**
across paths 4, 3, 1 and 7 — against the $427,320 in your current Year-3 model. So these paths **do**
meaningfully raise the ceiling. They raise it to about **2×**, not 19×.

## 12. Sources

All accessed Sep 22, 2026.

- Wanderlog Pro pricing — https://monkeyeatingmango.com/blog/wanderlog-pricing-2026/ · https://wanderlog.com/pro
- Viator affiliate 8% — https://phptravels.com/blog/how-to-earn-with-the-viator-affiliate-program
- Viator / GetYourGuide affiliate vs supplier rates — https://track360.io/blog/viator-getyourguide-affiliate-programs-operator-teardown-2026
- OTA commission rates — https://www.sambahq.com/ota-supplier-guide/ota-commission-rates · https://www.cloudbeds.com/online-travel-agencies/commissions/
- Travel affiliate rate-card benchmark — https://track360.io/blog/best-travel-affiliate-programs-2026-operator-rate-card-benchmark
- DMO budget allocation bands (15–28% web/SEO/content/CRM) — https://percepture.com/travel-tourism-insights/dmo-marketing-budget/
- DMO count (~2,400 globally) — https://dmcfinder.com/how-many-dmos-are-there/
- GuideGeek DMO licensing model — https://guidegeek.com/ · https://www.prnewswire.com/news-releases/guidegeek-the-free-ai-travel-assistant-from-matador-network-now-available-on-facebook-messenger-302053864.html
- White-label DMO itinerary tools — https://www.simplified.travel/post/ai-travel-planning-tool-for-dmos-guide · https://www.mtrip.com/
- Data Appeal / Mabrian acquisition (~€3.7M for 70%) — https://datappeal.io/mabrian-acquisition/ · https://mabrian.com/
- Creator campaign rates — https://evokad.com/destination-influencer-marketing-guide-2026/ · https://www.linkedin.com/pulse/inside-travel-influencer-marketing-budgets-who-gets-paid-gratteri--3dwjc
- Corporate retreat per-person costs — https://www.offsite.com/blog/retreat-cost · https://www.monikerpartners.com/blog/how-to-budget-for-a-company-retreat · https://www.emrgmedia.com/executive-offsite-retreat-planning-nyc-costs/
- Pilot is free / monetises on bookings — https://www.pilotplans.com/ · https://www.pilotplans.com/group-trip-planner
- Internal: `2-financial-model.md`, `2-financial-model.xlsx`, `docs/REVENUE_MODEL.md`, `docs/COMPETITOR_LANDSCAPE.md`
