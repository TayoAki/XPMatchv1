# The compliant version: how XPMatch should use Google place data

Status: a plan for review; nothing here is built. It follows our reading of Google's terms as
checked on 2026-09-23 (`docs/PLACE_DATA.md`, `docs/EVENT_SOURCES.md` section 1). It is not legal
advice: section 9 lists what a legal read should confirm before we build past Phase 0.

## 1. The rule

Google is a service we call when a place is on screen, not a source we copy from. We keep:

- **Place IDs**, indefinitely (refreshing any older than 12 months, free).
- **Coordinates**, for up to 30 days, then refetched or deleted.
- **Everything of our own**: the plan, notes, tags, reactions, traveler reviews and check-ins,
  match scores and reasons, and the model's own words.

Everything else Google returns (names, addresses, ratings, price levels, types, photos, hours,
websites, summaries, reviews, travel times) is fetched for the view that shows it, shown with
Google's attribution, and never stored or cached. No Google content goes to our model, except
through Google's grounding, whose output is shown the way Google requires.

## 2. What it looks like

A traveler asks "Plan me four days in Rome":

1. **The model suggests** places from its own knowledge, with its own tags (style, cuisine,
   category, price tier, area, why it fits). For a plan, the server also runs the traveler's
   profile searches.
2. **The server checks each place is real**: name to Google place ID with an ID-only Text Search,
   which is free.
3. **The server scores** each candidate with our match function: our data and the model's tags,
   plus, for plan builds and home picks, Google's type, price level and rating read for this
   request only (section 5.2).
4. **The card is our frame around Google's element.** Our frame holds the match badge, the taste
   reasons, Swap, Add and Not a fit. Inside it, Google's Places UI Kit element draws the photo,
   name, rating and type from the place ID, with Google's attribution.
5. **Saving keeps a reference, not a copy**: the place ID, our label and tags, the day, time and
   note, and coordinates for 30 days.
6. **Opening a place** shows Google's full details element (photos, hours, reviews, Google's own
   review summary) beside our sections: travelers' reviews and check-ins, the match, Use as my stay,
   Add to trip.
7. **Asking about a place** is answered from our travelers' reviews; Google's reviews and summary
   are right there in Google's element (section 4.5).
8. **Reopening** a chat, trip or guide draws the Google parts again from the place IDs.

| | Today | Compliant version |
| --- | --- | --- |
| Place ID | stored | stored; refreshed after 12 months |
| Coordinates | stored with no expiry in the catalog and in every copy | stored with a date; refetched or deleted after 30 days |
| Name, address, type, price, rating, website, hours | stored in the catalog and in every copy | drawn live by the UI Kit; never stored |
| Photos | photo names in every copy; URLs cached 24 h; images served with a public 1-day cache | drawn by the UI Kit; nothing cached |
| Reviews and summaries | `place_facts` for 30 days; review text sent to the model and kept in transcripts | drawn live by the UI Kit; never stored; never sent to our model |
| Travel times | cached 24 h in memory | fetched when a day is shown |
| What the model sees | Google names, types, price levels, ratings and review quotes | our labels and tags, travelers' reviews, the plan, place IDs |

## 3. What we have today

From a read of the code on 2026-09-23 (file-level detail in the appendix):

- **Stored.** 17 tables or columns hold Google content; only three hold IDs alone
  (`place_aliases`, `search_cache`, `package_events`). Nothing deletes old Google rows. The place
  sheet saves full details (reviews, hours, phone) into saved items, reactions and trip items, and
  the save routes accept any place JSON. Ratings also survive in free text: "Rated 4.7 by 12k
  people" is written into stop notes. Published guides serve stored Google content to every
  reader.
- **Cached.** Several server and browser caches hold Google content; the server's lookup cache
  never expires, and the photo route serves sign-in-only images with a public one-day cache.
- **Sent to the model.** Six paths send more than names, two of them with Google review text:
  "Ask about this place" writes its answer from reviews, and its tool result carries the quotes
  back to the chat model, where saved transcripts keep them. The system prompt carries up to 40
  catalog places with Google ratings and price levels. Link import reads Google Maps pages. Seven
  more paths carry Google place names.
- **Shown.** About 25 screens show Google content, most from stored copies and most with no Google
  map on screen. None shows the Google Maps logo away from the map, and the Saved page, guide covers
  and the guide editor show no photo credit.

## 4. What changes, by area

### 4.1 One place reference instead of copies

```ts
/** What we keep about a place. Everything else is Google's and is fetched when shown. */
interface PlaceRef {
  placeId: string;   // Google place ID, or our "est:" id for estimated places
  kind: PlaceKind;   // ours
  label?: string;    // ours: the name the model or the traveler used
  tags?: string[];   // ours: style, cuisine, category, price tier (model, traveler or open data)
  lat?: number;      // Google's, kept up to 30 days
  lng?: number;
  coordsAt?: string; // when the coordinates were fetched
  city?: string;     // our destination id
}
```

| Where | Change |
| --- | --- |
| `trips.place` and itinerary stops, `trip_items`, `saved_items`, `guides`, `guide_items`, `place_feedback`, `imports`, `chats` | `place` becomes a `PlaceRef`; titles keep our label, never Google's name; strict schemas replace `passthrough()` |
| Stop notes and "why" lines | our reasons only: no rating, review count or Google type in stored text |
| `places` (the catalog) | our place record: ID, kind, city, our tags and one-liners, what travelers did there (saves, loves, traveler ratings), coordinates with a date. Name, locality and the Google JSON go |
| `place_facts`, `photo_urls` | dropped |
| `place_aliases`, `search_cache`, `package_events`, `place_visits` | kept (IDs and our data only) |
| `chat_messages` | Google fields stripped from tool results on save and on load; stored rows cleaned once |
| `profiles.taste`, `rec_feedback.name`, `notifications.text` | our labels and tags; "usual price" from the model's price tiers |
| New nightly job | delete coordinates older than 30 days; refresh place IDs older than 12 months (free) |
| Migration | one backfill: keep IDs, move the model's names into `label`, drop the rest; coordinates without a date are dropped and refetched when viewed |

### 4.2 Showing places

- **Two shared components replace the ~15 local photo and row components:**
  - `GooglePlace` wraps the UI Kit and takes a place ID: `row` (compact element, horizontal: photo,
    name, rating, type, price), `card` (compact, vertical) and `sheet` (full element: photos,
    hours, website, reviews, Google's review summary). Our frame goes around it.
  - `GoogleAttribution` puts the Google Maps logo on any surface that shows Google content outside
    the element and without a map.
- **Maps** stay on the Google Maps JavaScript API. Pins use a reference's coordinates while they
  are under 30 days old; otherwise one Place Details call for the location only ($5 per 1,000,
  10,000 free a month).
- **Travel legs** are fetched when a day is shown, without the 24-hour cache.
- **Photos in our own layout** (outside the element) go through the proxy per request, with a
  private cache, the author credit and no stored URL. City covers stay on Wikipedia.
- **Our text drops Google facts.** The "Rated 4.6 by 2.3K people" reason goes; the element shows the
  rating right beside it.

### 4.3 Picking and ranking

The match function stays as it is (`src/lib/match.ts`); only the source of its three Google inputs
(type, price level, rating) changes.

- **Plan builds and home picks** (`src/server/packages.ts`, `src/server/itineraries.ts`,
  `src/server/recommend.ts`): each request runs its profile searches asking only for what the score
  reads (`types`, `location`, `priceLevel`, `rating`, `userRatingCount`), scores, keeps the place
  IDs, coordinates and our match, and drops the rest. The catalog pool, the 6-hour candidate cache,
  the 10-minute nearby cache and the lookup cache go; `search_cache` keeps result order as IDs.
- **Places the model names in chat** are scored on the model's own tags (style, amenities, cuisine,
  price tier, category, area, its own rating estimate), which the tool schemas already collect.
  Google's element shows the real rating beside the score.
- **The taste profile** is built from reactions keyed by place ID with our tags, so "like the Roman
  trattoria you loved" works without Google's names or types.

### 4.4 The model

1. `src/app/api/places/ask/route.ts`: stop passing Google reviews to the helper model
   (`src/server/answer.ts`).
2. `ask_about_place` (`src/components/chat/TravelCopilot.tsx`): return only
   `{ placeId, shown, guidance }`; the card takes its content from a client store and draws Google's
   parts live.
3. The catalog pool in the context (`TravelCopilot.tsx`, `src/app/api/catalog/pool/route.ts`):
   replace with our own signals (labels, tags, what travelers did), or drop it.
4. `import_reservation`: return what the model extracted, without the attached place.
5. Transcripts (`src/server/copilot-runner.ts`, `src/server/models.ts`): strip Google fields on
   save and on load, which also covers the suggestion-chip runs.
6. Imports (`src/server/import/index.ts`): refuse Google Maps links (google.com/maps,
   maps.app.goo.gl, goo.gl/maps, g.page) the way Instagram links are refused; drop "a map" from the
   screenshot prompt.
7. Names: the context carries our labels; stop overwriting stop titles with Google names
   (`src/server/itinerary.ts`, `src/lib/itinerary.ts`); drop Google's price level from the taste
   context (`src/lib/feedback/taste.ts`).

### 4.5 Questions about a place

- **Google's side, drawn by Google.** The sheet's element shows Google's reviews and Google's own
  review summary. No model of ours reads them.
- **Our side, answered by our model.** Travelers' reviews and check-ins, verified visits first.
  That content is ours: it can be summarized, ranked and quoted.
- **Free-form questions on Google's data**, if we still want them: Grounding with Google Maps (a
  Gemini call), shown as its own card, unedited, with the Maps links, and kept in the chat's history
  for up to 6 months. Not Maps Grounding Lite here: its output may be kept for 30 days and only to
  evaluate the display, so it cannot live in saved chats.

### 4.6 Tests

- The Places stub (`tests/e2e/mock-places.mjs`) gains the ID-only search and a stand-in for the UI
  Kit elements.
- Specs that read Google names or ratings from our markup read the stand-in instead.
- Unit tests cover the backfill, the nightly job and the transcript scrubber.

## 5. The choices, and what's best

### 5.1 How to show Google content

| | Places UI Kit (recommended) | Places API, drawn by us |
| --- | --- | --- |
| Cost per place shown | $0.001 (10,000 free a month), photos and reviews included | about $0.027 with rating and photo, $0.032 with reviews |
| Design | Google's layout inside our frame; colors and fonts through CSS properties; content items chosen per surface | fully ours |
| Compliance | attribution, author credits and review rules built in; our server never holds the data | we add every attribution and credit, and must never cache |
| Effort | one wrapper component, then surface by surface | a live-fetch hook, plus attribution on every surface |

Best: the UI Kit wherever Google content appears, and the Places API only for the server-side
fields the score reads.

### 5.2 How to rank

Plan builds and home picks read Google's type, price level and rating per request, so quality holds
and cost is per request; places the model names in chat are scored on its tags. This depends on
legal question 1. If the answer is no, everything is scored on the model's tags, and quality then
leans on our travelers' reviews as they build up.

### 5.3 What happens to the catalog

The table stays as our place records: the ID, our tags and one-liners, and what travelers did
there. The Google copy goes. If a candidate pool for the model proves worth having, it is rebuilt
from our records and from open data we may store (Foursquare Open Source Places, Apache 2.0), never
from Google.

### 5.4 In what order

Phase 0 first: it stops the clearest problems and holds under any reading of the terms. The rest
after the legal read.

## 6. Build order

| Phase | What | Effort | What the traveler sees |
| --- | --- | --- | --- |
| 0 | The model fixes in 4.4; Google Maps links refused in imports; the photo route's cache made private and `photo_urls` and the never-expiring lookup cache removed; the sheet stops saving full details; the Google Maps logo wherever Google content shows without a map | 1 day | "Ask about this place" answers from travelers' reviews and shows Google's reviews as written; a Google Maps mark on cards |
| 1 | `PlaceRef`, `GooglePlace` and `GoogleAttribution`; cards, rows, sheets, Saved, trips, guides and Explore moved onto them | 2–3 days | Google's compact card inside our frame |
| 2 | Backfill and strict schemas; `place_facts` dropped; the catalog becomes our records; the nightly coordinate and ID job | 1–2 days | Nothing, if it goes right |
| 3 | Ranking with per-request fields, model tags in chat, the taste profile on our tags, reasons without Google facts | 1 day | Match reasons about taste, with the stars shown by Google |
| 4 | Travelers' reviews answer place questions; optionally the Gemini grounding card | 1 day | |
| 5 | Tests, docs, and `docs/COGS.md` re-run with display-time costs | 1 day | |

About 7 to 9 working days in all.

## 7. What it costs

Rough, at list price, before free tiers:

| | Before the catalog | With the catalog (not compliant) | Compliant version |
| --- | --- | --- | --- |
| Typical trip chat | $1.65 | $0.35 | about $0.40 |
| One active traveler, one month | $8–10 | $1.20 | about $2.50–3 |

Where the compliant version spends: plan builds and home picks re-run their searches ($0.035 each,
three to five a build) because results cannot be shared between travelers; the UI Kit at $0.001 per
element loaded; and pins whose coordinates have expired. The free tiers (1,000 rating searches,
10,000 element loads and 10,000 location lookups a month) cover a 25-tester beta. The levers: fewer
searches per build, a slower home-picks refresh, and rows that load Google's element only when
scrolled into view.

## 8. What the traveler would notice

- The Google parts of cards and sheets (photo, name, rating, reviews) look like Google's card,
  inside our frame with our match and buttons.
- A Google Maps mark on surfaces without a map.
- Match reasons talk about taste ("Italian, which you love", "fits your premium budget"); the stars
  come from Google's element.
- "Ask about this place" answers from travelers' reviews; Google's reviews and summary are there to
  read.
- A card's Google part appears a moment after our frame.
- Google Maps links can no longer be imported; screenshots still can.

## 9. Questions for the legal read

1. May plan builds and home picks rank with Google's type, price level and rating read for the
   request and never stored?
2. May our match score and reasons sit beside a UI Kit element, marked as ours?
3. Is turning a name the model wrote into a place ID with an ID-only search a normal use of the
   search service?
4. May we keep the model's own name for a place (our label) and our tags next to the place ID, and
   show them in our own text?
5. May trip stops keep coordinates and addresses per traveler indefinitely by geocoding them? The
   Geocoding terms (§6.3.2) allow that "solely to support the direct, End User facing functionality",
   isolated per user.
6. May a traveler import their own Google Maps lists from a Google Takeout export, or from a
   screenshot of Google Maps?
7. Does a Gemini grounding card in a chat that also shows our cards count as "interspersing" other
   content (Gemini API terms)?
8. Do place IDs returned by Maps Grounding Lite count as content "extracted" from its output
   (service terms §10.3.1)?

## Appendix: what the code does today (read on 2026-09-23)

### A.1 Stored and cached

| Where | Google content today | Change |
| --- | --- | --- |
| `places` (`src/server/catalog.ts`) | name, locality, coordinates, full place JSON with up to 6 photos; refreshed only on lookup; never deleted | our place record (4.1) |
| `place_facts` (`src/server/place-facts.ts`) | full details, up to 5 reviews, review and generative summaries, attributes; 30 days, stale copy served on errors | dropped |
| `photo_urls` | Google photo URLs, 24 h | dropped |
| `trips` place, itinerary, summary | destination and stop copies; Google names as stop titles; ratings in notes; "Staying at …" | `PlaceRef`, our labels, our reasons |
| `trip_items` | name, Maps URL, place or full details, reservation place | `PlaceRef` |
| `saved_items` | name, locality, Maps URL, place or full details | `PlaceRef` |
| `guides`, `guide_items` | destination copy, a Google photo as cover URL, place copies | `PlaceRef`; covers drawn live or from Wikipedia |
| `place_feedback` | name, locality, place or full details | `PlaceRef` |
| `imports` | destination and place copies, served again for 7 days | `PlaceRef` |
| `chats` | "Exploring {name}", place copy | our label, `PlaceRef` |
| `chat_messages` | review quotes and place records inside tool results; no expiry | scrubbed (4.4, item 5) |
| `profiles.taste`, `rec_feedback.name`, `notifications.text` | names, Google types, price tendency | our labels and tags |
| Server memory (`src/server/places.ts`, `recommend.ts`, `routes.ts`) | lookup cache with no expiry, nearby results 10 min, photo URLs 2 h, candidates 6 h, travel legs 24 h | removed; per-request use only |
| Browser (`src/lib/places/client.ts`, `destination-photo.ts`, `recs/destination-picks.ts`, `recs/itinerary-draft.ts`) | details and places for the life of the tab | replaced by the UI Kit and `PlaceRef` |
| `/api/places/photo` | images with `public, max-age=86400, stale-while-revalidate=604800` | private, per request |

### A.2 Sent to the model

| Path | Google content | Fix |
| --- | --- | --- |
| Place Q&A helper (`src/server/answer.ts`, `/api/places/ask`) | review sentences with author, stars and age; review and generative summaries; attributes | no model on Google reviews (4.4, item 1) |
| `ask_about_place` tool result (`TravelCopilot.tsx`) | the answer with its quotes, saved and replayed | return only the place ID and guidance (item 2) |
| Catalog pool (`TravelCopilot.tsx`, `/api/catalog/pool`) | 40 places: name, Google type, price level, rating | our signals or nothing (item 3) |
| `import_reservation` tool result | a full place record | without the place (item 4) |
| Link import (`src/server/import/index.ts`) | Google Maps pages fetched and read by the model | refused (item 6) |
| Taste context (`src/lib/feedback/taste.ts`) | loved and disliked names, Google price tendency | our labels and tags (item 7) |
| Map pins, trip stops, saved items, missed picks, other tool results, messages sent from cards | Google names | our labels (item 7) |

### A.3 Shown

| Surfaces | Source today | Change |
| --- | --- | --- |
| Chat cards: hotels, restaurants, attractions, destination and plan workspace, package, trip proposal, comparison, place answer, imported places, reservations | resolved pins from the catalog, the catalog pool, `place_facts`, stored tool results | `GooglePlace` rows and cards inside our frames; our reasons only |
| Map panel, pin strip, phone map sheet | the map store (pins from the catalog and copies) | pins from `PlaceRef` coordinates; strip rows from `GooglePlace` |
| Place detail sheet (`src/components/map/PlaceDetailSheet.tsx`) | the pin plus `place_facts` (reviews, hours, 5 photos) | `GooglePlace` sheet plus our sections |
| Trip map, board, tiles, list, post-trip rating | stored copies in `trips` and `trip_items`, `place_facts`, cached legs | `PlaceRef` plus `GooglePlace`; legs on view |
| Home picks, Jump back in, Discover hero and collections, Explore | search results via `search_cache` and the catalog; stored copies | per-request ranking; `GooglePlace` |
| Guides (cards, page, editor), Saved | stored copies, Google photo covers | `PlaceRef` plus `GooglePlace`; Wikipedia or live covers |
| Traveler reviews, taste profile, admin | stored names and types | our labels and tags |
