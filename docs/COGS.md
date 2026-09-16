# XPMatch cost of goods sold (COGS)

Estimated unit costs as the app stands today. Prices are public list prices as of mid-2026 and should be
checked against the Google Cloud, OpenRouter and Railway pricing pages before relying on them; usage
assumptions are stated so the model can be re-run with real numbers.

## Cost drivers

| Driver | Where it is incurred | List price | Notes |
| --- | --- | --- | --- |
| Hosting (Railway) | App service + Postgres + 1 volume | Hobby plan $5/month incl. $5 usage; then ~$10 per GB RAM-month, ~$20 per vCPU-month, $0.15 per GB volume | Two small services idle around 300–400 MB RAM total |
| Model (OpenRouter → `openai/gpt-4o-mini`) | Every chat message | $0.15 per 1M input tokens, $0.60 per 1M output | Each message = ~3 model calls (answer, tool follow-up, suggestions) of ~8k input tokens each |
| Google Places Text Search | Every recommended hotel/restaurant/attraction card, destination focus, search-and-pin, guide editor lookups | $40 per 1,000 (Enterprise + Atmosphere tier, because the field mask includes rating, price level and editorial summary) | 1 call per place; in-process cache per query |
| Google Places Nearby Search / Text Search (Explore) | Each Explore tab or search | $35 per 1,000 (Enterprise tier: rating, price) | "For you" = 2 calls; cached 10 minutes per area/tab |
| Google Place Details | Opening a place sheet | $25 per 1,000 (Enterprise + Atmosphere: reviews, hours) | Cached per place per process |
| Google Place Photos | Every card image, sheet gallery, Explore card | $7 per 1,000 | 1 per card, up to 5–10 per sheet, 12 per Explore tab |
| Maps JavaScript API | Every page that shows a map | $7 per 1,000 map loads | One load per page view with a map |
| Open-Meteo, Wikipedia | Weather chip, destination blurbs, fallback photos | Free | — |

Google applies monthly free tiers per SKU (roughly 10,000 calls for Essentials, 5,000 for Pro, 1,000 for
Enterprise-class SKUs), which cover early usage entirely.

## Cost per action (list prices, no free tier)

| Action | Calls | Approx. cost |
| --- | --- | --- |
| Chat message with no cards | ~3 model calls | $0.005 |
| Chat message that shows 6 hotel/restaurant/attraction cards | 3 model calls + 6 Text Search + 6 photos + 1 destination search | **$0.33** |
| "Full plan" turn (hotels + attractions + restaurants, ~18 places) | 3–4 model calls + 18 Text Search + 18 photos | **$0.86** |
| Opening a place sheet | 1 Details + up to 5 photos | $0.06 |
| Explore tab view (fresh, uncached) | 1–2 Nearby + 12 photos | $0.12–0.15 |
| Page view with a map | 1 map load | $0.007 |
| Creating a trip / guide place lookup | 1 Text Search (+ photos on display) | $0.04–0.08 |

## Monthly picture

Assumed active user: 30 chat messages (half with card sets), 20 place sheets, 20 Explore views, 60 map
loads.

| Component | Per active user / month |
| --- | --- |
| Model | ~$0.15 |
| Places search for cards | ~$4.50 |
| Place sheets | ~$1.20 |
| Explore | ~$2.50 |
| Photos + map loads | ~$0.60 |
| **Variable COGS** | **≈ $9 per active user** (≈95% Google Places) |
| Fixed hosting | ≈ $5–15 per month total |

At 100 active users that is roughly $900/month of Google Places before free tiers, versus ~$15 of model
spend and ~$15 of hosting: the map/places experience, not the AI, is the cost center.

## Levers (in order of impact)

1. **Cheaper field masks.** Drop `editorialSummary` (and `priceLevel` where not shown) from card
   resolution so Text Search bills at the Pro tier ($32) or, better, resolve with the Essentials tier
   (IDs + location, $0 up to the free cap) and fetch rating/photos only for places the traveler looks at.
2. **Persist the Places cache in Postgres** (place id, resolved JSON, photo URLs, TTL ~30 days). Today the
   cache is per server process; the same "Hotel de Russie, Rome" is bought again after every deploy and
   for every user.
3. **Resolve fewer places per card set** (top 4 instead of 6) or resolve on hover/scroll.
4. **Cache Explore by city grid for hours, not minutes**, and pre-warm the home city.
5. **Photos**: cache the resolved `googleusercontent` URL for its validity window; show one photo per card
   (already) and load galleries lazily (already).
6. **Model**: prompt caching already applies automatically to the static system prompt on OpenAI models;
   a lighter suggestions call (or fewer suggestions) would cut a third of model spend.

With levers 1–3 the variable COGS falls to roughly $2–3 per active user per month.
