# Revenue model: how competitors make money and what XPMatch copies

Written September 21, 2026. Second of three documents: `docs/COMPETITOR_LANDSCAPE.md` (who the
competitors are, what they earn, who bought them, what users like and dislike), this one (where the
money is and what we integrate), and `docs/OPERATING_SYSTEM.md` (the systems that run the business
without a person as the bottleneck). The parent plan is `docs/BUSINESS_PLAN.md`.

Every rate and price here was read from a live page or a dated report (Sources). Attach rates and
revenue per trip are targets to test, marked as such. Section 9 lists what the competitor research still
has to confirm.

---

## 1. Summary

Money in this category comes from five places: booking commissions, subscriptions, done-for-you
fees, seats sold to travel advisors, and licensing the planner to hotels and destinations. The
incumbents own the booking margin, the small planners live on subscriptions and affiliate cuts, the
advisor world lives on commissions and planning fees, and one publisher (GuideGeek) turned a free
consumer bot into a licensing business with tourism boards.

XPMatch already builds the thing all of them monetize: a matched stay, three things to do and three
places to eat, on a map, with an itinerary board. What it lacks is a way to take money at any point in
that flow. The plan: sell advisor seats and concierge trips by hand for cash and proof, put a Book
button on every stay and activity so each trip earns whether or not the traveler pays, keep the
subscription as the volume funnel, and license the package builder to hotels and destinations once the
white-label pieces exist for advisors.

---

## 2. How each competitor makes money

| Company | Model | Verified prices and rates (seen September 2026) | What we take from it |
| --- | --- | --- | --- |
| Mindtrip | Free planner; earns on bookings made in the app (hotels, activities, and in-chat flights through Sabre with PayPal checkout since May 6, 2026); Hotels B2B product (Nov 2025); creator program pays $1 per referred free account, up to $10k/month, with a booking revenue share promised | No consumer subscription published | Booking handoff inside the plan; creator payouts per activated account; a B2B line for hotels |
| Layla (Expedia Group since July 31, 2026) | Premium subscription plus bookings through Booking.com, Skyscanner and GetYourGuide; human expert consultations bundled in Premium | $9.99/month or $49.99/year | The price anchor for Plus; humans bundled with software as the premium tier |
| Wanderlog | Freemium organizer; Pro subscription; affiliate links on stays and a Chrome extension that surfaces Airbnb totals | Pro $39.99/year | Annual price anchor; affiliate on stays inside the plan |
| TripIt (SAP Concur) | Pro subscription on top of a free organizer; corporate distribution through Concur | Pro $49/year | Annual price anchor; the "free organizer, paid alerts" split |
| StayMatch | Pay per scan | $10 day pass (3 scans), $20 / $30 / $50 per month for 6 / 12 / 25 scans | Per-use pricing for a single-trip buyer (our Trip Pass) |
| GuideGeek (Matador Network) | Free consumer assistant in WhatsApp, Instagram and Messenger; white-label licensing to destination marketing organizations (30+ DMO partners mid-2026, 70 clients reported in February 2024; 1.5M users) | Licensing prices not public | The destination and hotel licensing line |
| Fora | Host agency: advisors pay a membership and keep 70% of supplier commission (80% above $300k in annual bookings); $3B lifetime bookings; $1B valuation (July 2026) | $299/year or $99/quarter membership | Commission on stays we book for concierge clients; the advisor segment's economics |
| Travefy, Tern, TravelJoy, Safari Portal | Seat subscriptions for travel advisors | Travefy $39–59/month; Tern $39/seat/month ($32 annual); Safari Portal from $199 | The advisor seat price anchor |
| Thatch, Rexby | Creators sell guides and itineraries; platform take rate | Take rates pending the competitor research | A paid-guides line only if community guides show demand |
| Journy, Elsewhere (Lonely Planet) | Done-for-you planning for a fee or a trip margin | Fees pending the research | The concierge tier |
| Booking.com, Expedia, Google, Tripadvisor, Kayak | Booking margin (about 15% on hotels for OTAs) with planning given away free; Google books hotels in AI Mode with the partner as merchant of record | Free planning | We never compete on booking; we send bookings to them and take the affiliate share |
| ChatGPT, Gemini | General assistants; travel apps from Expedia, Booking and Tripadvisor inside ChatGPT | ChatGPT Plus $20/month | The substitute we must beat on specificity, verified places and the board |

---

## 3. The five ways money is made here, ranked for XPMatch

| Rank | Stream | Evidence it works | Unit value | Margin | Effort to start | Exit relevance |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Advisor seats** | Travefy and Tern sell $39–59 seats; Fora has 15,000+ advisors, 97% new to the profession | $588/year per seat | ~90% | 2–3 weeks (workspace) | High: advisor platforms and host agencies are strategic buyers |
| 2 | **Booking commissions** | Mindtrip's whole model; Layla's; Google's agentic booking; Booking.com pays about 4% of the stay, Expedia up to 4.8%, Viator and GetYourGuide 8% on activities | $20–30 per booked stay, $10–20 per booked activity | ~100% | 1–2 days for links; longer for rates | Highest: planning-to-booking is what Expedia bought Layla for |
| 3 | **Done-for-you trips** | 78% of advisors charge planning fees; $100–1,500 per trip; flat tiers $97–497 | $149–399 per trip, plus 7% of booked stays through a Fora membership | ~74% | 3 days | Medium: proves willingness to pay and feeds case studies |
| 4 | **Consumer subscription** | Layla $49.99/yr, Wanderlog $39.99/yr, TripIt $49/yr; travel trial conversion 4.1% median; annual renewal ~40% | $19 per trip or $49/year | ~50–65% | 3–4 days (billing) | Medium: recurring revenue buyers understand, but thin without volume |
| 5 | **Licensing to hotels and destinations** | GuideGeek's 30+ DMO clients; Mindtrip Hotels B2B | $500–2,000/month per client (target, not verified) | ~90% | Months (sales cycle) | High if it lands; slow |

What we deliberately skip: restaurant bookings (no platform pays a commission), flights as a revenue
line (about €2 per booking at Booking.com; low margin everywhere), our own booking engine (merchant
risk and the incumbents' territory), advertising (needs scale we will not have in two years), selling
data (kills trust and the sale).

---

## 4. What we copy, from whom, and why

| From | We copy | We change |
| --- | --- | --- |
| Mindtrip | Booking handoff inside the plan; creator payouts per activated account; a hotels B2B product later | We do not book in-app; we hand off to the partner as merchant of record and take the affiliate share |
| Layla | Annual price at $49; a human tier bundled with software | Our human tier is the concierge trip, priced per trip, not bundled monthly |
| Wanderlog | Free organizer with a paid annual tier; affiliate stays inside the plan | We sell the picks, not the organizer: the package is the paid moment |
| StayMatch | Pay-per-use for the one-trip buyer | Trip Pass at $19 for 60 days instead of scans |
| Fora | Commission on stays booked for clients; the advisor community as a channel | We are software to advisors, not a host agency; we join Fora ourselves only to earn on concierge bookings |
| Travefy and Tern | Seat pricing and the client-facing proposal | We produce the picks and the match; they produce the document. Export keeps both |
| GuideGeek | White-label licensing to destinations | We license the package builder and the taste quiz, not a chatbot |

---

## 5. Our revenue stack

### 5.1 Per trip planned

Assumptions to test: a mid-range stay of 3 nights ≈ $700; two activities ≈ $120 each; commissions
at 4% (stays) and 8% (activities); attach rates are targets for month 6.

| Line | Free trip | Paying trip | Note |
| --- | --- | --- | --- |
| Purchase | $0 | $19 Trip Pass, or ≈ $4/month of Plus | |
| Stay commission at 15% attach | $4.20 | $4.20 | 0.15 × $700 × 4% |
| Activities at 20% attach | $3.84 | $3.84 | 0.20 × 2 × $120 × 8% |
| Concierge upsell at 3% | $7.47 | $7.47 | 0.03 × $249 |
| **Expected value** | **≈ $15** | **≈ $30–35** | Before payment fees |

At 5% attach on stays (the pessimistic case) the free trip is worth about $10; at 30% (price shown on
the card, one-tap handoff) about $22. Attach is the number to move.

### 5.2 Per segment, base case at month 24

| Segment | Units | Revenue | Where it comes from |
| --- | --- | --- | --- |
| Advisors | 300 seats | $176k | Seats; their clients' bookings pay the advisor, not us |
| Consumers, paying | 4,000 Plus + 6,000 Trip Passes | $385k | Subscriptions and passes |
| Consumers, all trips | ~25,000 trips a year | $40k | Affiliate at the targets above, net of unbooked trips |
| Concierge | 300 trips | $75k fees + ≈ $15k commissions | Fees; Fora split on stays booked |
| Licensing | 0–5 clients | $0–60k | Only if the advisor white-label pieces prove out |

The arithmetic behind the consumer and advisor lines is in `docs/BUSINESS_PLAN.md` section 11.

---

## 6. Partner programs to apply to now

| Program | Pays | Window | Notes |
| --- | --- | --- | --- |
| Booking.com Affiliate Partner | About 4% of completed stays (a share of Booking's commission that rises with volume), 6% cars, 4% attractions, €2 per flight | 30 days | Direct sign-up or through CJ; approval reviews the site |
| Expedia Group affiliate and Travel Creator program | Up to 4.8% on hotels in select markets | Per program | Through Impact; also covers Hotels.com and Vrbo |
| Viator Partner | 8% of completed bookings | 30 days | Pays on confirmation |
| GetYourGuide Partner | 8% base, tiered up for volume | 31 days | Creator onboarding path exists |
| Travelpayouts | 60+ brands under one account; hotels 4–5%; Hotellook shares 50% of its revenue per booking | Varies | One account for Booking.com, Airbnb, Kiwi.com, GetYourGuide, Viator; good for the first 90 days before direct approvals land |
| Fora membership | 70% of supplier commission (80% above $300k booked) | — | $299/year; lets concierge trips earn on the stays we book; E&O cover and supplier access included |
| Stripe | 2.9% + $0.30 per card payment; Stripe Tax 0.5% | — | Billing for every offer |

Compliance: affiliate links are disclosed on the card and in the terms; Google Places content on cards
keeps the 30-day refresh; bookings hand off to the partner, so no payment data touches us.

---

## 7. Integration plan, in order, and why

| # | Integration | Why now | Product touchpoints | Effort | Depends on |
| --- | --- | --- | --- | --- | --- |
| 1 | **Stripe billing** with Trip Pass, Plus (annual first), Advisor seats, Concierge payments; customer portal; webhooks into entitlements | No way to pay us today | Pricing page, paywall at "Turn into a trip", second package, imports, members | 3–4 days | — |
| 2 | **Affiliate Book buttons** on stay cards, the place sheet and package items; Reserve buttons on things to do; click events stored per user and trip | Earns on free users; the exit story | `HotelCard`, `PackageCard`, `PlaceDetailSheet`, board stop details | 1–2 days for links + 1 day for events | Travelpayouts account on day one, direct programs as approved |
| 3 | **Concierge order flow**: order form, Stripe payment link, admin fulfillment queue with SLA timer, delivery as a shared board | Cash and proof in week one | `/concierge` page, `/admin` queue | 3 days | 1 |
| 4 | **Fora membership** for the founder | 7% on stays booked for concierge clients | Manual booking, recorded on the trip's Bookings tile | Sign-up | 3 |
| 5 | **Advisor workspace**: client list, client link under the advisor's name, proposal export | The seat we sell outbound | New `/advisor` area, per-client trips, PDF export | 2–3 weeks | 1 |
| 6 | **Referral and creator links** with per-activation payout ledger | Mirrors Mindtrip's channel at $1–2 per activated account | Sign-up attribution, `/admin` payouts | 1–2 days | 1 |
| 7 | **Lifecycle email** (Resend): trial ending, pre-trip, post-trip, win-back | Day-zero churn is where travel apps lose trials | Event hooks in trips and billing | 2 days | 1 |
| 8 | **Live hotel rates on stay cards** through an affiliate rate API (Travelpayouts Hotellook first; Expedia or Booking rate access as approved) | Price on the card is what moves attach from single to double digits | Stay cards, package items | 1 week | 2 |
| 9 | **Booking reconciliation**: import affiliate reports, match to click events, show revenue per trip on `/admin` | Know the attach rate instead of guessing it | `/admin` revenue tile | 2 days | 2, 8 |
| 10 | **White-label package pages** for hotels and destinations | GuideGeek's model with a better product | Branded destination page, embed | 2 weeks | 5 |
| 11 | **Paid guides** with a take rate | Only if community guides show demand | Guides, Stripe Connect payouts | 1 week | 1, evidence |

---

## 8. Metrics that say whether it is working

| Metric | Month 3 | Month 6 | Month 12 |
| --- | --- | --- | --- |
| Book-button clicks per trip | 0.5 | 0.8 | 1.2 |
| Stay attach (bookings per trip) | 5% | 15% | 25% |
| Affiliate revenue per trip | $3 | $8 | $14 |
| Trip Pass conversion at the paywall | 3% | 5% | 7% |
| Advisor seats | 5 | 30 | 120 |
| Concierge trips per month | 5 | 15 | 25 |
| Revenue per active user per month | $2 | $5 | $9 |

---

## 9. Open items the competitor research must confirm

- Thatch and Rexby take rates and creator earnings, to size the paid-guides line.
- Mindtrip booking volume or GMV signals, and whether creators have been paid booking shares yet.
- Layla's Premium adoption and what Expedia has changed since the acquisition.
- Journy and Elsewhere fees and margins, to check the concierge price points.
- Roadtrippers and Tripsy subscription prices, to complete the annual price anchors.
- GuideGeek licensing prices, if any partner has disclosed a contract value.

---

## Sources

- Booking.com affiliate rates: https://www.booking.com/affiliate-program/v2/index.html and https://affiliateprogramfinder.com/affiliate-programs/booking-com-affiliate-program-2/
- Expedia affiliate up to 4.8% hotels: https://partner.expediagroup.com/en-us/solutions/explore-our-affiliate-program
- Viator 8%, 30-day window: https://getlasso.co/affiliate/viator-us/ and https://track360.io/blog/best-travel-affiliate-programs-2026-operator-rate-card-benchmark
- GetYourGuide 8% base, tiered: https://partner.getyourguide.support/hc/en-us/articles/13981068165917-Our-partner-program
- Travelpayouts and Hotellook: https://www.travelpayouts.com/blog/best-hotel-affiliate-program/ and https://www.travelpayouts.com/blog/make-money-hotellook-hotel-affiliate-program/
- Fora membership $299/year, 70/30 split: https://www.foratravel.com/join/pricing and https://www.foratravel.com/help/en/articles/14303041-how-commission-works-at-fora
- Fora $1B valuation, 15,000+ advisors: https://skift.com/2026/07/16/fora-travel-the-unicorn-it-raised-60-million-at-a-1-billion-valuation/
- Mindtrip model and in-chat flights: https://www.datastudios.org/post/mindtrip-ai-travel-planning-in-chat-booking-and-pricing and https://monkeytravel.app/blog/mindtrip-review-2026
- Mindtrip creator program: https://mindtrip.ai/creator-program
- Layla pricing and partners: https://layla.ai/faq and https://layla.ai/about
- Expedia acquires Layla: https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-acquires-Layla-accelerating-its-AI-powered-trip-planning-and-booking-strategy/default.aspx
- Wanderlog Pro and TripIt Pro prices: https://monkeyeatingmango.com/blog/wanderlog-pricing-2026/ and https://monkeyeatingmango.com/blog/tripit-pricing-2026/
- StayMatch pricing: https://staymatch.ai/pricing/
- GuideGeek DMO licensing and scale: https://guidegeek.com/press/colorado-tourism-office-partners-with-guidegeek-to-launch-new-ai-travel-genius-colorado-concierge and https://en.wikipedia.org/wiki/GuideGeek
- Advisor software prices: https://tern.travel/pricing and https://journeyfuse.com/compare/travel-agent-software-pricing
- Planning fees: https://www.aaa.com/tripcanvas/article/how-much-do-travel-agents-cost-are-they-worth-it-CM1717 and https://creoproposals.com/blog/how-to-charge-travel-planning-fees
- RevenueCat 2026 travel benchmarks: https://www.revenuecat.com/state-of-subscription-apps
- Google agentic hotel booking: https://skift.com/2026/08/27/googles-agentic-hotel-booking-tool-comes-to-ai-mode/
