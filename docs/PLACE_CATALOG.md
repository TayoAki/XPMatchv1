# Place catalog: buy each place once, serve it from our database

Design for moving XPMatch from "one Google lookup per card, per user, per deploy" to a shared catalog
that the chat reads from, so that Google is paid once per place and the running cost is mostly the
model. Numbers use the price list in `docs/COGS.md`.

## 1. How many places a chat generates today

What the tools allow (`src/lib/travel/schemas.ts`) and what one save may look up:

| Source | Places per call | Notes |
| --- | --- | --- |
| `show_hotels`, `show_restaurants` | 1–6 | one Text Search each |
| `show_attractions` | 1–8 | |
| `show_destinations` | 1–6 | destination lookups, same SKU |
| "Full plan" turn (hotels + attractions + restaurants) | up to 20 | the prompt allows several tools in one turn |
| `create_trip` / `update_trip_plan` itinerary | 1–14 days × 1–8 stops (prompt asks for 3–6) | up to 40 lookups per save (`MAX_RESOLVE`) |
| `add_trip_ideas` / `schedule_stops` | up to 8 / 10 | |
| Link or screenshot import | up to 20 candidates | |
| Home picks | 6 searches per destination, 8 results each | every 6 hours per process |
| Reopening a chat | every card set again | the cards re-register on mount; only the in-process cache saves the call, and a deploy empties it |

A typical trip chat (about 8 messages: focus, hotels, things to do, restaurants, one refined search,
one itinerary of 4 days × 4 stops, 4 sheets opened, a few board edits) is about **28 place lookups**
and **50 photos**. A heavy one (20 messages, 8 card sets, two itinerary rewrites) is about 60 lookups.
The most one turn can trigger is 20 cards, and one itinerary save 40 lookups; nothing in the app caps
a user per day.

| | Lookups | Cost today (list) | Of which AI |
| --- | --- | --- | --- |
| Typical trip chat | 28 | **≈ $1.65** (cards $1.12, photos $0.34, sheets $0.10, routes/maps $0.07, model $0.04) | 2% |
| Heavy trip chat | 60 | ≈ $3.50 | 3% |
| One user, one month (2 trips, home picks in 3 cities, 10 Explore views, 10 sheets) | ~75 | ≈ $8–10 | 2% |
| One reopened chat after a deploy | 20–30 | ≈ $1 | 0% |
| Worst case, one user spamming full plans all day (100 turns) | 2,000 | ≈ $95/day | 0.5% |

## 2. Target: the chat pulls from a catalog we own

```
model names a place ──▶ alias table (name + city → place id)     0 calls, ~1 ms      ┐
                        └─ miss ▶ fuzzy match in `places` near the city    0 calls   │ ≥ 80% of lookups
                                  └─ miss ▶ Text Search, IDs only          free      │ once the city is seeded
                                            └─ known id ▶ `places` row     0 calls   ┘
                                            └─ new id   ▶ Place Details    $0.017–0.020, once, then stored
```

Every path writes back: the alias, the place row, the photo names. The next traveler, the next
deploy and the next reopen of the chat cost nothing.

### Tables (one migration)

| Table | Key | Holds |
| --- | --- | --- |
| `places` | Google place id | kind, name, normalized name, locality, country, lat/lng, address, category, price level, rating, rating count, website, Maps link, photo names, Google JSON + `google_fetched_at`; our fields: model one-liner, match tags, saves, loved/disliked counts, tester ratings |
| `place_aliases` | normalized query + destination id | place id, source (model, user, import), hit count. This is today's in-process `searchCache` key, made durable and shared |
| `destinations` | Google place id of the city | name, country, lat/lng, viewport, Wikipedia title, seeded_at |
| `search_cache` | kind + query + filters + 1 km grid cell | ordered place ids, fetched_at (24 h). Explore and home picks read this first |
| `photo_urls` | photo name + width | resolved Google URL, fetched_at. Shared across processes instead of the 2-hour in-process map |
| `place_facts` (exists) | place id | the full sheet data, 30 days |

Postgres `pg_trgm` gives the fuzzy match (available on Railway's Postgres and in PGlite for tests).

### The chat side

1. **Candidate pool in the agent context.** When a destination is in focus, the server adds the top
   40 catalog places for that city (name, kind, one-liner, tags, price, rating) to the context the
   model already receives (profile, preferences, constraints). That is about 2,000 tokens, or
   $0.0003 per message on the current model. The prompt says: prefer places from the pool, name
   others only when the pool has no fit. In a seeded city the model's cards then resolve entirely from
   the catalog.
2. **Catalog-first card tools.** The card handlers resolve through the pipeline above; the response
   carries the place id so the card, the map pin, the sheet and the board all share one row.
3. **The model's own text becomes catalog content.** `whyItFits`, `mustTry`, `tradeoffs` and the
   itinerary notes are stored against the place (attributed to the traveler profile they were written
   for), so later "why this fits" lines can reuse them, and Google's editorial summary is never bought
   for a card.

### Seeding a city in bulk

List searches are the cheap way in: a Text Search at the Pro tier returns 20 places for $0.032, under
$0.002 a place, against $0.040 for one card lookup today. A seed job per destination runs about 15
queries (stays by tier, restaurants by the cuisine list in the profile options, things to do by the
interest list) and lands ~300 places for about **$0.50 per city, once**. Fifty cities are $25. Explore
and home picks already run such searches; storing their results is seeding for free.

### Photos

Photo names are stored with the place; the image itself is still a Place Photos call the first time
it is shown at a width. To make that once per place rather than once per viewer: `photo_urls` shared
across processes, one photo per card (already), galleries lazy (already), and a CDN in front of
`app.xpmatchme.com` caching `/api/places/photo` for a day. Destination covers stay on Wikipedia.
Later: travelers' own photos on places they rated, the Beli pattern.

### Refresh and Google's rules

Place ids are ours to keep. Coordinates and the other Google fields are refreshed when a place is
displayed and its `google_fetched_at` is older than 30 days (one Details call at the smallest mask
the surface needs), which is the window the terms give. Our own fields (one-liners, tags, ratings,
saves) have no expiry. Places pins keep rendering on Google maps with attribution.

> **Correction (2026-09-23):** the 30-day window covers only latitude and longitude (Maps Service
> Specific Terms §14.3). Place IDs may be kept indefinitely; no other Places content may be cached or
> stored (Terms §3.2.3(b), Places policies). Storing names, ratings, photos, summaries and reviews as
> this section describes goes beyond that. See `docs/EVENT_SOURCES.md` section 1 for what is affected
> and the compliant shape; this needs a decision before more is built on the catalog.

## 3. What it costs after

Assumes a seeded city with an 80% catalog hit rate, photos shared through the CDN.

| | Today | With the catalog | Of which AI |
| --- | --- | --- | --- |
| Typical trip chat | $1.65 | **≈ $0.35** (misses $0.11, photos $0.12, sheets $0.05, routes/maps $0.03, model $0.04) | 11% |
| Heavy trip chat | $3.50 | ≈ $0.70 | 12% |
| One user, one month | $8–10 | **≈ $1.20** | 13% |
| Reopened chat | ≈ $1 | $0 | — |
| 25 active testers, month, after free tiers | ≈ $95 | ≈ $30 (hosting $21, model $4, Google under the free tiers) | |
| 100 active users, month | ≈ $750 | ≈ $150 | |

At that cost one active user sees about 60 place cards, plans two trips of ~16 stops, opens ten
sheets and views a few hundred photos a month, and adds five or six new places to the shared catalog.
The catalog compounds: each new place is bought once for everyone who comes after.

What stays on Google's meter after the catalog: photos (the largest line), the first lookup of a
genuinely new place, sheet details, map loads and routes. What stops: card lookups, re-lookups after
deploys and on reopen, the same place for many users, Explore and home-pick refreshes per user.

## 4. Build order

| Step | What | Effort | Effect |
| --- | --- | --- | --- |
| 0 | Per-user daily lookup budget in `/api/places/resolve` and itinerary saves (e.g. 150 lookups a day, using the existing rate limiter), and drop `editorialSummary` from the search mask | 1–2 hours | bounds one user at about $6/day; cards move one tier down |
| 1 | `places`, `place_aliases`, `destinations`, `photo_urls` tables; `resolvePointOfInterest` and `resolveDestination` read and write them; Text Search IDs only + Details for misses | 1–2 days | the 90% cut; survives deploys; shared across users |
| 2 | `search_cache` for Explore and home picks, masks trimmed to Pro | half a day | Explore and picks inside the 5,000 free tier |
| 3 | Candidate pool in the agent context and the catalog-first prompt line; seed job per destination | 1 day | AI picks from what we own; new cities cost $0.50 |
| 4 | CDN in front of the photo route; `photo_urls` shared | half a day | photos bought once per place |
| 5 | Travelers' one-liners and ratings stored on places; user photos | later | Beli-style content that is ours |
