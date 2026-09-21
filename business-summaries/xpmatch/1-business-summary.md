# XPMatch
## Business Summary — Pre-Launch Prospectus

Prepared by: Tayo Aki, Faven [A]
Prepared for: ourselves, and a future lending partner or acquirer
Business type: saas · service · content
Stage: pre-launch (product built, not yet monetised)
Last updated: Sunday, Sep 21, 2026

> **Founder inputs are defaults.** Nine founder-side facts were not supplied and have been
> defaulted: ownership and equity split, founder hours, entity and jurisdiction, capital available,
> spend to date, owner compensation, revenue to date, other businesses, and non-compete exposure.
> Each is listed in `2-financial-model.md` §0, tagged **[A]**, and carried onto the Validation
> Scorecard. Nothing in this document should be shown to a lender until they are replaced with
> real answers.

---

## Table of Contents

1. Founder Attestation
2. Disclosure
3. From Summary to Launch
4. Executive Summary — Financial Quickview, Key Benefits, Key Risks
5. Financial Overview
6. Demand Overview
7. Founder Interview
8. Validation Scorecard
9. Next Steps

---

## 1. Founder Attestation

We, the founders named above, have reviewed this Business Summary and the accompanying financial
model. Every figure is tagged **Verified**, **Estimated**, or **Assumed**, and to the best of our
knowledge the tags are accurate. We have not knowingly omitted a material risk.

*Unsigned — founder inputs in this draft are defaults, not founder answers. This attestation is not
yet true and must not be treated as given.*

Tayo Aki · Faven
Sep 21, 2026

## 2. Disclosure

This document describes a business that has not yet launched. It is a planning and decision
document, not an offer to sell securities or a solicitation of investment.

Forward-looking statements: the projections here are built from the assumptions listed in
`2-financial-model.md` and are subject to risks the founders do not control. Projections tagged
Assumed have no supporting evidence yet; the Validation Scorecard in Section 8 lists the tests that
would change that. Twenty of thirty-eight modelled assumptions are Assumed.

Competitor information was gathered from public sources on the dates cited, and is recorded with
its source URLs in `docs/COMPETITOR_LANDSCAPE.md` and `docs/REVENUE_MODEL.md` (read September 2026).
It may be incomplete or out of date.

## 3. From Summary to Launch

1. **Review** — both founders read this summary and `2-financial-model.md` in full.
2. **Challenge** — each writes down the three numbers they believe least. Those go to the Validation
   Scorecard if they are not already there.
3. **Validate** — run the Scorecard tests in cost order. Each either moves a number to Verified or
   kills the assumption. Budget: **$979 and 8 weeks**.
4. **Decide** — go / no-go on $12,061 of business capital and a 12-month unpaid founder year. A "go"
   means the Quickview numbers are the commitment.
5. **Build** — Stripe billing, the three paywall moments, and the concierge order form. Four days of
   founder work; nothing else ships until money can be taken.
6. **Launch** — concierge trips sold by hand to the founders' network in week 1; advisor outbound
   from week 3 once sending domains have warmed.
7. **Milestone review** — at 90 days or first $5,000 of revenue, whichever comes first, re-run
   `/business-summary` in Update mode and compare actuals to the Year-1 monthly plan.

## 4. Executive Summary

XPMatch is a personalised travel planner that turns a traveller's taste profile into a single card —
one matched stay, three things to do, three places to eat, on a map — which the traveller can swap,
lock and convert into a day-by-day trip board. It makes money five ways: $49/seat/month from
independent travel advisors, $149–399 per done-for-you concierge trip, $49/year or $19/trip from
consumers, and an affiliate share on stays and activities booked through the plan.

Why now: 37% of US travellers used AI to plan a trip in spring 2026 (Allianz, 2,001 adults), 78% of
travel advisors now charge a planning fee, and Expedia bought the AI planner Layla on July 31, 2026,
which established both the category and the buyer. The gap competitors left is specificity — every
2026 roundup of AI trip planners concludes that occasional travellers should use ChatGPT, because
the planners produce the same generic lists. XPMatch sells the match, not the itinerary.

The headline numbers: **$12,061** of business capital, first revenue in **month 1**, cash breakeven
in **month 2**, **$40,123** of Year-1 revenue growing to **$427,320** in Year 3, at a Year-3 SDE of
**$172,073** (40% margin). The founders work a combined 50 hours a week at launch, 30 at steady
state, and draw nothing for twelve months.

It runs lean by design. One founder does sales, delivery and product; the second contributes 10
hours a week. A part-time concierge reviewer joins at month 15 and a support contractor at month
25. Everything else — support drafting, content, lead research, dashboards — is automated or
AI-drafted, per `docs/OPERATING_SYSTEM.md`.

What a buyer would see in three years: **$548,932 of ARR run-rate**, 405 advisor seats at 89% gross
margin, 69% blended gross margin, a place catalog that costs $1.40–2.00 per active user per month
where it once cost $10, and a taste-profile dataset that improves the product with every reaction.
At 3.2x SDE that is a **$550,635** business.

**Note:** There are no customers, no revenue, and no way to accept payment — the codebase contains
no billing integration. Twenty of thirty-eight assumptions are Assumed, giving a Verified fact share
of 3%. Year-1 SDE is **negative $5,575** once the second founder's unpaid time is priced at market.
And the $60,061 of total cash the plan requires, including a 12-month unpaid runway, exceeds the
founders' stated $25,000 by **$35,061**. This business is not financeable today and is not yet
proven at any gate beyond the first.

### Financial Quickview

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

### Key Benefits

- **The product is already built:** onboarding, taste matching, the package builder with swap and
  lock, trip boards, maps and a place catalog are live in production, so the $12,061 of capital
  buys distribution rather than software.
- **Unit costs already solved:** the place catalog took cost per active user from about $10/month to
  $1.40–2.00, which is what makes a $49/year consumer plan viable at 51–66% margin.
- **A 90% margin segment with a $400 CAC ceiling:** advisor seats carry an estimated $1,600 lifetime
  value at 3% monthly churn, which is what makes outbound economic for that segment and not for
  consumers.
- **Revenue from month one without a funnel:** concierge trips at $249 average and $65 of delivery
  cost sell by hand to the founders' network, producing 51% of Year-1 revenue with no marketing spend.
- **Five priced competitors, none positioned on taste:** Layla, Wanderlog, TripIt, StayMatch and
  Mindtrip all publish pricing, which validates willingness to pay while leaving match-quality
  unclaimed.
- **A strategic buyer proved the category this year:** Expedia acquired Layla on July 31, 2026, and
  Fora reached a $1B valuation with 15,000+ advisors in the same month.
- **Founder dependency is designed against from day one:** `docs/OPERATING_SYSTEM.md` assigns every
  recurring job to automation, an AI agent, or a written SOP, targeting under 10 founder hours a
  week in delivery.

### Key Risks

- **No customer has ever paid:** zero revenue, zero paid pilots, and no billing integration in the
  codebase — Gate 1 of the founders' own method is unstarted.
- **The funding gap is 58% of the requirement:** $60,061 is needed including the unpaid year against
  $25,000 of stated founder cash.
- **Year-1 SDE is negative:** −$5,575, because two founders working unpaid are worth more than the
  $20,880 of operating profit they generate.
- **One assumption dominates the outcome:** a 30% miss on advisor seat adds costs $46,291 of Year-3
  SDE, more than the entire concierge line contributes.
- **The exit thesis is 4x apart from the business plan:** 3.2x SDE gives $550,635 against the plan's
  $2.0–2.7M, because that figure applies an ARR multiple at an SDE margin the cost structure does
  not produce.
- **Costs are set by two suppliers:** Google Places pricing and OpenRouter model pricing determine
  gross margin, and neither founder controls either.

## 5. Financial Overview

Summarised from `2-financial-model.md`. Read the assumptions table there before trusting any line.

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Revenue | $40,123 | $190,673 | $427,320 |
| Cost of goods sold | $8,143 | $59,342 | $131,447 |
| Gross profit | $31,980 | $131,331 | $295,873 |
| Gross margin | 80% | 69% | 69% |
| Advertising & marketing | $7,200 | $24,000 | $48,000 |
| Other operating expenses | $3,900 | $71,400 | $145,800 |
| Net operating profit | $20,880 | $35,931 | $102,073 |
| Owner add-backs (net) | −$26,455 | $20,635 | $70,000 |
| **SDE** | **−$5,575** | **$56,566** | **$172,073** |
| SDE margin | −14% | 30% | 40% |

Year-1 monthly detail, the capital deployment schedule, and SDE add-back detail are in the model file.

Three assumptions carry the projection. **Advisor seat adds** is the largest single driver of Year-3
SDE by a wide margin — seats are 41% of Year-3 revenue at roughly 90% margin, and a 30% miss costs
$46,291. **Free-to-paid conversion at 4–6%** determines whether the consumer funnel is a business or
a lead source for concierge. **Cost per paying user at $2.00/month** is the one that runs backwards:
a 30% overrun costs $28,797 of Year-3 SDE and would make the $49 annual plan unsellable at a profit.

## 6. Demand Overview

Evidence that customers exist and are reachable. Sources and dates are as recorded in
`docs/COMPETITOR_LANDSCAPE.md` and `docs/BUSINESS_PLAN.md` §3, gathered September 2026.

- **Money already changes hands for this exact deliverable.** 78% of travel advisors charge a
  planning fee (Travel Institute, via Creo Proposals). Consultations run $100–250; domestic trips
  $100–500; international $250–1,500 (AAA). One custom-itinerary service publishes flat tiers at
  $97 / $197 / $297 / $497. **[E]**
- **Freelance marketplace signal is real but thin.** Fiverr trip-plan gigs cluster at $50–60 with
  24+ sellers listed. The founders' own method classifies a thin job-post count at low prices as a
  research-slot signal, not a purchase-intent cluster. **[E]**
- **Category adoption.** 37% of US travellers used AI to plan travel in spring 2026 (Allianz, 2,001
  adults, March–April 2026); 43% among affluent travellers (Deloitte, 2026 summer travel survey). **[E]**
- **Five competitors publish prices.** Layla $9.99/mo or $49.99/yr; Wanderlog Pro $39.99/yr; TripIt
  Pro $49/yr; StayMatch $10 day pass and $20/$30/$50 monthly tiers; advisor tools Travefy $39–59/mo,
  Tern $39/seat/mo, Safari Portal from $199. **[E]**
- **The advisor segment is large, new and concentrated.** Fora: 15,000+ advisors, 97% new to the
  profession, $3B lifetime bookings, $1B valuation (July 2026). Advisors pay $299/yr or $99/quarter
  for membership and already reallocate $39–59/month to proposal software. **[E]**
- **Comparable exits.** Expedia acquired Layla on July 31, 2026 (~25 people, ~€5M raised). GuideGeek
  (Matador Network) reports 30+ DMO licensing partners mid-2026 and 1.5M users. **[E]**
- **Direct signals: none.** Waitlist size, pre-orders, letters of intent and completed discovery
  calls are all **zero**. No beta tester has been invited; `docs/BETA_READINESS.md` lists eight
  unfinished items before the first invite. **[V]**
- **Community sizes: not yet determined.** The plan names r/solotravel, destination subreddits,
  Fora's advisor community, Travel Advisors Unite and Host Agency Reviews as watering holes but
  records no member counts or engagement rates. Test: one afternoon counting members and
  30-day post volume across the eight named communities, cost $0, by Oct 5, 2026. **[A]**

## 7. Founder Interview

Questions are numbered continuously. Answers are in the founders' own voice. Numbers carry a tag.
Answers marked *[default]* were not supplied by a founder and are the skill's stated defaults.

### GENERAL OVERVIEW

1. **Describe what the business will do and who the target customer is, in plain words.**
   We give people a stay, three things to do and three places to eat that fit their own taste, on a
   map, in under a minute. Two customers pay: the traveller who plans two or more trips a year, and
   the independent travel advisor who does this for twenty to eighty clients a year and currently
   rebuilds the same proposal every time.

2. **What legal entity will own it, in which jurisdiction, and who are the owners?**
   XPMatch, Inc., a Delaware C-corp incorporated September 2026. Tayo Aki 70%, Faven 30%. *[default, A]*
   Our published Terms of Service and Privacy Policy are effective Sep 16, 2026 and already name
   XPMatch, Inc. **[V]**

3. **Do you operate other businesses, and will any share staff, cash or customers?**
   No. *[default, A]*

4. **Share your background and the story behind this idea. What did you see that others did not?**
   Every AI trip planner answers the question "what should I do in Lisbon". None of them answers
   "what should *I* do in Lisbon". The planners produce the same ten places because they have no
   model of the person asking. We built the taste profile first and the itinerary second.

5. **Why now rather than a year ago or a year from now?**
   Three things landed in 2026. Expedia bought Layla on July 31 **[E]**, which told every advisor
   platform this category is strategic. Fora reached a $1B valuation with 15,000+ advisors, 97% of
   them new to the profession **[E]** — a large, new, under-tooled buyer segment. And model costs
   fell far enough that our cost per active user is $1.40–2.00/month **[E]** instead of $10.

6. **What assets will the business own on day one, and what has to be built?**
   Owned: the application, the place catalog and its resolution logic, the match model, the taste
   quiz, the trip board, the admin tooling, `app.xpmatchme.com` and `www.xpmatchme.com`, and the
   documentation set in `docs/`. To build: Stripe billing and the paywalls (3–4 days), the concierge
   order form and fulfilment queue (3 days), the advisor workspace (2–3 weeks). **[E]**

7. **What strengths does a founder need here, and which are you missing?**
   Needed: product judgement, cold outbound, and the patience to deliver concierge trips by hand
   for a year. We have the first. We have never run a cold-email engine at 400 sends a week, and
   neither founder has sold software to travel advisors. That gap is why the advisor channel gets a
   dated kill decision at week 12 rather than an open-ended budget.

8. **Who is the ideal buyer in three to five years, and why would they pay?**
   In order of likelihood: a financial buyer on Acquire.com buying profit and low founder
   dependency; an advisor platform or host agency buying a client-facing planning tool their
   advisors already use; an OTA buying the personalisation engine, which is what Expedia bought in
   Layla.

9. **Name the three most pivotal decisions in the first year.**
   Whether to keep the consumer tier at all if Trip Pass conversion misses 2% by week 8; whether to
   hire the concierge reviewer at month 15 or cap concierge volume; and whether to spend the second
   half of Year 1 on the advisor workspace or on SEO package pages. We cannot do both.

### BUSINESS MODEL & REVENUE STREAMS

10. **List every way the business will make money, and the share of revenue from each in Y1 and Y3.**
    Concierge trips 51% → 19%; advisor seats 28% → 41%; Plus subscriptions 8% → 17%; Trip Pass
    8% → 9%; affiliate commissions 5% → 14%. **[A]** Licensing to hotels and destination marketing
    organisations is deliberately excluded from the model; it is a Year-3+ conversation.

11. **What is the pricing, and how was it set?**
    Plus $49/year or $7.99/month, anchored to Layla $49.99/yr, TripIt Pro $49/yr and Wanderlog Pro
    $39.99/yr **[E]**. Trip Pass $19 for 60 days, which has no direct comparable — StayMatch's $10
    day pass is the nearest shape **[A]**. Advisor seats $49/month against Travefy $39–59 and Tern
    $39 **[E]**. Concierge $149 / $249 / $399, below the $250–1,500 an advisor charges for
    international planning **[E]**.

12. **Which revenue streams have the highest margin, and which the lowest?**
    Affiliate is effectively 100% once the links exist. Advisor seats are 89%. Trip Pass 84%.
    Concierge 74%. Plus annual is the thinnest at 47% after processing fees — $49 of revenue against
    $24 of COGS and $1.70 of fees. **[E]**

13. **Is there seasonality? Best and worst months?**
    January and September are the planning peaks for summer and holiday travel respectively.
    We have not measured the amplitude and the model does not seasonalise, which will overstate
    revenue in slow months and understate it in peaks. Test: pull Google Trends on five head terms,
    $0, by Oct 5. **[A]**

14. **Are there geographic limits?**
    United States first for both segments. The product works anywhere Google Places has coverage.
    GDPR applies if we accept EU users, and the Privacy Policy needs explicit-consent handling for
    dietary and religious preferences before we do. **[E]**

15. **Could one customer, channel or platform exceed 20% of revenue?**
    No single customer. But Google Places is 100% of our place data and OpenRouter is 100% of model
    inference, so two suppliers sit behind every unit of gross margin. In Year 1, concierge is 51%
    of revenue and depends entirely on one founder's time.

16. **How do the revenue streams change as the business matures?**
    Concierge falls from half of revenue to a fifth — it stays because it produces case studies and
    stress-tests the product, not because it scales. Seats and affiliate grow into the gap. If
    licensing to destinations ever lands it would be the fourth act, and it is not modelled.

### PRODUCT & TECHNOLOGY (SaaS module)

17. **Pricing plans and expected mix. Monthly versus annual.**
    Plus splits 50/50 annual/monthly in Year 1, moving to 65/35 by Year 3 as annual becomes the
    default with a 14-day trial. **[A]** Annual matters because travel apps renew annual plans at
    about 40% and monthly subscribers make a first renewal only 53% of the time. **[E]**

18. **Target MRR at month 12 and month 36, with the customer count behind it.**
    Month 12: $6,698 of monthly revenue, 72 annual and 50 monthly Plus subscribers, 49 advisor
    seats. Month 36: $45,744 of monthly revenue, 1,314 annual and 381 monthly Plus subscribers,
    405 seats. **[A]**

19. **Expected churn, and where the benchmark comes from.**
    Plus monthly 12%/month and annual renewal 45%, both from RevenueCat's 2026 travel benchmarks
    with a 5-point uplift on annual for the taste profile that improves with use **[E]**. Advisor
    seats 5%/month falling to 3% **[A]**.

20. **Free trial or freemium? Expected trial-to-paid conversion?**
    Freemium, with a 14-day trial on the annual plan. 4% of free accounts convert within 30 days in
    Year 1, rising to 6% by Year 3. The travel median is 4.1%. **[E]**

21. **Customer acquisition cost by channel, and payback period.**
    Not yet measured — no channel has produced a signup. The model spends $7,200 in Year 1 to
    acquire 7,970 signups and 319 paying customers, an implied $22.58 per paying customer, which is
    above the $14–20 ceiling that Plus lifetime value supports. That is why consumer acquisition is
    give-first and product-loop, not paid. **[A]**

22. **Expected lifetime value, and the formula.**
    Plus: $49/yr × 1.8 years average life = $88 revenue, $41 gross profit. Advisor: $588/yr at 3%
    monthly churn = 2.8 years = $1,600 revenue. CAC ceilings of $14–20 and $400 respectively. **[E]**

23. **The three features that matter at launch, and what is deliberately not built.**
    Matter: the taste quiz, the package card with swap and lock, and "Turn into a trip". Not built,
    on purpose: our own booking engine (merchant risk, and it is the incumbents' territory),
    restaurant reservations (no platform pays a commission), flight booking as a revenue line
    (about €2 per booking), and payment splitting for groups.

24. **Integrations or marketplaces that bring distribution.**
    None today. Candidates: an export to Travefy and Tern so advisors keep their document tool,
    and the Fora advisor community as a channel rather than an integration.

25. **Stack, hosting, and model costs as a share of revenue.**
    Next.js 16, React 19, Tailwind 4, CopilotKit v2, Postgres, deployed to Railway from a Dockerfile.
    Models through OpenRouter. COGS is 20% of revenue in Year 1 and 31% in Year 3 — it rises as the
    free base grows faster than the paying base. **[E]**

26. **Security posture, backups, tenant isolation.**
    Sign-in throttling is live (ten tries per email, a hundred per network address per 15 minutes).
    Postgres runs as **one instance, one volume, with no backups configured** — this is the single
    worst operational fact in the business and is item 5 on the pre-beta checklist. Every API key
    pasted into chat during the build still needs rotating. **[V]**

27. **Technical debt you are choosing to accept at launch.**
    Phone flows are verified in emulated Chromium only, not on real iOS or Android hardware. There
    is no error monitoring. The Privacy Policy does not yet cover the app — only the website — and
    the Terms set the age at 18 while the Privacy Policy says 13/16.

28. **Support load per customer, and who handles it.**
    Unmeasured. Bug reports already route to `/admin` with screenshots. The plan is an AI-drafted
    reply queue with a human approving, at a one-business-day first response. **[A]**

### SERVICE DELIVERY (Concierge module)

29. **What is the service, the deliverable, and the price?**
    A human-reviewed trip plan built inside the app, delivered in 48 hours as a shared board plus a
    20-minute call. $149 for a short trip, $249 for an international week, $399 for a group of six
    or more. Full refund if not delivered in 48 hours.

30. **Who delivers it, at what cost, and at what margin?**
    The founder through month 14, at $5 of API cost and 1.5 hours of unpaid time. From month 15 a
    part-time reviewer at $35/hour, making cash cost $57.50 per trip and margin 77%. The plan's $65
    figure prices founder time at market; on a cash basis in Year 1 it is $5. **[E]**

31. **Capacity, and the hiring trigger.**
    One founder at 1.5 hours per trip can deliver twenty trips a month inside a ten-hour week. The
    hire triggers above twenty; the model hires at month 15, when volume reaches 20/month.

32. **Client concentration.**
    Concierge clients are one-off, so no concentration within the line — but the line itself is 51%
    of Year-1 revenue, which is the concentration that matters.

33. **Onboarding and delivery SOPs; what is templated versus bespoke.**
    Five steps, ninety minutes, written out in `docs/BUSINESS_PLAN.md` §9.2: intake form, build,
    review against live listings, deliver with a call, post-trip rating and case study. The build is
    templated because it uses the same package builder the product uses. The review is bespoke.

34. **Can the service become a product?**
    That is the plan's central move — the concierge SOP is the specification for the advisor
    workspace, and every concierge trip is built inside the app precisely so the software absorbs
    the service.

### CONTENT & SEO (Content module)

35. **What will the content be, who writes it, and how often?**
    Destination package pages — "where to eat in Lisbon for food-first travellers" — rendered from
    the place catalog with our own blurbs and match reasons, plus one piece a day drafted from real
    activity and approved by a founder. Twenty-five cities × four taste profiles = 100 pages.

36. **What is the SEO thesis, and why can you outrank the incumbents?**
    We answer a narrower query than the incumbents do: not "best restaurants in Lisbon" but the
    same question qualified by traveller type, which is a long-tail set with weaker competition.
    **Search volumes for the head terms have not been pulled.** Test: one afternoon in a keyword
    tool, $0–99, by Oct 12. **[A]**

37. **Target traffic and the share that is organic.**
    Not yet determined, and the model does not project SEO traffic as a revenue line — package
    pages feed the signup ramp only. Pages converting at 2% or better get siblings; below that the
    programme stops at 100 pages.

38. **How exposed is the model to AI search summaries?**
    Materially. Google's AI Mode answers travel questions directly and books hotels with the partner
    as merchant of record. A destination-page strategy aimed at informational queries is the part of
    this plan most likely to be worth nothing in three years, which is why it is a marketing channel
    in the model and not a revenue stream.

39. **Will you ever buy links or use a private blog network?**
    No.

### CUSTOMERS & DEMAND

40. **Who is the typical customer?**
    Segment A: adults 28–45, household income $90k+, two to four leisure trips a year, food and
    neighbourhoods over landmarks, whose current system is Google Maps lists and Instagram saves.
    Segment B: solo or small-team travel advisors, 0–3 years in the profession, hosted by Fora or
    similar, 20–80 clients a year, already paying $39–59/month for proposal software.

41. **What evidence do you have that these customers already spend money on this problem?**
    Advisors: 78% charge planning fees, and they already pay for Travefy or Tern **[E]**. Travellers:
    the $97–497 flat-tier itinerary sellers and the $50–60 Fiverr gigs **[E]**. What we do not have
    is a single person who has paid *us*.

42. **How many customers does the Year-3 revenue number require?**
    405 advisor seats, 1,695 paying consumers, 335 concierge trips in the year, and roughly 14,600
    trips planned across the free and paid base. **[A]**

43. **What share of revenue is repeat or renewal in Year 2?**
    About 55% — seats and Plus renewals. Concierge and Trip Pass are transactional by design.

44. **Which segment has the highest lifetime value?**
    Advisors, at roughly $1,600 against $88 for Plus — an 18:1 ratio that decides where outbound
    effort goes.

45. **What would make a customer leave?**
    A traveller leaves when the gap between trips outlasts the subscription; that is why the plan
    sells annual first and builds between-trip nudges. An advisor leaves when the tool adds a step
    instead of replacing one.

### SALES PROCESS

46. **Walk through how a stranger becomes a paying customer.**
    Consumer: signup → quiz (70% complete) → first package under 60 seconds → trip created in the
    first session (35% target) → paywall at "Turn into a trip" → 4% pay within 30 days. Advisor:
    cold email at 400 sends a week → 3–5% reply → 5–8 appointments a week → free first proposal →
    seat starts on the second client link.

47. **How long is the sales cycle?**
    Consumer: one session to thirty days. Advisor: estimated two to four weeks from first reply to
    a paid seat, never yet run. **[A]**

48. **Who does the selling, and what does it cost per sale?**
    The founder owns every call, pilot and guarantee. AI drafts lists, emails and call notes and
    never sends one-to-one outreach under its own name. Cost per advisor sale is unmeasured; the
    channel's sending infrastructure is $150/month fixed.

49. **How will leads be tracked?**
    A LAPS board — leads, appointments, presentations, sales — reviewed every Monday, with a CAOS
    log (concept, audience, offer, sale blockers) written after every call.

50. **What is the refund policy and the expected rate?**
    Concierge: full refund if not delivered in 48 hours. Trip Pass: refund if the board is still
    empty after 7 days. Plus: 14-day trial, cancel anytime. Expected rate not determined. **[A]**

### ADVERTISING, MARKETING & SOCIAL MEDIA

51. **What are the primary sources of customers, and the expected share from each?**
    Give-first community answers and the founder's own profile in months 1–3; travel creators with
    unique links from month 4; destination package pages from month 7; the shared-trip product loop
    throughout. Outbound carries advisors the whole way. Shares are unmeasured — every channel is at
    zero today. **[A]**

52. **What paid channels, at what budget, and what CAC makes the model work?**
    A single $500 test on Meta or TikTok at month 9, against the best-performing landing page, and
    only continued at a CAC at or below one third of gross profit per customer — about $14 for Plus.
    Paid social is not in the Year-1 plan beyond that test.

53. **What is the organic plan?**
    Answer five questions a day in destination subreddits and advisor groups for four weeks,
    give-first, never pitching, with the profile link doing the work. Publish one piece a day built
    from real client work.

54. **Will you build an email list?**
    Yes, through Resend: welcome, package tips, trial ending, pre-trip, post-trip, seasonal and
    win-back. Two days of work, shared with the retention plan.

55. **Who makes the creative, and who approves it?**
    AI drafts, a founder approves and posts. No AI persona sends one-to-one outreach.

56. **Which marketing channel is most likely to fail, and what is the fallback?**
    Destination package pages, for the AI-search reason in Q38. The fallback is the creator channel,
    where Mindtrip has already proved the mechanics by paying $1 per referred account.

57. **Are there influencer or affiliate channels natural to this category?**
    Yes — travel TikTok, Instagram and Substack creators who already publish "3 days in X", which our
    import turns into a package. Ten creators with 10k–100k followers, unique links, 30-day test,
    keeping those whose signups activate at 40% or better.

### OPERATIONS, WORKLOAD & STAFF

58. **How many hours per week will each founder spend?**
    Tayo 40 hours in the first 90 days, 25 at steady state; Faven 10 and then 5. *[default, A]*
    Breakdown at steady state: sales calls and outbound 10, concierge review 6 (to month 14),
    product 6, exceptions and support 3, content approval 2, gate and money decisions 2.

59. **List every employee, contractor or agency needed.**
    Part-time concierge reviewer, remote, $35/hour, ~$1,500/month, from month 15, building and
    QA-ing concierge trips against the SOP. Support contractor, remote, ~$1,500/month, from month
    25, first-response on the support inbox. Neither exists today. **[A]**

60. **Which tasks will be documented as SOPs, and who writes them?**
    Concierge delivery, support triage, the weekly ops checklist, the release checklist and the
    monthly close. A founder writes each one the first time the task is done twice.

61. **What communication and project cadence?**
    Monday: LAPS scoreboard, cost and hit-rate tiles, open bug reports. Daily: outreach, one content
    piece, concierge deliveries. Friday: CAOS review and next week's list. Monthly: P&L, cohort
    retention, Google SKU counts. Quarterly: a dated gate decision in `docs/decisions/`.

62. **How long would a competent stranger need to learn to run this?**
    Roughly a month for delivery and support, which the SOPs cover. Sales is the hard part, because
    the advisor pitch depends on knowing how a host agency works. That is the transferability risk a
    buyer will price.

63. **Which relationships depend on a founder personally?**
    All of them today — every concierge client, every advisor conversation, every creator deal.
    The plan to make them transferable is the SOP set plus moving outreach to a documented sequence
    rather than a personal relationship.

### TECHNOLOGY & SYSTEMS

64. **What is the stack and why?**
    Next.js 16 with React 19 and Tailwind 4, CopilotKit v2 for the agent runtime, Postgres for
    accounts, trips, saved places, guides and the place catalog, PGlite embedded in development,
    Railway for deployment. Models are reached through OpenRouter so the choice stays cheap and
    swappable.

65. **Who builds it, who maintains it, and what does that cost?**
    A founder, with AI assistance. Hosting is $20–25/month today, growing to about $400/month by
    Year 3. **[V/E]**

66. **List every software subscription.**
    Railway hosting ~$25, Resend ~$20, cold-email tool and inboxes ~$150, error monitoring ~$29
    (not yet purchased), domains ~$5. About $150/month in Year 1 beyond hosting. **[E]**

67. **Where are the domain, hosting and critical accounts held?**
    `app.xpmatchme.com` and `www.xpmatchme.com`, Railway, Google Cloud, OpenRouter and Resend, all
    in founder-held accounts. An access inventory and key rotation are required before any sale and
    are overdue now.

68. **What security, backup and data-privacy obligations apply?**
    Postgres backups are not enabled. The Privacy Policy needs an app section covering chats, trips,
    saved places, learned preferences, the in-depth profile (dietary and religious preferences are
    health- and religion-adjacent, requiring explicit consent under GDPR), bug-report screenshots,
    and the fact that messages and pasted content go to model providers. Google Maps sets its own
    cookies on the app, so the current "no third-party cookies" line is no longer true.

### FINANCIAL

69. **What capital is required to reach first revenue and cash breakeven?**
    $12,061 of business capital: $3,850 of one-time costs, $3,636 of month-1 drawdown, $4,575 of
    working-capital buffer. Separately the founders need $48,000 of personal runway for the unpaid
    year. Against $25,000 available that is a $35,061 shortfall. **[E/A]**

70. **What accounting software, who does the books, and will they be separate?**
    Not yet chosen. Separate business banking and bookkeeping from day one is non-negotiable if a
    sale is the goal, because a buyer prices what can be proven. Test: open business banking and
    bookkeeping, ~$40/month, by Oct 15. **[A]**

71. **Cash or accrual? How is subscription revenue recognised?**
    Accrual for the P&L: annual plans recognised at $4.08/month over twelve months. Cash receipts
    drive the cash-flow rows, since annual plans bill upfront. Trip Pass is recognised at purchase.

72. **What payment processors, and what fees?**
    Stripe at 2.9% + $0.30, with Checkout, Billing, the customer portal, Smart Retries and Stripe
    Tax. **[V]**

73. **What is the expected gross margin, and the biggest COGS line?**
    80% in Year 1, 69% thereafter. The biggest line is per-user API, model and hosting cost, at
    $95,990 in Year 3 — 73% of all COGS.

74. **What owner compensation is assumed?**
    $0 through month 12, $4,000/month in Year 2, $8,000/month in Year 3. *[default, A]* This is the
    largest add-back and the reason Year-2 and Year-3 SDE exceed net operating profit.

75. **Which expenses are one-time versus recurring?**
    One-time: app-specific legal $2,000, landing pages and brand $1,500, trademark $350. Everything
    else recurs.

76. **What documents would prove the numbers to a lender in three years?**
    Stripe payout reports, business bank statements, filed tax returns, the Railway and Google Cloud
    billing consoles, and the `/admin` cohort and cost tiles. Set them up now — a buyer will not
    accept a spreadsheet.

### COMPETITION

77. **Who are the top competitors, what do they charge, and what do they do better?**

| Competitor | Primary focus | Pricing | What they do better | Our advantage | Source |
|---|---|---|---|---|---|
| Layla (Expedia) | AI planner + booking | $9.99/mo, $49.99/yr | Expedia's supply, capital and distribution; human experts bundled | Taste profile and match score; advisor white-label they do not sell | Layla FAQ; Expedia IR, Jul 31 2026 |
| Mindtrip | Free planner, earns on bookings | Free | In-chat flight booking via Sabre; a creator programme paying $1/account; a Hotels B2B line | We charge for the plan, so we are not dependent on attach | monkeytravel.app review 2026; mindtrip.ai/creator-program |
| Wanderlog | Freemium organiser | Pro $39.99/yr | A genuinely better organiser and a large existing base | We sell the picks, not the organiser | monkeyeatingmango.com, Aug 2026 |
| TripIt (SAP Concur) | Itinerary organiser | Pro $49/yr | Corporate distribution through Concur; inbox parsing | Leisure taste matching, which Concur has no reason to build | monkeyeatingmango.com, Aug 2026 |
| Travefy / Tern | Advisor proposal software | $39–59/mo; $39/seat/mo | Established advisor workflows and integrations | We produce the picks; they produce the document — export keeps both | tern.travel/pricing; Capterra |
| ChatGPT | General assistant | $20/mo | Free-form reasoning, and reviewers recommend it for occasional travellers | Verified Google places with links, a match score, and a board | stippl.io, stardrift.ai 2026 roundups |

78. **What advantages will you have, stated so they could be checked?**
    Every card is a verified Google place with a live link, so the hallucinated-restaurant failure
    does not occur. The package is built from an eight-factor taste model and the score is shown
    with its reasons. Cost per active user is $1.40–2.00/month, which is what lets a $49/year plan
    carry a real place catalog. Each is testable by a third party.

79. **Is the barrier to entry high or low?**
    Low on the surface and moderate underneath. Anyone can wire a model to Google Places in a
    weekend. What takes time is the catalog economics, the match model calibrated on real reactions,
    and the advisor relationships. None of that stops a funded competitor; it buys about two quarters.

80. **Have competitors been acquired, shut down or raised recently?**
    Expedia acquired Layla on July 31, 2026. Fora raised at a $1B valuation in July 2026. Mindtrip
    launched in-chat booking on May 6, 2026 and a Hotels B2B product in November 2025. The category
    is consolidating upward, which is good for an exit and bad for a slow build. **[E]**

81. **What is the biggest competitive threat over three years?**
    Google. It already answers travel questions in AI Mode and books hotels with the partner as
    merchant of record. If personalised itineraries become a native feature of the search box, the
    consumer tier loses its reason to exist and only the advisor segment survives.

### LEGAL, REGULATORY & PLATFORM RISK

82. **Are there licences or regulations that apply?**
    Not for software. Selling travel itself — which we do not do — triggers seller-of-travel
    registration in several US states. Joining a host agency like Fora to earn commission on
    concierge bookings would change that answer and needs checking before it is done. **[A]**

83. **Which third-party platforms could shut you down?**
    Google Maps Platform (place data, and a policy limiting storage of Places content beyond 30 days
    — the catalog refreshes by design to stay inside it), OpenRouter and the model behind it, Railway,
    Stripe, and Resend. Google is the one with both the policy leverage and the competing product.

84. **Trademarks and IP: what will be filed, and is the name clear?**
    A word mark for XPMatch, ~$350. **The name has not been cleared.** Test: USPTO TESS search plus
    a domain and social check, $0, by Oct 5. **[A]**

85. **Tariffs, sales tax, data rules?**
    No tariffs — nothing physical. US sales tax on SaaS varies by state and Stripe Tax handles it.
    GDPR applies on EU traffic and is not yet satisfied for the app.

86. **Any exposure from prior employment or non-competes?**
    None. *[default, A]*

### LAUNCH PLAN & FINANCING

87. **Where does the capital come from, and on what terms?**
    $25,000 of founder cash, no outside capital, no lender approached. *[default, A]* The $35,061
    shortfall against the full requirement is unresolved and is the first thing a partner would ask
    about.

88. **How much working capital after launch, and for how long?**
    $4,575, three months of month-12 operating expenses. The business is cash-positive from month 2
    on a cash basis, so working capital is a buffer against a concierge dry spell, not a runway.

89. **What is the minimum first offer and first channel? What does launch week look like?**
    The first offer is a concierge trip at a founding-client price, sold to the founders' own
    network. Launch week: ship Stripe billing and the concierge order form, buy two sending domains
    and start warm-up, book three pilots, rotate every exposed key, turn on Postgres backups.

90. **What is the 90-day milestone that says keep going, and the one that says stop?**
    Keep going: 3–5 paying clients and one channel producing paying users weekly. Stop the advisor
    segment: under 2% reply rate after list, deliverability and copy fixes, with no pilots and no
    urgent pain surfaced in thirty logged calls. Pivot: healthy replies but objections clustering on
    one variable — change that one thing and re-run four weeks.

91. **How are equity, roles and decisions divided, and what if one founder leaves?**
    70/30 with Tayo deciding on product, pricing and gates. *[default, A]* **There is no vesting
    schedule and no founder agreement**, which is a material gap for any future transaction and
    should be fixed before the first dollar is taken.

92. **Would you consider outside capital or a strategic co-founder?**
    Not for the base case — the exit thesis is built for a financial buyer precisely because that
    outcome stays in the founders' control. A host-agency partnership that brought advisor
    distribution would be worth equity.

### THE CLEAR PATH TO GROWTH

93. **Identify three to five projects that would increase revenue in years one to three.**

    1. **Advisor workspace v2 (client list, white-label proposal export, client links):** seats are
       41% of Year-3 revenue at about 90% margin and the largest sensitivity in the model. 2–3 weeks
       for v1, a further 3–4 weeks for v2 shaped by what the first ten advisors ask for.
    2. **Affiliate links on every stay and activity:** turns every trip planned — free or paid — into
       revenue at roughly 100% margin, worth $58,576 in Year 3 at pessimistic attach and about three
       times that if the 15% target attach is reached. One to two days for links, longer for direct
       rates.
    3. **Destination package pages (100 pages, 25 cities × 4 taste profiles):** the only channel with
       compounding economics, built from the catalog at content-generation cost only. About a week.
    4. **Creator programme with unique links and revenue share:** Mindtrip pays $1 per referred
       account, which proves the mechanic; ten creators at 10k–100k followers, 30-day test.
    5. **Licensing the package builder to hotels and destination marketing organisations:**
       GuideGeek has 30+ DMO clients; $500–2,000/month per client at ~90% margin. A months-long
       sales cycle and entirely unvalidated — not in the model.

94. **Which has the greatest potential, and why?**
    The advisor workspace. It is the largest revenue line by Year 3, carries the highest margin,
    has a $400 CAC ceiling that makes outbound economic, and is the asset a strategic buyer wants —
    advisor platforms and host agencies are exactly who bought in this category in 2026.

95. **Which is the least expensive, and why?**
    Affiliate links. One to two days of work against a Year-3 contribution of $58,576 at the
    pessimistic attach rate, with no ongoing cost and no new customer required — the trips are
    already being planned.

96. **Which is the most expensive, and why?**
    Licensing to hotels and destinations. It needs a white-label build, a sales motion neither
    founder has run, and a cycle measured in quarters. It is the only one of the five that could
    consume a year and return nothing, which is why it is excluded from the projection.

### SWOT ANALYSIS

97. **Strengths**
    - A working product with a solved cost problem: $1.40–2.00 per active user per month, down from
      about $10, which is what makes a $49/year plan possible.
    - A 90%-margin segment (advisor seats) with an 18:1 lifetime-value advantage over consumers.
    - Revenue available in month one from concierge, with no funnel and no marketing spend.
    - A documented operating system that assigns every recurring job to automation, an agent or an SOP.

98. **Weaknesses**
    - Zero customers, zero revenue, no billing integration, and no paid pilot — the second gate of
      the founders' own method is unstarted.
    - The funding gap: $60,061 needed against $25,000 available.
    - No sales experience in the target segment; neither founder has sold software to travel advisors
      or run outbound at 400 sends a week.
    - Founder concentration: one person does sales, delivery and product, and every relationship is
      personal.
    - Operational gaps that would fail diligence today: no database backups, unrotated keys exposed
      during the build, no error monitoring, no founder agreement or vesting, an app Privacy Policy
      that does not cover the app.

99. **Opportunities**
    - Advisor platforms and host agencies are acquiring in this category right now.
    - 15,000+ Fora advisors, 97% new to the profession, are an under-tooled and nameable audience.
    - Affiliate attach is unmeasured and could be three times the modelled value if the 15% target holds.
    - The taste-profile dataset compounds with use and is the one asset a competitor cannot copy quickly.

100. **Threats**
    - **Platform-native substitution:** Google answers travel questions in AI Mode and books hotels
      directly; if personalised itineraries become native to search, the consumer tier has no reason
      to exist.
    - **AI search summaries:** the destination-page channel is aimed at exactly the informational
      queries AI summaries absorb.
    - **Supplier pricing:** Google Places and OpenRouter set our gross margin and neither founder
      controls either; a 30% COGS overrun costs $28,797 of Year-3 SDE.
    - **Copycat density:** every 2026 roundup of AI trip planners is written by another AI trip
      planner, so the generic pitch is worthless and differentiation must hold.
    - **Incumbent down-market moves:** Expedia now owns Layla and can bundle planning into supply at
      a price we cannot match.
    - **Key-person risk:** a buyer would discount heavily for a business where one founder holds
      every customer relationship.
    - **Macro:** leisure travel spending is discretionary and a $49/year subscription is an easy cut.

101. **What would keep you up at night?**
    That we spend a year proving people like the product and never prove they will pay for it.
    Beta sign-ups are the fourth rung on the evidence ladder and we have none of the top three.

102. **What is the one advantage hardest for a competitor to replicate?**
    The place catalog combined with the reaction history — every keep, swap, lock and thumb makes
    the next package better, and that data only exists if people have used the product for a while.
    A funded competitor can copy the interface in a quarter and cannot copy two years of reactions.

---

## 8. Validation Scorecard

Every Assumed number, ranked by how much the projection depends on it. Sensitivity ranking is from
`2-financial-model.md` §7. Kill thresholds are written here *before* the tests are run.

| # | Assumption | Current value | Used in | Cheapest test to verify | Cost | Timebox | Kill threshold |
|---|---|---|---|---|---|---|---|
| 1 | Advisor seat adds per month | 2/mo at M3 → 33/mo at M36 | 41% of Y3 revenue; largest SDE driver ($92,583 swing) | Warm two sending domains, run 400 sends/week to Fora-directory advisors for 6 weeks, log every reply against CAOS | $300 | 8 weeks | Under 2% reply rate after list, deliverability and copy fixes, with zero paid seats → kill the advisor segment |
| 2 | Free → paid conversion | 4% Y1 → 6% Y3 | Plus and Trip Pass volume ($50,402 swing) | Ship Stripe billing and the three paywalls; measure 30-day conversion on the first 500 signups | $0 | 6 weeks | Under 2% at the "Turn into a trip" paywall → consumer tier becomes a funnel only, not a revenue line |
| 3 | COGS per paying user | $2.00/mo | Gross margin; a 30% overrun costs $28,797 of Y3 SDE | Add the cost-per-active-user tile to `/admin` from Google SKU counts and OpenRouter spend; read it weekly | $0 | 2 weeks | Above $3.00/mo for two consecutive weeks → tighten the free tier or reprice Plus |
| 4 | Free signup volume | 7,970 in Y1 | Every consumer line ($47,772 swing) | Answer 5 questions a day in the named communities for 4 weeks with the profile link; count signups by referrer | $0 | 4 weeks | Under 100 signups in 4 weeks → no organic consumer channel exists; concierge and advisors carry the plan |
| 5 | Concierge trips per month | 2 → 10 → 30 | 51% of Y1 revenue | Sell 3 pilots to the founders' network at a founding-client price, in week 1 | $0 | 2 weeks | Fewer than 2 sold in 3 weeks of asking → willingness to pay is not there at any price |
| 6 | Affiliate revenue per trip | $1.50 / $3.00 / $4.00 (pessimistic attach) | 14% of Y3 revenue ($34,126 swing) | Put Booking.com and activity-partner links on every card with the price shown; measure click-through and attach on the first 200 trips | $0 | 6 weeks | Attach below 3% on stays → drop affiliate from the model entirely |
| 7 | Trip Pass at $19 / 60 days | $19 | 9% of revenue; no competitor comparable exists | Price test $19 against $29 at the paywall, 50/50, first 400 signups | $0 | 6 weeks | Conversion indifferent to price → the price is not the objection; the offer is |
| 8 | Advisor seat churn | 5%/mo → 3%/mo | Seat lifetime value ($1,600) and the $400 CAC ceiling | Cannot be tested inside 8 weeks. Instrument it now: seat start date, second-client-link date, cancel date | $0 | Instrument in 1 week; read at M6 | Above 8%/mo at M6 → lifetime value falls under $700 and outbound stops paying |
| 9 | Founder cash available | $25,000 against $60,061 needed | Whether the plan is executable at all | A conversation between the founders about personal runway, and a written answer | $0 | 1 week | Combined available cash under $40,000 → the unpaid year is not survivable; cut to concierge-only and keep day jobs |
| 10 | SEO head-term volumes | Unmeasured | Channel 3 of the growth plan | One afternoon in a keyword tool across 10 head terms | $99 | 1 week | Under 1,000 monthly searches across the head set → drop destination pages |
| 11 | Name clearance for XPMatch | Unverified | The brand and the trademark filing | USPTO TESS search plus domain and social check | $0 | 1 week | A live mark in class 42 or 39 → rename before any spend on brand |
| 12 | Books separate from personal accounts | Not set up | Whether a buyer can ever verify the numbers | Open business banking and bookkeeping | $80 | 2 weeks | — (do it regardless; a buyer will not accept a spreadsheet) |
| 13 | Founder agreement and vesting | Does not exist | Any future transaction | Template plus a lawyer's review | $500 | 4 weeks | — (do it regardless; an unvested 30% holder blocks a sale) |
| 14 | Community sizes at the named watering holes | Unmeasured | The give-first channel in #4 | Count members and 30-day post volume across the 8 named communities | $0 | 1 week | Under 50k combined members → the channel cannot produce the Y1 ramp |
| 15 | Seasonality amplitude | Not modelled | Monthly revenue shape | Google Trends on 5 head terms | $0 | 1 week | — (informational; adjust the model) |

**Total validation cost: $979. Total elapsed time: 8 weeks**, run in parallel. Two of these are not
tests but overdue work — items 12 and 13 — and two more sit outside this table because they are
operational rather than commercial: turning on Postgres backups and rotating every API key exposed
during the build. Both should be done this week regardless of what any test returns.

The tests are ordered so the two that can kill the plan outright — advisor seat adds and concierge
willingness to pay — return first.

## 9. Next Steps

- [ ] Tayo — rotate every API key pasted in chat during the build; put new values in Railway; redeploy — by **Sep 24, 2026**
- [ ] Tayo — turn on Postgres volume backups in Railway — by **Sep 24, 2026**
- [ ] Both founders — replace the nine defaulted inputs in `2-financial-model.md` §0 with real answers, and answer Scorecard #9 in writing — by **Sep 28, 2026**
- [ ] Tayo — ship Stripe billing, the three paywall moments, and the concierge order form — by **Oct 3, 2026**
- [ ] Tayo — sell 3 concierge pilots to the founders' network at a founding-client price (Scorecard #5) — by **Oct 5, 2026**
- [ ] Tayo — buy two secondary sending domains, set SPF/DKIM/DMARC, begin warm-up (Scorecard #1) — by **Oct 5, 2026**
- [ ] Faven — run Scorecard items #10, #11, #14 and #15; each is an afternoon — by **Oct 5, 2026**
- [ ] Tayo — add the cost-per-active-user tile to `/admin` (Scorecard #3) — by **Oct 10, 2026**
- [ ] Faven — open business banking and bookkeeping (Scorecard #12) — by **Oct 12, 2026**
- [ ] Both — founder agreement with vesting, reviewed (Scorecard #13) — by **Oct 20, 2026**
- [ ] Tayo — write the app section of the Privacy Policy and align the age gate at 18 — by **Oct 20, 2026**
- [ ] Both — re-run this document in Update mode at 90 days or first $5,000 of revenue, whichever comes first — by **Dec 21, 2026**

For questions about this summary contact Tayo Aki, tradingtacos@gmail.com.
