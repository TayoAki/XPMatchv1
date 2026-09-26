# React Native plan: XPMatch as a native iOS and Android app

Status: a plan for review; nothing here is built. Facts about outside tools were checked on
2026-09-26 (sources in section 12). It follows the plan → model → build workflow: preview, feature
checklist, data model, screens, connections, vertical slices, sample data, tests, decisions.

## 1. The short version

- **What we'd build:** a native iOS and Android app with Expo (React Native), in this repository
  next to the website. The Next.js server stays the only backend: the app uses the same API, chat
  runtime, database and Google server key.
- **What carries over:** 34 of the 45 files in `src/lib` (types, tool schemas, the match model,
  itinerary logic) move into a shared package both apps use, and 8 more move with small adapters.
  The server code doesn't move at all.
- **What gets rebuilt:** the screens. The website's 112 component files draw web elements styled
  with CSS classes; the app needs native views. The chat runs on CopilotKit's official React Native package, the maps on
  Google's native map SDKs.
- **What the server adds:** token sign-in for the app, account deletion (both stores require it),
  push notifications, links that open the app, a minimum-version check and duplicate-safe trip
  creation.
- **Time and money:** eight slices, about 9–11 weeks to store submission for the first release.
  Apple charges US$99 a year, Google Play US$25 once, and Expo's build service is free to start.
  Maps on phones cost nothing per load.
- **Biggest risks:**
  - the chat stream on real phones, proved first in VS-00;
  - what account deletion does to trips shared with others (your decision, O-01);
  - the pending legal read on Google place data (O-02).

## 2. The tech stack today

| Layer | What we use | Version | What it does |
| --- | --- | --- | --- |
| Web framework | Next.js, App Router, `output: "standalone"` | 16.3.5 | One Node server for the pages and all 56 API routes |
| UI | React, React DOM | 19.2.8 | Every screen (112 component files, about 18,800 lines) |
| Styling | Tailwind CSS through `@tailwindcss/postcss`; Inter and Source Serif 4 from Fontsource; `lucide-react` icons; `clsx` | 4.3 | Design tokens and utility classes |
| Chat in the browser | CopilotKit v2, `@copilotkit/react-core/v2`: `CopilotKitProvider`, `CopilotChat`, `useFrontendTool`, `useHumanInTheLoop`, `useAgentContext`, `useConfigureSuggestions` | 1.72.0 | Chat UI, the 19 tools that draw cards, the 11 context entries |
| Chat on the server | `@copilotkit/runtime/v2` (`CopilotRuntime`, `BuiltInAgent`) speaking the AG-UI protocol (`@ag-ui/client`, `@ag-ui/core`) | 1.72.0 / 0.0.59 | Runs the agent and streams its events |
| Model access | Vercel AI SDK `ai` with `@ai-sdk/openai-compatible` to OpenRouter (default `openai/gpt-4o-mini`); Anthropic, OpenAI or Google keys optional; an offline demo model | 6.0 | Any tool-calling model |
| Validation | zod | 3.25 | Tool schemas and request bodies |
| Drag and drop | dnd-kit (`core`, `sortable`) | 6.3 / 10.0 | Trip board, plan reordering |
| Database | Postgres on Railway through `pg`; PGlite (embedded Postgres) locally | pg 8.23 | 24 tables, migrations in `src/server/schema.ts` run at boot |
| Sign-in | Email and password (bcryptjs), hashed session tokens, `xp_session` cookie, `src/proxy.ts` gate, same-origin check on writes | bcryptjs 3 | Accounts and per-user data |
| Maps | Google Maps JavaScript API in the browser (browser key, restricted to our domain) | — | Maps, numbered markers, route lines |
| Place data | Google Places API (New) on the server: Text Search, Place Details, Nearby Search, Place Photos (through our proxy); Routes API for travel times (server key) | — | Real places, photos, hours, reviews, legs |
| Other data | Open-Meteo (weather), Wikipedia (destination facts, images) | — | Grounding for the agent |
| Email | Resend | — | Password reset links |
| Documents | `unpdf` | 1.8 | Reads PDF confirmations for reservations |
| Tests | Vitest (14 files, 137 tests); Playwright (22 end-to-end specs) with stand-ins for the model, Places, Routes, Resend and a fixture website | 5.0 / 1.63 | No keys or network needed |
| CI | GitHub Actions: lint, typecheck, unit tests, build, end-to-end suite | Node 22 | Every push |
| Hosting | Railway: the app service builds `main` with Railpack and deploys on every push; Postgres as a second service with a volume; `app.xpmatchme.com` | — | Production |

## 3. How everything works today

### 3.1 The big picture

```
Browser (desktop, or Safari on a phone)
  │  pages and scripts · the xp_session cookie · Google Maps JavaScript API (browser key)
  ▼
Next.js server on Railway (one Node process, app.xpmatchme.com)
  ├── src/proxy.ts           no session cookie → /login for pages, 401 for /api/*
  ├── pages (src/app)        Discover, Chat, Trips, Explore, Saved, Updates, Inspiration,
  │                          Create, Guides, Admin, and the sign-in pages
  ├── 56 API routes          profile, trips, saved, guides, places, itineraries, packages,
  │   (src/app/api)          imports, reservations, reviews, notifications, admin …
  ├── /api/copilotkit        CopilotKit runtime → our agent → AI SDK → OpenRouter
  └── src/server/*           sign-in, database, place catalog, itinerary and package builders,
                             match and taste, reviews, imports, email
        │                     │                               │
        ▼                     ▼                               ▼
  Postgres (Railway)    Google Places API (New) and     OpenRouter (the model), Open-Meteo,
  24 tables             Routes API (server key)         Wikipedia, Resend
```

### 3.2 Signing in

1. Sign-up and sign-in post the email and password to `/api/auth/signup` or `/api/auth/login`
   (rate-limited). Passwords are hashed with bcrypt, cost 12.
2. The server makes a random session token, stores only its SHA-256 hash in `sessions` for 30 days,
   and sends the token in the `xp_session` cookie: HttpOnly (page scripts can't read it),
   SameSite=Lax, Secure in production.
3. On every request `src/proxy.ts` sends visitors without the cookie to `/login`, or answers 401 for
   APIs. Route handlers then look the token up (`getSessionUser` in `src/server/auth.ts`) and push
   the expiry out again when fewer than 15 days are left.
4. Requests that change data must also come from our own site: `assertSameOrigin` in
   `src/server/http.ts` checks the browser's `Sec-Fetch-Site` or `Origin` header (a CSRF guard).
5. "Forgot password?" emails a single-use, 30-minute link through Resend; resetting the password
   signs every other device out.

### 3.3 A chat turn

1. The traveler types. CopilotKit in the browser posts to `/api/copilotkit/agent/default/run`:
   the chat's messages, the **19 tools** the browser offers (name, description and a JSON schema
   built from `src/lib/travel/schemas.ts`) and **11 context entries** (profile, taste, learned
   preferences, thumbs, saved items, trips, planner values, map state, the catalog's places for the
   destination, active filters, today's date).
2. The route checks the session, then CopilotKit's runtime runs our agent (`src/server/agent.ts`):
   the system prompt (`src/lib/travel/prompt.ts`), the context and the messages go to the model
   through the AI SDK and OpenRouter, for up to 6 steps. The agent has two tools of its own on the
   server: weather (Open-Meteo) and destination facts (Wikipedia).
3. The answer streams back as AG-UI events over server-sent events: text as it is written, each
   tool call with its arguments, and "run finished".
4. A tool call such as `show_destinations` draws its card inside the message, in the browser. The
   card then fills itself in from ordinary API routes: `/api/itineraries` builds the day-by-day
   plan, `/api/places/resolve` finds each place, `/api/recs/home` scores picks. Two tools wait for
   the traveler before the model continues: `create_trip` and `remember_preference`.
5. When the run ends, `PersistentAgentRunner` (`src/server/copilot-runner.ts`) saves the
   transcript in Postgres, so a chat reopens after a deploy and on any device.

The tools live in the browser, not on the server: whichever client talks to the agent has to offer
them, and the system prompt names all 19.

### 3.4 Places, photos and maps

- **The place catalog** (`src/server/catalog.ts`) stores the places Google returns and answers
  repeat lookups without calling Google: a remembered alias, then a fuzzy name match near the
  destination, then a free ID-only Text Search, and Place Details only for an ID never seen. Each
  account gets 400 lookups a day.
- **Photos** come through our proxy, `/api/places/photo`, so the server key never reaches a device.
- **Maps** are drawn in the browser by the Google Maps JavaScript API: numbered markers, route
  lines, one map per day in the plan. Without keys, a small gazetteer gives estimated pins.
- **Travel times** between stops come from the Routes API (walk, drive, transit), with straight-line
  estimates as the fallback.
- `docs/PLACE_DATA_REDESIGN.md` plans to stop storing most Google content; section 7.5 covers what
  that means for the app.

### 3.5 Plans, trips and everything saved

- **Match scores** come from a deterministic model (`src/lib/match.ts`): profile, learned
  preferences, dealbreakers, taste, thumbs, rating. Thumbs and reactions recalibrate it per
  traveler.
- **The itinerary builder** (`src/server/itineraries.ts`) picks the stay, groups things to do by
  area into days, adds lunch and dinner nearby and times each day to the traveler's rhythm. Make
  itinerary saves the plan as a trip.
- **Everything the traveler owns** is a row in Postgres tied to the user: trips, items, members,
  saved items, guides, reviews, check-ins, reactions, notifications, chats and transcripts.

### 3.6 State in the browser

- `src/lib/store.tsx` loads the traveler's data once (`GET /api/me/state`) and writes each change
  through the API, optimistically. Only the planner values and small UI preferences stay in
  `localStorage`.
- Per-chat stores (map pins, compare selection, filter chips, pending cards) are small
  `useSyncExternalStore` stores in `src/lib`.

### 3.7 Tests, CI and deploys

- Vitest covers the pure logic; Playwright drives the real app against stand-ins
  (`tests/e2e/start-app.mjs` with `mock-openrouter.mjs`, `mock-places.mjs`, `mock-site.mjs`,
  `mock-resend.mjs`).
- GitHub Actions runs lint, typecheck, unit tests, the build and the end-to-end suite on every push.
- Railway builds `main` with Railpack and deploys it. The live service doesn't use the repo's
  `Dockerfile` or `railway.json`, so it has no healthcheck configured.

## 4. What moving to React Native means

React Native draws real iOS and Android views from React components. It has no DOM and no CSS, so
the website's screens can't run in it, but everything behind them can stay.

| Part | Today | In the native app | Work |
| --- | --- | --- | --- |
| Server | Next.js pages, 56 API routes, chat runtime, Postgres, Google server key | The same server is the app's backend | A few additions (section 8) |
| Plain TypeScript logic | 34 of the 45 files in `src/lib`: types, tool schemas, match model, itinerary logic, link builders, place-name tools, per-chat stores | Shared by both apps from `packages/shared` | Move, no rewrite |
| Code that talks to the network or the device | 8 files: `api.ts`, `store.tsx`, `app-config.ts`, `places/client.ts`, `places/destination-photo.ts`, `reviews-client.ts`, `recs/itinerary-draft.ts`, `recs/destination-picks.ts` | Same logic, with small adapters for the server address, sign-in header, storage, navigation and location | Split |
| Web-only helpers | `ui-prefs.ts`, `use-flip.ts`, `use-media-query.ts` | Native equivalents | Replace |
| Screens | 112 component files: divs with Tailwind classes, dnd-kit, portals, the Google Maps JavaScript API | Rebuilt with native components, same design, copy and behavior | Most of the work |
| Chat | CopilotKit's web chat and 19 tools registered in the browser | A native chat screen; the same 19 tools and context entries, registered in the app | Rebuild the UI, reuse schemas |

So the refactor is: add a native app next to the website in this repository, move the shared logic
out of the website so both apps use it, and add the few server features a native app needs. The
website keeps working and shipping throughout.

## 5. Options compared

| | A. Expo app + shared package (recommended) | B. Capacitor: the website in a native shell | C. One UI for web and phone |
| --- | --- | --- | --- |
| What it is | A React Native app next to the website; logic shared, screens rebuilt natively | Capacitor 8.5 packages web files, or loads the live site, in a WebView | Rewrite the website in React Native components and serve it on the web through react-native-web (Expo Router's web output), or share navigation with Solito |
| Time to a first build | 1–2 weeks (VS-00) | Days | Months |
| Feel on the phone | Native lists, sheets, gestures, keyboard, maps | A website in a frame | Native on phones; the website changes too |
| Maps | Google's native SDKs: map loads unlimited and free | The web Maps JavaScript API: US$7 per 1,000 loads after 10,000 a month | Native on phones |
| Fit with our server | The API as it is, plus token sign-in | Static export (`output: 'export'`) drops route handlers that read the request, `cookies()`, the proxy and server actions, so the app can't be exported; loading the live site with `server.url` is "not intended for use in production" by Capacitor's own docs | Moves away from Next.js server rendering for the website |
| App Store risk | Low | High: guideline 4.2 asks apps to go "beyond a repackaged website" | Low |
| Risk to the website | None | None | High: every screen rewritten |

**Recommendation: A.** It is the only option that gives a native feel without putting the website
at risk, and the shared package and server changes it needs would be needed by any option.
Expo's DOM components (`'use dom'`, web components running in a WebView inside the native app) are
a fallback for rarely used screens that aren't worth rebuilding yet: their props must be
serializable, they can't take children, and they are slower than native views, so never for the
chat, the plan or the maps.

## 6. The mobile stack

Versions as published on 2026-09-26; each library follows the version Expo SDK 57 pins where it
pins one.

| Need | Choice | Version | Why |
| --- | --- | --- | --- |
| Framework | Expo SDK 57: React Native 0.86, React 19.2.3, the New Architecture (always on since SDK 55) | expo 57.0 | Current stable, released 2026-06-30. SDK 58 (on a React Native 0.88 release candidate) has been in a three-to-four-week beta since 2026-09-15; move to it once it is stable |
| Screens and links | Expo Router: one file per screen, and every screen gets a link | 57.0 | Links into the app (F-017) come with it |
| Native code | Development builds instead of Expo Go | — | Google maps on iOS and push notifications need native code; Expo Go dropped push in SDK 53 |
| Builds and releases | EAS Build, Submit and Update | eas-cli 24.8 | iOS builds run on EAS's Macs; Update ships fixes to the app's code without a store release |
| Chat | `@copilotkit/react-native`, pinned to the runtime's version | 1.72.0 (latest 1.74.0) | CopilotKit's official React Native package: the same v2 hooks as the website, plus a native `CopilotChat` |
| Network | Expo's fetch (global since SDK 56, streams responses) and the shared API client | — | Streaming for the chat; the token on every request |
| Maps | `react-native-maps` with the Google provider on both platforms | 1.27.2 | Google's terms (section 7.5); free map loads; 1.29 has an open iOS marker bug |
| Styling | Uniwind (Tailwind CSS v4 classes for React Native) | 1.12.0 | Shares the website's Tailwind 4 theme tokens and class names. NativeWind 4 (the most used) is on Tailwind v3, and its Tailwind v4 version (5.0) is a release candidate "not intended for production use" |
| Base components | react-native-reusables (a shadcn/ui port on Radix-style primitives; supports Uniwind) | — | Accessible dialogs, menus, switches to build on |
| Animation and gestures | Reanimated 4 and Gesture Handler | 4.5.1 / 2.32 | Sheets, drag, swipes |
| Reordering | `react-native-reorderable-list` | 0.18.1 | Virtualized, scrolls while dragging, maintained; its API "is not considered stable yet", so it sits behind our own `StopList` |
| Long lists | FlashList | 2.0.2 | Chat list, Saved, Updates |
| Sheets | `@gorhom/bottom-sheet` | 5.2 | The map and place sheets; also what CopilotKit's native chat uses |
| Keyboard | `react-native-keyboard-controller` | 1.21.9 | The composer stays above the keyboard |
| Secure storage | `expo-secure-store` (Keychain on iOS, Keystore on Android) | 57.0 | The sign-in token; AsyncStorage is unencrypted |
| Images | `expo-image` | 57.0 | Sends the token with photo requests; memory-only cache |
| Push | `expo-notifications` and Expo's push service; `expo-server-sdk` on our server | 57.0 / 7.2.0 | One API for both platforms, free |
| Later | `expo-location`, `expo-image-picker`, `expo-document-picker` | 57.0 | Explore near you, check-ins, imports |
| Icons and type | `lucide-react-native`; Inter and Source Serif 4 through `expo-font` | 1.48 | The website's icons and typefaces |
| Tests | `jest-expo` with React Native Testing Library; Maestro flows, which EAS Workflows can run on iOS simulators and Android emulators | 57.0 / 14.0 | Component tests and on-device journeys |

## 7. How the app works

### 7.1 Repository layout

```
/                      the website stays where it is (Next.js, API, tests; Railway builds it)
├── package.json       the website's install, unchanged
├── packages/shared/   @xpmatch/shared: types, tool schemas, match model, itinerary logic, links,
│                      place-name tools, per-chat stores, the API client and store with adapters
└── mobile/            the Expo app with its own package.json and lockfile: app/ (one file per
                       screen, Expo Router), components/, lib/ (native adapters), app.config.ts,
                       eas.json, metro.config.js
```

The website stays at the root so the Railway service, the CI workflow and the end-to-end suite
keep working unchanged.

The app gets **its own install in `mobile/`** instead of joining an npm workspace with the website.
Expo pins an exact React version per SDK (19.2.3 for SDK 57) while the website runs 19.2.8, and a
React Native bundle must hold exactly one copy of React. In one npm workspace, the website's React
would sit at the root, where hoisted packages such as `react-native` would pick it up next to the
app's own copy. Expo's monorepo guide also says duplicate React Native versions aren't supported.

`packages/shared` is TypeScript source, not a built package. The website reaches it through a path
alias; the app through Metro, which watches the folder and resolves its imports from
`mobile/node_modules`. Each app compiles the shared code itself, so its `react` and `zod` imports
resolve to that app's own copies. If we later want build caching or more apps, the usual next step
is pnpm workspaces, whose isolated installs Expo supports from SDK 54, with the website moved to
`apps/web`.

### 7.2 The shared package

- **Moved as they are** (34 files): `types.ts`, `match.ts`, `itinerary.ts`, `ranking.ts`,
  `reviews.ts`, `search-parser.ts`, `travel/*` (schemas, prompt, links, collections, inspiration),
  `recs/types.ts`, `recs/verdict.ts`, `recs/why.ts`, `places/*` (types, names, kind, hours,
  gazetteer, facts, evidence), `feedback/*`, `profile/options.ts`, the `types.ts` files under
  `reservations/`, `import/`, `bugs/` and `admin/`, and the five per-chat stores.
- **Moved with adapters** (8 files): the API client takes a base URL and a way to add the sign-in
  header; the store takes storage (`localStorage` on the web, secure or async storage in the app) and
  an "on signed out" callback instead of `window.location`; the check-in client takes a location
  reader. The web passes today's behavior, so nothing changes for it.
- **Types that live in server files move too:** `DraftPick`, `DraftStop`, `DraftDay` and
  `ItineraryDraft` from `src/server/itineraries.ts`, and the package types from
  `src/server/packages.ts`, so neither app imports from `src/server`.
- **Request schemas** written inline in 26 route files move into the package where the app sends the
  same body, so both sides validate with one schema.
- The unit tests for these files move with them and keep running in CI.

### 7.3 Signing in on the phone

The website keeps its cookie. The app uses a token in the same `sessions` table:

1. The app calls the same sign-in routes as the website (`login`, `signup`, `forgot`, `reset`)
   with `client: "ios"` or `"android"` and a device name in the body. Each route validates and
   rate-limits exactly as today.
   - For a native client, sign-in, sign-up and reset answer `{ token, expiresAt, user }` and set no
     cookie.
   - All four skip the same-origin check for a native client; the check exists to protect cookies
     set in a browser.
2. The app keeps the token in the phone's secure storage (Keychain on iOS, Keystore on Android) and
   sends `Authorization: Bearer <token>` on every request, including the chat stream and photos.
3. `getSessionUser` authenticates a request that carries a bearer token by that token alone, and
   every other request by the cookie. `src/proxy.ts` lets a request with either through to the
   handler, which validates it.
4. Bearer requests skip the same-origin check. Cross-site forgery rides on cookies the browser
   attaches by itself; a browser adds an `Authorization` header by itself only after an HTTP
   authentication challenge, which we never send. A page on another site can't add the header
   either: that needs a CORS preflight we never approve.
5. Sign-out deletes that one session. A password reset deletes all the others, and account
   deletion deletes every one. Sessions record the platform, device name, app version and last use,
   for a future "Your devices" list.

Why not keep the cookie in the app: React Native does store and send cookies on its own (iOS
through the shared cookie storage, Android through its cookie handler, and Expo's fetch uses the
same stores), but React Native's docs call cookie-based authentication "currently unstable", and
the same-origin check would reject the app anyway.

Two details from the secure store: some iOS versions rejected values over about 2,048 bytes (our
token is far smaller), and iOS keeps Keychain entries after the app is deleted. The app therefore
clears the stored token on its first launch after an install.

Store rules this section has to meet:

- **Account deletion (App Store 5.1.1(v), Google Play):** an app that lets people create an account
  must let them delete it inside the app; deactivation isn't enough. Google Play also needs a web
  page where people can ask for deletion without the app. Section 8 adds both.
- **Sign in with Apple (App Store 4.8)** applies only when a third-party or social sign-in creates
  the account. It doesn't apply to an app that "exclusively uses your company's own account setup
  and sign-in systems", which is our email and password. If we add Google sign-in (F-030), we
  add Sign in with Apple with it.

### 7.4 The chat on the phone

CopilotKit now has an official React Native package, `@copilotkit/react-native`, first published
on 2026-05-07. Its docs say React Native "is feature complete, but the docs are still catching
up". Its 1.72.0 release matches our runtime and website, and it contains:

- `CopilotKitProvider` pointed at `https://app.xpmatchme.com/api/copilotkit`, with the bearer token
  in `headers`. The provider reads its headers when it renders, so it re-renders when the token
  changes (or we call `copilotkit.setHeaders`).
- The hooks the website uses: `useAgent`, `useFrontendTool`, `useHumanInTheLoop`,
  `useAgentContext`, `useConfigureSuggestions`, `useSuggestions`, `useCopilotKit`, plus
  `useRenderToolCall` to draw a tool's card in our own message list and `useThreads`.
- A native `CopilotChat` with a `threadId` prop like the website's, and a markdown renderer. It
  depends on `@gorhom/bottom-sheet`, Reanimated, Gesture Handler and `react-native-streamdown`.
- Not supported yet: `threadId` on `useAgent` (the thread comes from the chat's configuration),
  the Inspector, voice, and three web rendering hooks we don't use.

Setup notes from its docs: `react-native-get-random-values` must be imported before anything else,
because CopilotKit's own fallback backs `crypto.getRandomValues` with `Math.random`. Metro must also
resolve `jose` with its browser build.

**The one thing to prove first (VS-00): the stream.**

- React Native's own `fetch` can't stream a response body; the issue has been open since 2020.
- Expo's `fetch` streams (since SDK 52), and since SDK 56 it replaces the global `fetch`.
- CopilotKit's package installs its own XHR-based streaming `fetch` as the global whenever
  `new Response("").body.getReader` is missing. Under Expo, `Response` is still React Native's older
  polyfill, so by our reading of its source the package will likely replace Expo's `fetch` for the
  whole app.

The VS-00 build checks, on a real iPhone and Android phone:

- which `fetch` ends up global;
- that events arrive as they are written, not in one batch at the end;
- that Stop cancels the run;
- that the bearer header reaches the server on the stream, API calls and photos.

Fallbacks if it fails: AG-UI's own client (`@ag-ui/client`, which needs only a fetch whose body
has `getReader()`, `TextDecoder` and a random source) on Expo's `fetch`, keeping the same runtime.
Last, the AI SDK's Expo guide (`useChat` over Expo's `fetch`), which speaks its own stream format
and would need a second chat endpoint.

**The chat screen** starts from the package's `CopilotChat` with our thread, our cards and our
composer, and replaces its parts with our own components where the design needs it. The chat
list, the welcome state and the planner chips are ours.

Common to every transport option:

- **All 19 tools are registered in the app from the first chat build,** with the same names and
  schemas (`@xpmatch/shared`). The system prompt names every tool, so a tool the app doesn't offer
  could still be attempted. Tools without a native design yet get a plain card (a list of places
  with Save and Open) until they get their own.
- **The same 11 context entries** are built by shared functions from the store, so the model sees the
  same traveler on both apps.
- **Cards draw from partial arguments** while the tool call streams, as on the web (`Streaming<T>`).
- **Threads are shared:** a chat started on the website continues on the phone (the runner already
  stores transcripts per user).
- **Losing the network mid-answer** shows "Connection lost" with Retry; reopening the chat reloads
  the transcript through the runtime's connect call.

### 7.5 Maps and place details

**Google's terms decide the map.** The Maps Platform service terms say "Customer must not use Google
Maps Content from the Places API in conjunction with a non-Google map" (§14.2), and the same for the
Routes API (§19.2). Places content may be shown with no map at all (§14.1), and Google's Places UI
Kit may be used "with or without any map, including a non-Google Map" (§15.1). Our pins, place
cards and travel legs are Places and Routes content, so:

- **Both platforms use Google's map**: `react-native-maps` with the Google provider, set up through
  its Expo config plugin (`iosGoogleMapsApiKey`, `androidGoogleMapsApiKey`) in a development
  build. On iOS the library's default is Apple Maps, and `expo-maps` (still alpha) and Mapbox aren't
  Google maps either, so none of them may show our places.
- **Map loads are free on phones.** Google charges nothing for loads through the Maps SDKs for iOS
  and Android, while the website pays US$7 per 1,000 dynamic map loads after 10,000 a month.
- **Keys:** one key per platform, restricted to the iOS bundle ID and to the Android package name
  with its signing fingerprint. These keys ship inside the app, so the restriction is their
  protection. Places and Routes calls stay on our server with the server key, as today.
- **Version:** Expo SDK 57 pins `react-native-maps` 1.27.2. From 1.29.0, custom markers can
  disappear on Google maps on iOS (issue #5953, open), and our numbered pins are custom markers. We
  stay on 1.27 until that is fixed.
- **Numbered pins, route lines and the day maps** are rebuilt as native markers and polylines; the
  pin numbering and the day grouping come from the shared itinerary logic.

**Place details.** Until the place-data redesign lands, the app shows the same details the website
shows, from the same API.

Google's Places UI Kit elements are generally available on iOS and Android: Place Details since
June 2025, Place Search and Autocomplete since 2025-07-16. They come in the PlacesSwift SDK on
iOS and as fragments on Android. It costs US$1 per 1,000
queries after 10,000 a month, and US$5 per 1,000 for its Pro elements after 5,000. Place Details Pro
through the API costs US$17 per 1,000. There is no React Native wrapper, so using it means a small
native module of our own (VS-10), which is only worth building once the legal read confirms the
redesign (O-02).

### 7.6 Photos

The app loads `/api/places/photo` with the bearer token in the image request's headers (`expo-image`
takes headers per image). Photos stay in memory only: the place-data redesign stops caching Google
content (`docs/PLACE_DATA_REDESIGN.md`), and a disk cache on the phone would be one more copy.

### 7.7 Push notifications

- **The app** asks for permission at a moment that explains itself (after the first trip is made,
  or when the traveler adds a member), then gets an Expo push token (`getExpoPushTokenAsync`) and
  registers it with `POST /api/me/devices`. The token stays the same across app updates but can
  change after a reinstall on Android, so the app registers it again on every launch.
- **The server** sends through Expo's push service when `notify()` writes an Update of a kind that
  pushes (`trip_invite`, `trip_activity`, `guide_saved`). Each message carries the text and a link
  (`/trips/{id}`) that the app opens when the notification is tapped. Lock screens show the text, so
  it stays short and names only what the traveler needs ("Tayo added you to 4 days in Rome").
- **Expo's limits:** no charge; 600 notifications a second per project; up to 100 messages per
  request; 4,096 bytes per message.
- **What the server keeps:**
  - one token per user and device;
  - the ticket id Expo returns for each message. Receipts are fetched about 15 minutes later and
    Expo clears them after 24 hours.
- **Failures:**
  - a token Expo reports as `DeviceNotRegistered` is disabled;
  - `MessageRateExceeded` slows sending down;
  - a push that fails never loses the Update itself, which is already in the database.
- **Setup:** a paid Apple developer account and a Firebase (FCM V1) key uploaded to EAS; EAS
  manages Apple's push credentials. An Expo access token for enhanced push security goes into
  Railway's variables.
- **The server library** is `expo-server-sdk` (7.2.0), behind our own `src/server/push.ts`, so moving
  to APNs and FCM directly later would change one file.

### 7.8 Links into the app and sharing

- Trip, guide, chat and password-reset links (`https://app.xpmatchme.com/trips/…`, `/guides/…`,
  `/chat?thread=…`, `/reset?token=…`) open the app when it is installed: Universal Links on iOS
  (`/.well-known/apple-app-site-association`) and App Links on Android
  (`/.well-known/assetlinks.json`), both served by the Next.js server and added to the public paths
  in `src/proxy.ts`. Without the app they open the website, as today.
- A link to something the traveler can't see answers "not available" exactly as the website does;
  the server decides, not the app.
- Trips and guides get a native Share button with their web link.

### 7.9 Releases and keeping versions compatible

- **EAS Build** makes the iOS and Android binaries in Expo's cloud (iOS on its Macs); **EAS Submit**
  uploads them to App Store Connect and the Play Console; **EAS Update** ships changes to the app's
  JavaScript to installed apps without a store release, as long as the native code is unchanged.
- **Three build profiles:**
  - development: our own development client, pointed at a local server or staging;
  - preview: TestFlight and Play internal testing, pointed at staging (O-03);
  - production: the stores, pointed at `app.xpmatchme.com`.
- **Old app versions stay in use for months,** so API changes are additive: new fields are optional,
  nothing is renamed or removed while a supported app version still uses it.
- `/api/config` gains `minAppVersion` per platform. Below it, the app shows "Update XPMatch" with a
  store link instead of failing in odd ways.
- Every request carries `X-XP-Client: ios/1.0.0 (12)` so logs and bug reports show which build sent
  it.

### 7.10 Store listings and privacy answers

- **Apple's privacy labels** declare everything the app and its SDKs collect, whether it is linked
  to the traveler, and any tracking. The answers can be updated without a new build. The privacy
  manifest goes in `ios.privacyManifests` in the app config.
- **Google's Data safety form** is required of every app, including what SDKs collect.
- For us both cover:
  - account data (name, email);
  - what travelers write and save (profile answers, chats, trips, reviews);
  - photos and files they import (later);
  - location for check-ins, of which we keep only the result (later);
  - push tokens;
  - crash data if O-04 adds a vendor.
- **App Review gets a demo account** with a trip already made. The review notes explain that the
  assistant's cards come from Google Places and that prices are estimates, as the website says.

## 8. Server changes

| Change | Files | Why |
| --- | --- | --- |
| Token sign-in: `login`, `signup`, `forgot` and `reset` accept `client: "ios"` or `"android"` (and `login`, `signup` and `reset` then answer with a token instead of a cookie); `logout` accepts the bearer token; bearer tokens in `getSessionUser`, `src/proxy.ts` and `requireUser`; `sessions` gains `client`, `device_name`, `app_version`, `last_seen_at` | `src/server/auth.ts`, `src/server/http.ts`, `src/proxy.ts`, `src/server/schema.ts`, `src/app/api/auth/{login,signup,forgot,reset,logout}/route.ts` | React Native's docs call cookie sign-in "currently unstable", and the same-origin check rejects native requests |
| Account deletion: `DELETE /api/me` with the password, in one transaction, with an audit row; "Delete account" on the website too | new `src/app/api/me/route.ts`, `src/server/account.ts`, settings UI | Required by the App Store and Google Play |
| Push: `device_tokens` and `push_tickets` tables, `POST` and `DELETE /api/me/devices`, a sender called from `notify()`, a receipts check | `src/server/schema.ts`, new `src/server/push.ts`, `src/server/models.ts` (`notify`), new routes | Updates reach the phone |
| App links: `apple-app-site-association` and `assetlinks.json` | new route handlers under `src/app/.well-known/`, `src/proxy.ts` public paths | Links open the app |
| Version gate: `minAppVersion` in `/api/config`; `X-XP-Client` logged | `src/app/api/config/route.ts`, `src/server/http.ts` | Old apps fail politely |
| No duplicate trips: `POST /api/trips` accepts an optional `clientRequestId`, unique per owner | `src/app/api/trips/route.ts`, `src/server/schema.ts` | Phone networks retry; a double tap must not make two trips |
| Shared types and schemas out of server files | `src/server/itineraries.ts`, `src/server/packages.ts`, 26 route files | The app can't import `src/server` |
| Prompt sections follow the tools the client sent | `src/server/agent.ts`, `src/lib/travel/prompt.ts` | An older app that lacks a new tool never gets told to use it |

Nothing changes for the website's sign-in, the chat runtime's protocol, the database's existing
tables (other than the added columns) or the Google server key.

## 9. Blueprint

### 9.1 Product walkthrough

**Users**

- [USER-01] Traveler: plan a trip with the concierge on the phone, keep it, and use it on the road.
- [USER-02] Trip member: get told when added to a trip, open it, add to it.
- [USER-03] Operator (us): ship builds, keep old versions working, see failures, answer store
  review.

**Primary walkthrough**

1. A new traveler installs XPMatch from the App Store or Google Play and opens it.
2. They create an account (name, email, password) and answer three questions as chat bubbles:
   where they start from and dream of going, what they love doing, how they spend.
3. Discover shows "For you in {city}": nine picks with match scores and thumbs.
4. They open the Concierge tab and ask "Plan me 4 days in Rome". The answer streams in with a
   Rome itinerary card: photo, match score, "4-day itinerary · stay at …".
5. They open the plan: days with stops on a Google map with numbered pins. They swap a restaurant,
   mark a museum Not a fit, and drag dinner below the evening walk; the times follow.
6. They tap Make itinerary. "4 days in Rome" appears under Trips, on the phone and on the website.
7. They add a friend by email. The friend's phone shows a notification; tapping it opens the trip.

**Highest-value exception**

- Trigger: the network drops while the answer streams, or the phone locks mid-answer.
- Expected behavior: the chat says "Connection lost" and keeps what already arrived; nothing is
  saved twice.
- Recovery: Retry sends the turn again; reopening the chat reloads the transcript from the server.

**Non-goals for the first release**

- Rebuilding the website in React Native, or one UI codebase for both.
- Admin pages, bug triage and city seeding in the app (they stay on the website).
- Offline planning, Explore near you, check-ins, imports from the share sheet, reservations,
  creating guides, the package and compare cards as native designs (they get plain cards), Sign in
  with Apple or Google, payments. Most come in later slices (section 9.6).

### 9.2 Feature checklist

| ID | Actor | User or operational outcome | Priority | Dependencies | Status | Acceptance check | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | Traveler | Sign up, sign in and sign out in the app; stay signed in across restarts (the session renews while in use, as on the website) | MVP | — | Planned | Given a new email, when the traveler signs up and restarts the app, then Discover opens with their name | Pending |
| F-002 | Traveler | Reset a forgotten password from the app | MVP | F-001 | Planned | Given an account, when "Forgot password?" is used, then the emailed link sets a new password and every other session stops working | Pending |
| F-003 | Traveler | Delete the account and its data from the app (and from the website) | MVP | F-001 | Planned | Given a signed-in traveler, when they confirm with their password, then sign-in fails, their rows are gone and every token is refused | Pending |
| F-004 | Traveler | First run: three questions that fill the profile | MVP | F-001 | Planned | Given a new account, when the three answers are sent, then the profile holds them and Discover uses the home city | Pending |
| F-005 | Traveler | Discover: nine picks for a city with match scores, reasons and thumbs | MVP | F-004 | Planned | Given a profile, when Discover opens, then picks show scores and a thumbs-down moves a card to the end | Pending |
| F-006 | Traveler | Chat with streaming answers, Stop, suggestions and the chat list; chats shared with the website | MVP | F-001 | Planned | Given a chat started on the website, when it is opened on the phone, then the same messages show and a new turn streams | Pending |
| F-007 | Traveler | Destination itinerary cards and Make itinerary | MVP | F-006 | Planned | Given "Plan me 4 days in Rome", when Make itinerary is tapped twice quickly, then exactly one trip "4 days in Rome" exists | Pending |
| F-008 | Traveler | Hotel, restaurant and attraction cards with photo, rating, match, thumbs, Save, Add to trip | MVP | F-006 | Planned | Given a card set, when Save is tapped, then the place shows under Saved on both apps | Pending |
| F-009 | Traveler | A Google map of the chat's places with numbered pins; the assistant can move it | MVP | F-006 | Planned | Given pinned places, when a pin is tapped, then that place's details open | Pending |
| F-010 | Traveler | Place details: photos, rating, hours, reviews, travelers' reviews, Save, Add to trip, Use as my stay | MVP | F-009 | Planned | Given a place, when details open, then Google's attribution shows and Use as my stay changes the plan's stay | Pending |
| F-011 | Traveler | Change the plan: swap a stop, Not a fit, reorder by drag or arrows, move to another day | MVP | F-007 | Planned | Given a day, when a stop is dragged below another, then the order and times update and the pins renumber | Pending |
| F-012 | Traveler | Approve or decline the assistant's trip proposal and "Remember this?" cards | MVP | F-006 | Planned | Given a proposal, when Create trip is tapped, then the trip exists and the assistant continues | Pending |
| F-013 | Traveler, member | Trips list and trip page: day list board (reorder, Move to day), map, members, trip chat | MVP | F-007 | Planned | Given a trip, when a member is added, then the member sees it in Trips | Pending |
| F-014 | Traveler | Saved places and guides; unsave | MVP | F-008 | Planned | Given a saved place, when it is unsaved on the phone, then the website no longer lists it | Pending |
| F-015 | Traveler, member | Updates with an unread badge, and push notifications that open the trip or guide | MVP | F-013 | Planned | Given push allowed, when the traveler is added to a trip, then a notification arrives and opens that trip | Pending |
| F-016 | Traveler | Update my assistant: profile fields, learned preferences with delete, Learn from our chats | MVP | F-004 | Planned | Given a learned preference, when it is deleted, then it no longer reaches the assistant | Pending |
| F-017 | Traveler | Links to trips, guides and chats open in the app; Share a trip or guide | MVP | F-013 | Planned | Given the app installed, when a trip link is tapped in Messages, then the trip opens in the app | Pending |
| F-018 | Operator | Minimum app version: the server can require an update | MVP | — | Planned | Given `minAppVersion` above the build, when the app opens, then it shows Update XPMatch | Pending |
| F-019 | Traveler, operator | Report a bug from the app with a screenshot and the build number | MVP | F-001 | Planned | Given a report, when it is sent, then admins see it with platform and build | Pending |
| F-020 | Operator | Store listings, privacy labels, data safety form, review notes with a demo account | MVP | F-003 | Planned | Given the checklist, when builds are submitted, then both stores accept them for testing | Pending |
| F-021 | Traveler | Explore near you with the phone's location | Later | F-009 | Planned | Given location allowed, when Explore opens, then places near the traveler show on the map | Pending |
| F-022 | Traveler | Check in at a place and write a verified review | Later | F-010 | Planned | Given the traveler at the place, when they check in, then only the result is stored, not the coordinates | Pending |
| F-023 | Traveler | Import from the share sheet (links, screenshots) and the photo library | Later | F-006 | Planned | Given a shared link, when XPMatch is picked in the share sheet, then the import card shows its places | Pending |
| F-024 | Traveler | Import reservations (text, PDF, screenshot) into a trip | Later | F-013 | Planned | Given a confirmation, when it is imported, then the booking shows on its day | Pending |
| F-025 | Traveler | Read and save community guides | MVP | F-017 | Planned | Given a guide link, when it opens, then the places and the map show and Save guide works | Pending |
| F-026 | Traveler | Create and edit guides | Later | F-025 | Planned | Given a draft, when published, then it shows under Inspiration | Pending |
| F-027 | Traveler | Package and compare cards as native designs | Later | F-006 | Planned | Given a package request, when the card shows, then Swap and Lock work | Pending |
| F-028 | Traveler | Open saved trips without a connection | Later | F-013 | Planned | Given a trip opened once, when offline, then its days, times and notes show | Pending |
| F-029 | Traveler | Google's own place elements (Places UI Kit) in cards and details | Later | F-010 | Blocked | Given the legal read, when a place shows, then Google's element draws the Google content | Pending |
| F-030 | Traveler | Sign in with Apple and Google | Later | F-001 | Planned | Given an Apple ID, when the traveler continues with Apple, then an account is created or matched | Pending |

Rejected: admin screens, city seeding and bug triage in the app; a WebView wrapper of the website
as the shipped app (section 5).

### 9.3 Data model

Everything the traveler already has keeps its tables: users, profiles, preferences, trips,
trip_items, trip_members, chats, chat_messages, saved_items, guides, guide_items, notifications,
place_feedback, place_visits, rec_feedback, package_events, imports, bug_reports and the place
tables (whose future is in `docs/PLACE_DATA_REDESIGN.md`). The app adds:

| ID | Entity or controlled choice | Created by | Owner | Lifecycle or allowed states | Required data | Relationships | Sensitive fields | Historical snapshot needed? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D-001 | Session (existing `sessions`, new columns) | System at sign-in | The user | active → revoked, active → expired | token hash, user, expiry, client (`web`, `ios`, `android`), device name, app version, last seen | user; device tokens | token hash (the token itself is never stored) | No: a session is current state |
| D-002 | Device token (`device_tokens`) | The app, after the traveler allows notifications | The user | active → disabled → deleted | Expo push token (unique), platform, user, session, created, last used, disabled reason | user; session (deleted with it) | the push token (identifies a device) | No |
| D-003 | Push ticket (`push_tickets`) | System when sending | System | sent → ok, sent → error; receipt pending → ok or error | notification, device token, Expo ticket id, status, receipt status, error code, times | notification; device token | none | Yes: records what was sent and why a token was disabled |
| D-004 | Account deletion record (`account_deletions`) | System when a traveler deletes the account | System | written once | former user id, time, source (`ios`, `android`, `web`), counts of rows removed | none (the user row is gone) | none: no email or name | Yes: proof the deletion happened, without personal data |
| D-005 | Trip request id (`trips.client_request_id`) | The app when making a trip | The trip's owner | set once | a random id per tap | unique with the owner | none | No |
| D-006 | Client kind (controlled choice) | Product | Product | `web`, `ios`, `android` | — | sessions, deletions | — | — |
| D-007 | Notification kinds that push (controlled choice) | Product | Product | `trip_invite`, `trip_activity` and `guide_saved` push; `system` (admin updates) stays in Updates only | — | notifications | — | — |
| D-008 | Minimum app version (configuration) | Operator | Operator | one value per platform | semantic version | `/api/config` | — | No |

Allowed transitions:

| Entity | Transition | Who | Rule |
| --- | --- | --- | --- |
| Session | active → revoked | The user (sign out on that device); the system (password reset: all but the current; account deletion: all) | Revoking deletes the row, so the token stops working at once |
| Session | active → expired | The system | 30 days after it was last renewed; a request with fewer than 15 days left renews it, as on the web |
| Device token | → active | The app, signed in, with permission | Upsert by token: the same phone signing in as someone else moves the token to the new user |
| Device token | active → disabled | The system | Expo answers `DeviceNotRegistered`, or the traveler turns notifications off |
| Device token | → deleted | The system | Its session is revoked (sign out, reset, deletion) |
| Account | active → deleted | Only the account's owner, with the password | One transaction; nothing is left that identifies the traveler (section 9.9, O-01) |

Deleting a user row today cascades through every table that points at it. The exceptions keep the
row and blank the person: `bug_reports`, and "added by" on trip items and members. Two
consequences need a decision before VS-01 ships (O-01):

- trips the traveler owns disappear for their other members;
- their published guides disappear, leaving entries in other travelers' Saved lists that point at
  nothing.

### 9.4 Screens

Expo Router makes every file under `mobile/app/` a screen:

```
mobile/app/
  _layout.tsx                 providers: session, chat runtime, store, theme; update gate
  (auth)/sign-in.tsx  sign-up.tsx  forgot.tsx  reset.tsx
  (onboarding)/questions.tsx  the three first-run questions
  (tabs)/_layout.tsx          tab bar: Discover, Trips, Concierge, Saved, More
  (tabs)/index.tsx            Discover
  (tabs)/trips.tsx            Trips list
  (tabs)/concierge.tsx        the current chat, or a new one
  (tabs)/saved.tsx            Places | Guides
  (tabs)/more.tsx             Updates, Update my assistant, Report a bug, Account, Sign out
  chat/[thread].tsx           a chat from the chat list or a link
  map.tsx                     the chat's map (sheet)
  place/[id].tsx              place details (sheet)
  plan/[card].tsx             a destination card's plan
  trips/[id].tsx              a trip: Overview | Board | Map
  guides/[id].tsx             a guide
  updates.tsx  assistant.tsx  account.tsx (with Delete account)  update-required.tsx
```

| Feature IDs | Route or surface | User roles | Reusable components | Required UI states | Responsive and accessibility notes |
| --- | --- | --- | --- | --- | --- |
| F-001, F-002 | `(auth)/*` | Anyone | TextField, PrimaryButton, FormError | idle, submitting (button locked), wrong password, rate limited, offline, success | Keyboard avoids the fields; autofill for email and password; errors read by VoiceOver and TalkBack |
| F-003 | `account.tsx` | Traveler | ConfirmDialog, PasswordField | idle, confirming, deleting, wrong password, failed (account intact), deleted | Two steps; destructive button labeled "Delete account"; never the default button |
| F-004 | `(onboarding)/questions.tsx` | New traveler | ChatBubble, ChipGroup with Show all, BudgetCards | step 1–3, saving, save failed with retry | Chips 44 pt tall; Dynamic Type up to the largest size |
| F-005 | `(tabs)/index.tsx` | Traveler | PickCard, MatchBadge, Thumbs, CardRow | loading skeleton, empty (no city yet), partial (some kinds missing), error with retry | Rows scroll sideways; each card is one accessible element with its actions |
| F-006, F-012 | `(tabs)/concierge.tsx`, `chat/[thread].tsx` | Traveler | MessageList, Composer, SuggestionChips, ToolCard, ProposalCard, RememberCard | empty with suggestions, streaming, stopped, connection lost with Retry, HITL pending, run error | Composer stays above the keyboard; streaming text announced politely, not per token |
| F-007, F-011 | card in chat, `plan/[card].tsx` | Traveler | DestinationCard, DayCard, StopRow (drag handle, up/down, Day picker), SwapSheet | building plan, plan ready, swapping, moving, Make itinerary saving, saved (Open itinerary) | Up/down buttons and the Day picker give every move a non-drag path |
| F-008, F-009, F-010 | cards, `map.tsx`, `place/[id].tsx` | Traveler | PlaceCard, MapView with NumberedPin, PlaceDetail, Attribution | pins loading, place not found, photo missing, details error | Map pins also listed as rows; attribution never covered |
| F-013 | `(tabs)/trips.tsx`, `trips/[id].tsx` | Traveler, member | TripRow, BoardDay, StopRow, MemberList, AddMember | empty (no trips yet), loading, not a member ("not available"), saving a move, conflict (changed elsewhere, reloads) | Same move controls as the plan |
| F-014, F-025 | `(tabs)/saved.tsx`, `guides/[id].tsx` | Traveler | PlaceRow, GuideCard | empty with a next step, loading, removed | — |
| F-015 | `updates.tsx`, notifications | Traveler, member | UpdateRow, UnreadBadge | empty, unread, permission not asked, denied (explains settings) | Ask for permission only after the first trip, with a reason |
| F-016 | `assistant.tsx` | Traveler | ProfileSection, PreferenceRow, Switch | loading, saving, deleted | — |
| F-018 | `update-required.tsx` | Anyone | — | blocking | Store link button |
| F-019 | Report a bug (More) | Traveler | ReportForm, ScreenshotPreview | idle, sending, sent, failed | — |

Every screen also handles "signed out elsewhere" (a 401 sends the traveler to sign-in and clears
what was on screen) and long content (names that wrap, the largest text size).

### 9.5 Connections

| ID | User or external event | Query or command | Validation | Authorization | Consistency and idempotency | Failure and recovery | Audit and telemetry |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | Sign in or sign up | `POST /api/auth/login` or `/api/auth/signup` with `{ email, password, client: "ios", deviceName }` → `{ token, expiresAt, user }` | zod on both sides; same password rules as the web (8 characters or more) | Public; rate-limited per email and per address | One new session per success; an existing email answers 409 | 401 with one message for wrong email or password; 429 with the wait; offline keeps the form | Session row with client, device and version |
| C-002 | Any signed-in request | Any `/api/*` with `Authorization: Bearer` | Server as today | `getSessionUser` validates the token on every request; the route's own ownership checks unchanged | As each route today | 401: clear the token, go to sign-in; 5xx: the screen's error state with Retry | `X-XP-Client` in logs; no tokens in logs |
| C-003 | Sign out | `POST /api/auth/logout` with the bearer token | — | The token's own session only | Deleting twice is fine | Offline: the token is dropped on the phone; the session expires later | — |
| C-004 | Send a chat message | `POST /api/copilotkit/agent/default/run`, AG-UI SSE | Tool arguments against the shared zod schemas | Session required; the runner refuses threads of other users | The runner saves the transcript once per run | Stream drops: keep what arrived, Retry; app backgrounded: stop reading, reload the transcript on return | Run id with the thread id in server logs |
| C-005 | A card fills itself in | `POST /api/itineraries`, `POST /api/places/resolve`, `GET /api/recs/home`, … | Server as today | Session; lookup budget per account | Read-only | The card says what failed and offers Retry | — |
| C-006 | Make itinerary | `POST /api/trips` with `clientRequestId` | Server schema as today | Session | Unique (owner, clientRequestId): a retry returns the trip already made | Network error: retry with the same id; the button stays locked while pending | Trip created event |
| C-007 | Notifications allowed | `POST /api/me/devices` `{ expoToken, platform, appVersion }` | Token format checked | Session; the token moves to this user | Upsert by token | Retried on next launch | — |
| C-008 | A notification is created (trip invite, activity, guide saved) | `notify()` writes the row, then sends through Expo's push API | Payload holds only the text and the link, no personal data beyond it | Only to the notified user's active tokens | One ticket per (notification, token): a resend never duplicates | Expo 429 or 5xx: three tries with backoff, then marked failed; the in-app Update is never lost | Ticket and receipt rows; failures counted on the admin page |
| C-009 | Delete account | `DELETE /api/me` `{ password }` | Password required | The signed-in owner only | One transaction; a replay after success answers 401 (no session left) | Wrong password: 403, nothing changes; server error: rolled back, account intact | `account_deletions` row without personal data |
| C-010 | A photo shows | `GET /api/places/photo?name&w` with the bearer header | Server checks the name pattern and width | Session | Read-only | Missing photo: a neutral placeholder | — |
| C-011 | A link is tapped | Universal Link or App Link → the matching screen → its normal API call | — | The server's rules for that trip, guide or chat | — | Signed out: sign in, then continue to the link; not allowed: "not available" | — |
| C-012 | App opens or returns | `GET /api/config` | — | Public | — | Offline: carry on with the last answer | — |
| C-013 | Check in (later) | One location reading → `POST /api/places/{id}/checkin` | Server checks the distance | Session | One check-in per place per day | Denied permission: explain, offer the booking proof | Only the result is stored, never the coordinates |
| C-014 | Import a screenshot or file (later) | Resize on the phone, then `POST /api/import` or `/api/reservations` (multipart) | Type and 6 MB limit on the server | Session | Imports are cached per link for seven days | Too large after resizing: say so | Import row |

### 9.6 Vertical slices

Each slice is one outcome end to end (server, app, tests) and ends with the website's full suite
still green. Estimates assume one developer working with an AI assistant, in working days.

| Slice | Outcome | Included feature IDs | Data changes | Server behavior | UI | Tests | Exit evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VS-00 Foundation (5–7 days) | The app builds for iOS and Android, signs in with a token and streams one chat answer with one card | F-001 (server side), F-018 | `sessions` columns | Native sign-in on the auth routes; bearer in `getSessionUser`, `src/proxy.ts`, `requireUser`; `minAppVersion` | Expo app with the five tabs, theme tokens and fonts from the website; a bare chat screen | `native-auth.spec.ts`; shared package tests; the website's suite | Development builds on an iPhone and an Android phone stream an answer and draw `focus_map`'s card; the website's CI and Railway deploy unchanged |
| VS-01 Identity and account (4–5 days) | Sign up, sign in, sign out, reset, delete account; the three first-run questions | F-001–F-004 | `account_deletions` | `DELETE /api/me`; reset revokes tokens; Delete account on the website | `(auth)/*`, `(onboarding)/questions.tsx`, `account.tsx` | `account-deletion.spec.ts`; Maestro `first-run`, `delete-account` | SD-01 (first half), SD-02, SD-06, SD-09 pass |
| VS-02 Chat and the first plan (8–10 days) | Ask for a trip, get the Rome card, Make itinerary, see the trip in Trips | F-006, F-007, F-013 (list) | `trips.client_request_id` | Idempotent `POST /api/trips`; prompt sections follow the tools sent | Chat list, chat screen, composer, suggestions, destination card, plain cards for the other tools, Trips list | `trips-idempotency.spec.ts`; component tests for the cards; Maestro `chat`, `make-itinerary` | SD-01 end to end on both platforms; SD-04; SD-07 |
| VS-03 Map, places and the plan (8–10 days) | See the plan on a Google map, open places, swap, Not a fit, reorder, move days | F-008–F-011 | — | — | Map sheet with numbered pins, place cards, place details, plan screen with drag, arrows and Day picker | Component tests (reorder, swap); manual device pass | Screenshots on both platforms; the reorder logic's unit tests shared with the website |
| VS-04 Approvals and learning (3–4 days) | Confirm a trip proposal; answer Remember this?; edit the profile and learned preferences; thumbs | F-012, F-016 | — | — | Proposal and Remember cards, Update my assistant | Maestro `approvals` | The assistant continues after each tap; deleted preferences leave the context |
| VS-05 Trips, saved, updates and push (6–8 days) | Work on a trip on the phone; get told when added to one | F-013–F-015 | `device_tokens`, `push_tickets` | Devices routes; sends from `notify()`; receipts; token clean-up | Trip page (Overview, Board, Map), members, trip chat, Saved, Updates, the permission prompt | `push.spec.ts` with the push stand-in; Maestro `trip` | SD-08, SD-11; a real notification on both phones opens the trip |
| VS-06 Discover, guides and links (4–5 days) | Discover picks; read and save guides; links open the app; Share | F-005, F-017, F-025 | — | The two well-known files | Discover, guide screen, Share | `app-links.spec.ts`; manual links from Messages and Mail | SD-05; a trip link opens the app on both phones |
| VS-07 Store readiness (4–5 days, plus review time) | Both stores accept the app | F-018–F-020 | — | Bug reports carry platform and build | Report a bug, Update XPMatch screen, icons, splash, store screenshots | Accessibility checklist; full Maestro run; the website's suite | TestFlight and Play internal testing builds; privacy labels and data safety answered; submitted |

MVP total: about 42–54 working days, so roughly 9–11 weeks to submission, plus store review.

Later slices, in the order we'd suggest:

- **VS-08 Location:** Explore near you and check-ins (F-021, F-022), with the phone's location.
- **VS-09 Imports:** the share sheet, the photo library and reservations (F-023, F-024).
- **VS-10 Google's place elements** (F-029), after the legal read in `docs/PLACE_DATA_REDESIGN.md`.
- **VS-11 Offline trips** (F-028).
- **VS-12 Creating guides, and native package and compare cards** (F-026, F-027); social sign-in
  (F-030).

### 9.7 Sample data

The app's tests use the stand-ins the website's suite already has (`tests/e2e/start-app.mjs`: the
scripted model, the Places stub with Rome and Austell, the Resend stub), plus a new stand-in for
Expo's push API. All accounts are synthetic (`…@example.com`).

| Scenario | Roles and records | Starting state | Action | Expected result | Edge represented |
| --- | --- | --- | --- | --- | --- |
| SD-01 | Ada (new traveler) | No account | Sign up in the app, answer the three questions, ask "Plan me 4 days in Rome", Make itinerary | "4 days in Rome" under Trips on the phone and the website | Happy path |
| SD-02 | Anyone | No account | Sign up with `ada@` and a five-letter password | Field errors; no user row | Invalid input |
| SD-03 | Ben (new account) | No trips, saved items or updates | Open Trips, Saved and Updates | Each shows what to do next, no spinner left running | Empty state |
| SD-04 | Ada | Rome plan open | Make itinerary twice fast, with the first response lost | One trip | Duplicate action |
| SD-05 | Ada owns "4 days in Rome"; Ben is not a member | — | Ben opens the trip's link; Ben's token calls `GET /api/trips/{id}` | "Not available"; 404 from the server | Permission denial |
| SD-06 | Ada signed in on the phone | — | Ada resets her password on the website | The phone's next request gets 401 and shows sign-in | Revoked session |
| SD-07 | Ada | Chat open | The stand-in model cuts the stream halfway; the Places stub answers 500 once | "Connection lost" with Retry; the card's Retry works | External failure |
| SD-08 | Ada with notifications on | — | The push stand-in answers `DeviceNotRegistered` | The token is disabled; the Update still shows in the app | Push failure |
| SD-09 | Ada owns a trip with Ben as a member and a guide Cara saved | — | Ada deletes her account | Per decision O-01; Ada can't sign in; Ben and Cara see a consistent state | High-value exception |
| SD-10 | Any | `minAppVersion` above the build | Open the app | Update XPMatch screen | Old version |
| SD-11 | Ada, then Ben, on one phone | Ada has notifications on | Ada signs out, Ben signs in and allows notifications | The token belongs to Ben; Ada's notifications stop | Shared device |

### 9.8 Test matrix

| Feature ID | Acceptance check | Test level | Fixture or scenario | Expected result | Command or method | Result or evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 | Token sign-in, bearer requests, origin rule, sign-out | Integration (API) | SD-01, SD-02 | 200 with token; 401 after sign-out; cookie requests without Origin still refused | `npm run test:e2e -- native-auth.spec.ts` (Playwright request, no browser) | Pending |
| F-001 | Session survives a restart | End-to-end (app) | SD-01 | Discover opens signed in | Maestro flow `signin-restart.yaml` | Pending |
| F-002 | Reset revokes other sessions | Integration (API) | SD-06 | Old token 401 | `native-auth.spec.ts` | Pending |
| F-003 | Deletion removes everything; replay refused; wrong password changes nothing | Integration (API) | SD-09 | Rows gone; audit row; 403 on a wrong password | `npm run test:e2e -- account-deletion.spec.ts` | Pending |
| F-003 | Delete account from the app | End-to-end (app) | SD-09 | Back at sign-in; sign-in fails | Maestro `delete-account.yaml` | Pending |
| F-004, F-005 | Questions fill the profile; picks show | Component + end-to-end (app) | SD-01, SD-03 | Picks for Austell | `npm --prefix mobile test`; Maestro `first-run.yaml` | Pending |
| F-006 | Streaming, Stop, stream cut | Component + end-to-end (app) | SD-07 | Text streams; Retry after a cut | Maestro `chat.yaml` on Android and iOS | Pending |
| F-007 | One trip for two taps | Integration (API) + end-to-end (app) | SD-04 | One trip | `trips-idempotency.spec.ts`; Maestro `make-itinerary.yaml` | Pending |
| F-008–F-011 | Cards, pins, details, reorder | Component + unit + manual | SD-01 | Order and times follow; pins renumber | shared `vitest` (reorder logic, already covered); `npm --prefix mobile test`; manual pass on devices | Pending |
| F-012 | Proposal and Remember cards resume the run | End-to-end (app) | SD-01 | The assistant continues after the tap | Maestro `approvals.yaml` | Pending |
| F-013 | Board moves; non-member refused | Integration (API) + end-to-end (app) | SD-05 | 404 for Ben | existing trip specs; Maestro `trip.yaml` | Pending |
| F-015 | Device tokens, sends, receipts, shared device | Integration (API) | SD-08, SD-11 | Token moved; disabled on `DeviceNotRegistered`; no duplicate sends | `npm run test:e2e -- push.spec.ts` with the push stand-in | Pending |
| F-015 | A notification opens the trip | Manual on devices | SD-01 | The trip opens | TestFlight and Play internal testing | Pending |
| F-017 | Links open the app | Manual on devices + integration (the two well-known files) | SD-05 | App opens; files served with the right type | `app-links.spec.ts`; manual | Pending |
| F-018 | Update gate | Component | SD-10 | Update screen | `npm --prefix mobile test` | Pending |
| All | Website unaffected | Existing suite | — | All green | `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` | Pending |
| All | Accessibility | Manual | — | VoiceOver and TalkBack reach every control; the largest text size doesn't clip | Checklist per screen | Pending |

### 9.9 Decisions, assumptions and open questions

| ID | Type | Statement | Rationale or evidence | Owner | Validate by | Reversal path | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEC-01 | Decision | Build a native Expo (React Native) app; keep the website as it is | Section 5 | You | Before VS-00 | The shared package and server work serve any option | Proposed |
| DEC-02 | Decision | The Next.js server stays the only backend for both apps | It already has every route; one set of rules, one database | You | Before VS-00 | — | Proposed |
| DEC-03 | Decision | The website stays at the root with its own install; `mobile/` has its own install; `packages/shared` is source both reach by path | Railway, CI and the suite keep working unchanged; each app keeps its own React (section 7.1) | Us | VS-00 | pnpm workspaces with `apps/web` and `apps/mobile` if we want a monorepo tool later | Proposed |
| DEC-04 | Decision | The app signs in with bearer tokens in the same `sessions` table; the website keeps its cookie | Section 7.3 | Us | VS-00 | Tokens are ordinary sessions; revoking them is one delete | Proposed |
| DEC-05 | Decision | Google maps on both platforms, not Apple Maps on iOS | Section 7.5 | Us | VS-03 | — | Proposed |
| DEC-06 | Decision | Push through Expo's push service | Section 7.7 | Us | VS-05 | Send through APNs and FCM directly; only `src/server/push.ts` changes | Proposed |
| DEC-07 | Decision | The app registers all 19 tools from VS-02; tools without a native design get a plain card | The prompt names every tool (section 7.4) | Us | VS-02 | — | Proposed |
| DEC-08 | Decision | Admin pages stay on the website | Few users, desktop work | You | — | Add later if needed | Proposed |
| A-01 | Assumption | CopilotKit's React Native package streams our runtime's events and runs our tools and approval cards on both platforms | Section 7.4 | Us | The VS-00 build | Our own AG-UI client over a streaming fetch (section 7.4) | Open |
| A-02 | Assumption | Metro can compile `packages/shared` from outside `mobile/` and resolve its imports from the app's own `node_modules` | The website runs React 19.2.8; Expo SDK 57 pins 19.2.3 (section 7.1) | Us | VS-00: one bundle, one React | Copy the shared source into `mobile/` at build time with a script | Open |
| A-03 | Assumption | Email and password only means Sign in with Apple isn't required | App Review 4.8 applies to third-party sign-in (section 7.3) | Us | First review | Add Sign in with Apple with any social sign-in (F-030) | Open |
| A-04 | Assumption | 9–11 weeks for the MVP | Section 9.6 | Us | After VS-02: compare actual days with the estimate | Cut VS-06 or move it after launch | Open |
| A-05 | Assumption | Most early users are on iPhones | `docs/MOBILE_PLAN.md`: production traffic is mostly iPhone Safari | Us | Store analytics after launch | — | Open |
| O-01 | Open question | When a traveler deletes the account, what happens to trips they own that have other members, and to guides other travelers saved? | Today's cascades delete both (section 9.3) | You | Before VS-01 | — | Open |
| O-02 | Open question | Should the place-data redesign's API change land before the app's place screens (VS-03), so the app is built once on it? | `docs/PLACE_DATA_REDESIGN.md`; the legal read is pending | You | Before VS-03 | Build on today's API and migrate the app later (costs a rework of VS-03) | Open |
| O-03 | Open question | A staging environment for test builds (a second Railway environment with its own database)? | Test builds shouldn't write to production | You | Before VS-02 | Point test builds at production with test accounts only | Open |
| O-04 | Open question | Crash reporting (Sentry) for the app? | Crashes on phones are invisible without it; a new vendor to add to the privacy policy | You | Before VS-07 | Bug reports only | Open |
| O-05 | Open question | Enroll with Apple as a person or as a company? | A company needs a D-U-N-S number; the store shows the seller's name | You | Before VS-00 | — | Open |
| O-06 | Open question | Launch on both stores at once, or iPhone first? | A-05; one codebase builds both | You | Before VS-07 | — | Open |

## 10. Timeline and costs

**Timeline.** VS-00 to VS-07 take about 42–54 working days (9–11 weeks), then store review. Two
things run alongside:

- **Google Play's closed test.** A personal Play account needs 12 testers in a closed test for 14
  days before it can publish. Starting that test at the end of VS-05 keeps it off the critical
  path.
- **The website keeps shipping.** Each slice's server changes are additive and go out through
  `main` as usual.

| Item | Cost | Note |
| --- | --- | --- |
| Apple Developer Program | US$99 a year | Needed for TestFlight, push and the App Store |
| Google Play Console | US$25 once | — |
| EAS | Free to start: 15 Android and 15 iOS builds a month, one at a time; updates for up to 1,000 monthly users. Starter: US$19 a month with US$45 of build credit and 3,000 update users. Production: US$199 a month | Every plan includes Build, Submit, Update and Workflows |
| Expo push service | Free | 600 notifications a second per project |
| Google maps on phones | Free | Map loads through the Maps SDKs for iOS and Android are unlimited |
| Places API, Routes API, the model | Unchanged per chat | The app calls our server, which calls them as today |
| Staging (O-03) | A second Railway environment with its own Postgres, billed by use | Optional |
| Crash reporting (O-04) | Depends on the vendor | Optional |

## 11. What we need from you before building

1. **Decisions:** DEC-01 (build the native app) and the open questions O-01 (what account deletion
   does to shared trips and guides), O-02 (place-data redesign first or not), O-03 (staging),
   O-05 (enroll as a person or a company) and O-06 (both stores or iPhone first).
2. **Accounts:**
   - Apple Developer Program, US$99 a year. A company needs a D-U-N-S number and must be a legal
     entity; Apple doesn't accept trade names.
   - Google Play Console, a one-time US$25. A personal account created after 13 November 2023 must
     keep at least 12 testers opted in to a closed test for the 14 days before it can apply for
     production, so that test should start early (an organization account doesn't have this
     requirement).
   - An Expo account for EAS. Its access token goes into this environment's secrets, never into
     the repository.
3. **Names:** the app's store name and the bundle ID and package name (for example
   `com.xpmatch.app`), which can't change after the first release.
4. **Google Cloud:** two new keys for the Maps SDK for iOS and for Android, restricted to that
   bundle ID and to the package name with its signing fingerprint. The server key stays where it
   is.
5. **Two phones for testing:** an iPhone and an Android phone that install the development builds.
   iOS builds run on EAS's Macs, so no Mac is needed.

## 12. Sources

Checked on 2026-09-26. Package versions come from the npm registry that day.

- **Expo:**
  - [SDK 57](https://expo.dev/changelog/sdk-57)
  - [SDK 58 beta](https://expo.dev/changelog/sdk-58-beta)
  - [SDK 56](https://expo.dev/changelog/sdk-56) (Expo's fetch becomes the global `fetch`)
  - [SDK 52](https://expo.dev/changelog/2024-11-12-sdk-52) (Expo's fetch streams)
  - [`expo` package](https://docs.expo.dev/versions/latest/sdk/expo/)
  - [New Architecture](https://docs.expo.dev/guides/new-architecture/)
  - [Expo Router](https://docs.expo.dev/router/introduction/)
  - [monorepos](https://docs.expo.dev/guides/monorepos/)
  - [DOM components](https://docs.expo.dev/guides/dom-components/)
  - [using libraries](https://docs.expo.dev/workflow/using-libraries/)
  - [SDK 57's pinned modules](https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json)
  - [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
  - [expo-maps](https://docs.expo.dev/versions/latest/sdk/maps/)
  - push: [FAQ](https://docs.expo.dev/push-notifications/faq/), [sending](https://docs.expo.dev/push-notifications/sending-notifications/), [setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
  - [EAS Workflows end-to-end tests](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)
  - [pricing](https://expo.dev/pricing)
  - [Apple privacy](https://docs.expo.dev/guides/apple-privacy/)
- **CopilotKit and AG-UI:**
  - [React Native docs](https://docs.copilotkit.ai/react-native)
  - [`@copilotkit/react-native`](https://www.npmjs.com/package/@copilotkit/react-native)
  - [its streaming fetch](https://github.com/CopilotKit/CopilotKit/blob/main/packages/react-native/src/streaming-fetch.ts)
  - [AG-UI client's HTTP transport](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/run/http-request.ts)
  - [AI SDK with Expo](https://ai-sdk.dev/docs/getting-started/expo)
- **React Native:**
  - [networking and cookies](https://reactnative.dev/docs/network)
  - [security and storage](https://reactnative.dev/docs/security)
  - [streaming issue #27741](https://github.com/facebook/react-native/issues/27741)
- **Google Maps Platform:**
  - [service terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) (§14 Places API, §15 Places UI Kit, §19 Routes API)
  - [pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
  - [Places UI Kit is generally available](https://mapsplatform.google.com/resources/blog/places-ui-kit-is-now-generally-available-bring-googles-rich-places-content-to-any-map/)
  - Places UI Kit for [iOS](https://developers.google.com/maps/documentation/places/ios-sdk/places-ui-kit-overview) and [Android](https://developers.google.com/maps/documentation/places/android-sdk/places-ui-kit-overview)
- **Maps libraries:**
  - [react-native-maps](https://github.com/react-native-maps/react-native-maps) and its [installation](https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md)
  - [issue #5953](https://github.com/react-native-maps/react-native-maps/issues/5953)
- **Styling and lists:**
  - NativeWind [installation](https://www.nativewind.dev/docs/getting-started/installation) and [v5](https://www.nativewind.dev/v5)
  - [Uniwind](https://docs.uniwind.dev/)
  - [react-native-reusables](https://github.com/founded-labs/react-native-reusables)
  - [react-native-reorderable-list](https://github.com/omahili/react-native-reorderable-list)
  - [Reanimated compatibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/)
- **Apple:**
  - [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (4.2, 4.8, 5.1.1(v))
  - [offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
  - [privacy details](https://developer.apple.com/app-store/app-privacy-details/)
  - [enrollment](https://developer.apple.com/programs/enroll/)
- **Google Play:**
  - [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
  - [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
  - [registration fee](https://support.google.com/googleplay/android-developer/answer/6112435)
  - [testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- **Capacitor and Next.js:**
  - [Capacitor config (`server.url`)](https://capacitorjs.com/docs/config)
  - [`@capacitor/core`](https://www.npmjs.com/package/@capacitor/core)
  - [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports)
