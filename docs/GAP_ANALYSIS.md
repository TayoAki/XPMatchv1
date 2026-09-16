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
- **Post-trip prompt:** after a trip's end date, Updates asks "How was Rome?" → quick rating of each idea
  and booking (Beli-style pairwise "which did you prefer?" can follow later).
- **Update my assistant** gains a "Your taste" section listing learned preferences with delete.
- **Metrics:** % of shown cards with feedback, % of users with ≥5 feedback events, repeat-save rate.
- **Effort:** M. No vendors. Model prompt updated to use the taste profile and explain fit.

## 2. Turn inspiration into a plan (Mindtrip)

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
- **Drag-and-drop** with `@dnd-kit` between days and within a day; keyboard reordering for accessibility.
- **Reservation import:** paste a confirmation email or PDF text → model parses provider, dates,
  confirmation number → Bookings entry with a date, shown on the board and the calendar.
- **Metrics:** % of trips with ≥1 scheduled stop, stops per trip, share of ideas that get scheduled.
- **Effort:** M for stops + board + day pins; L including DnD polish, routes and import.

## 4. Natural-language Smart Filters (Booking.com)

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

**Today.** The place sheet shows up to five Google reviews and an editorial summary; the model can look up
Wikipedia facts. Nobody can ask "Is it quiet enough for a conversation?"

**Gap.** No question answering over reviews, no evidence display, and Google's Places API returns at most
five reviews per place, so depth is limited by design.

**Close it.**
- **`ask_about_place` tool** (server side): gathers the place facts layer (five reviews, `reviewSummary`,
  `generativeSummary`, attributes), answers the question with a model call that must cite which review
  or attribute supports each claim, and returns "not enough evidence" when it cannot.
- **Sheet UI:** "Ask about this place" input with suggested questions per kind ("Is it noisy?", "Good
  for a work day?", "Kid-friendly?"), an answer card and an `EvidenceList` of quotes with author and
  date, plus attribute badges. A line explains the evidence base ("based on Google's review summary and
  the 5 most relevant reviews").
- **Optional second source:** the Yelp Fusion AI API for restaurants in the US, if its terms and price fit;
  it would deepen restaurant evidence beyond five reviews.
- **Compliance:** display reviews unmodified with attribution, cache derived facts ≤30 days, no bulk
  export.
- **Metrics:** questions per sheet open, % answered with evidence, follow-up save/add rate.
- **Effort:** M.

## 6. Side-by-side comparison (Tripadvisor)

**Today.** Cards list options; comparing means reading them one by one.

**Gap.** No compare mode and no capture of what the traveler cares about for this decision.

**Close it.**
- **Select to compare:** a checkbox on hotel/restaurant/attraction cards and trip ideas (2–3 items) →
  "Compare" button; the assistant can also call `compare_options` when asked ("compare these two").
- **Comparison card:** columns are options, rows are the traveler's priorities (from the preference
  model, the trip's preferences, active constraint chips and the question asked), then Price, Rating and
  reviews, Location (distance to the destination center or the trip's stops), Amenities/attributes,
  Strengths, Compromises, and **Missing information** (explicitly listed). Data rows come from the place
  facts layer; judgement rows come from the model with evidence links; price differences use the cards'
  estimates and Booking/Google Hotels links.
- **Outcome actions:** Save, Add to trip, "Pick this one" (records a like with reasons → feature 1).
- **Metrics:** compares per session, decision rate after compare.
- **Effort:** M (S once features 5 and 7 exist).

## 7. Find hidden tradeoffs (StayMatch)

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
  noise, walls, elevator, wifi/desk, cleanliness, crowds, distance, service hours, physical demand; flags
  render with evidence quotes and are used to rank options down for travelers with the matching
  dealbreaker.
- **Metrics:** % cards with a heads-up, dislike rate on flagged vs unflagged picks.

## 8. Learn preferences through conversation (Layla)

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
- **Guardrail:** never store sensitive categories (health, religion) without an explicit "Always" click;
  document this in the privacy notes.
- **Metrics:** confirmations per week, ratio of trip vs always, deletions.
- **Effort:** S/M.

## 9. Flight price tracking (Google Travel)

**Today.** Flight cards carry model estimates and Google Flights deep links. There is no live fare access,
no scheduler and no email or push channel.

**Gap.** Live prices, a watch list, periodic checks and notifications.

**Close it (after 1–8).**
- **Phase A — watch intent (S):** "Track this route" on flight cards stores a `flight_watch` (origin,
  destination, dates or month, cabin, travelers, target price) shown under the trip's Bookings and on the
  Trips page; it deep-links to Google Flights with the same parameters.
- **Phase B — live fares (L):** a fare API (Amadeus Self-Service Flight Offers, Duffel, or Kiwi Tequila)
  queried by a Railway cron service hitting `/api/jobs/flight-watch` daily; prices stored per watch;
  Updates + email when the price drops by a threshold or a cheaper date appears.
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
