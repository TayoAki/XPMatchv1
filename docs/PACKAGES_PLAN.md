# Packages plan: the catalog, the package card, the science and three options

What this covers: what the place catalog costs to build, fill and keep; the package card that
replaces the separate hotel / restaurant / things-to-do sets as the default opener; how a traveler
narrows a package and swaps single items; the scoring model behind each package and how it learns;
three options generated automatically; the cost picture; and the build order. It builds on
`docs/PLACE_CATALOG.md` (the catalog design) and `docs/COGS.md` (prices).

## 1. How much is the catalog

Three costs, none of them large. The engineering is the real one.

| Cost | Amount | Notes |
| --- | --- | --- |
| **Building it** | about 4–5 working days | tables, the resolution pipeline, the shared search and photo caches, a seed job, tests (steps 0–4 in `docs/PLACE_CATALOG.md`) |
| **Filling a city** | **≈ $0.50 per city, once** | ~15 list searches at the Pro tier ($0.032 each, 20 places per search) put ~300 places in. Inside the 5,000 free Pro searches a month that is 330 cities for $0 |
| **Storing it** | ≈ $0 | ~5 KB per place: 300 places per city is 1.5 MB, 500 cities is 750 MB, about $0.11 a month on Railway's volume pricing |
| **Keeping it fresh** | ≈ $17–20 per 1,000 places shown per month, list | one Details call when a displayed place is older than 30 days; 1,000 shown places a month sits inside the free tiers |
| **What it replaces** | ≈ $4 per active user per month | today's card lookups, plus the re-lookups after every deploy and every reopened chat |

So the catalog is roughly a week of build, then pennies. It pays for its Google cost in the first
month of any real usage; the engineering week is the investment.

## 2. The package card

The default first response for a destination is one card, built on the server from the catalog and
scored for this traveler. The model names the destination and writes the one-liners; it no longer
chooses the places.

**Composition (default):** 1 stay, 3 things to do, 3 places to eat: 7 slots. Pace changes the count
(relaxed 2 things, packed 4). Each slot shows photo, name, kind chip, match percent, price tier and
a one-line why. The header shows the package's overall match and the profile facts it was built from
("Boutique hotel · Museums & art · Seafood · mid-range").

**Actions on the card:** Turn into a trip (opens `create_trip` pre-filled with the seven places in a
sensible day order), Narrow, Swap on every slot, Lock on every slot, Not for me on every slot.

**On the map:** the seven pins, and below the map a strip of mini cards synced with the pins (tap a
pin, the strip scrolls; swipe the strip, the pin highlights). Mini cards show only catalog data, so
scanning is free; tapping one opens the full place sheet, the only step that buys Google details.

### Narrowing in

Narrowing rebuilds the package from the same candidate pool, so it costs nothing and is instant.

| Control | What it does |
| --- | --- |
| **Constraint chips** (budget, area, vibe, dietary, timing, distance) | the smart-filter chips that already exist; tapping or typing one re-scores the pool with that constraint hard or soft and rebuilds unlocked slots |
| **Based-on chips** are toggles | switch off "Museums & art" and the things-to-do slots re-pick without that interest, without changing the profile |
| **Area focus** | pick a neighborhood chip or drag the map: candidates are limited to a radius around the stay or the chosen area, which also makes the package walkable |
| **Pace** | relaxed / balanced / packed changes how many things to do a day carries |
| **Locks** | a locked slot survives every narrowing and swap |

### Swapping one experience

| Control | What it does |
| --- | --- |
| **Swap** | opens the two next-best alternates for that slot (already scored, no calls); choosing one replaces the slot and logs the swap |
| **More like this** | alternates limited to the same category and price tier |
| **Not for me** | thumbs down: the place never comes back for this traveler, its factors are recalibrated, and a reason chip is offered (the existing reasons) |
| **Not this kind** | drops the category from this package and offers to remember it as a preference (the existing remember_preference flow) |

Every keep, swap, lock and thumbs is written to a `package_events` table (traveler, package, slot,
from, to, reason, variant). That table is the training signal in section 3.

## 3. The science behind each package

### What exists today

`src/lib/match.ts` already scores every candidate deterministically and explainably: a base of 55 plus
factor deltas the badge can show. Quality (+12 for 4.6 with 200+ reviews, +7 for 4.3, −8 under 4.0,
−3 for few reviews), price against the budget tier (+10 fit, +4 a notch below, −10 two notches
above), interests (+12, +6), styles (+6), stay type (+10), must-haves (+4 each, up to three), cuisine
(+12), dietary (+6), adventurous (+4), family (+6), couple (+4), taste twins from loved places (+10),
disliked patterns (−8), learned likes (+5) and dislikes (−8), dealbreakers (−25), heads-ups (−4
each), passed before (−30). Thumbs calibrate each factor per traveler between 0.4× and 1.4× after
three judgments. Home picks already use this to pick the top three per row with category diversity.

### What a package adds

A package is not seven independent top picks; it is the best *set*. The package score is:

1. **Sum of item scores** (the existing model, so every item still carries its reasons).
2. **Coherence**: a bonus when things to do and places to eat are within walking distance of the
   stay and of each other (the board's walking rule: 5 km/h, up to 2.5 km), a penalty per kilometer
   beyond; the traveler's walking preference sets the tolerance.
3. **Diversity**: no two items of the same category in a slot group, a spread of price tiers inside
   the budget, and for "mix" or "adventurous" food profiles one safe bet (many reviews) plus one local
   find (fewer reviews, high rating).
4. **Time fit**: early risers get morning places (cafés, markets, viewpoints), night owls get evening
   ones (bars, late kitchens), from category heuristics rather than paid opening hours.
5. **Hard filters first**: dealbreakers, hard constraint chips, dietary must-haves, passed-before and
   a quality floor (4.0 with 50+ reviews unless the profile is adventurous) remove candidates before
   scoring.

Assembly is greedy per slot followed by a few rounds of swap improvement; the pool is at most a few
hundred places, so this runs in milliseconds with no external calls.

### How it learns

| Signal | Already collected | Used for |
| --- | --- | --- |
| Thumbs on a card | yes | per-traveler factor calibration (0.4×–1.4×) |
| Loved / fine / not for me, with reasons, and post-trip ratings | yes | taste twins, disliked patterns, learned preferences |
| Keep / swap / lock per slot | new (`package_events`) | which factors predict "kept in the package" per traveler and across everyone |
| Which of the three variants was chosen | new | the traveler's direction (pace, budget, style) as the first signal on day one |
| Turn into a trip, then post-trip ratings | yes | the outcome the whole model is measured on |

Start with counting estimators like today's calibration (they are transparent and need little data).
Once there are a few hundred swaps across testers, fit global factor weights (a logistic regression
on the factor vectors of kept versus swapped items) as priors, with per-traveler calibration on top.
The output stays explainable: "in your package because: Boutique, $$ fits your budget, like Da Enzo,
which you loved".

### How we know it works

Per package and per variant, on the admin page: keep rate (slots untouched), swap rate per slot,
thumbs-up rate, trip conversion, and later loved rate after the trip. Offline replay: when weights
change, re-score every past package and check the kept items rank higher than the swapped ones. With
enough users, A/B by user bucket. Guardrails never move: no dealbreakers, no passed-before, the
quality floor.

## 4. Three options, automatically

Two readings of "three options", and both are cheap because they come from the same scored pool.

**Three packages to choose from.** The opener shows three variants as tabs (swipe on phones), each a
different objective over the same candidates, named by what changes:

| Variant | Objective | Example title |
| --- | --- | --- |
| 1 | pure best match | "Your match" |
| 2 | the traveler's second interest or style leads | "More food, fewer museums" |
| 3 | pace or budget shifted one notch; "local finds" for adventurous profiles | "Quieter and closer" or "A notch up" |

Which axes variants 2 and 3 use comes from the profile: the top two interests when they differ in
kind, pace when the profile is "balanced", budget when the taste profile shows a price tendency that
differs from the stated tier. Choosing a variant is the first learning signal for a new traveler.

**Two alternates per slot.** Every slot keeps its next two best candidates ready behind Swap, so
swapping is one tap and never a search.

Only the visible variant loads photos (7), and alternates load theirs when Swap opens (2), so three
options cost the same as one.

## 5. Cost picture

Per active user per month, list prices, from `docs/COGS.md` and `docs/PLACE_CATALOG.md`:

| | Today | Catalog | Catalog + packages |
| --- | --- | --- | --- |
| Card and itinerary lookups | $4.00 | $0.30 | $0.18 |
| Photos | $3.20 | $0.65 | $0.40 |
| Explore and home picks | $1.50 | $0.05 | $0.05 |
| Place sheets | $0.50 | $0.25 | $0.12 |
| Maps and routes | $0.50 | $0.50 | $0.50 |
| Model | $0.15 | $0.15 | $0.12 |
| **Total** | **$9.85** | **$1.90** | **$1.40** |

| Monthly bill, hosting included, after free tiers | Today | Catalog | Catalog + packages |
| --- | --- | --- | --- |
| 25 active testers | $95 | $30 | $27 |
| 100 active users | $750 | $150 | $50–70 |

Three variants and the swap alternates add nothing measurable: scoring is local, and photos load only
for what is on screen. The package also guarantees the catalog hit rate, because the places come
from what we own by construction, and it caps an opening turn at seven places however the model
behaves.

## 6. Build order

| Phase | What | Effort |
| --- | --- | --- |
| 0 | Per-user daily lookup budget on resolve and itinerary saves; drop `editorialSummary` from the search mask | 2 hours |
| 1 | Catalog: `places`, `place_aliases`, `destinations`, `search_cache`, `photo_urls`; resolution through them; seed job with an admin "Seed city" button | 3–4 days |
| 2 | Package: `buildPackage(destination, traveler, variant, constraints, locks)` on the server; `show_package` tool and the prompt change that makes it the opener; the card on desktop and phone with based-on chips, narrowing chips, Swap with two alternates, Lock, Not for me, Turn into a trip; `package_events` | 3–4 days |
| 3 | Map mini cards: the strip under the map panel and inside the phone map sheet, synced with pins, tap to the full sheet | 1–2 days |
| 4 | Three variants: objectives, titles from the profile, tabs, photos only for the visible variant | 1–2 days |
| 5 | Learning loop: swaps and variant choice into calibration; global priors once there is data; admin metrics (keep, swap, conversion); offline replay script | 2–3 days |
| 6 | CDN in front of the photo route | half a day |

About 12–15 working days in total. Phase 0 goes in before the first testers regardless; phases 1
and 2 are the ones that change the bill and the product.

## 7. Choices to confirm

1. Package composition: 1 stay + 3 things to do + 3 places to eat, or a day-shaped package
   (morning, lunch, afternoon, dinner) for trips with dates.
2. The package as the opener for every destination chat, or only once the profile quiz is complete
   (before that, the model's card sets as today).
3. Keep Google's star rating on cards (Enterprise Details, 1,000 free a month) or show only the
   match percent on cards and stars in the sheet (Pro Details, 5,000 free).
4. The variant axes: interests, pace and budget as proposed, or fixed titles.
5. "Full explore" means the full place sheet; the Explore page stays as it is.
