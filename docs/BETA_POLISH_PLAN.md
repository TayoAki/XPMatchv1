# Beta polish plan: deeper personalization, home picks, match scores, itinerary detail, bug reports

**Status: shipped.** Flows in `docs/USER_FLOWS.md`, costs in `docs/COGS.md`, beta notes in
`docs/BETA_READINESS.md`; tests in `tests/unit/match.test.ts` (match model, calibration, quality stats,
home-pick queries and kind check, top-three picking, hours) and `tests/e2e/onboarding.spec.ts` (the
six-step wizard → home rows with match badges → thumbs down with a reason lowers the score → trip
proposal with resolved stops → board stop details and the Itinerary tile → Jump back in photos → Update
my assistant → a bug report with a screenshot → the admin page with the report and the hit rate).

Asked for after Wave 3, before inviting beta testers: "Jump back in" has no images; onboarding should go
deeper so the home page can offer three picks per category (things to do, where to stay, where to eat);
itinerary stops should carry the full card information; a bug icon lets testers report problems; every
recommendation gets a match score with thumbs up / down so we learn when we got it right.

| Step | What | Where |
| --- | --- | --- |
| 0 | Jump back in cards get real photos (trip cover, the chat's destination, the saved place) | Discovery panel, chats table |
| 1 | In-depth onboarding: six short steps (about you · style & interests · stays · food · logistics & next trip · dealbreakers & notes); the same sections edit in place under Update my assistant | Assistant dialog, profile model, agent context |
| 2 | Match score and thumbs on every recommendation; recommendation feedback stored and fed back into scoring and the assistant's context | Cards, Explore, home picks, board stops, `rec_feedback` |
| 3 | Home picks: "For you in Rome" → three rows of three (Things to do · Where to stay · Where to eat) built from the deep profile through Google Places, scored and with thumbs | Discovery panel, `/api/recs/home` |
| 4 | Itinerary detail: board stops expand into the full card (photos, rating, category, price, address, hours, links, match, thumbs, Ask about it); the trip proposal's stops resolve and pin while the traveler decides; the Itinerary tile shows the same summary | Board, proposal card, trip page |
| 5 | Bug reports: bug icon in the sidebar (and the mobile top bar) → what happened / expected / severity / screenshot → stored, admins notified; `/admin` lists reports and the recommendation hit rate | Shell, `bug_reports`, admin page |
| 6 | Docs, unit + end-to-end tests, build, deploy | — |

## 0. Jump back in

- Trips use the trip's resolved place photo (Google) and fall back to the Wikipedia lookup by destination.
- Chats remember the destination the map focused on (`chats.destination`, `chats.place`, migration
  `0005`): `focus_map` stores it with the chat title, so a chat card shows Rome's photo. Chats attached to a
  trip use the trip's cover.
- Saved destinations use the saved place's photo.

## 1. Onboarding

New profile fields (all optional, all editable later): `interests` (things to do: museums & art, history &
architecture, food tours & markets, nightlife, live music, nature & hiking, beaches, wellness & spa,
shopping, photography spots, sports & adventure, family activities, local neighborhoods, coffee culture,
wine & craft beer, street food), `stayTypes` (boutique, design, luxury resort, budget hotel, apartment,
hostel, B&B, business hotel), `stayMustHaves` (pool, gym, breakfast, kitchen, central, quiet room,
workspace, free cancellation, walkable area, near transit, parking), `cuisines`, `dietaryTags`
(vegetarian, vegan, gluten-free, halal, kosher, no shellfish, nut allergy), `foodAdventure` (safe / mix /
adventurous), `dayRhythm` (early / balanced / late), `walking` (lots / moderate / little), `transport`
(walk & transit / rideshare / car / mixed), `flightPreference` (nonstop / cheapest / comfort / flexible),
`nextDestination`, `nextWhen`.

First run: a six-step wizard with a progress bar, Back / Next, Skip for now, and Save preferences on the
last step. Already onboarded: the same sections stacked with a section rail, plus the memory and taste
panels, under Update my assistant. Everything is sent to the assistant in the profile context;
`update_traveler_profile` accepts the new fields.

## 2. Match score and thumbs

`src/lib/match.ts` scores a candidate (kind, name, category, price level or tier, rating and count, text
such as amenities, cuisine, style, why it fits, tradeoffs) against the profile, learned preferences, taste
profile and recommendation feedback. Factors: quality (rating and review count), price fit (level vs
budget tier), interests / stay types / cuisines / must-haves / dietary matches, companions, taste twins
("Like Da Enzo, which you loved") and dislikes, learned likes and dislikes, dealbreaker conflicts named in
the tradeoffs, and a per-factor calibration learned from thumbs: a factor that keeps firing on picks the
traveler thumbs down loses weight for that traveler. The result is 5–99 with a label (Great match / Good
match / Worth a look / Probably not you) and the reasons behind it, shown as a badge with a "Why this
score" popover.

Thumbs ("Did we get this right?") record a `rec_feedback` row per traveler and place (score shown, the
factors that fired, up or down, an optional reason for a miss: too pricey, wrong vibe, too far, already
been, not my thing). Rows are loaded with the user state, drive calibration on the client, and reach the
assistant as "Recommendation feedback" (hit rate, recent misses with reasons) so it steers away from them.
Admins see the hit rate by kind and context.

## 3. Home picks

`GET /api/recs/home?destination=…` resolves the destination, runs profile-driven Text Searches (interests
→ "museums and galleries in Rome", stay types and must-haves → "boutique hotels with a pool in Rome",
cuisines and dietary tags → "trattoria in Rome", "vegetarian restaurants in Rome"; budget → price
levels), scores every candidate with the match model and keeps the best three per row with different
categories where possible. Cached six hours per destination and profile signature. The focus destination is
the next upcoming trip, else the onboarding "next destination", else the planner's Where, else the home
city; the header menu switches between them or any typed place.

## 4. Itinerary detail

Board stops get a Details toggle: photo strip, rating and count, category, price level, address, today's
hours and phone (Place Details, cached 30 days in `place_facts`), Google Maps and website links, the match
badge with thumbs, Ask about it (opens the trip chat with the question) and the note. The trip proposal
card resolves its stops as soon as the proposal is complete (kind icon, photo, rating, category, match)
and pins them on the map while the traveler decides. The Itinerary tile lists stops with the same summary.

## 5. Bug reports

Sidebar bug icon (and the mobile top bar) → dialog: what happened, what you expected, severity (broken /
looks wrong / idea), optional screenshot (downscaled in the browser to 1280 px JPEG), with the page URL,
chat id, browser and app version attached automatically. `POST /api/bugs` stores it in `bug_reports`
(screenshot as base64 text, 1.5 MB cap) and notifies every admin (`ADMIN_EMAILS`). `/admin` (admins only)
lists reports newest first with status open / resolved, the screenshot, and the recommendation quality
summary (hit rate overall, by kind, by context, recent misses).

## Tests

- Unit: match scoring (price fit, interests, taste twin, dealbreaker conflict, calibration), profile
  normalization, home-pick query building, recommendation stats.
- End to end (`onboarding.spec.ts`): the six-step wizard → home rows with three cards each and match
  badges → thumbs down with a reason → `/api/me/recs` → the badge reflects calibration → bug report with
  a screenshot → `/admin` shows it and the hit rate → board stop Details → proposal stops resolve.
- Existing specs move to the wizard through the shared `signup` helper (styles, dealbreakers, dietary and
  stays are options instead of a callback).

## Cost

Home picks: about six Text Searches per traveler per destination per six hours (≈ $0.25 at list price,
free tier covers beta). Place Details for stop details come from the 30-day cache. Match scoring and
thumbs are free.
