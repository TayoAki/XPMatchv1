# Gap analysis: nine features to borrow, and how to close the gaps in the XPMatch MVP

Companion to `docs/COMPETITIVE_RESEARCH.md` (how each competitor does it today) and `docs/USER_FLOWS.md`
(what XPMatch does today). The source table called the product "MileMatch"; the codebase is XPMatch and
the names are used interchangeably here.

Effort: **S** = days, **M** = 1–2 weeks, **L** = 3+ weeks or a new vendor contract.

## Summary

| # | Feature (from) | XPMatch today | Gap | Closing move | Effort | Wave |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Personal taste profile (Beli) | Onboarding profile + `update_traveler_profile`; hearts as the only signal | No like/dislike with reasons, no per-domain taste model, no past-trip feedback | Place feedback loop → per-domain taste profile fed to the agent and shown on cards | M | 2 |
| 2 | Inspiration → plan (Mindtrip) | Save places/guides; "Plan a trip from this guide" | No link/screenshot/document import | `import_inspiration`: paste a link (then a screenshot) → places → cards → trip | M then L | 3 |
| 3 | Itinerary + map in one board (Wanderlog) | Trip page tiles + map of ideas; itinerary is plain text | Stops are not places; no day pins; no drag-and-drop; no travel times | Structured stops linked to places, per-day pins, one board view, DnD | M/L | 2 |
| 4 | Natural-language smart filters (Booking.com) | Chat + planner bar; Explore free-text search | Constraints stay implicit; nothing visible or editable | `search_constraints` tool → editable chips; Explore query parsing + Places filters | M | 1 |
| 5 | Questions answered from reviews (Yelp) | Sheet shows 5 Google reviews + editorial summary | No Q&A, no evidence | `ask_about_place` grounded on Places reviews, attributes and Google's review summary, with quotes | M | 2 |
| 6 | Side-by-side comparison (Tripadvisor) | Cards only | No compare mode, no priorities | `compare_options` tool + compare UI: priorities × options, strengths/compromises/unknowns | M | 1 |
| 7 | Hidden tradeoffs (StayMatch) | `whyItFits` only (positives) | No downsides, no dealbreakers | `tradeoffs` on cards + dealbreakers in the profile; grounded "heads-up" chips | S → M | 1 |
| 8 | Learn preferences in conversation (Layla) | Saves immediately, profile-wide only | No confirmation, no trip vs profile scope, no memory UI | Human-in-the-loop "Remember this? For this trip / Always", memory panel | S/M | 1 |
| 9 | Flight price tracking (Google Travel) | Estimated fares + Google Flights links | No live fares, no scheduler, no email/push | Watch intent first; fare API + cron + email later | L | 4 |

Waves: **1** ships in the next 2–3 weeks with no new vendors; **2** adds data/UX depth; **3** adds content
import; **4** waits on a fare API and email.

## Wave 1 status: shipped

Design and review in `docs/WAVE1_PLAN.md`; flows in `docs/USER_FLOWS.md`.

| # | What shipped | Left for Wave 2 |
| --- | --- | --- |
| 4 | `set_search_constraints` → editable "Understood as" chips (must-have vs preference, "Not applied" for unmappable phrases, edits re-run the search, chips stay in the agent's context, "Save to trip"); Explore parses price words, "under $30", ratings, "open now" into Places `priceLevels` / `minRating` / `openNow` and shows the chips | review-checked post-filter for "quiet"-style constraints |
| 6 | Compare toggles on hotel, restaurant and attraction cards → floating bar → `compare_options` card: priorities × options with strong/ok/weak/unknown verdicts and notes, Price, Rating (Google rating and review count replace the model's guess when the option is pinned), Location, Strengths, Compromises, Couldn't verify; Map / Save / Add to trip / Pick this one per column | negative-mention counts and review evidence per cell |
| 7 | `tradeoffs` on hotel, restaurant, attraction and flight cards rendered as amber Heads-up chips; "What ruins a trip for you?" dealbreaker chips in onboarding stored as `polarity = dealbreaker` preferences and checked by the prompt | flags grounded in review text and Places attributes with confidence |
| 8 | `remember_preference` human-in-the-loop card (Always / For this trip / No thanks), "What XPMatch has learned" panel with delete and a "Learn from our chats" switch, trip-scoped list on the trip page, profile-wide and trip-scoped preferences in the agent's context | learning from clicks and trip ratings |
| — | Foundations: `preferences` table + API + store; chat transcripts persisted in Postgres by the runtime runner (chats survive deploys); follow-up suggestions paused while a card waits for a click (fixes the `AI_MissingToolResultsError` seen in production) | place facts layer, evidence rendering, notification channels, instrumentation |

## Where the research says we can beat the originals

The competitor teardowns in `docs/COMPETITIVE_RESEARCH.md` expose four gaps none of the nine currently
fill, and our versions should be built around them:

1. **Show what was understood.** Booking.com maps text to filters but never shows or lets you edit the
   result; our constraint chips do both, and say what could not be mapped.
2. **Compare as a structured artifact.** Tripadvisor answers "compare these two hotels" in prose and was
   caught giving unhedged verdicts; our comparison card has explicit priorities, evidence, negative-mention
   counts and a "missing information" row.
3. **Confirm before remembering, and choose the scope.** Layla infers preferences silently and offers only
   an account-wide opt-out; our "Remember this? For this trip / Always / No" is the trust story.
4. **Evidence with confidence.** StayMatch scores how much review evidence sits behind each flag and Yelp
   cites passages inline; we do both on every heads-up, answer and comparison cell, and are honest that
   Google supplies at most five reviews per place.

## Foundations shared by several features

1. **Unified preference model.** One table `preferences` (user_id, domain: stays|food|flights|activities|
   general, statement, polarity: like|dislike|dealbreaker, scope: profile|trip, trip_id, source:
   onboarding|chat|feedback|import, confirmed_at). Onboarding fields map into it; features 1, 4, 6, 7 and 8
   read from it; the agent gets a compact rendering in context.
2. **Place facts layer.** `place_facts` (place_id, kind, attributes jsonb, review_summary, generative_summary,
   reviews jsonb, fetched_at) filled from Places Details with the attribute fields we do not request today
   (`allowsDogs`, `goodForChildren`, `liveMusic`, `outdoorSeating`, `servesVegetarianFood`,
   `parkingOptions`, `accessibilityOptions`, `paymentOptions`, `reviewSummary`, `generativeSummary`).
   Refreshed at most every 30 days (Google's caching limit). Features 5, 6 and 7 read from it, so one
   Details call serves all three.
3. **Evidence rendering.** A shared `EvidenceList` component: quoted review snippets with author and
   relative date (Google attribution rules), attribute badges, "no evidence" state.
4. **Notification channels.** Email (e.g. Resend) added to the existing in-app Updates so features 9 and
   trip activity can reach people who are not in the app.
5. **Instrumentation.** Event log (`events`: user_id, name, props) for the metrics listed per feature.

## 1. Personal taste profile (Beli)

**How Beli does it.** A three-bucket reaction ("I liked it / It was fine / I didn't like it") seeds a
handful of pairwise comparisons against places you already ranked, which insert the place into a
per-category ranked list; the 0–10 score is derived from list position, never typed. "Good for" labels,
notes and favorite dishes capture the why, separately from the score. Every unvisited place gets a
predicted score for you and a friends' average.

**Today.** The profile captures stated preferences at onboarding and through `update_traveler_profile`.
Saved hearts are positive-only, un-reasoned signals. Past trips are not used as evidence.

**Gap.** No way to say "I liked this place because…" or "not for me because…", no per-domain taste
(stays vs food vs flights vs activities), no ranking among places, no "fits you" scoring.

**Close it.**
- **Feedback on any place** (card, place sheet, trip idea, past trip): 👍 / 👎 plus reason chips per
  domain — stays: location, quiet, design, cleanliness, service, value, bed, workspace; food: taste,
  value, ambiance, service, wait, portions; activities: worth it, crowded, too long, kid-friendly, physically
  demanding; flights: schedule, seat, price, airline — plus an optional note. Table `place_feedback`
  (user_id, place jsonb, kind, verdict, reasons text[], note, trip_id, created_at).
- **Taste profile derivation** (server, on write): per domain, weighted counts of liked/disliked reasons
  → `preferences` rows with `source = feedback`. Rendered to the agent as e.g. "Stays: values quiet and
  design; disliked noise twice. Food: loves markets and tasting menus; dislikes long waits."
- **On cards:** a "Fits you" line grounded in the taste profile ("You rated two quiet design hotels
  highly") and a "Not for me" action that records a dislike and hides the card.
- **Post-trip prompt:** after a trip's end date, Updates asks "How was Rome?" → the three-bucket reaction
  for each idea and booking, then at most three "which did you prefer?" comparisons against places
  already rated in the same domain (Beli's local insertion), which yields a per-domain ranked list and a
  derived score without asking anyone to type a number.
- **Update my assistant** gains a "Your taste" section listing learned preferences with delete.
- **Metrics:** % of shown cards with feedback, % of users with ≥5 feedback events, repeat-save rate.
- **Effort:** M. No vendors. Model prompt updated to use the taste profile and explain fit.

## 2. Turn inspiration into a plan (Mindtrip)

**How Mindtrip does it.** "Start Anywhere": paste a link, upload a screenshot, photo, PDF or notes list,
share from the iOS share sheet, or email a booking confirmation; OpenAI models extract places against
Mindtrip's own POI database and the user picks the output shape (chat, collection or trip). Known limits:
TikTok needs text overlays, one input yields one output, no browser extension.

**Today.** Users can save places and community guides, add them to trips and ask the assistant to plan
from a guide or from saved places. There is no way to bring in outside inspiration.

**Gap.** No link import, no screenshot or document interpretation, no share-sheet entry point.

**Close it.**
- **Phase A — links** (M): "Import inspiration" from the chat's + menu, the Saved page and the guide
  editor: paste a URL or text. Server route fetches the page (readability extraction; for TikTok /
  Instagram / YouTube use oEmbed and Open Graph data since page bodies are not accessible), then a
  model call extracts `{ name, city, kind, why }[]`; places are resolved through Places and rendered as
  an "Imported from <domain>" card set with Save, Add to trip and **Plan a trip like this** (sends a
  prompt seeded with the extracted places). Store the import (`imports`: user_id, url, title, places
  jsonb) so it appears under Saved › Imports.
- **Phase B — screenshots and photos** (M): image upload in the chat input (CopilotKit's `onAddFile`);
  the extraction call uses a vision-capable model (`openai/gpt-4o-mini` accepts images) to read
  captions, place names and cities; same pipeline afterwards.
- **Phase C — documents** (L): PDF and email confirmations → bookings (see Wanderlog), itineraries →
  itinerary stops.
- **Mobile entry:** a PWA manifest with a Web Share Target so "Share → XPMatch" works from TikTok and
  Instagram on Android; a browser extension later.
- **Metrics:** imports per user, places extracted per import, % imports that become a trip.

## 3. Itinerary and map together (Wanderlog)

**How Wanderlog does it.** One scrolling plan (reservations, notes, lists, days, budget) beside a map;
every place is pinned on add; pins are colored per list or day with a layers toggle and lines in itinerary
order; travel time and distance between stops by mode; a per-trip email address and an optional Gmail
scan import flight and hotel confirmations; checkbox multi-select "Move to day" as well as drag-and-drop;
"Optimize route" for one day between a chosen start and end.

**Today.** The trip page has tiles for Ideas, Itinerary, Bookings and Media next to a map of every place
attached to the trip. The itinerary is text lines per day, not linked to places; bookings are links.

**Gap.** Stops are not places, so days do not appear on the map; no drag-and-drop; no single board that
mixes flights, stays, restaurants and experiences; no travel times or route lines.

**Close it.**
- **Structured stops:** itinerary days hold `{ id, text, placeId?, itemId?, time? }`. "Add to Day N" on
  every idea; the assistant's `update_trip_plan` and a new `schedule_idea` tool set stops with place
  references. Migration keeps old string stops as text-only.
- **Board view:** replace the tile-only layout with one scrollable board beside the map: Overview
  (flights and stays from Bookings), Days (stops in order, numbered), Ideas (unscheduled). Tiles remain as
  jump links. Day-by-day stays optional: a trip with no scheduled stops is just a board of ideas.
- **Map by day:** numbered, color-coded pins per day, "All / Day 1 / Day 2" chips, and a light route line
  between consecutive stops. Travel time between stops via the Google Routes API comes later (cost per
  call; cache per pair).
- **Move first, drag later:** checkbox multi-select → "Move to Day N / Ideas" (Wanderlog's keyboard-free
  path) ships with the board; drag-and-drop with `@dnd-kit` follows.
- **Reservation inbox:** a per-trip forwarding address (e.g. trip-<id>@in.xpmatch.app via an inbound email
  provider) turns forwarded confirmations into Bookings automatically; a Gmail scan is out of scope.
- **Reservation import:** paste a confirmation email or PDF text → model parses provider, dates,
  confirmation number → Bookings entry with a date, shown on the board and the calendar.
- **Metrics:** % of trips with ≥1 scheduled stop, stops per trip, share of ideas that get scheduled.
- **Effort:** M for stops + board + day pins; L including DnD polish, routes and import.

## 4. Natural-language Smart Filters (Booking.com)

**How Booking.com does it.** A free-text box in the app ("Hotels in Amsterdam with a great gym, a rooftop
bar, and canal views"); GPT models map it onto Booking's existing filter taxonomy (property type,
facilities, distance) and return the filtered list. Nothing shows what was understood or lets the user
edit it, and unmappable parts fail silently.

**Today.** Constraints the traveler states ("quiet, near restaurants, under $250") live only in the
model's head; hotel cards reflect them implicitly. Explore's search box runs a free-text Places query.

**Gap.** Nothing shows what was understood, nothing is editable, and unmappable constraints fail
silently.

**Close it.**
- **`search_constraints` tool:** whenever criteria are stated, the model calls it with
  `{ kind, budgetMax, currency, area, mustHave[], niceToHave[], avoid[], vibe[] }`; the UI renders
  editable chips above the results ("Quiet ✕ · Near restaurants ✕ · Under $250/night ✕ · Pool ✕") with an
  "Understood as" label; removing or editing a chip re-runs the request. Chips persist for the chat and
  can be saved to the trip's preferences.
- **Explore:** parse the search text server-side with a cheap model call into the same schema, then run
  Places Text Search with real parameters (`priceLevels`, `minRating`, `openNow`, `includedType`) and show
  chips for what was applied. Constraints Places cannot express (e.g. "quiet") show as "not filtered,
  checked in reviews" and hand off to feature 5's evidence layer for a post-filter.
- **Metrics:** % of searches with ≥1 chip, chip edits per search, results-clicked after edit.
- **Effort:** M.

## 5. Questions answered through reviews (Yelp)

**How Yelp does it.** "Ask Yelp Assistant" on business pages with per-business suggested questions; a
safety classifier runs first; retrieval over reviews, photos, business info and the business website;
the answer streams with inline citations and highlighted review passages plus photos. Review Insights
adds per-topic sentiment scores (1–100) that open the underlying reviews when tapped.

**Today.** The place sheet shows up to five Google reviews and an editorial summary; the model can look up
Wikipedia facts. Nobody can ask "Is it quiet enough for a conversation?"

**Gap.** No question answering over reviews, no evidence display, and Google's Places API returns at most
five reviews per place, so depth is limited by design.

**Close it.**
- **`ask_about_place` tool** (server side): gathers the place facts layer (five reviews, `reviewSummary`,
  `generativeSummary`, attributes), answers the question with a model call that must cite which review
  or attribute supports each claim, and returns "not enough evidence" when it cannot.
- **Sheet UI:** "Ask about this place" input with suggested questions per kind ("Is it noisy?", "Good
  for a work day?", "Kid-friendly?"), an answer card that streams with inline citations, and an
  `EvidenceList` of quotes with author and date plus attribute badges. A line explains the evidence base
  ("based on Google's review summary and the 5 most relevant reviews"), and each evidence item carries a
  confidence hint (how many reviews mention the topic). A small classifier step (cheap model call)
  rejects off-topic or unsafe questions with a templated reply before any retrieval, as Yelp does.
- **Optional second source:** the Yelp Fusion AI API for restaurants in the US, if its terms and price fit;
  it would deepen restaurant evidence beyond five reviews.
- **Compliance:** display reviews unmodified with attribution, cache derived facts ≤30 days, no bulk
  export.
- **Metrics:** questions per sheet open, % answered with evidence, follow-up save/add rate.
- **Effort:** M.

## 6. Side-by-side comparison (Tripadvisor)

**How Tripadvisor does it.** There is no comparison table. The AI Assistant accepts "Compare these two
hotels for a couples' trip", answers in prose grounded in reviews, shows live prices and a map, and
selects reviews by detail and recency. A 2026 Which? investigation found unhedged verdicts that ignored
over a hundred negative mentions, which is the failure mode our structured version must avoid.

**Today.** Cards list options; comparing means reading them one by one.

**Gap.** No compare mode and no capture of what the traveler cares about for this decision.

**Close it.**
- **Select to compare:** a checkbox on hotel/restaurant/attraction cards and trip ideas (2–3 items) →
  "Compare" button; the assistant can also call `compare_options` when asked ("compare these two").
- **Comparison card:** columns are options, rows are the traveler's priorities (from the preference
  model, the trip's preferences, active constraint chips and the question asked), then Price, Rating and
  reviews (with the count of negative mentions on the traveler's priorities and their recency), Location
  (distance to the destination center or the trip's stops), Amenities/attributes, Strengths,
  Compromises, and **Missing information** (explicitly listed). Data rows come from the place facts
  layer; judgement rows come from the model with evidence links and are phrased as hedged findings, never
  verdicts; price differences use the cards' estimates and Booking/Google Hotels links.
- **Outcome actions:** Save, Add to trip, "Pick this one" (records a like with reasons → feature 1).
- **Metrics:** compares per session, decision rate after compare.
- **Effort:** M (S once features 5 and 7 exist).

## 7. Find hidden tradeoffs (StayMatch)

**How StayMatch does it.** The traveler picks what matters (quiet, usable desk, natural light, nearby
supermarket…); one scan reads Airbnb and Booking.com reviews for per-criterion signals and inspects
listing photos against claims; each of the 5–10 shortlisted stays shows strengths, tradeoffs and keep/skip
reasons with a review-confidence score (4 relevant reviews vs 40). Metered by scan, one free.

**Today.** Every card explains why a pick fits; nothing says what might disappoint.

**Gap.** No downsides, no traveler-specific dealbreakers, no grounding in reviews.

**Close it.**
- **Prompt and schema (S):** add `tradeoffs: string[]` to hotel, restaurant, attraction and flight schemas
  and instruct the model to name 1–2 honest, traveler-specific downsides (light sleeper → street noise;
  remote worker → no desk; family → stairs, no crib; mobility → hills, long walks) or "none known".
  Cards show them as amber "Heads-up" chips.
- **Dealbreakers in the profile (S):** onboarding adds "What ruins a trip for you?" (noise, no
  workspace, stairs/mobility, crowds, early starts, long transfers, spicy food…) stored as
  `polarity = dealbreaker` preferences; the model must check picks against them.
- **Grounded flags (M):** with the place facts layer, a server job scores review text and attributes for
  noise, walls, elevator, wifi/desk, cleanliness, crowds, distance, service hours, physical demand; each
  flag renders with evidence quotes and a confidence hint (StayMatch's "4 reviews vs 40"), and ranks
  options down for travelers with the matching dealbreaker. Photo-versus-claim checks (a vision call on
  the Places photos) are a later add-on.
- **Metrics:** % cards with a heads-up, dislike rate on flagged vs unflagged picks.

## 8. Learn preferences through conversation (Layla)

**How Layla does it.** Preferences are inferred from chats, clicks and trip ratings into an account-wide
travel profile; nothing is confirmed with the user and there is no per-trip memory. Control is a single
"Travel profiling" opt-out; memory notes live in a separate store from transcripts with shorter
retention; the policy states model vendors do not train on user data and deletion completes within about
24 hours. Expedia acquired Layla in July 2026.

**Today.** When the traveler states a lasting preference the model calls `update_traveler_profile`, which
saves immediately and shows "Preferences remembered". Trip-level preferences exist as free text on the
trip page and can be set by `update_trip_plan`.

**Gap.** No confirmation before saving, no choice between this trip and the usual profile, no view of
what has been learned from chat.

**Close it.**
- **Confirm and scope:** turn `update_traveler_profile` into a human-in-the-loop tool: the chip reads
  "Remember that you prefer boutique hotels?" with **For this trip**, **Always**, **No thanks**. "For this
  trip" writes to the trip's preferences (or the current chat's planner scope when no trip is attached);
  "Always" writes to the profile and the unified preference model with `source = chat`.
- **Memory panel:** "Update my assistant" lists learned preferences (statement, scope, when, from which
  chat) with edit and delete; the agent context includes both profile-wide and trip-scoped items,
  labeled.
- **Guardrails and trust:** never store sensitive categories (health, religion) without an explicit
  "Always" click; add a "Travel profiling" switch in Update my assistant that stops learning from chat;
  keep learned preferences in their own table with their own retention, separate from chat transcripts;
  state in the privacy notes that model vendors do not train on user data and that deletion completes
  within a day.
- **Metrics:** confirmations per week, ratio of trip vs always, deletions.
- **Effort:** S/M.

## 9. Flight price tracking (Google Travel)

**How Google does it.** "Track prices" on a Google Flights result (exact dates) or "Any dates" for a
route (alert when the monthly minimum drops significantly); email and mobile alerts including "likely to
rise" and "fare expiring" predictions; low/typical/high labels against the route's history; a price
guarantee on badged fares; since April 2026 "track these flight prices for me" works in AI Mode chat with
an explicit confirmation before the alert is saved.

**Today.** Flight cards carry model estimates and Google Flights deep links. There is no live fare access,
no scheduler and no email or push channel.

**Gap.** Live prices, a watch list, periodic checks and notifications.

**Close it (after 1–8).**
- **Phase A — watch intent (S):** "Track this route" on flight cards, or "track these flights for me" in
  chat with an explicit confirmation card, stores a `flight_watch` in one of two modes — exact dates, or
  "any dates" for a route and month — shown under the trip's Bookings and on the Trips page; it deep-links
  to Google Flights with the same parameters.
- **Phase B — live fares (L):** a fare API (Amadeus Self-Service Flight Offers, Duffel, or Kiwi Tequila)
  queried by a Railway cron service hitting `/api/jobs/flight-watch` daily; prices stored per watch;
  Updates + email when the price drops by a threshold or a cheaper date appears, plus a weekly "nothing
  dropped" digest so silence is never ambiguous; low/typical/high labels once a watch has enough history.
- **Phase C — insights:** "typical range" from stored history, book handoff to the airline/OTA.
- **Metrics:** watches created, notification click-through, bookings attributed.

## Sequencing and effort

| Wave | Scope | Weeks | New vendors |
| --- | --- | --- | --- |
| 1 | Preference confirm + scope (8), constraint chips (4), tradeoffs prompt + dealbreakers (7), compare (6), unified preference model | 2–3 | none |
| 2 | Place facts layer + review Q&A (5), taste profile + feedback loop (1), structured stops + board + day pins (3) | 3–4 | none (more Places Details fields; watch cost) |
| 3 | Link import, then screenshot import (2); reservation import; drag-and-drop and routes (3) | 3–4 | none required (optional Yelp Fusion AI) |
| 4 | Flight watch intent, then live fares + email + cron (9) | 3+ | fare API, email provider |

Cost note: waves 1–3 add model calls (cheap) and Places Details calls (the expensive part); see
`docs/COGS.md`. The place facts layer with a 30-day cache keeps Details to roughly one call per place per
month regardless of how many features read it.
