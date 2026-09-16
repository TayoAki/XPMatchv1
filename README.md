# XPMatch — AI travel planner built with CopilotKit

XPMatch is a personalized travel copilot: a chat-first planner (modeled on the Mindtrip
layout) that turns a traveler's profile into **actionable** recommendations — destinations,
hotels, flights, restaurants and things to do — rendered as rich cards with booking links, and
that can save confirmed plans as trips.

Built with **Next.js 16**, **React 19**, **Tailwind CSS 4** and the **CopilotKit v2 SDK**
(`@copilotkit/react-core/v2` + `@copilotkit/runtime/v2`), with **Claude** (`claude-opus-5`) as the
default model through the AI SDK.

## Features

- **Personalized from message one** — an onboarding dialog ("Update my assistant") captures name,
  home city/airport, travel styles, pace, budget, companions, dietary needs and notes. Everything is
  sent to the agent as context on every run, and the model can remember new preferences it hears in
  conversation via the `update_traveler_profile` tool.
- **Generative UI recommendations** — the agent calls frontend tools that render streaming cards:
  `show_destinations`, `show_hotels`, `show_flights`, `show_restaurants`, `show_attractions`.
- **Actionable, not just descriptive** — every card links out to live inventory: Google Flights,
  Booking.com / Google Hotels, Google Maps, OpenTable and GetYourGuide, pre-filled with the
  recommended place, dates and travelers. Prices are labeled as estimates.
- **Human-in-the-loop trips** — `create_trip` proposes a day-by-day itinerary the traveler confirms
  in chat; confirmed trips land on the Trips page.
- **Save anything** — heart any card; saved items feed back into the agent's context.
- **Live map with pinned recommendations** — as soon as the chat is about a place (the model calls
  `focus_map`, fixing typos like "roam" → Rome), the right panel becomes a Google Map centered on
  it. Every hotel, restaurant and attraction card is resolved through the Places API and pinned;
  clicking a marker or "View on map" opens a place sheet with photos, rating, Google reviews,
  hours, Save and Add to trip. A weather chip, search-and-pin and a satellite toggle round it out.
  Without Google keys the panel degrades to estimated pins from a small gazetteer.
- **Live grounding tools (server-side)** — weather outlook (Open-Meteo) and destination facts
  (Wikipedia), both keyless.
- **Mindtrip-style shell** — left navigation (Chats, Trips, Explore, Saved, Updates, Inspiration,
  Create), a Where / When / Who / Budget planner bar, "Create a trip", a welcome hero
  ("Where to today, Tayo?"), and a discovery panel with a proactive nudge, "Jump back in",
  "For you in {city}" and "Get inspired".
- **Personalized suggestion chips** — static chips before the first message, model-generated
  follow-ups after.
- **Demo mode** — with no API key configured the app runs against an offline demo model so the
  whole UI can be explored; a banner makes this explicit.

## Getting started

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (or OPENAI_API_KEY / GOOGLE_API_KEY)
npm run dev                  # http://localhost:3000
```

Without a key the app starts in demo mode. Model selection lives in `src/server/agent.ts`:

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables Claude (`anthropic/claude-opus-5` by default). |
| `OPENAI_API_KEY`, `GOOGLE_API_KEY` | Used when no Anthropic key is present (`openai/gpt-5`, `google/gemini-2.5-pro`). |
| `COPILOT_MODEL` | Force a `provider/model` (any model the AI SDK knows) or `demo`. |
| `COPILOT_EFFORT` | Claude effort level for 4.6+/5 models (`low` … `max`, default `medium`). |
| `NEXT_PUBLIC_COPILOTKIT_INSPECTOR` | `true` shows the CopilotKit dev inspector. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser key for the Maps JavaScript API (restrict to your referrers). |
| `GOOGLE_MAPS_API_KEY` | Server key for the Places API (New): geocoding, ratings, photos, reviews. |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Optional Map ID for custom styling; defaults to `DEMO_MAP_ID`. |

Note: CopilotKit generates follow-up suggestions with a forced tool call, which Claude Fable 5.1
rejects; keep `COPILOT_MODEL` on the Opus/Sonnet families.

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

## How it is wired

```
src/app/api/copilotkit/[[...path]]/route.ts   CopilotKit v2 runtime (fetch handler, in-memory threads)
src/server/agent.ts                          BuiltInAgent: model selection, prompt, server tools
src/server/demo-model.ts                     Offline model speaking the same tool protocol
src/lib/travel/prompt.ts                     Static system prompt (traveler facts arrive as context)
src/lib/travel/schemas.ts                    Zod schemas for every generative-UI tool
src/lib/travel/links.ts                      Deep-link builders (Flights, Booking, Maps, OpenTable…)
src/lib/store.tsx                            Local-first store (profile, planner, saved, trips, chats)
src/components/chat/TravelCopilot.tsx        useAgentContext / useFrontendTool / useHumanInTheLoop /
                                             useConfigureSuggestions registration
src/components/chat/TravelChat.tsx           <CopilotChat> with the welcome hero and input slots
src/components/chat/cards/*                  Destination, hotel, flight, restaurant, attraction,
                                             trip-proposal cards
src/components/panel/RightPanel.tsx          Discovery feed ⇄ map switch
src/components/panel/DiscoveryPanel.tsx      Right-hand discovery panel
src/components/map/*                         Google Map panel, markers, place sheet, card ↔ pin hook
src/lib/map-store.ts                         Per-thread map state (focus, pins, selection)
src/server/places.ts + src/app/api/places/*  Places API (New) resolution, details, photo proxy
src/components/shell/*                       Sidebar, top bar, app shell
```

Chat history is held by the runtime's in-memory runner for the lifetime of the server process;
profile, trips, saved items and the chat list persist in the browser (`localStorage`).

## Scripts

```bash
npm run dev     # start locally
npm run lint    # eslint
npm run build   # production build
npm start       # serve the production build
```
