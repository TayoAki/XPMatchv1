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

- **Personalized from message one** — an onboarding dialog ("Update my assistant") captures name,
  home city/airport, travel styles, pace, budget, companions, dietary needs, notes and "What ruins a
  trip for you?" dealbreakers. Everything is sent to the agent as context on every run; concrete
  profile fields heard in conversation go through `update_traveler_profile`.
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
  a Wanderlog-style Board (days as sortable lists with numbered stops, estimated travel legs,
  Directions, Optimize order, Move to…, time and note edits, an Ideas tray, Add a stop) with
  drag-and-drop (pointer or keyboard, dnd-kit), numbered per-day pins and route lines on the map with
  Day chips as layers; `schedule_stops` puts a place on a day from chat.
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
- **Generative UI recommendations** — the agent calls frontend tools that render streaming cards:
  `show_destinations`, `show_hotels`, `show_flights`, `show_restaurants`, `show_attractions`.
- **Actionable, not just descriptive** — every card links out to live inventory: Google Flights,
  Booking.com / Google Hotels, Google Maps, OpenTable and GetYourGuide, pre-filled with the
  recommended place, dates and travelers. Prices are labeled as estimates.
- **Accounts and per-user data** — email + password sign-up, sessions in HttpOnly cookies, and a
  profile, saved places, trips, chat list and notifications stored per user on the server.
- **Trips like Mindtrip** — `create_trip` proposes a day-by-day itinerary the traveler confirms in
  chat, the planner's "Create trip" makes one directly, and every trip has its own page: title and
  chips, a proactive nudge, "Ask anything else" (opens a chat attached to the trip), the trip's
  chats, and tiles for **Ideas**, **Itinerary**, **Bookings**, **Media**, **Trip preferences**,
  **Calendar** and **Members**, next to a map of everything pinned to the trip. Members are added by
  email and notified under Updates; inside a trip chat the assistant can `update_trip_plan` and
  `add_trip_ideas`.
- **Add to trip** — every card and place sheet has an "Add to trip" picker (existing trip or a new
  one); ideas show up on the trip page and its map.
- **Save anything** — heart any card, place sheet or Explore result; the Saved page has **Places**
  (grouped by type, with Add to trip) and **Guides** tabs, and saved items feed the agent's context.
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
- **Mindtrip-style shell** — left navigation (Chats, Trips, Explore, Saved, Updates, Inspiration,
  Create), a Where / When / Who / Budget planner bar, "Create a trip", a welcome hero
  ("Where to today, Tayo?"), and a discovery panel with a proactive nudge, "Jump back in",
  "For you in {city}" and "Get inspired". Chats is one experience: the sidebar's Chats item expands
  in place to list conversations, and the active chat sits beside the map or discovery feed.
- **Personalized suggestion chips** — static chips before the first message, model-generated
  follow-ups after.
- **Demo mode** — with no API key configured the app runs against an offline demo model so the
  whole UI can be explored; a banner makes this explicit.

See `docs/USER_FLOWS.md` for every user flow screen by screen, `docs/COGS.md` for the unit-cost model
(the Google Places calls behind the map, not the model, dominate cost), and `docs/PLAN.md` for the
architecture and build plan.

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
| `HELPER_MODEL` | OpenRouter model for small structured jobs (review answers, import extraction); defaults to the agent's model. |
| `HELPER_VISION_MODEL` | OpenRouter model that reads screenshots for imports (default `openai/gpt-4o-mini`). |
| `PLACES_BASE_URL` | Override the Places API base URL (the end-to-end suite points it at a stub). |
| `IMPORT_ALLOW_LOOPBACK` | `1` lets imports fetch `localhost` (test fixture site only; never set in production). |
| `COPILOT_EFFORT` | Claude effort level for 4.6+/5 models (`low` … `max`, default `medium`). |
| `NEXT_PUBLIC_COPILOTKIT_INSPECTOR` | `true` shows the CopilotKit dev inspector. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser key for the Maps JavaScript API (restrict to your referrers). |
| `GOOGLE_MAPS_API_KEY` | Server key for the Places API (New): geocoding, ratings, photos, reviews. |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Optional Map ID for custom styling; defaults to `DEMO_MAP_ID`. |
| `DATABASE_URL` | Postgres connection string (Railway provides it). Unset → embedded PGlite in `.data/pglite`. |
| `PGSSL` | `true` to force TLS to Postgres when the URL has no `sslmode=require`. |
| `PGLITE_DIR` | Where PGlite stores its files locally (default `.data/pglite`). |
| `COPILOTKIT_TELEMETRY_DISABLED` | `true` to turn off CopilotKit's anonymous runtime telemetry. |

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
src/components/panel/DiscoveryPanel.tsx      Right-hand discovery panel
src/components/map/*                         Google Map panel, markers, place sheet, card ↔ pin hook
src/lib/map-store.ts                         Per-thread map state (focus, pins, selection)
src/server/places.ts + src/app/api/places/*  Places API (New) resolution, details, photo proxy
src/components/shell/*                       Sidebar, top bar, app shell
```

Chat transcripts, the chat list, profile, learned preferences, trips, saved items and notifications
persist in the database per user (transcripts are written by the runner after every run and restored
into the runtime when a chat is reopened after a deploy). Only the planner bar values and small UI
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
`mock-openrouter.mjs` (scripted tool calls and JSON-mode answers), `mock-places.mjs` (Rome and Austell
fixtures) and `mock-site.mjs` (the import fixture site). GitHub Actions runs lint, typecheck, unit tests,
the build and the suite on every push (`.github/workflows/ci.yml`). Set `PW_CHROMIUM` to a Chromium
binary when Playwright's own download is unavailable.
