# XPMatch — AI travel planner built with CopilotKit

XPMatch is a personalized travel copilot: a chat-first planner (modeled on the Mindtrip
layout) that turns a traveler's profile into **actionable** recommendations — destinations,
hotels, flights, restaurants and things to do — rendered as rich cards with booking links, and
that can save confirmed plans as trips.

Built with **Next.js 16**, **React 19**, **Tailwind CSS 4** and the **CopilotKit v2 SDK**
(`@copilotkit/react-core/v2` + `@copilotkit/runtime/v2`). The model is any tool-capable model
reachable through the AI SDK: **OpenRouter** (cheap models such as `openai/gpt-4o-mini`) or Claude
directly. Accounts, trips, saved places and community guides live in **Postgres** (embedded PGlite
in development), and the app deploys to **Railway** with the included Dockerfile.

## Features

- **Personalized from message one** — a six-step onboarding (about you · style & interests · stays ·
  food · logistics & next trip · dealbreakers & notes) captures name, home city/airport, companions,
  budget, pace, travel styles, things you love doing, the kind of place you stay in and its
  must-haves, cuisines, dietary needs, how adventurous you eat, your day rhythm, walking, transport
  and flight preferences, where you are dreaming of going next, and "What ruins a trip for you?"
  dealbreakers; the same sections edit in place under Update my assistant. On a phone the wizard
  runs as three screens and long chip lists fold behind "Show all". Everything is sent to the
  agent as context on every run; profile fields heard in conversation go through
  `update_traveler_profile`.
- **A place catalog: every place bought once** — every place Google returns is stored by place id
  (`places`, with what a query resolved to in `place_aliases`, shared list-search results in
  `search_cache` and resolved photo URLs in `photo_urls`) and served to everyone from then on. A
  lookup goes remembered alias → fuzzy name match around the destination → a free ids-only Text
  Search → Place Details only for an id never seen; Google's fields refresh after 30 days when a
  place is shown. Admins seed a city from `/admin` (19 list searches, about twenty places each), the
  assistant is told which places the catalog already holds for the destination in focus and prefers
  them, and each account gets 400 lookups a day. `docs/COGS.md` has the before and after.
- **One package to open a destination** — when a destination is clear, `show_package` opens with a
  single personalized card built on the server from the catalog: the best stay, things to do and
  places to eat for this traveler (the match model plus coherence around the stay, category
  diversity, a price spread and the day rhythm), in three variants (your match, the second interest
  leading, a pace or budget shift). Every slot has **Swap** with two ready alternates, **Lock**,
  thumbs, Add to trip and Show on the map; chips narrow the whole package (budget a notch either way,
  pace, walkable from the stay, the profile facts it was built from as toggles); **Turn into a trip**
  hands the exact places to `create_trip`. Keeps, swaps, locks, thumbs and variant picks are stored
  (`package_events`) and calibrate the match factors per traveler; admins see keep and trip rates.
- **Home picks with a match score** — "For you in Rome" (the next trip, the dreamed-of destination,
  the planner's Where or the home city, switchable) lines up three things to do, three stays and
  three places to eat from Google Places, queried from the deep profile and scored by a deterministic
  **match model** (budget vs price, interests, stay types, must-haves, cuisines, dietary tags,
  companions, taste twins, learned preferences and dealbreakers, rating and review count). Every
  recommendation card in chat, Explore, the home picks and the board's stop details shows the score
  with a "Why this score" breakdown and **thumbs up / down**; judgments lower repeat offenders,
  recalibrate the factors that keep misleading that traveler, and reach the agent as recommendation
  feedback. Admins see the hit rate.
- **Learns tastes with your say-so** — when you mention a lasting preference in chat, a "Remember
  this?" card offers **Always / For this trip / No thanks** (`remember_preference`, human-in-the-loop).
  "Update my assistant" lists everything learned with delete buttons and a "Learn from our chats"
  switch; trip-scoped items show on the trip page.
- **Smart filters you can see** — criteria in a request ("quiet, under $250 a night, pool") become an
  editable "Understood as" chip strip (`set_search_constraints`): must-haves vs preferences, "Not
  applied" for what could not be mapped, and every edit re-runs the search. Explore parses price
  words, ratings and "open now" into Google Places filters and shows the same kind of chips.
- **Honest heads-ups** — every hotel, restaurant, attraction and flight card carries `tradeoffs`:
  amber chips with the downsides for this traveler, including any conflict with a dealbreaker.
- **Side-by-side comparison** — Compare on two or three cards → floating bar → `compare_options`
  card: your priorities as rows with strong / ok / weak / unknown verdicts, Price, Rating (Google's
  numbers when the option is pinned), Location, Strengths, Compromises and Couldn't verify, with Map,
  Save, Add to trip and Pick this one per column.
- **Questions answered from reviews** — "Is it noisy at night?" on a place sheet or in chat
  (`ask_about_place`) is answered from Google's reviews, review summary and attributes with verbatim
  quotes picked by index (never retyped by the model), a confidence label and topic filters on the
  Reviews tab; Place Details are cached for 30 days in a shared `place_facts` table.
- **Itinerary board with the map** — a trip's itinerary is structured stops linked to real places:
  a Wanderlog-style Board (days as sortable lists with numbered stops, travel legs by **Walk / Drive /
  Transit** from the Google Routes API ("12 min walk · 0.9 km · via Google", straight-line estimates
  as the fallback), Directions in the same mode, Optimize order, Move to…, time and note edits, an
  Ideas tray, Add a stop) with drag-and-drop (pointer or keyboard, dnd-kit), numbered per-day pins and
  route lines on the map with Day chips as layers; `schedule_stops` puts a place on a day from chat.
  Each placed stop expands into the full card (photos, rating, category, price, today's hours, phone,
  links, match score and thumbs, Ask about it), the trip proposal in chat resolves and pins its stops
  while the traveler decides, and the Itinerary tile shows the same facts.
- **Bug reports and an admin page** — **Report a bug** in the account menu opens a report (what happened,
  expected, severity, screenshot downscaled in the browser; page, chat and build attached). Accounts in
  `ADMIN_EMAILS` get an Update per report and an `/admin` page with the beta numbers (sign-ups in
  total, in the last 7 days and by day; trips, chats, saved places, guides, open bugs), a **Members**
  roster (who signed up, their email, sign-up date, whether they finished the quiz, home city and
  activity), **What people answered** (per-question counts of the quiz answers across onboarded
  profiles: interests, budget, stay types, cuisines and the rest), the reports and recommendation
  quality. The server also logs one `[xpmatch] db ready` line
  with the user, trip and chat counts at boot, so the deploy log answers "how many users" without
  database access.
- **Taste profile that learns from reactions** — Rate any place (Loved it / It was fine / Not for me
  with reason chips) on cards, the sheet, trips and Saved; "Not for me" hides the card. Reactions
  feed a per-domain taste profile (Your taste in Update my assistant), repeated reasons become
  learned preferences, cards show "Fits your taste" from real overlap, and finished trips ask "How
  was Rome?" with Beli-style pairwise questions that rank places 0–10. `record_feedback` captures
  reactions said in chat.
- **Inspiration import** — paste a link (blog, Reddit, YouTube, article) in chat or use Import
  inspiration (composer + menu, Create › Import) with a link or a screenshot: places are extracted by
  the model, verified through Google Places and shown as cards with Add all to a trip, Plan a trip and
  Save as a collection; unverified mentions are listed honestly. SSRF-guarded fetching, seven-day
  cache per link, history under Saved › Imports.
- **Reservations into the trip** — paste a confirmation email in chat (`import_reservation`) or use
  Import inspiration › **A reservation** with the text, its PDF or a screenshot: flights, hotels,
  restaurants, cars, trains and activities become reservation cards (provider, confirmation code,
  dates and times, place, travelers, price, flight legs). Add to trip stores them under the trip's
  Bookings with those details, pins hotels and venues that Google Places recognizes on the trip map,
  and the Board shows each reservation on the day it starts.
- **Generative UI recommendations** — the agent calls frontend tools that render streaming cards:
  `show_destinations`, `show_hotels`, `show_flights`, `show_restaurants`, `show_attractions`.
- **Actionable, not just descriptive** — every card links out to live inventory: Google Flights,
  Booking.com / Google Hotels, Google Maps, OpenTable and GetYourGuide, pre-filled with the
  recommended place, dates and travelers. Prices are labeled as estimates.
- **Accounts and per-user data** — email + password sign-up, sessions in HttpOnly cookies, and a
  profile, saved places, trips, chat list and notifications stored per user on the server. Forgotten
  password: "Forgot password?" on the sign-in page emails a single-use, 30-minute link through Resend
  (the answer never reveals whether the account exists; requests are rate-limited), and an admin can
  issue the same link by hand from the Members roster; `/reset?token=…` sets the new password, signs
  that browser in and signs every other device out.
- **Trips like Mindtrip** — `create_trip` proposes a day-by-day itinerary the traveler confirms in
  chat, the planner's "Create trip" makes one directly, and every trip has its own page: title and
  chips, a proactive nudge, "Ask anything else" (opens a chat attached to the trip), the trip's
  chats, and tiles for **Ideas**, **Itinerary**, **Bookings**, **Media**, **Trip preferences**,
  **Calendar** and **Members**, next to a map of everything pinned to the trip. Members are added by
  email and notified under Updates; inside a trip chat the assistant can `update_trip_plan` and
  `add_trip_ideas`.
- **Add to trip** — every card and place sheet has an "Add to trip" picker (existing trip or a new
  one); ideas show up on the trip page and its map.
- **Save anything** — heart any card, place sheet, Explore result or Discover collection; the Saved
  page has **Places** (grouped by type, collections first, with Add to trip) and **Guides** tabs, and
  saved items feed the agent's context.
- **Community guides** — **Create** has a guide editor (title, destination, description, tags, an
  ordered list of places resolved through Google Places with a note each, draft or publish).
  **Inspiration** lists published guides with search; a guide page shows the places, their map,
  Save guide, "Plan a trip from this guide" and author-only edit/delete. Saving someone's guide
  notifies them under **Updates**.
- **Explore near you** — Mindtrip-style: location header (home city, current location or any place),
  search, tabs **For you | Restaurants | Experiences | Stays | Guides**, photo cards with rating,
  category, locality and price, Save and Add to trip, and a labeled map synced with the cards
  (Google Places Nearby Search / Text Search, cached server-side).
- **Live map with pinned recommendations** — as soon as the chat is about a place (the model calls
  `focus_map`, fixing typos like "roam" → Rome), the right panel becomes a Google Map centered on
  it. Every hotel, restaurant and attraction card is resolved through the Places API and pinned;
  clicking a marker or "View on map" opens a place sheet with photos, rating, Google reviews,
  hours, Save and Add to trip; a destination's sheet adds Stays, Restaurants and Things to do tabs
  filled with the assistant's picks and preference-based Google Places results. A weather chip,
  search-and-pin and a satellite toggle round it out.
  Without Google keys the panel degrades to estimated pins from a small gazetteer.
- **Live grounding tools (server-side)** — weather outlook (Open-Meteo) and destination facts
  (Wikipedia), both keyless.
- **Discover home and a top header** — the "Serene Resort" design language (`docs/UI_REDESIGN_PLAN.md`):
  a 64 px header (wordmark, Discover · My trips · Saved, the Updates bell, the account menu, a teal
  **Create a trip** pill) above a Discover page whose hero holds a serif prompt composer, three
  suggestion chips, the Where / When / Guests / Budget planner fields (popover editors on desktop,
  sheets on phones), "Create a trip" and "or chat with your AI concierge", beside a Google Places
  photograph of the destination the traveler is headed to (next trip, dream destination, planner,
  home city) with its author attribution. Below it: three themed collections (By the water, Close
  to nature, Immersed in culture, each a real destination's photo, saveable, linking to Inspiration),
  "For you in {city}", "Jump back in" and the newest community guides. The conversation lives at
  `/chat` under a slim strip (chat title with the **Recent** menu, planner chips, New chat) with the
  discovery feed or the live map beside it; a floating **Your AI concierge** pill opens it from
  every other page (scoped to the trip whose page is open). Old `/?thread=` and `/?prompt=` links
  redirect.
- **A chat-first phone app** — below tablet width a bottom tab bar (Discover, Trips, Saved,
  Concierge, More) carries navigation; the More sheet holds Explore, Inspiration, Updates (with the
  unread badge), Create, Admin, Update my assistant, Report a bug and Log out. The first run is three
  questions asked as chat bubbles inside the Discover hero (where you start from and dream of going,
  what you love doing, how you spend); the Concierge tab's empty state then opens with the nine home
  picks as the assistant's first message with thumbs. On the concierge page everything else opens
  over the chat in sheets: recommendation cards swipe
  as a row and a tap on a photo opens the place as a sheet; "Map · N pinned" opens the map in a
  sheet with the pinned list, a pin stacks the place detail on top; "Saved to Trips" and "Open the
  board" open the itinerary board as a full-height sheet with "Open trip" for the full page. Trip
  pages become **Overview | Board | Tiles** tabs with the board first, where stops move with up /
  down buttons and the Move to… menu instead of dragging. Every card fits a 390 px screen and tap
  targets grow on touch screens. `tests/e2e/mobile.spec.ts` walks all of it at an iPhone viewport;
  `docs/MOBILE_PLAN.md` has the assessment and the plan.
- **Personalized suggestion chips** — static chips before the first message, model-generated
  follow-ups after.
- **Demo mode** — with no API key configured the app runs against an offline demo model so the
  whole UI can be explored; a banner makes this explicit.

See `docs/USER_FLOWS.md` for every user flow screen by screen, `docs/COGS.md` for the unit-cost model
(the Google Places calls behind the map, not the model, dominate cost), `docs/PLAN.md` for the
architecture and build plan, and `docs/BUSINESS_PLAN.md` for the business plan (offers, pricing, and
the Sales, Marketing, Onboarding, Fulfillment and Retention playbooks with their gates) with its three
working documents: `docs/COMPETITOR_LANDSCAPE.md`, `docs/REVENUE_MODEL.md` and
`docs/OPERATING_SYSTEM.md`.

## Getting started

```bash
npm install
cp .env.example .env.local   # add OPENROUTER_API_KEY (or ANTHROPIC_API_KEY) and the Google keys
npm run dev                  # http://localhost:3000 → sign up, then chat
```

No database setup is needed locally: without `DATABASE_URL` the app uses **PGlite** (embedded
Postgres, data in `.data/pglite`). Set `DATABASE_URL` to use a real Postgres; the schema is created
by idempotent migrations on first use (`src/server/schema.ts`).

Without a model key the app starts in demo mode. Model selection lives in `src/server/agent.ts`:

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Preferred when set: routes the agent through OpenRouter (`openai/gpt-4o-mini` by default). |
| `OPENROUTER_MODEL` | Any tool-capable OpenRouter model id, e.g. `google/gemini-2.5-flash-lite`, `anthropic/claude-haiku-4.5`. |
| `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME` | Optional attribution headers OpenRouter uses for app rankings. |
| `ANTHROPIC_API_KEY` | Enables Claude directly (`anthropic/claude-opus-5` by default). |
| `OPENAI_API_KEY`, `GOOGLE_API_KEY` | Used when no Anthropic key is present (`openai/gpt-5`, `google/gemini-2.5-pro`). |
| `COPILOT_MODEL` | Force a `provider/model` (any model the AI SDK knows) or `demo`. |
| `HELPER_MODEL` | OpenRouter model for small structured jobs (review answers, import and reservation extraction); defaults to the agent's model. |
| `HELPER_VISION_MODEL` | OpenRouter model that reads screenshots for imports and reservations (default `openai/gpt-4o-mini`). |
| `PLACES_BASE_URL` | Override the Places API base URL (the end-to-end suite points it at a stub). |
| `ROUTES_API_ENABLED` | `0` skips the Routes API; board travel legs are then straight-line estimates labeled "est.". |
| `ROUTES_BASE_URL` | Override the Routes API base URL (the end-to-end suite points it at a stub). |
| `IMPORT_ALLOW_LOOPBACK` | `1` lets imports fetch `localhost` (test fixture site only; never set in production). |
| `COPILOT_EFFORT` | Claude effort level for 4.6+/5 models (`low` … `max`, default `medium`). |
| `NEXT_PUBLIC_COPILOTKIT_INSPECTOR` | `true` shows the CopilotKit dev inspector. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser key for the Maps JavaScript API (restrict to your referrers). |
| `GOOGLE_MAPS_API_KEY` | Server key for the Places API (New) (geocoding, ratings, photos, reviews) and the Routes API (board travel legs). |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Optional Map ID for custom styling; defaults to `DEMO_MAP_ID`. |
| `DATABASE_URL` | Postgres connection string (Railway provides it). Unset → embedded PGlite in `.data/pglite`. |
| `PGSSL` | `true` to force TLS to Postgres when the URL has no `sslmode=require`. |
| `PGLITE_DIR` | Where PGlite stores its files locally (default `.data/pglite`). |
| `COPILOTKIT_TELEMETRY_DISABLED` | `true` to turn off CopilotKit's anonymous runtime telemetry. |
| `ADMIN_EMAILS` | Comma-separated account emails that see `/admin` (beta numbers, bug reports, recommendation quality) and get an Update per report. |
| `RESEND_API_KEY` | Turns on outgoing email through Resend ("Forgot password?" links). Unset: the form still answers, nothing is sent, and admins issue links by hand. |
| `EMAIL_FROM` | Sender on the domain verified in Resend (default `XPMatch <no-reply@xpmatchme.com>`). |
| `RESEND_BASE_URL` | Override Resend's API base URL (the end-to-end suite points it at a stub; never set in production). |
| `APP_VERSION` | Optional build label attached to bug reports (Railway's `RAILWAY_GIT_COMMIT_SHA` is used when unset). |

Note: CopilotKit generates follow-up suggestions with a forced tool call, which Claude Fable 5.1
rejects; keep `COPILOT_MODEL` on the Opus/Sonnet families.

### Using OpenRouter (cheap models)

Set `OPENROUTER_API_KEY` and the agent talks to OpenRouter's OpenAI-compatible Chat Completions
endpoint through the AI SDK (`@ai-sdk/openai-compatible`). Pick the model with
`OPENROUTER_MODEL` (or `COPILOT_MODEL=openrouter/<id>`). The app relies on streaming **tool
calls**, so choose a model that lists `tools` in its supported parameters on
[openrouter.ai/models](https://openrouter.ai/models). Good low-cost options: `openai/gpt-4o-mini`
(default), `google/gemini-2.5-flash-lite`, `google/gemini-2.5-flash`, `openai/gpt-4.1-mini`,
`anthropic/claude-haiku-4.5`. Very small or `:free` models often ignore the tool protocol and will
answer in plain text instead of rendering cards.

### Google Maps setup

1. In Google Cloud, enable **Maps JavaScript API** and **Places API (New)** on the project.
2. Create two keys: a browser key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) restricted to your HTTP
   referrers and to the Maps JavaScript API, and a server key (`GOOGLE_MAPS_API_KEY`) restricted to
   the Places API. The server key never reaches the browser: photos are served through the
   `/api/places/photo` redirect and lookups go through `/api/places/resolve`.
3. Optional: create a Map ID for custom styling and set `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
   (advanced markers require a Map ID; the default `DEMO_MAP_ID` works for development).
4. Set `PLACES_DEBUG=1` to log every place lookup the assistant triggers.

Without the keys the map panel still appears, using estimated pins from a small built-in
gazetteer, and says what is missing.

## Deploying to Railway

The repo ships a multi-stage `Dockerfile` (Next.js standalone output) and a `railway.json` with the
`/api/health` healthcheck, so a Railway service built from this GitHub repo works out of the box:

1. Create a project with a **Postgres** service and an app service connected to this repository
   (deploy branch of your choice).
2. Set the app service variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `OPENROUTER_API_KEY`,
   `OPENROUTER_MODEL`, `GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (inlined at build
   time — Railway passes service variables to the Docker build), `COPILOTKIT_TELEMETRY_DISABLED=true`.
3. Generate a domain. Restrict the browser Google key to that domain and the server key to the
   Places API.
4. Smoke test: sign up → chat about a city → map pins → create a trip → add a member.

Sessions use `Secure` cookies in production, so the app must be served over HTTPS (Railway domains
are).

## How it is wired

```
src/app/api/copilotkit/[[...path]]/route.ts   CopilotKit v2 runtime (fetch handler, per-user request scope)
src/server/copilot-runner.ts                 In-memory runner that persists transcripts to Postgres and restores them
src/server/agent.ts                          BuiltInAgent: model selection, prompt, server tools
src/server/demo-model.ts                     Offline model speaking the same tool protocol
src/lib/travel/prompt.ts                     Static system prompt (traveler facts arrive as context)
src/lib/travel/schemas.ts                    Zod schemas for every generative-UI tool
src/lib/travel/links.ts                      Deep-link builders (Flights, Booking, Maps, OpenTable…)
src/lib/store.tsx                            Client store hydrated from /api/me/state, writes through to the API
src/server/db.ts + src/server/schema.ts      Postgres / PGlite adapter and idempotent migrations
src/server/auth.ts + src/app/api/auth/*      Password hashing, hashed session tokens, signup/login/logout
src/proxy.ts                                 Redirects signed-out visitors to /login (APIs get 401)
src/server/models.ts + src/app/api/*         Profile, saved items, trips, members, items, chats, notifications
src/components/trips/*                       Trips list + calendar, trip page (sections, map, members), Add to trip
src/components/chat/TripChatScope.tsx        Trip context + update_trip_plan / add_trip_ideas inside a trip chat
src/server/guides.ts + src/app/api/guides/*  Community guides: list/search/nearby, create, edit, delete, save
src/components/guides/*                      Guide card, editor (Create page), guide page
src/components/explore/ExploreClient.tsx     Explore near you (Nearby Search via /api/places/nearby) with map
src/components/map/PlacesMap.tsx             Shared labeled map + place sheet used by trips, guides and Explore
src/components/chat/TravelCopilot.tsx        useAgentContext / useFrontendTool / useHumanInTheLoop /
                                             useConfigureSuggestions registration
src/components/chat/TravelChat.tsx           <CopilotChat> with the welcome hero and input slots
src/components/chat/cards/*                  Destination, hotel, flight, restaurant, attraction,
                                             trip-proposal, constraint-chip, comparison and remember cards
src/lib/constraints-store.ts, compare-store.ts, hitl-store.ts   Per-thread chips, compare selection, pending HITL cards
src/lib/search-parser.ts                     Deterministic Explore query → Places filters + chips
src/components/panel/RightPanel.tsx          Discovery feed ⇄ map switch
src/components/panel/DiscoveryPanel.tsx      Discovery feed (proactive card, Jump back in, picks, Get inspired)
src/components/discover/*                    Discover home: hero, prompt composer, planner fields and editors,
                                             hero photo, collection cards, community guides row
src/lib/travel/collections.ts                The three Discover collections and the hero's default destination
src/lib/places/destination-photo.ts          Client-side destination resolution (cached) and photo width helper
src/components/map/*                         Google Map panel, markers, place sheet, card ↔ pin hook
src/lib/map-store.ts                         Per-thread map state (focus, pins, selection)
src/server/places.ts + src/app/api/places/*  Places API (New) resolution, details, photo proxy
src/server/catalog.ts + src/lib/places/names.ts   The place catalog: stored places, aliases, fuzzy name match, shared caches
src/server/seed.ts + src/app/api/admin/seed  List searches that fill a city; the admin Seed city button
src/server/packages.ts + src/app/api/packages/*   Package builder (variants, alternates, coherence) and the events log
src/server/package-learning.ts               Calibration from package events and the admin package numbers
src/components/chat/cards/PackageCard.tsx    The package opener card: variants, swap, lock, narrowing, Turn into a trip
src/components/map/PinStrip.tsx              Mini cards under the map, in step with the pins
src/components/shell/*                       Site header, chat strip, phone tab bar, concierge launcher, app shell
```

Chat transcripts, the chat list, profile, learned preferences, trips, saved items and notifications
persist in the database per user (transcripts are written by the runner after every run and restored
into the runtime when a chat is reopened after a deploy). Only the planner values and small UI
preferences stay in the browser.

## Scripts

```bash
npm run dev        # start locally
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest unit tests (parsers, evidence, itinerary, taste, ranking, import guard)
npm run test:e2e   # Playwright end-to-end suite against a stand-in model, a Places stub and a fixture site
npm run build      # production build
npm start          # serve the production build
```

The end-to-end suite (`tests/e2e`) needs no API keys or network: `start-app.mjs` launches the app with
`mock-openrouter.mjs` (scripted tool calls and JSON-mode answers), `mock-places.mjs` (Rome, Austell and
the Discover destinations as fixtures) and `mock-site.mjs` (the import fixture site). GitHub Actions runs lint, typecheck, unit tests,
the build and the suite on every push (`.github/workflows/ci.yml`). Set `PW_CHROMIUM` to a Chromium
binary when Playwright's own download is unavailable.
