# XPMatch cost of goods sold (COGS)

**Status:** the place catalog and the package opener described in sections 6 and 7 are built
(`docs/PACKAGES_PLAN.md`), so the "Catalog + packages" columns in `docs/PACKAGES_PLAN.md` are the
running model; the "today" figures below describe the app before that change and remain the
reference for what each Google call costs.

Unit costs as the app stood on September 20, 2026 before the catalog, priced against Google's current core-services
list (per 1,000 calls, with the monthly free calls per SKU: Essentials 10,000, Pro 5,000,
Enterprise 1,000). Usage assumptions are stated so the model can be re-run with real numbers from the
Google Cloud billing console once testers are on.

## 1. Price list used

| SKU | $ per 1,000 | Free per month |
| --- | --- | --- |
| Dynamic Maps (Maps JavaScript API map load) | 7.00 | 10,000 |
| Static Maps | 2.00 | 10,000 |
| Embed | free | unlimited |
| Routes: Compute Routes Essentials | 5.00 | 10,000 |
| Text Search Essentials (IDs only) | free | unlimited |
| Place Details Essentials | 5.00 | 10,000 |
| Text Search Pro / Nearby Search Pro | 32.00 | 5,000 |
| Place Details Pro | 17.00 | 5,000 |
| Text Search Enterprise / Nearby Search Enterprise | 35.00 | 1,000 |
| Text Search / Nearby Enterprise + Atmosphere | 40.00 | 1,000 |
| Place Details Enterprise | 20.00 | 1,000 |
| Place Details Enterprise + Atmosphere | 25.00 | 1,000 |
| Place Photos | 7.00 | 10,000 |
| Autocomplete | 2.83 | 10,000 |
| Places UI Kit (query / Pro) | 1.00 / 5.00 | — |
| OpenRouter `openai/gpt-4o-mini` | $0.15 per 1M input tokens, $0.60 per 1M output | — |
| Railway | Pro plan $20/month plus usage (about $1–2/month at beta scale) | — |

Which SKU a call lands on is decided by the field mask: asking for one Enterprise field bills the whole
call at Enterprise. Google's SKU page puts `rating`, `userRatingCount`, `priceLevel`, `websiteUri` and
opening hours in Enterprise; `editorialSummary`, `reviews`, `reviewSummary`, `generativeSummary` and the
"serves / good for" booleans in Enterprise + Atmosphere; `displayName`, `formattedAddress`,
`location`, `viewport`, `photos`, `primaryTypeDisplayName`, `googleMapsUri` in Pro; and for Place
Details the IDs-only tier covers `id`, `name`, `photos` and `attributions`.

## 2. What the app calls today, and the SKU each call bills at

| App feature | Call (`src/server/places.ts`) | Field mask | SKU today | Cache today |
| --- | --- | --- | --- | --- |
| Every recommendation card, destination focus, trip/guide lookups, import candidates | `places:searchText`, `maxResultCount: 1` | rating, price, website **+ editorialSummary** | **Text Search Enterprise + Atmosphere, $40** | In-process map, per process, 500 entries |
| Explore category tabs | `places:searchNearby` | rating, price, website | **Nearby Search Enterprise, $35** | 10 minutes, in-process |
| Explore typed search or filters, home picks (6 queries per destination) | `places:searchText`, 8–20 results | rating, price, website | **Text Search Enterprise, $35** | 10 minutes (Explore), 6 hours (home picks), in-process |
| Place sheet, Ask about a place, board stop details | `places/{id}` | reviews, summaries, atmosphere | **Place Details Enterprise + Atmosphere, $25** | **30 days in Postgres** (`place_facts`), shared by everyone |
| Every card image, sheet gallery, Explore card | photo media (`skipHttpRedirect`) | — | Place Photos, $7 | Photo URL 2 hours in-process; the image 24 hours in the browser |
| Any page that creates a map | Maps JavaScript API | — | Dynamic Maps, $7 | One load per map created |
| Board travel legs | Compute Routes | — | Routes Essentials, $5 | 24 hours in-process |
| Weather chip, destination blurbs, fallback photos | Open-Meteo, Wikipedia | — | free | 15 minutes / per page |
| Chat, helpers, imports | OpenRouter | — | about $0.005 per message | prompt caching on OpenAI models |

Two things stand out. Cards are bought at the most expensive tier because of one field
(`editorialSummary`) the card never shows on its own line, and every cache except place facts lives
in the server process: a deploy or restart throws it away and the same "Trattoria X, Rome" is bought
again, for every user.

## 3. Cost per action

List prices, before free tiers. "Catalog" is the design in section 6.

| Action | Today | With the place catalog |
| --- | --- | --- |
| Chat message with no cards | $0.005 | $0.005 |
| Chat message with 6 cards (6 searches, 6 photos) | **$0.29** ($0.33 for the first message in a new destination) | $0.05 new places, **$0.01** when the places are already in the catalog |
| "Full plan" turn (about 18 places) | **$0.85** | $0.15 new, $0.03 known |
| Opening a place sheet (Details + up to 5 photos) | $0.06 first time, $0.035 within 30 days | same |
| Explore "For you" (2 searches + 12 photos), uncached | $0.15 | $0.02 (grid cache shared across testers, photos lazy) |
| Explore category tab or typed search | $0.12 | $0.02 |
| Home picks for a destination (6 searches + 9 photos), every 6 hours | $0.27 | $0.03 |
| Map created (page load with a map, map sheet on a phone) | $0.007 | $0.007 |
| Board reorder or travel-mode change | $0.005 per day changed | same |
| Import a link or screenshot (about 7 candidates) | $0.28–0.30 | $0.05 |
| Create a trip or guide (destination lookup) | $0.04 | $0.005 |
| Ask about a place, match score, thumbs, board edits | $0 (cached facts, no external calls) | $0 |

## 4. What the free tiers buy, per month, across all testers

| SKU | Free calls | In app terms |
| --- | --- | --- |
| Text Search Enterprise + Atmosphere | 1,000 | about 1,000 fresh cards: 165 six-card messages, or 55 full plans |
| Text Search Enterprise | 1,000 | 165 home-pick refreshes, or 1,000 Explore searches |
| Nearby Search Enterprise | 1,000 | 500 fresh "For you" views or 1,000 category-tab views |
| Place Details Enterprise + Atmosphere | 1,000 | 1,000 distinct place sheets (repeat opens within 30 days are free) |
| Place Photos | 10,000 | about 10,000 images: a card is 1, a sheet up to 5, an Explore view 12 |
| Dynamic Maps | 10,000 | 10,000 maps created (about 150 people at 60 a month) |
| Compute Routes | 10,000 | 10,000 day changes on boards |

The Enterprise tiers are the binding ones: 1,000 cards is roughly a week of 25 active testers.

## 5. Monthly picture

Assumed active tester: 30 chat messages, half with six cards (90 cards), 20 place sheets, 20 Explore
views, 3 destinations of home picks, 60 maps, 20 board changes, 1 import, about 460 photos.

| | Per active user, list price | 25 active testers, after free tiers | 100 active users, after free tiers |
| --- | --- | --- | --- |
| Cards and lookups (Text Search E+A) | $4.00 | $60 | $360 |
| Photos | $3.20 | $10 | $250 |
| Explore (Nearby / Text Enterprise) | $1.05 | $0 | $70 |
| Home picks | $0.30–0.60 | $0 | $7 |
| Place sheets | $0.50 | $0 | $10–25 |
| Maps, routes | $0.50 | $0 | $0 |
| Model (OpenRouter) | $0.15 | $4 | $15 |
| Hosting (Railway) | — | $21 | $25 |
| **Total** | **≈ $10 per active user** | **≈ $95/month** (≈ $3.80 per tester) | **≈ $750/month** (≈ $7.50 per user) |

Real beta testers are lighter than the assumed user (most do one or two sessions), so the 25-tester
month is more likely $40–60. Photos are the second cost center at scale and are easy to forget: an
Explore view alone is 12 of them.

With the catalog (section 6) the same usage costs about **$30/month for 25 testers** (hosting and
model, everything else inside free tiers) and **$180–200/month for 100 users**, about $2 per user.

## 6. How Beli- and Mindtrip-style apps keep this low

Inferred from how their products behave, not from inside knowledge, and from what any team at their
scale has to do to survive these prices:

1. **Buy each place once, serve it forever from their own database.** Beli is the clearest case: a
   restaurant enters Beli's database the first time any member adds it (a place search, then one
   Details call) and every feed, ranking, list and map pin after that is a query on Beli's own tables.
   Their ratings are their own, their photos are members' photos, their notes are members' notes, so
   there is nothing of Google's to refresh. Google is touched on "add a place", not on "look at a
   place". Mindtrip resolves the AI's recommendations against a catalog it has been accumulating,
   writes its own descriptions instead of buying Google's, and takes hotel photos and prices from
   booking-partner feeds that are free per call and pay commission.
2. **IDs are free; content costs.** A Text Search that asks only for `places.id` is free without
   limit, and a Place Details call that asks for `id`, `name`, `photos` is on the IDs-only tier. Once
   a place ID is known, the only paid question is "what do we need to show right now".
3. **Their own data replaces Atmosphere.** A one-line "why you'll like it" from the model, the
   traveler's match score, members' ratings and photos all cost nothing per view. Google's editorial
   summary, review summary and reviews are only bought when someone opens the full sheet.
4. **Caches are shared and durable**, in the database or a CDN, keyed by place ID or by map grid
   cell, so a restart costs nothing and one tester's fetch serves the next tester.
5. **Lists are cheaper than lookups.** One Nearby or Text Search returns up to 20 places for one
   fee (under $0.002 per place); a per-place Details call is 10× that. Lists seed the catalog;
   lookups are for the long tail.
6. **Free base layers.** Foursquare's open-source Places dataset and Overture Maps' places are free to
   store forever (names, categories, coordinates, addresses) and can resolve most names locally; Google
   is then only asked for photos, ratings and hours when they are displayed.

Two rules from Google's Places policies shape all of this and apply to XPMatch: place IDs may be
stored indefinitely, but other Places content must not be pre-fetched, cached or stored beyond the
allowed exceptions (the service terms allow coordinates for 30 consecutive days), and Places results
shown on a map must be shown on a Google map with attribution. So the durable part of a catalog is the
place ID, the coordinates within the 30-day window and *our own* data (model blurbs, match features,
tester ratings, saves); Google's fields are a cache with a 30-day ceiling, refreshed when a place is
displayed. Our existing `place_facts` cache already follows that window.

## 7. The place catalog for XPMatch

In order of payoff; the first three are a couple of days of work and take today's card cost down by
about 90%.

1. **Resolve by ID, not by tier.** `resolvePointOfInterest` and `resolveDestination` run Text Search
   with `places.id` only (free), then look the ID up in a new `places` table (place ID, kind, name,
   coordinates, locality, photo names, Google fields JSON with `fetched_at`, our fields). On a miss or
   a stale row, one Place Details call with the smallest mask the card needs: Pro ($17, 5,000 free) if
   the card shows our match score instead of Google stars, Enterprise ($20, 1,000 free) if it keeps
   rating and price. Either way `editorialSummary` leaves the card mask; the model's "why" line
   already does that job.
2. **Every Google response upserts into `places`.** Home picks, Explore, imports and Details all
   return full place objects; storing them means the next lookup of any of those places is free. With
   testers concentrated in a few cities the catalog hit rate passes 50% within weeks.
3. **Explore and home picks cached in Postgres by grid cell** (coordinates rounded to about 1 km,
   category, query, filters) for 24 hours, and their masks trimmed to Pro. Twenty-five testers in the
   same metro then share two Nearby calls a day instead of two each per ten minutes.
4. **Photos.** One photo per card and lazy galleries (already); resolved photo URLs cached in Postgres
   rather than per process; a CDN (Cloudflare in front of `app.xpmatchme.com`) caching
   `/api/places/photo` for a day so an image is bought once for everyone; Wikipedia and members'
   photos wherever a Google photo is not essential (destination covers already use Wikipedia).
5. **Maps.** Keep Google maps for Places pins (policy), create maps only when visible (phones already
   do), Static Maps ($2) for non-interactive previews if any are added.
6. **Guardrails in Google Cloud**: per-day quotas that cap the worst case (for the current build:
   Text Search 250/day ≈ $10/day ceiling, Place Details 250/day, Photos 2,000/day, map loads
   2,000/day) plus budget alerts at $50 and $100; OpenRouter monthly limit $25.
7. **Later**: Foursquare OS Places or Overture as the base layer for name resolution; hotel content
   from a booking affiliate feed; Google's "Grounding with Maps" (Gemini only) as an alternative to
   model-then-resolve if the app ever moves off OpenRouter.

## 8. What a tester can reasonably do

At today's build, one active tester costs about $10 a month at list price and $3–4 after free tiers
are spread across 25 people; a heavy tester (100 card messages, 50 sheets, 50 Explore views) is about
$30 at list price. Nothing a single tester does is expensive per action (the priciest single turn is a
full plan at $0.85), so the beta risk is volume and runaway loops, not any one feature. The quotas in
section 7 bound the worst day at roughly $45.
