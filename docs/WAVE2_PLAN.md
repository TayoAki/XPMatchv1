# Wave 2 plan: review Q&A, itinerary board, taste profile, inspiration import

> **Status: shipped.** All five steps below are built, unit- and end-to-end-tested and documented in
> `docs/USER_FLOWS.md`. Deviations from the plan, all deliberate: travel times are straight-line estimates
> (the Routes API decision is still open); pointer drops land where the pointer is and keyboard drags use
> nearest corners (live re-parenting while dragging fought dnd-kit's measuring); "Add to Day N" is the
> Ideas tray's select rather than a separate stops endpoint (the whole itinerary is saved on every change);
> screenshots shipped in the same step as links; a Places result counts as the mentioned place only when
> its name matches; "Not for me" hides a card immediately; no nightly real-API CI job.

How to build and test the next four features from `docs/GAP_ANALYSIS.md`, in the order that makes each
one cheaper to build than the last. Every design below reuses what Wave 1 put in place (the `preferences`
table, the chip / compare / heads-up cards, persisted transcripts) and keeps the rule that made Wave 1
trustworthy: **evidence is rendered from source data, never retyped by the model**.

| Step | Feature | Effort | Depends on |
| --- | --- | --- | --- |
| 0 | Test foundation: unit tests, in-repo end-to-end suite, Places stub, CI | 1–2 days | — |
| 1 | Questions answered from reviews (Yelp) + the place-facts layer | 4 days | 0 |
| 2 | Itinerary and map in one board (Wanderlog) | 6 days | 0 |
| 3 | Personal taste profile (Beli) | 4 days | 0, and 2 for the post-trip flow |
| 4 | Inspiration → plan (Mindtrip): links, then screenshots | 4 + 2 days | 0, and 2 for "Add to Day" |

About four weeks for one engineer, no new vendors. The place-facts layer (step 1) also upgrades Wave 1's
comparison and heads-up chips with real evidence, which is why it goes first; the board (step 2) is the
largest visible change and both the post-trip rating (3) and imports (4) land their results on it.

## 0. Test foundation

**Today.** Verification runs from Playwright scripts kept outside the repository against a stand-in
OpenRouter server, with the real Google Places API. Nothing runs in CI and there is no `npm test`.

**Build.**
- `vitest` for unit tests under `tests/unit/` (pure modules: `search-parser`, transcript trimming and
  settling, the constraint and compare stores, and every new pure module below). Script `npm test`.
- `@playwright/test` under `tests/e2e/` with the current scripts ported to specs (`full`, `trips`,
  `guides`, `sheet`, `wave1`, `restore`). `playwright.config.ts` starts `next dev` with `PGLITE_DIR`
  pointing at a temp directory and `OPENROUTER_BASE_URL` pointing at the checked-in stand-in model
  (`tests/e2e/mock-openrouter.mjs`, moved into the repo with its scenarios). Script `npm run test:e2e`.
- **Places stub.** `src/server/places.ts` reads `PLACES_BASE_URL` (default Google). `tests/e2e/mock-places.mjs`
  serves canned Text Search, Nearby, Details and photo responses for a small Rome fixture set (hotels,
  restaurants, attractions, each with five reviews, attributes and a review summary). Suites run without
  Google keys, deterministically and for free; a `GOOGLE_MAPS_API_KEY` in the environment switches the
  same specs to the real API for a nightly run.
- `.github/workflows/ci.yml`: lint, type check, unit tests, end-to-end tests on every push and pull request.

**Definition of done.** `npm test` and `npm run test:e2e` pass locally and in CI with no secrets.

## 1. Questions answered from reviews (Yelp)

### What it looks like
- The place sheet gains an **Ask** box under the header: "Ask about this place… e.g. Is it quiet at
  night?" with three suggested questions built from the place kind and the traveler's dealbreakers and
  learned preferences (hotel: "Is it quiet at night?", "Is there a desk to work at?", "How far is the
  metro?"; restaurant: "Vegetarian options?", "Do I need to book?", "Good for a group?"; attraction: "How
  long does it take?", "Is it crowded?", "Worth it with kids?").
- The **answer card** shows one to three sentences, a confidence label (clear / mixed / not mentioned),
  then **Evidence**: review passages quoted verbatim with author, star rating and relative date, the
  matching phrase highlighted; attribute badges ("Outdoor seating: yes", "Serves vegetarian food: yes",
  "Wheelchair-accessible entrance"); and an evidence line: "Based on Google's review summary, 5 recent
  reviews and 14 attributes". When nothing supports an answer the card says "Not mentioned in the
  available reviews" and offers the website and phone.
- The Reviews tab gains **topic chips** (Noise, Cleanliness, Service, Value, Location, Food, Crowds,
  Wait) with mention counts; tapping one highlights the reviews on that topic. This is Yelp's Review
  Insights without inventing a 1–100 score from five reviews.
- In chat, "is Hotel Artemide noisy?" produces the same card inline, linked to the pin.

### How it works
1. **Place-facts layer.** Table `place_facts (place_id pk, kind, name, attributes jsonb, review_summary,
   generative_summary, reviews jsonb, opening_hours jsonb, price_range jsonb, fetched_at)`.
   `src/server/place-facts.ts` fills it with one Place Details call whose field mask adds `reviewSummary`,
   `generativeSummary`, the attribute booleans (`allowsDogs`, `goodForChildren`, `goodForGroups`,
   `liveMusic`, `outdoorSeating`, `reservable`, `servesVegetarianFood`, `takeout`, `delivery`, `dineIn`,
   `restroom`), `parkingOptions`, `paymentOptions`, `accessibilityOptions`, `priceRange` and
   `currentOpeningHours`. Rows refresh after 30 days (Google's caching limit). `getPlaceDetails` reads
   from it, so the sheet, the comparison card and the heads-up chips share one Details call per place per
   month across all users instead of one per server process.
2. **Evidence retrieval is deterministic** (`src/server/evidence.ts`): a topic lexicon (noise → quiet,
   noisy, loud, traffic, thin walls, street; workspace → desk, wifi, work; and so on for the eight
   topics plus the attribute keys) maps the question to topics, review text is split into sentences,
   matching sentences are ranked by topic hits and recency, attributes are matched by key, and the review
   summary is searched the same way. Output: `{ snippets: [{ reviewIndex, sentence, terms }], attributes:
   [{ key, value, label }], summaryHits, topicCounts }`.
3. **Answering** (`answerPlaceQuestion(facts, question, traveler)`): one structured-output model call
   (cheap model, AI SDK `Output.object`) that receives only the evidence and must return `{ answer,
   confidence, evidenceRefs: [{ type: review | attribute | summary, ref }], notMentioned }`. Quotes are
   rendered from the referenced review by index; a ref that does not exist is dropped. With no evidence
   the template answer is returned without a model call. A short pre-check declines off-topic or personal
   questions (Yelp's classifier step, kept simple: length, topic outside the place, requests for people's
   data).
4. **Two entry points, one implementation.** `POST /api/places/[id]/ask` for the sheet (no chat turn,
   ~1 s). Server tool `ask_about_place({ placeId?, name, destination?, question })` for the chat, whose
   result the client renders with `useRenderToolCall` as the same answer card, so the outer model never
   handles quotes.
5. **Compliance.** Reviews display unmodified with author attribution; derived facts cached at most 30
   days; no bulk export.

### Files
`src/server/schema.ts` (migration 0003), `src/server/place-facts.ts`, `src/server/evidence.ts`,
`src/server/answer.ts`, `src/app/api/places/[id]/ask/route.ts`, `src/server/agent.ts` (tool),
`src/components/place/AskAboutPlace.tsx`, `src/components/place/EvidenceList.tsx`,
`src/components/place/TopicChips.tsx`, `src/components/chat/cards/PlaceAnswerCard.tsx`,
`src/components/map/PlaceDetailSheet.tsx`, `src/lib/travel/prompt.ts`.

### Tests
- **Unit.** Lexicon: question → topics (twelve phrasings per topic). `findEvidence` on the Rome fixture:
  "quiet?" returns the two sentences that mention noise with the right review indices; "desk?" returns no
  snippet and no attribute; "dogs?" returns the `allowsDogs` attribute. Quote validation: a model ref
  outside the review range is dropped. Refresh: a row older than 30 days triggers one Details call, a
  fresh row none. `answerPlaceQuestion` with a stubbed model returns the card shape; with empty evidence
  it returns the template without calling the model.
- **API.** `POST /api/places/[id]/ask` against the Places stub returns an answer with a verbatim quote;
  unknown place id → 404; empty question → 400.
- **End to end.** Open a hotel sheet → tap "Is it quiet at night?" → the answer card shows a highlighted
  quote whose text also appears in the Reviews tab; ask "Do they allow dogs?" → attribute badge; ask "Is
  the owner nice?" → "Not mentioned"; topic chip "Noise · 2" highlights two reviews; in chat, "is Hotel
  Artemide noisy?" → the stand-in model calls `ask_about_place` → the card renders with a Map link that
  opens the sheet.
- **Production check.** Ask three questions about a real place; confirm the Details SKU did not change
  in the Cloud console (reviews were already on the Enterprise + Atmosphere tier).

### Cost and risks
No new Google SKU; Details calls fall because the cache is shared. About $0.001 of model per question.
`reviewSummary` and `generativeSummary` are missing for many places; the card must read fine without
them. Five reviews is a hard cap: the evidence line says so every time.

## 2. Itinerary and map in one board (Wanderlog)

### What it looks like
- The trip page gets a **Board** view (the tiles remain as jump links): one scrolling column beside the
  map with Overview (dates, travelers, bookings), **Days** (each a list of numbered stops: photo, name,
  category, start time, duration, note, with a travel leg between stops "12 min walk · 0.9 km · est." and a
  Directions link), an "Add a stop" search inside every day, and an **Ideas** tray of unscheduled items.
- Stops drag within a day, between days and from Ideas into a day (`@dnd-kit`, pointer and keyboard
  sensors). Every stop also has a **Move to…** menu (Wanderlog's checkbox alternative) so nothing
  depends on dragging. **Optimize order** on a day sorts by nearest neighbor from the first stop.
- The map shows numbered pins colored per day, chips "All · Day 1 · Day 2 …" as layers, a light line
  through each visible day in stop order, and hover sync with the board.

### How it works
1. **Structured stops** without a table change: `trips.itinerary` becomes version 2, `{ day, title,
   stops: [{ id, title, note, kind?, place?: ResolvedPlace, startTime?, durationMin?, itemId? }] }`.
   `src/lib/itinerary.ts` holds `normalizeItinerary` (version 1 strings become stops without places; applied
   on read, idempotent, nothing destructive), `moveStop`, `reorderDay`, `estimateLeg` (straight-line
   distance × 1.3 path factor; 5 km/h walking under 2 km, 25 km/h driving otherwise, labeled "est."),
   `optimizeDay` (nearest neighbor) and `dayColor`.
2. **Server resolution.** `PATCH /api/trips/[id]` accepts version 2; stops with a `kind` and no `place`
   are resolved through Places Text Search biased to the destination (existing cache, at most 8 in
   parallel, best effort). "Add to Day N" on an idea copies the idea's place into a stop
   (`POST /api/trips/[id]/stops { day, itemId | place | title }`); reorder and move send the whole
   itinerary, which stays small.
3. **Assistant.** `create_trip` and `update_trip_plan` take `stops: [{ name, kind?, note?, startTime?,
   durationMin? }]` per day (the server resolves them); new `schedule_stops({ stops: [{ name, day, kind?,
   note?, startTime? }] })` for "put the Colosseum on day 2 in the morning", merging into the affected days
   only. The trip context already lists days and stops.
4. **Map.** `PlacesMap` and `GoogleMap` gain per-pin `color` and `label` (numbered advanced markers),
   `routes: [{ color, path }]` drawn as polylines, and the day filter chips.
5. **Travel time** ships as the estimate. Real durations by mode (Routes API) sit behind a flag for a
   later decision because they are billed per request.

### Files
`src/lib/itinerary.ts`, `src/lib/types.ts`, `src/app/api/trips/route.ts` and `[id]/route.ts` (schemas),
`src/app/api/trips/[id]/stops/route.ts`, `src/components/trips/board/{TripBoard,DayColumn,StopCard,
IdeasTray,TravelLeg,useItineraryDnd}.tsx`, `src/components/trips/TripPage.tsx` (Board / tiles toggle),
`src/components/trips/TripMap.tsx`, `src/components/map/{PlacesMap,GoogleMap}.tsx`,
`src/components/chat/TripChatScope.tsx` (schedule_stops), `src/lib/travel/schemas.ts`, prompt.

### Tests
- **Unit.** Normalizer: version 1 strings → stops; version 2 passes through; junk is dropped. Move and
  reorder helpers across every case (within a day, across days, from Ideas, to an empty day). Leg estimate
  math and mode choice. Nearest-neighbor order on a fixture with a known answer. Color assignment stable
  per day.
- **API.** PATCH with version 2 resolves places through the stub and returns them; over 30 days or 20 stops
  per day → 400; a legacy trip with string items loads as stops.
- **End to end.** Create a trip, add two ideas → Board → "Move to Day 1" on one idea → a numbered pin in
  Day 1's color; drag a stop from Day 1 to Day 2 with pointer moves past dnd-kit's activation distance;
  reorder with the keyboard sensor (space, arrow, space) as the reliable path; reload → order persists;
  Day 2 chip hides Day 1 pins; travel leg text between two stops; "put the Colosseum on day 2" through the
  stand-in model → `schedule_stops` → the stop appears on the board and map.
- **Manual.** Mobile layout (map above the board), a 10-day trip, a trip with no dates.

### Cost and risks
No new Google spend (lines and estimates are client-side). Pointer drag in automation is the flaky part,
so the keyboard path carries the assertions and one pointer test is allowed to retry. Version 2 rollout
is read-time only, so older trips never break.

## 3. Personal taste profile (Beli)

### What it looks like
- A **reaction control** on every place surface (card footer menu, sheet header, trip idea and stop
  rows, Saved): "Loved it / It was fine / Not for me", then reason chips per domain (stays: quiet,
  location, design, clean, service, value, bed, workspace; food: taste, value, ambiance, service, wait,
  portions; activities: worth it, crowded, too long, kid-friendly, physically demanding; destinations:
  vibe, food, cost, weather, safety) and an optional note. "Not for me" also hides the card.
- **Post-trip rating.** The day after a trip's end date, Updates and the trip page show "How was Rome?
  Rate 6 places"; a sheet steps through the trip's stops and ideas with the three buckets, then up to
  three "Which did you prefer?" pairs against places already rated in the same domain. That is Beli's
  local insertion: positions in a per-domain ranked list produce a 0–10 score nobody types.
- **Your taste** in Update my assistant: per-domain summary (top liked and disliked reasons, ranked
  places, price tendency), the full history with delete.
- **On cards**: a "Fits your taste" line when a pick matches liked categories or reasons ("Like Trattoria
  Da Enzo, which you loved"), computed deterministically; the model also receives the taste profile and
  refers to it in `whyItFits`.

### How it works
1. Table `place_feedback (id, user_id, place_id, kind, name, destination, place jsonb, verdict loved | fine |
   disliked, reasons text[], note, trip_id?, source card | sheet | trip | post_trip | hide, position numeric?,
   created_at)`, unique per user and place (a new reaction updates the row).
2. `computeTasteProfile(userId)` (`src/server/taste.ts`) aggregates feedback, saved items and Wave 1
   preferences into `{ domains: { stays: { liked: [{ reason, count }], disliked, topPlaces, priceTendency,
   categories } } }`, stored in `profiles.taste` on every write and returned by `/api/me/state`. Strong
   signals (the same reason disliked twice) also become `preferences` rows with `source = feedback`, so
   the Wave 1 memory panel and the agent context pick them up with no extra plumbing.
3. Ranking (`src/lib/ranking.ts`, pure): the three buckets seed the search range, each comparison halves
   it (binary insertion), the final position interpolates to 0–10; incomparable pairs can be skipped.
4. **Assistant.** Context "Taste profile" (compact per-domain summary plus the last ten reactions);
   frontend tool `record_feedback({ name, kind, verdict, reasons, note })` for "the hotel was too noisy"
   said in chat, immediate, with a small chip; prompt rules to use the profile and avoid disliked patterns.

### Files
`src/server/schema.ts` (migration), `src/server/taste.ts`, `src/lib/ranking.ts`,
`src/app/api/me/feedback/route.ts` and `[id]/route.ts`, `src/lib/store.tsx`,
`src/components/feedback/{ReactionControl,PostTripRating}.tsx`, card footers, sheet header,
`TripSections.tsx`, `AssistantSettingsDialog.tsx` (Your taste), `TravelCopilot.tsx`, prompt.

### Tests
- **Unit.** `computeTasteProfile` on fixtures → expected summaries and the threshold that creates a
  preference row; ranking: bucket seeds, insertion with recorded answers, interpolation, skip handling;
  reason chips per kind; "Fits your taste" matcher on category and reason overlap.
- **API.** Feedback insert, update on a second reaction, delete; state includes `taste`; a trip whose
  end date passed yields the post-trip prompt once.
- **End to end.** Rate a hotel from the sheet ("Loved it" + "Quiet") → Your taste lists it → the next chat
  turn's context contains it (asserted from the stand-in model's request log); "Not for me" on a card
  hides it; create a trip with past dates and two placed ideas → the post-trip banner → rate both → one
  pairwise question → the ranked list shows both with scores; the memory panel shows a
  `source = feedback` preference after two "noisy" dislikes.

### Cost and risks
No external calls. The risk is signal sparsity: the profile is honest about it ("2 ratings so far") and
the "Fits your taste" line only appears with real overlap.

## 4. Inspiration → plan (Mindtrip)

### What it looks like
- **Import inspiration** from the chat composer's + menu, the Create page (new **Import** tab) and Saved.
  Paste a link (blog, Reddit thread, YouTube page, an article) or, in phase B, upload a screenshot or
  photo. Instagram and TikTok pages cannot be read; the dialog says so and points to the screenshot path.
- The result is an "Imported from <site>" card set in the chat with the usual photo, rating, category,
  a short "mentioned as…" line, Save, Add to trip and Compare, pinned on the map with the destination in
  focus, plus **Add all to a trip** (with "Add to Day N" once the board exists), **Plan a trip from
  these** and **Save as a collection** (a private guide). Mentions that could not be verified through
  Places are listed, not shown as cards. Imports are kept under Saved › Imports.

### How it works
1. `POST /api/import` with `{ url }` or a multipart image (`src/server/import.ts`):
   - **Guard.** http(s) only, hostnames resolved and rejected when private or loopback, at most three
     redirects each re-checked, 2 MB and 8 s limits, a browser-like user agent.
   - **Extraction.** Title, `og:title` and `og:description`, headings, paragraphs and list items with
     scripts, styles and navigation removed, capped at 15k characters; Reddit through its public JSON
     form; YouTube through page metadata.
   - **Structured model call** (cheap model, `Output.object`): `{ destination?, places: [{ name, kind,
     city?, why }] }`, at most 20, deduplicated by name. Phase B sends the image to `openai/gpt-4o-mini`
     with the same schema.
   - **Verification.** Every candidate is resolved through Places Text Search biased to the destination;
     unresolved ones become "couldn't verify"; only place names and a `why` of at most 160 characters
     are stored (`imports (id, user_id, source_url, source_title, site, destination, places jsonb,
     unverified jsonb, created_at)`), cached by URL hash for seven days.
2. **Chat tool** `import_inspiration({ url })` (frontend): calls the API, renders `ImportedPlacesCards`,
   pins the resolved places and returns their names so the model can continue with `create_trip` or
   `add_trip_ideas`. Pasting a bare URL in chat triggers it through a prompt rule.
3. **Dialog** (`ImportDialog`) for the Create page and the composer menu, using the same API, with the
   output choice after extraction (chat about it, add to a trip, save as a collection), as Mindtrip does.

### Files
`src/server/import.ts`, `src/app/api/import/route.ts`, `src/server/schema.ts` (migration),
`src/components/import/{ImportDialog,ImportedPlacesCards}.tsx`, `src/components/chat/TravelChat.tsx`
(menu entry), `src/components/guides/CreateClient.tsx` (Import tab), `src/app/(app)/saved/page.tsx`
(Imports tab), `src/components/chat/TravelCopilot.tsx` (tool), prompt.

### Tests
- **Unit.** Guard rejects `file:`, `127.0.0.1`, `10.0.0.1`, `169.254.169.254`, a redirect to a private
  address, oversized bodies. Extraction on fixtures: a blog post yields its headings and paragraphs, a
  Reddit JSON fixture its post and top comments, a YouTube-style page its metadata. Schema parsing caps at
  20 and deduplicates.
- **API.** With a local fixture site (`tests/e2e/fixtures/site/`), the stand-in model returning a fixed
  extraction and the Places stub: five resolved places, two unverified; a 403 fixture returns the honest
  message; a repeated URL is served from the cache with no model call.
- **End to end.** Paste the fixture URL in chat → "Imported from example.test" cards with pins → Add all
  to a new trip → the trip's ideas list; Create › Import with a PNG fixture (phase B, stand-in vision) →
  cards; Saved › Imports lists both; an Instagram-like URL shows the screenshot hint.

### Cost and risks
About $0.002 of model per link import, $0.01 with an image, plus Places resolution per verified place
(about $0.04 each in `docs/COGS.md`): roughly $0.30 for a typical seven-place import, cached per URL.
Blocked sites are common; the product answer is the screenshot path, not scraping workarounds.
Extraction can invent places; requiring a Places match and showing "couldn't verify" keeps it honest.

## 5. Review of this plan

- **Honesty holds.** Quotes come from stored review text by index, attributes from Places, "fits your
  taste" from recorded reactions, imports only from places that resolve. The model reasons over evidence
  but never manufactures it, and each card states its evidence base and its limits (five reviews, estimates).
- **Cost.** No new Google SKUs. The shared place-facts cache lowers Details spend; the only new Places
  spend is import resolution, bounded per URL by the cache. Routes API and Yelp Fusion stay optional.
- **Data safety.** Itinerary version 2 is a read-time normalizer; feedback, imports and facts are new
  tables; nothing rewrites existing rows.
- **Sequencing.** Facts and Q&A first because compare and heads-ups get real evidence from the same
  layer; the board before taste and import because both deliver onto it.
- **Decisions to confirm before starting:** (1) accept estimated travel times now and decide on the
  Routes API after seeing the board; (2) add `@dnd-kit` as the drag-and-drop dependency; (3) "Not for me"
  hides a card immediately; (4) links first, screenshots second, documents and email confirmations
  later; (5) whether nightly runs against the real Google API are wanted in CI (needs a key as a secret).
