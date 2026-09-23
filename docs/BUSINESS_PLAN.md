# XPMatch business plan: profitable in 12 months, sold in 24

Written September 21, 2026. Companion documents: `docs/COGS.md` (unit costs), `docs/PACKAGES_PLAN.md`
(the package product), `docs/COMPETITIVE_RESEARCH.md` (how competitors work), `docs/BETA_READINESS.md`
(what is live), and the three working documents under this plan: `docs/COMPETITOR_LANDSCAPE.md` (who
the competitors are, what they earn, who bought them, what users like and dislike),
`docs/REVENUE_MODEL.md` (where the money is and what we integrate) and `docs/OPERATING_SYSTEM.md`
(the systems that run the business without a person as the bottleneck). Method: the demand-first business operating system (niche validation → offer design →
LAPS selling → delivery and brand → productization), applied to the five areas asked for: **Sales,
Marketing, Onboarding, Fulfillment, Retention**. Every number below is either a verified external
figure (Sources at the end), a figure from our own cost docs, or a target labeled as such.

> **Missing input.** The PDF referenced in the request was not attached to the session, so nothing from
> it is in this version. Section 12 lists the places where its content should be merged.

---

## 1. Goal and exit thesis

**Goal.** Cash-flow positive by month 12, sellable by month 24 at a price that rewards two years of work.

**What a buyer pays for in 2026.** Three kinds of buyer exist for a business like this, and they value
different things:

| Buyer | Example | What they pay for | Typical price |
| --- | --- | --- | --- |
| Strategic (OTA, metasearch) | Expedia bought Layla on July 31, 2026: ~25 people, ~€5M raised, an AI planner with personalization | Team, personalization tech, a product they can wire to their supply | Undisclosed; team-and-tech deals |
| Advisor platforms and host agencies | Fora ($1B valuation, 15,000+ advisors, 97% new to the profession), Travefy, Tern | A client-facing planning tool their advisors already use | Strategic; depends on advisor adoption |
| Financial buyers on marketplaces | Acquire.com, MicroAcquire | Profit, retention, low founder dependency, clean books | Micro-SaaS under $1M ARR: 2.5–4× ARR or 4–6× seller's discretionary earnings; $1–5M ARR bootstrapped: 4–6× ARR |

The two-year plan is built for the third buyer first, because that outcome is in our control, while
keeping the first two in reach: advisor adoption and a personalization engine are exactly what
strategic buyers bought this year.

**Exit targets (month 24, base case).**

| Metric | Target | Why |
| --- | --- | --- |
| ARR | $600k (stretch $1.2M) | 3–4× ARR ≈ $1.8–2.4M base; buyers anchor on profit under $1M ARR |
| Gross margin | ≥ 80% blended | Catalog-era COGS ≈ $1.40–2 per active user (`docs/COGS.md`) |
| Net margin | ≥ 40% | Solo founder plus contractors; AI does research, drafting, code |
| Annual-plan share of subscribers | ≥ 60% | Travel apps renew annual plans at ~40%, monthly first renewals ~53% (RevenueCat 2026) |
| Paying accounts | ≈ 4,000 consumer + 300 advisor seats | Section 9 shows the arithmetic |
| Founder hours in delivery | < 10 h/week | Concierge and support run on SOPs; transferable |

**Two-year shape.**

| Period | Engine | What it proves |
| --- | --- | --- |
| Months 1–3 | Paid pilots: concierge trips and advisor seats sold by hand | Purchase intent with money, not sign-ups |
| Months 3–6 | Repeatable channel + self-serve billing | One channel that produces paying users weekly |
| Months 6–12 | Brand and value ladder; profitable | Costs below revenue, retention known |
| Months 12–18 | Scale the winning segment; second segment | ARR growth with margin intact |
| Months 18–24 | Sale readiness, buyer conversations | Clean data room, documented ops, offers |

---

## 2. Where we are (diagnosis against the gates)

The method's first rule is "sell the service first, earn the SaaS third". We built the software
first. That is not fatal, but it means the gates are still ahead of us, not behind us.

| Gate | Test | Status |
| --- | --- | --- |
| Gate 0: niche validated | 20+ purchase-intent signals · 3–5 competitors with public pricing · ≥ 50% gross margin · nameable watering holes | **Passes on evidence (section 3)**; the purchase-intent cluster is off-platform (planning fees, gigs), which the method calls a research-slot signal, so the pilots in Phase 1 must confirm it |
| Gate 1: offer validated | 1–3 paid pilots, or 10+ calls with consistent pain language, or 150 engaged EOIs | **Not started.** Zero paying customers today |
| Gate 2: repeatable sales | 3–5 paying clients and one repeatable channel by week 12 | Not started |
| Gate 3: deliver and brand | SOPs, case studies, value ladder | Partly: the product and docs exist; no case studies |
| Gate 4: productize | Software promoted to core offer when clients ask for direct access | The software exists; it becomes the core offer once Gate 2 passes |

**Evidence hierarchy reminder.** Paid pilot > verbal commit with a price > booked call > waitlist
sign-up > social engagement. Beta sign-ups are the fourth rung. Nothing in this plan treats them as
validation.

---

## 3. Niche scorecard (Gate 0)

**Niche.** People who plan their own leisure trips, want picks that fit *them* rather than generic
top-10 lists, and are willing to pay to skip the research. Two paying buyers sit on top of that:
the traveler, and the independent travel advisor who does this for clients.

### Gate 0 checklist

1. **Purchase-intent cluster: ✅ (off-platform).** Money already changes hands for exactly this
   deliverable. 78% of travel advisors now charge a planning fee (Travel Institute via Creo Proposals);
   consultations run $100–250, domestic trips $100–500, international $250–1,500 (AAA); one custom
   itinerary service sells flat tiers at $97 / $197 / $297 / $497 (Alaska Road Trip); Fiverr trip-plan
   gigs cluster at $50–60 with 24+ sellers listed. 37% of U.S. travelers used AI to plan travel this
   spring (Allianz, 2,001 adults, March–April 2026); 43% of affluent travelers (Deloitte). Weak point:
   the job-post count on freelance platforms is thin and prices there are low, so treat this as the
   "lookalikes upstream" case: sell off-platform at productized prices.
2. **Competitors with public pricing: ✅.** Layla $9.99/month or $49.99/year; Wanderlog Pro
   $39.99/year; TripIt Pro $49/year; StayMatch $10 day pass, $20 / $30 / $50 per month; ChatGPT Plus
   $20/month is the substitute reviewers recommend; Mindtrip is free and earns on bookings (in-chat
   flights since May 6, 2026) and pays creators $1 per referred account. Advisor tools: Travefy
   $39–59/month, Tern $39/seat/month ($32 annual), Safari Portal from $199. Five-plus priced
   competitors: validated market, not saturated in our positioning (taste-matched packages).
3. **≥ 50% gross margin: ✅.** Catalog-era cost ≈ $1.40–2.00 per active user per month
   (`docs/COGS.md` section 5 and `docs/PACKAGES_PLAN.md`). Against a $49/year plan ($4.08/month) that
   is 51–66% before payment fees; against advisor seats at $49/month it is above 90%; concierge trips at
   $249 with 1.5 hours of human review cost about $65 to deliver, 74%. Passes, with the consumer tier
   the thinnest: section 9 sets the free-tier cost cap that protects it.
4. **Nameable watering holes: ✅.** Travelers: r/solotravel, r/JapanTravel, r/ItalyTravel,
   r/travel (no self-promotion; give-first only), Facebook groups for bachelorette and girls' trips,
   TikTok and Instagram travel creators who already post "3 days in Lisbon" itineraries, Substack
   travel newsletters. Advisors: Fora's advisor community and its public advisor directory
   (foratravel.com), the Travel Advisors Unite and Host Agency Reviews Facebook groups, LinkedIn
   profiles with "Fora Advisor" or "Independent Travel Advisor" in the headline, host-agency conferences.

### Attention signal (30 days)

Every 2026 roundup of AI trip planners is a listicle by another planner (Stippl, Stardrift, Layla,
Wanderlog): copycat density is high on the generic "AI itinerary" pitch. Reviewers' verdict is that
paying is worth it for people who travel two to three times a year and want live data; occasional
travelers are told to use ChatGPT. Differentiation therefore cannot be "AI plans your trip". It has to be
the taste profile, the match score and the one-card package that people can swap and lock, plus the
board, and for advisors the client-facing personalization they cannot get from Travefy or Tern.

### Verdict: ✅ PICKED, with a research slot

Primary niche picked. Keep one research slot open for **group-trip organizers** (bachelorette, friends'
trips): apps there are free (Troupe, WePlanify, Let's Jetty) and reviewers note a per-trip credit beats a
subscription for people planning months ahead, which our Trip Pass (section 4) already serves.

---

## 4. Positioning and offers

**Positioning statement.** XPMatch helps **people who plan their own trips and travel two or more times
a year** get **a stay, three things to do and three places to eat that fit their taste, on a map, in
under a minute**, for **$49 a year**, delivered as **a package they can swap, lock and turn into a
day-by-day board**, without **three evenings of tabs, generic top-10 lists, or a $250 planning fee**.

**Advisor positioning.** XPMatch Advisor gives **independent travel advisors** **a client-facing taste
quiz and matched packages under their own name in 48 hours**, for **$49 a seat per month**, delivered as
**a client link plus a board they can edit and export**, without **rebuilding the same proposal in a
document tool for every client**.

### The offer ladder

| Offer | Buyer | Price | What they get | Risk reversal | Delivery cost | Gross margin |
| --- | --- | --- | --- | --- | --- | --- |
| **Free** | Anyone | $0 | Taste quiz, one package per destination from the catalog, one trip board, saved places | — | ≤ $0.20/month (cap, section 9) | — |
| **Trip Pass** | Someone planning one trip | $19 for 60 days | Everything in Plus for one trip: unlimited packages, imports, reservation import, compare, routed legs, members | Refund if the trip board stays empty after 7 days | ≈ $3 | ≈ 84% |
| **Plus** | 2+ trips a year | $7.99/month or $49/year | Unlimited trips and packages, imports, reservation import, compare, routed legs, members, taste profile that learns | 14-day trial (annual), cancel anytime | ≈ $2/month | ≈ 55–65% |
| **Concierge trip** | Anyone who wants it done | $149 short trip · $249 international week · $399 group of 6+ | A human-reviewed plan built in the app, delivered in 48 hours as a shared board with a 20-minute call | Full refund if not delivered in 48 hours | ≈ $65 (1.5 h review + API) | ≈ 74% |
| **Advisor** | Independent travel advisors | $49/seat/month ($39 annual) | Client links, client list, white-label proposal export, everything in Plus for each client | First client proposal free; cancel anytime | ≈ $4/seat incl. clients | ≈ 90% |

**Why this ladder.** Trip Pass is the low-friction first purchase at the exact moment of intent
("Make itinerary"). Plus is where the recurring revenue and the retention question live. Concierge is
the "sell the service first" engine: it validates willingness to pay in week one, funds the early months,
produces case studies, and every concierge trip is built inside the app, so it also stress-tests the
product. Advisor is the multiplier: one seat brings 20–50 travelers a year onto the platform and is the
segment strategic buyers care about.

**Cold offer line (advisor).** "Send your client a link, they answer eight questions, and you get a
proposal with a stay, three things to do and three restaurants matched to them, on a map, under your
name, in under a minute. First proposal free."

**Cold offer line (concierge).** "Your trip planned around what you actually like, on a map you can edit,
in 48 hours or it's free."

### CAOS log (update after every call)

| Date | Concept | Audience | Offer | Sale blockers |
| --- | --- | --- | --- | --- |
| | | | | |

---

## 5. Ideal customer profile

**Grounding.** Planning-fee and gig pricing above; competitor customer bases (Layla, Wanderlog, TripIt
subscribers; Fora's 15,000+ advisors, 97% new to the profession); reviewer verdicts on who should pay.

### Segment A: the frequent self-planner (→ Plus, $49/year; Trip Pass $19)

| Dimension | Detail |
| --- | --- |
| Who | Adults 28–45, couples and small friend groups, U.S. first, 2–4 leisure trips a year, plan on a laptop and phone, food and neighborhoods over landmarks |
| Firmographics | Household income $90k+, already pay for at least one travel subscription or planning fee; iPhone; Google Maps lists and Instagram saves are their "system" |
| Pain (their words) | "I have 40 tabs open and still don't know where to eat." "Every list is the same ten places." "I saved a hundred reels and can't find any of them." "I don't want to pay $250 for a planner to tell me what I could Google." |
| Trigger events | Booked flights (confirmation in inbox), a group chat naming dates, a saved reel or blog link, a friend's shared trip, 60–90 days before departure |
| Watering holes | r/solotravel, destination subreddits, TikTok and Instagram "X days in Y" creators, Substack travel newsletters, Facebook trip-planning groups |
| Budget behavior | $40–50/year is the proven price point (Wanderlog, TripIt, Layla annual); one-off $19 is below a single dinner; $249 concierge is below the advisor fee they compare it to |
| Objections | "ChatGPT does this for free" → the match score, live Google data and the board are what ChatGPT cannot do; "AI hallucinates places" → every card is a verified Google place with a link; "I only travel once a year" → Trip Pass |
| Disqualify if | Business travel only; package-holiday buyers; anyone who wants booking done for them without a plan (send to an advisor) |

### Segment B: the independent travel advisor (→ Advisor, $49/seat/month)

| Dimension | Detail |
| --- | --- |
| Who | Solo or small-team advisors, 0–3 years in the profession, hosted by Fora or a similar host agency, 20–80 clients a year, U.S. |
| Firmographics | Earn commission (Fora starts at a 70/30 split) plus planning fees; pay $39–59/month for Travefy or Tern; sell through Instagram and referrals |
| Pain (their words) | "I rebuild the same proposal for every client." "Clients ghost after the first draft." "I charge a planning fee and need to look worth it." "New to this and I don't know every city." |
| Trigger events | Joining a host agency (Fora onboarding cohorts), first planning-fee client, posting for an assistant, a busy season (spring for summer trips, September for holidays) |
| Watering holes | Fora advisor directory and community, Travel Advisors Unite and Host Agency Reviews groups, LinkedIn "Independent Travel Advisor", host-agency webinars, Instagram bios with "Fora Advisor" |
| Budget behavior | Already reallocating $39–59/month to proposal software; a second tool has to replace a step, not add one |
| Objections | "My clients want me, not an app" → the link carries the advisor's name and the advisor edits the board; "I already use Travefy" → we produce the picks, Travefy produces the document; export keeps both; "Commission tracking?" → not ours, on purpose |
| Disqualify if | Corporate or group-tour operators; agencies wanting booking engines and commission reconciliation; anyone needing offline or print-first |

### Segment C: the group organizer (research slot → Trip Pass $19, Concierge $399)

| Dimension | Detail |
| --- | --- |
| Who | The one friend who plans the bachelorette, the ski week, the 40th birthday; 6–12 travelers; picks dates and the stay for everyone |
| Pain (their words) | "Nobody answers the poll." "I did all the work and got blamed for the restaurant." |
| Trigger | Group chat created, dates fixed, deposit collected |
| Watering holes | Bachelorette-planning Facebook groups, r/bachelorette, wedding forums, Pinterest |
| Budget behavior | Free apps dominate (Troupe, WePlanify, Let's Jetty); pays per trip, not per year |
| Objections | "Everyone has to sign up" → members join by link; "Free apps exist" → they organize, they do not pick |
| Disqualify if | Needs payments splitting or polls as the core; we do neither |

**Priority: A first** (cleanest pain, our product already fits, fastest to a Trip Pass), **B in
parallel from week 2** (one close brings many travelers; the strategic buyers' segment; the sales
motion is outbound and the method's LAPS engine fits it exactly), **C later** (free competitors, low
willingness to pay, but a cheap add-on to serve once members-by-link exist).

---

## 6. Sales

**Objective.** Turn purchase intent into money by hand first, then with the product. Month 3: 3–5 paying
pilots and one repeatable channel (Gate 2). Month 12: self-serve billing carries consumers; outbound
carries advisors.

**Owner.** The founder owns every sales call, pilot, guarantee and gate decision. AI drafts lists, emails,
proposals and call notes and never sends one-to-one outreach under its own name.

### 6.1 Motion by offer

| Offer | Motion | Where the sale happens |
| --- | --- | --- |
| Trip Pass, Plus | Product-led: paywall at "Make itinerary", second package, import, members | In the app (Stripe checkout) |
| Concierge | Founder-led: order form on the site, a 20-minute call, delivery in 48 hours | Landing page + calendar link + Stripe payment link |
| Advisor | Outbound LAPS engine + free first proposal | Cold email, LinkedIn and Instagram DMs, host-agency webinars |

### 6.2 The LAPS engine for advisors (weeks 1–12)

Cold email, every send: (1) one line proving we looked at *their* practice (their niche, a recent trip
they posted), (2) one credibility line with a number ("packages score against 8 taste factors; testers
rate 60%+ of picks a hit"), (3) the offer as result + timeframe + risk reversal, (4) one easy CTA
("Want me to build one for your next client? Reply with the destination."). 50–125 words, segments under
50 people, two or three follow-ups, two or three variants at all times, kill losers and scale winners
every Monday.

| Week | Leads (new) | Sends incl. follow-ups | Replies at 3–5% | Appointments | Presentations | Sales |
| --- | --- | --- | --- | --- | --- | --- |
| 1–2 | 0 (warm-up) | 0 | — | 3 from network | 3 | 1 concierge pilot |
| 3–6 | 150/week | 300/week | 9–15/week | 4–6/week | 3–4/week | 1/week |
| 7–12 | 200/week | 400/week | 12–20/week | 5–8/week | 4–6/week | 2/week |

Targets by week 12: 30 discovery calls logged against CAOS, 5+ paying advisor seats, 10+ concierge trips,
one channel with a known cost per sale. Reply under 2% after list, deliverability and copy fixes → kill
the advisor channel and re-run with segment C; replies healthy but one objection dominating → change that
one variable and re-run a four-week sprint.

### 6.3 Lead sources (from the ICP canvas)

1. **Hand-raisers.** Advisors posting for itinerary help or an assistant (Upwork, Facebook groups), travelers
   asking for a planner in destination subreddits (answer, never pitch; the profile link does the work).
   Never mention their post in outreach; target the pain the post reveals.
2. **Lookalikes.** Fora's public advisor directory filtered by leisure niches and recent join dates;
   Instagram bios containing "Fora Advisor" or "Travel Advisor"; LinkedIn "Independent Travel Advisor"
   with under three years in role. Enrichment: name → agency page → email; expect 30–40% resolvable.
3. **Trigger monitoring, weekly.** New Fora advisor cohorts (their community and social posts), "just
   became a travel advisor" posts, advisors posting their first planning-fee announcement, seasonal
   windows (January and September planning peaks).
4. **Not cold email.** DMs at most 100 a day across platforms; give-first answers in communities with
   research-as-proof posts ("we scored 1,200 Lisbon restaurants against eight taste factors; here is what
   food-first travelers actually pick"); one partner call a week (host agencies, travel creators,
   newsletter authors).

### 6.4 Sending infrastructure (start in week 1; warm-up takes 2–3 weeks)

Two secondary domains (never the app domain), two inboxes each, SPF/DKIM/DMARC on day one, automated
warm-up, a cold-email tool with reply triage, a LAPS board updated every Monday, a real human name and
address and a working unsubscribe on every send. Sending domains are never shared across niches.

### 6.5 What the product needs for sales

| Item | Effort | Why |
| --- | --- | --- |
| Stripe billing: plans, checkout, customer portal, webhooks, entitlements | 3–4 days | No self-serve revenue exists today |
| Paywall moments: "Make itinerary", second package in a destination, imports, members | 2 days | Sell at the moment of intent |
| Concierge order form, payment link and an admin fulfillment queue | 3 days | Sell the service in week one |
| Advisor workspace: client list, client link with the advisor's name, proposal export (PDF) | 2–3 weeks | The advisor offer |
| Pricing page and two landing pages (travelers, advisors) with one CTA each | 2 days | One CTA per page; defer decks and videos until someone asks |

### 6.6 Sales metrics (weekly, non-negotiable)

LAPS counts per variant; reply, positive-reply and meeting rates; concierge orders and delivery time;
Trip Pass and Plus conversions by paywall moment; cost per sale by channel; CAOS notes reviewed Friday.

---

## 7. Marketing

**Objective.** Build a channel that produces qualified sign-ups at a cost below one third of gross
profit per customer, then compound it with content made from real client work. Outbound is *the*
channel in months 1–3; brand work starts once Gate 2 passes.

**The value ladder.** Gift (free, from real client work) → product for prospects → core offer → product
for clients → return path.

| Rung | XPMatch asset | Built from |
| --- | --- | --- |
| Gift | The taste quiz with a shareable "your travel taste" card; free destination packages pages | The onboarding wizard and the package builder that exist |
| Product for prospects | Trip Pass at $19; the "8 questions, 7 picks" email course | The paywall; Resend |
| Core | Plus; Advisor seats | Billing |
| Product for clients | Concierge; later a members-only guides library | The admin queue; community guides |
| Return path | Post-trip ratings, "next trip" nudges, the Updates feed | The feedback loop that exists |

### 7.1 Channels, in order of proof

| Channel | Why it fits | Cost | First test | Scale rule |
| --- | --- | --- | --- | --- |
| **Creators (travel TikTok, Instagram, YouTube, Substack)** | They already publish "3 days in X"; our import turns their content into a package; Mindtrip pays $1 per referred account, proving the channel | Revenue share 30% of first-year revenue, or $1–2 per activated sign-up | 10 creators with 10k–100k followers, unique links, 30 days | Keep creators whose sign-ups activate at ≥ 40% |
| **Destination package pages (SEO)** | "Where to eat in Lisbon for food-first travelers" answered with our own blurbs, match reasons and Wikipedia photos; Google fields refreshed within the 30-day policy window | Content generation only | 25 cities × 4 taste profiles = 100 pages | Pages with ≥ 2% sign-up rate get siblings |
| **Communities (give-first)** | Destination subreddits and Facebook groups reward specific answers | Founder time, 30 min/day | Answer 5 questions a day for 4 weeks with the profile link | Track sign-ups by referrer |
| **Advisor partnerships** | Host agencies and advisor educators reach thousands of new advisors at once | Revenue share or free seats for their cohort | One webinar with a host-agency community | One partner conversation a week |
| **Shared trips (product loop)** | Every trip board invites members; members need an account | $0 | Members-by-link and a viral coefficient readout on `/admin` | Target ≥ 0.3 new sign-ups per paying user per quarter |
| **Paid social (Meta, TikTok)** | Only after organic conversion is known | Media | $500 test against the best landing page | Continue only at CAC ≤ 1/3 of gross profit per customer |

### 7.2 The 5 Ps, funded by client results (months 4–12)

- **Pitch:** the concierge case studies ("Lisbon for a food-first couple, planned in 48 hours").
- **Publish:** one piece a day documenting the work: a package, a swap, a taste insight, a cost lesson.
- **Product:** the free quiz and Trip Pass as the entry products.
- **Profile:** the founder's own account narrating the build in public; the demo video that exists.
- **Partnerships:** creators, host agencies, newsletter authors.

### 7.3 Marketing metrics

Sign-ups by source (UTM and referral codes), activation rate by source, CAC by channel, share of sign-ups
from members-by-link, organic traffic to package pages, creator link performance. All on `/admin` so
nobody has to open a second tool to see them.

### 7.4 What the product needs for marketing

| Item | Effort |
| --- | --- |
| Referral and creator codes with attribution stored on the account | 1–2 days |
| Public destination package pages rendered from the catalog with our own text, attribution and a Google map where places are shown | 1 week |
| Shareable taste card (image) after the quiz | 1 day |
| Trip share links for non-members with "join this trip" | 1–2 days |
| Lifecycle email through Resend: welcome, package tips, trial ending, pre-trip, post-trip | 2 days |

---

## 8. Onboarding

**Objective.** A new account reaches its first matched package within 60 seconds, its first trip board
within the first session, and its first purchase at the moment of intent. RevenueCat's 2026 data says most
trial cancellations happen on day zero: if value is not visible immediately, people do not come back to
find it. Everything here serves day zero.

### 8.1 The path

| Step | Today | Target | Change |
| --- | --- | --- | --- |
| Sign-up | Email + password | Same, plus Google sign-in | Reduces the first friction; 1 day |
| Quiz | Six steps on desktop, three questions in chat on phones | Three questions everywhere, the rest inferred over time | Fewer steps before the first package |
| First package | "For you in <destination>" home picks plus the package opener when a destination is in focus | The package is the first screen after the quiz, for the destination the person named | Already built; make it the landing state |
| Aha moment | Match score with "Why this score", swap and lock | Same, plus the "your taste" card | Measure time to first swap or lock |
| First trip | Proposal card → Save → board | "Make itinerary" from the package | Paywall for Trip Pass here after the first free trip |
| Second session | Jump back in, Updates | Pre-trip email and "next trip" nudge | Lifecycle email |

### 8.2 Activation metrics and targets

| Metric | Target month 3 | Target month 12 |
| --- | --- | --- |
| Quiz completion | 70% | 80% |
| Time to first package | < 60 s median | < 45 s |
| First-session trip created | 35% | 45% |
| Day-7 return | 30% | 40% |
| Free → paid within 30 days | 4% (travel median trial conversion is 4.1%) | 6% |
| Trial length | 14 days annual (trials over 4 days convert about 70% better) | Same |

### 8.3 Advisor onboarding

A guided first proposal: connect the advisor's name and photo, paste a client's brief, send the client
link, watch the package appear, export. First proposal free; the seat starts when the second client link
is created. Concierge orders follow the same path with the founder as the "advisor".

### 8.4 What the product needs

| Item | Effort |
| --- | --- |
| Package-first landing after the quiz | 1 day |
| Google sign-in | 1 day |
| Activation events (quiz done, package shown, swap, lock, trip created, member joined) and a funnel on `/admin` | 2 days |
| Lifecycle email (see 7.4) | shared |
| Advisor guided first proposal | part of the workspace |

---

## 9. Fulfillment

**Objective.** Deliver what was sold at a cost that keeps gross margin above 80% blended, with quality
that is measured, and with founder time under ten hours a week.

### 9.1 Product delivery (the software)

**Costs.** From `docs/COGS.md` and `docs/PACKAGES_PLAN.md`: before the catalog an active user cost about
$10 a month at list price; with the catalog and packages about $1.40–2.00; hosting $20–25 a month; the
model about $0.15 per active user. The daily lookup budget (400 per account) and the catalog-first
resolution are already live.

| Tier | Cost cap per month | Enforced by |
| --- | --- | --- |
| Free | $0.20 | Packages and cards served from the catalog only; 40 lookups a day; Explore limited to cached grids; one photo per card |
| Trip Pass, Plus | $3.00 | 400 lookups a day; photos through the cached proxy; Explore cached 24 h |
| Advisor (per seat incl. clients) | $6.00 | Client packages from the catalog; seeding of the advisor's top cities |
| Concierge | $5.00 API + human time | Built inside the app |

**Guardrails already in the docs.** Google Cloud quotas and budget alerts, OpenRouter spending limit,
quotas that bound the worst day at about $45. Add: a cost-per-active-user tile on `/admin`, computed
from SKU counts, reviewed weekly.

**Quality.** The recommendation hit rate on `/admin` (thumbs up over judged) is the product's quality
number: keep it at or above 60%; one miss reason dominating means retune `src/lib/match.ts` or the
seed queries. Package keep rate and trip rate (already tracked) are the second and third.

**Reliability.** Deploys from `main` on Railway with the health check; Vitest and Playwright suites
run before every push; incident rule: a red deploy or a broken sign-in is fixed before anything else.

### 9.2 Concierge delivery (the service)

Standard operating procedure, 90 minutes per trip:

1. Intake form: destination, dates, travelers, budget, the taste quiz (the client fills it).
2. Build: packages per destination, swap to the client's answers, schedule the board, add routed legs,
   attach any confirmations the client sent.
3. Review: the founder checks every place against its live listing (hours, closures, price), writes one
   line per day, records the check.
4. Deliver: share link plus a 20-minute call; the client owns the board and can keep editing.
5. After the trip: the post-trip rating request; the case study (with permission).

Founder time: 1.5 hours per trip, 10 trips a month is 15 hours. Above 20 a month, hire a part-time
reviewer at $25–35 an hour; the SOP is the training manual.

### 9.3 Advisor delivery

Self-serve. Support by email within one business day. A shared "advisor playbook" page (how to brief,
how to swap, how to export). Their clients' trips count against the advisor's cost cap.

### 9.4 Support and operations

Bug reports arrive on `/admin` with screenshots (built). Add: a support inbox routed to the founder with
AI-drafted replies reviewed before sending; a weekly ops checklist (deploy green, costs, hit rate, open
reports, refunds); refund policy on the pricing page.

### 9.5 Fulfillment metrics

Cost per active user by tier, gross margin by offer, hit rate, package keep rate, concierge delivery
time (target 100% within 48 hours), support first-response time, uptime.

---

## 10. Retention

**Objective.** Keep paying customers through the gap between trips. Travel is episodic: RevenueCat's
2026 benchmarks show travel apps renew annual plans at about 40% and monthly subscribers make a first
renewal about 53% of the time. The plan is to beat 40% annual renewal by being useful *between* trips and
by anchoring the account to the taste profile that improves with use.

### 10.1 Levers, in order of impact

1. **Sell annual first.** Annual plan as the default with the 14-day trial; monthly as the visible
   alternative. Target 60% of subscribers on annual by month 12.
2. **The taste profile as the moat.** Every reaction, rating and swap makes the next package better and
   is stored on the account; show the profile improving ("12 places rated, match accuracy up") on the
   home page.
3. **Between-trip cadence.** Post-trip ratings (built) → "your next trip" suggestion from the profile and
   the inspiration score (to build: score Inspiration and "Get inspired" with the match model) → saved
   inspiration imports that wait for dates → seasonal nudges by email.
4. **Members.** Trips with two or more members retain better in every collaboration product; make
   inviting a member a step of "Make itinerary"; members-by-link without an account first.
5. **Advisor stickiness.** Client history, exports and the advisor's public link accumulate on the seat;
   the second client is the retention moment, so the first-proposal onboarding must lead to it.
6. **Churn saves.** Cancel flow offers a pause (up to 6 months, keeps the profile) before cancel; a
   win-back email 30 days before the next likely trip window.
7. **Support that answers.** One business day, from a person.

### 10.2 Retention metrics and targets

| Metric | Month 6 | Month 12 | Month 24 |
| --- | --- | --- | --- |
| Annual renewal | measure | 45% | 50% |
| Monthly first renewal | measure | 55% | 60% |
| Paying users active in a 90-day window | 60% | 65% | 70% |
| Trips per paying account per year | 1.5 | 2 | 2.5 |
| Advisor seat monthly churn | measure | ≤ 5% | ≤ 3% |
| Net revenue retention (advisor) | measure | ≥ 95% | ≥ 100% |

### 10.3 What the product needs

| Item | Effort |
| --- | --- |
| Scored Inspiration and "Get inspired" tiles with "next trip for you" | 2–3 days |
| Pause-instead-of-cancel in the billing portal | 1 day |
| Members by link; invite as a step of "Make itinerary" | 1–2 days |
| Lifecycle email: pre-trip, post-trip, seasonal, win-back | shared with 7.4 |
| Profile progress on the home page | 1 day |

---

## 11. Unit economics and the P&L path

### 11.1 Per offer

| Offer | Price | Annual revenue per customer | Cost per year | Gross profit | Notes |
| --- | --- | --- | --- | --- | --- |
| Plus annual | $49 | $49 | $24 (COGS) + $1.70 (fees) | $23 (47%) | Thin; pushes the free cap and the annual mix |
| Plus monthly | $7.99 | $96 if retained; ≈ $45 at 53% first renewal and decay | $24 + $3.40 | ≈ $18–68 | Sold second |
| Trip Pass | $19 | $19 per trip; 1.6 trips a year ≈ $30 | $3 per trip | $25 (84%) | The entry product |
| Concierge | $149–399 | $249 average | $65 | $184 (74%) | Founder time is the constraint |
| Advisor | $49/month | $588 | $48 + $18 | $522 (89%) | The margin engine |

Customer lifetime value at target retention: Plus ≈ 1.8 years ≈ $88 revenue, $41 gross profit, so CAC
must stay under $14–20 for consumers; Advisor at 3% monthly churn ≈ 2.8 years ≈ $1,600 revenue, so
CAC up to $400 is acceptable, which is why outbound works for that segment and not for consumers.

### 11.2 Base case by month 24

| Line | Count | ARR | Gross profit |
| --- | --- | --- | --- |
| Advisor seats | 300 | $176k | $157k |
| Plus (2,400 annual at $49, 1,600 monthly at $7.99) | 4,000 | $271k | $165k |
| Trip Pass | 6,000 a year | $114k | $91k |
| Concierge | 25 a month | $75k | $55k |
| Affiliate (Booking.com 4% of stays, Expedia up to 4.8%, activity partners) | — | $40k | $40k |
| **Total** | | **$676k** | **$508k (75%)** |

Operating costs at that scale: hosting and model ≈ $1.5k/month, tools (Stripe, email, analytics, cold
email stack) ≈ $500/month, part-time reviewer and support ≈ $3k/month, founder salary ≈ $8k/month,
marketing ≈ $4k/month: ≈ $200k a year. Net ≈ $308k (46%). At 3–4× ARR or 4–6× seller's discretionary
earnings the base case supports a $2.0–2.7M sale; the stretch case (double the consumer numbers) about
$4M.

### 11.3 Break-even

Fixed costs before founder salary ≈ $2.5k/month. Break-even at ≈ 60 advisor seats, or 1,300 Plus
annuals, or 14 concierge trips a month, or any mix. Target month 6 for break-even before salary and month
12 with salary.

### 11.4 Cost guardrails that protect the margin

Free tier at $0.20; the daily lookup budget; catalog-first for every card; package pages built from our
own text; a monthly review of Google SKU counts against the free tiers; OpenRouter model choice reviewed
quarterly (helper calls on the cheapest capable model).

---

## 12. Roadmap: 24 months with gates

### Weeks 1–12 (Phase 1 and 2: validate with money, build the engine)

| Week | Human (founder) | AI (research, drafting, code) | Gate check |
| --- | --- | --- | --- |
| 1 | Buy sending domains, start warm-up; book 3 concierge pilots from the network at founding-client prices; rotate the keys named in `docs/BETA_READINESS.md` | Stripe billing, Trip Pass and Plus paywalls, concierge order form and admin queue, pricing page | |
| 2 | Deliver pilot 1; first 3 discovery calls with advisors | Advisor lead list (150), three email variants, landing pages, activation events | |
| 3–4 | Deliver pilots 2–3; start sends (segments < 50); 5 calls a week | Advisor workspace v1 (client link, client list, export); lifecycle email | Gate 1: 1–3 paid pilots |
| 5–8 | Two sends a week, LAPS board Mondays, CAOS log after every call; first 5 advisor seats | Referral codes, share links, package-first onboarding, creator kit | |
| 9–12 | 10 creators live; first webinar with an advisor community; second variant sprint | Destination package pages (25 cities); cost tile and funnel on `/admin` | **Gate 2, week 12: dated Go / Pivot / Kill report** |

**Gate 2 decision rules.** GO: 3–5 paying clients and one repeatable channel. PIVOT: healthy replies but
objections cluster on one element (price, scope, buyer, timing); change that one thing, re-run four weeks.
KILL the segment: under 2% replies after fixes, no pilots, no urgent pain; the system is reusable, the
segment was wrong.

### Months 4–6 (Phase 3: deliver, systematize, brand)

Concierge SOP and first hire threshold; case studies; the 5 Ps launched; scored Inspiration and
between-trip nudges; members by link; annual-first pricing live; first cohort retention numbers.
**Check:** break-even before salary.

### Months 7–12 (Phase 4: productize what clients asked for)

Advisor workspace v2 from advisor requests (the method's rule: promote software when clients ask for
direct access); affiliate links on stays and activities; paid social test if organic CAC is known;
second segment (group organizers) if A and B are on track. **Check:** profitable with salary; ARR ≥ $250k;
annual mix ≥ 60%.

### Months 13–18 (scale)

Double down on the channel with the lowest CAC; advisor partnerships with host agencies; programmatic
pages to 100 cities; part-time support hired; founder out of day-to-day delivery. **Check:** ARR ≥ $450k;
net margin ≥ 35%; renewal ≥ 45%.

### Months 19–24 (sale readiness and sale)

Data room (metrics by month, cohort retention, CAC by channel, P&L, contracts, IP assignment, key
rotation and access inventory, privacy and terms, the docs in this repo); broker or marketplace listing
at month 20; strategic conversations in parallel (Expedia-style planners, advisor platforms, host
agencies); keep growth running through the process because buyers price the trailing twelve months.
**Check:** ARR ≥ $600k; offers on the table by month 22.

### Where the PDF plugs in

Sections 3 (evidence), 4 (offers and prices), 7 (channels) and 11 (financial assumptions) should be
reconciled with it first; any framework it prescribes for the five areas replaces the headings here
without changing the gates.

---

## 13. Operating rhythm

- **Monday:** LAPS scoreboard, kill or scale variants, cost and hit-rate tiles, open bug reports.
- **Daily:** outreach or partner follow-ups (human), one piece of content documenting the work (AI drafts,
  human posts), concierge deliveries.
- **Friday:** CAOS review, offer one-pager adjusted, next week's list built.
- **Monthly:** P&L, cohort retention, Google SKU counts against free tiers, model and tool review.
- **Quarterly:** gate review with a dated decision document in `docs/decisions/`.

**AI-founder split.** AI handles research, drafting, content, code, triage and dashboards. A human owns
sales calls, delivery accountability, guarantees, money and every gate decision. No AI persona sends
one-to-one outreach.

---

## 14. Risks and what we do about them

| Risk | Signal | Response |
| --- | --- | --- |
| Consumers will not pay for another travel app | Trip Pass conversion under 2% at the paywall by week 8 | Lead with concierge and advisors; consumer tier stays as the funnel |
| Google Places costs outrun revenue | Cost per active user above cap two weeks running | Tighten free tier, catalog-only cards, trim masks (`docs/COGS.md` section 7) |
| Policy: Places content stored beyond 30 days | Audit | Catalog freshens by design; package pages render live fields; place IDs only are durable |
| Copycat density on "AI itinerary" | Reply rates fall, CAC rises | Differentiate on taste profile, packages, advisor white-label; never on "AI plans your trip" |
| Founder dependency blocks a sale | Founder hours in delivery above 10 a week | SOPs, part-time reviewer, support inbox with drafted replies |
| Strategic buyers move on (Expedia has Layla) | Fewer inbound conversations | Financial-buyer path is the base case; advisor platforms are the second strategic path |
| Key or data incident before a sale | Any | Rotate keys now; access inventory; privacy policy; deletion SLA (Layla's 24-hour norm) |

---

## 15. Decision log

| Date | Decision | Basis |
| --- | --- | --- |
| 2026-09-21 | Sell concierge and advisor seats by hand before scaling consumer marketing | Demand-first method: paid pilots outrank sign-ups |
| 2026-09-21 | Consumer prices anchored at $49/year and $19 per trip | Layla $49.99/yr, TripIt $49/yr, Wanderlog $39.99/yr; per-trip credit preferred by planners |
| 2026-09-21 | Advisor seat at $49/month | Travefy $39–59, Tern $39; must replace a step, not add one |
| 2026-09-21 | Base case exit built for a financial buyer; strategic kept in reach | Marketplace multiples 2.5–6× ARR; Expedia–Layla shows strategic appetite |

---

## Sources

- Expedia acquires Layla (July 31, 2026): https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-acquires-Layla-accelerating-its-AI-powered-trip-planning-and-booking-strategy/default.aspx and https://skift.com/2026/07/31/expedia-acquired-ai-trip-planner-layla-exclusive/
- Fora Series D, $1B valuation, 15,000+ advisors (July 2026): https://skift.com/2026/07/16/fora-travel-the-unicorn-it-raised-60-million-at-a-1-billion-valuation/ and https://www.foratravel.com/newsroom/fora-announces-series-d-funding
- Fora commission split 70/30 → 80/20: https://www.foratravel.com/help/en/articles/14303041-how-commission-works-at-fora
- SaaS and micro-SaaS multiples (2026): https://blog.acquire.com/acquire-com-biannual-acquisition-multiples-report-jan-2026/ and https://bigideasdb.com/saas-valuation-multiples-2026
- Mindtrip pricing and model (free planning, in-chat booking since May 6, 2026): https://monkeytravel.app/blog/mindtrip-review-2026 and https://www.datastudios.org/post/mindtrip-ai-travel-planning-in-chat-booking-and-pricing
- Mindtrip creator program ($1 per account, up to $10k/month): https://mindtrip.ai/creator-program and https://www.toolify.ai/ai-news/mindtrip-monetize-your-travel-itineraries-for-up-to-10k-monthly-3513038
- Wanderlog Pro $39.99/year and TripIt Pro $49/year (verified August 2026): https://monkeyeatingmango.com/blog/wanderlog-pricing-2026/ and https://monkeyeatingmango.com/blog/tripit-pricing-2026/
- Layla Premium $9.99/month or $49.99/year: https://layla.ai/faq
- StayMatch pricing: https://staymatch.ai/pricing/
- Reviewer verdicts on paying for AI planners: https://www.stippl.io/blog/best-ai-travel-planner-2026 and https://stardrift.ai/resources/best-ai-travel-planners-2026
- Advisor software pricing: https://tern.travel/pricing, https://journeyfuse.com/compare/travel-agent-software-pricing, https://www.capterra.com/p/148927/Travefy-Agent/
- Planning fees ($100–250 consult; $100–500 domestic; $250–1,500 international; 78% of advisors charge): https://www.aaa.com/tripcanvas/article/how-much-do-travel-agents-cost-are-they-worth-it-CM1717 and https://creoproposals.com/blog/how-to-charge-travel-planning-fees
- Custom itinerary flat tiers $97–497: https://alaskaroadtrip.com/alaska-itinerary-cost
- Fiverr trip-plan gigs ($50–60): https://www.fiverr.com/gigs/itinerary-planning and https://www.fiverr.com/categories/lifestyle/traveling/trip-plans
- AI use in travel planning (Allianz 37%, Deloitte 43% affluent): https://www.hoteldive.com/news/artificial-intelligence-mainstream-travel-planning-tool/826002/ and https://www.deloitte.com/us/en/insights/industry/transportation/2026-summer-travel-trends-survey.html
- RevenueCat State of Subscription Apps 2026 (travel trial conversion 4.1%, annual renewal ~40%, monthly first renewal ~53%, day-zero cancellations, trial length): https://www.revenuecat.com/state-of-subscription-apps and https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category
- Booking.com affiliate (4% stays, 6% cars, 4% attractions, €2 per flight): https://www.booking.com/affiliate-program/v2/index.html and https://affiliateprogramfinder.com/affiliate-programs/booking-com-affiliate-program-2/
- Expedia affiliate up to 4.8% on hotels: https://partner.expediagroup.com/en-us/solutions/explore-our-affiliate-program
- Group-trip apps and per-trip pricing preference: https://tripprof.com/en/blog/best-group-travel-planning-apps/ and https://www.weplanify.com/en/alternatives/best-group-trip-planner-apps
- Internal: `docs/COGS.md`, `docs/PACKAGES_PLAN.md`, `docs/COMPETITIVE_RESEARCH.md`, `docs/BETA_READINESS.md`, `docs/USER_FLOWS.md`
