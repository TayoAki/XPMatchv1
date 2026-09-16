# XPMatch v2 plan: accounts, per-user data, community guides, Railway

Status: proposed → reviewed → **building** (see "Review" and "Build order" at the end).

## 1. What we are adding

| Area | Today | Target |
| --- | --- | --- |
| Login | none; everything in `localStorage` | Email + password accounts; every record owned by a user |
| Trips | local list + itinerary from chat | Server-side trips with members, a Mindtrip-style detail page (Ideas, Itinerary, Bookings, Media, Trip preferences, Calendar), trip-scoped chat and map |
| Explore | curated static list | Things **near you**: restaurants, experiences, stays and community guides around your home city (or your location), list + map |
| Saved | local hearts | Server-side saves of places **and** guides, from chat, Explore and Inspiration |
| Updates | local activity log | Communications: you were added to a trip, a trip member added something, someone saved your guide |
| Inspiration | curated static cards | Community guides created by users, browsable and searchable |
| Create | trip form | **Guide editor**: title, destination, description, places with notes, cover photo, publish to the community (trip creation stays one click away) |
| Hosting | local only | Railway: Next.js service + Postgres, public URL |

Out of scope for this round (tracked as follow-ups): social login, password reset emails, persistent chat
transcripts across server restarts (needs a database-backed CopilotKit runner), real-time collaboration,
booking integrations, mobile layout polish.

## 2. Architecture

### 2.1 Database
- **Postgres** on Railway in production, accessed with `pg`. **PGlite** (embedded Postgres, WASM) for local
  development when `DATABASE_URL` is unset, so `npm run dev` needs no setup and uses the same SQL dialect.
- A tiny adapter (`src/server/db.ts`) exposes `query(sql, params)` for both drivers. No ORM: the schema is
  small and raw SQL keeps the dependency surface minimal.
- Idempotent migrations (`CREATE TABLE IF NOT EXISTS …`, tracked in a `schema_migrations` table) run on the
  first query of each server process.

### 2.2 Auth
- Email + password. Passwords hashed with bcrypt (12 rounds). Sessions are random 256-bit tokens stored
  hashed (SHA-256) in `sessions`, sent as an `HttpOnly; Secure; SameSite=Lax` cookie (`xp_session`,
  30 days, refreshed on use).
- Routes: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
  Mutating API routes verify a same-origin `Origin` header (CSRF) in addition to the cookie.
- `src/proxy.ts` (Next 16's middleware) redirects unauthenticated visitors of app pages to `/login?next=…`
  and returns 401 for API routes, including the CopilotKit runtime and Places routes so the model and
  Google keys are only spent by signed-in users.
- Pages: `/login`, `/signup` (name, handle, email, password), logout in the sidebar menu.

### 2.3 Data model
```
users            id, email (unique), password_hash, name, handle (unique), created_at
sessions         id, user_id, token_hash, expires_at, created_at
profiles         user_id (pk), preferences jsonb (TravelerProfile fields), onboarded, updated_at
trips            id, owner_id, title, destination, place jsonb (lat/lng/viewport/photo), start_date, end_date,
                 travelers, budget_tier, summary, itinerary jsonb, preferences text, created_at, updated_at
trip_members     trip_id, user_id, role (owner|editor|viewer), added_by, created_at
trip_items       id, trip_id, kind (idea|booking|media), place jsonb, title, note, url, added_by, created_at
trip_chats       thread_id (pk), trip_id, user_id, title, created_at
chats            thread_id (pk), user_id, title, created_at, updated_at
saved_items      id, user_id, kind (destination|hotel|restaurant|attraction|flight|guide), ref_id, title,
                 subtitle, place jsonb, url, created_at
guides           id, author_id, title, destination, place jsonb, description, cover_url, tags text[],
                 published, created_at, updated_at
guide_items      id, guide_id, position, place jsonb, note
notifications    id, user_id, kind (trip_invite|trip_activity|guide_saved|system), text, data jsonb, read, created_at
```
`place jsonb` always holds a `ResolvedPlace` (id, name, lat/lng, photos, rating…) so anything can be pinned
on a map without another lookup.

### 2.4 Client state
- The existing external store keeps its shape (profile, saved, trips, chats, updates) but is **hydrated from
  `GET /api/me/state`** after login and **writes through** to the API (optimistic updates, rollback on error).
  Only the trip planner values and UI preferences stay in `localStorage`.
- Components keep using `useTravelStore()`; only the persistence layer changes.

### 2.5 AI integration
- Agent context adds the signed-in user (name, handle), their trips (from the server) and, on a trip page,
  the current trip (members, ideas, itinerary). `create_trip` and `update_traveler_profile` write through the
  API. The place sheet's **Add to trip** opens a trip picker (or creates a trip).
- Chat threads are recorded per user (`chats`); trip chats are recorded in `trip_chats` so a trip page can
  list and reopen its conversations.

### 2.6 Maps
- Extract the marker/fit/select logic of `MapPanel` into a reusable `GoogleMap` component so Explore, trip
  pages and guide pages can show their own map with labeled markers.

## 3. Screens

### Trips (`/trips`)
"Your trips" header, **New trip** button. Tabs **Trips | Calendar**. Sections Upcoming / Past with cover
photos (Places photo of the destination), title, "Destination · dates", member avatars. Calendar tab: month
grid with trip ranges highlighted.

### Trip detail (`/trips/[id]`)
Left: title, chips (destination, dates, travelers, budget), proactive card ("Dallas this weekend — want help
getting started…" with Find hotels / Top things to do / Neighborhood guide), an embedded chat scoped to the
trip, and the list of trip chats. Right: tiles **Ideas** (places added to the trip), **Itinerary** (day plan,
editable), **Bookings** and **Media** (links with notes), **Trip preferences** (notes the assistant reads),
**Calendar** (dates), **Members** (add by email → notification), and the trip map with all pinned places.

### Explore (`/explore`)
Location header ("Austell ⌄", change via the profile or browser geolocation), search box, filter tabs
**For you | Restaurants | Experiences | Stays | Guides**. Cards: photo, name, rating (count), category,
locality, price tier, ♡ Save and + Add to trip. Right: map with labeled markers for the visible cards.
Data: Google Places Nearby Search per category around the location (cached server-side); the Guides tab
shows community guides whose destination is near the location.

### Saved (`/saved`)
Tabs **Places | Guides**. Places grouped by kind with open/remove; guides as cards. "Turn these into a trip"
sends the saved items to the assistant.

### Updates (`/updates`)
Notification feed with unread badge in the sidebar: trip invites (open trip), member activity, guide saves.
Mark all read on view.

### Inspiration (`/inspiration`)
Community guides grid (cover, title, destination, author handle, places count, saves), search by destination
or title, "Create a guide" CTA. Guide detail (`/guides/[id]`): cover, title, author, description, places with
photos and notes, map, **Save guide**, **Plan a trip from this guide** (prompt), author-only Edit/Delete.

### Create (`/create`)
Tabs **Guide | Trip**. Guide editor: title, destination (Places lookup), description, tags, add places by
search (resolved via Places, with a note each), reorder/remove, cover photo (from destination or first place),
**Publish** (visible in Inspiration) or save as draft. Trip tab keeps the existing planner form.

### Account
`/login`, `/signup`, onboarding dialog saves to the profile API, sidebar footer shows the user and offers
Log out.

## 4. Railway deployment
- App service built from the GitHub repo (`TayoAki/XPMatchv1`, deploy branch configurable), Node 22,
  `next build` → `next start` on `$PORT`, `/api/health` healthcheck. `output: "standalone"` keeps the image
  small; a `Dockerfile` is included so builds are deterministic.
- Postgres service with a volume; `DATABASE_URL` referenced into the app service.
- Variables: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (build-time,
  browser key restricted to the Railway domain), `GOOGLE_MAPS_API_KEY`, `DATABASE_URL`,
  `COPILOTKIT_TELEMETRY_DISABLED=true`, `NODE_ENV=production`.
- Railway domain generated for the service; smoke test: signup → chat → map → trip.

## 5. Build order
1. DB adapter + migrations, auth routes/pages, proxy gate, profile + state APIs, store write-through.
2. Trips: tables, APIs, list + calendar, detail page, members + notifications, Add to trip, trip chat.
3. Saved + Updates on the server.
4. Guides: Create editor, Inspiration, guide detail, save guide.
5. Explore near you (Nearby Search + shared map component).
6. Railway: Dockerfile, health route, project, Postgres, variables, domain, smoke test.
7. README refresh.

Each step is committed separately; the app stays runnable in demo mode throughout.

## 6. Review (self-review before building)
- **Auth is deliberately simple** (email + password, opaque sessions). It is production-safe for a small
  community if the site runs on HTTPS (Railway does). Password reset and OAuth are follow-ups.
- **CSRF**: cookie is `SameSite=Lax` and mutating routes require a same-origin `Origin`; forms are JSON
  POSTs from our own pages. Good enough for this scope.
- **API cost protection**: the model and Google keys are only reachable behind login; Places responses are
  cached in memory per process. Per-user rate limits are a follow-up if abuse appears.
- **Chat transcripts** live in CopilotKit's in-memory runner: titles and trip links persist, message history
  does not survive a restart. Acceptable now; a database-backed runner is the fix later.
- **PGlite in Next**: must be listed in `serverExternalPackages` and its data directory ignored by git.
- **`NEXT_PUBLIC_*` on Railway** is inlined at build, so the browser key must be present as a build
  variable; the deploy notes call this out.
- **Scope**: the six tabs are each small CRUD surfaces once auth and the DB exist; the guide editor and
  Explore are the two larger pieces and are built last, before deployment.
Verdict: sound; proceed in the order above.

## 7. Status (2026-09-16)

| Step | State |
| --- | --- |
| 1. DB adapter, auth, profile/state APIs, store write-through | Done |
| 2. Trips (list, calendar, detail page, members, Add to trip, trip chats) | Done |
| 3. Saved (Places / Guides tabs) + Updates links | Done |
| 4. Guides (Create editor, Inspiration, guide page, save + notification) | Done |
| 5. Explore near you (Nearby Search + shared map) | Done |
| 6. Railway (Dockerfile, Postgres, variables, domain) | Deployed at https://xpmatch-production.up.railway.app (branch `claude/modest-tesla-smhnnb`) |
| 7. README | Done |

Follow-ups worth doing next: password reset email, OAuth sign-in, database-backed chat transcripts
(CopilotKit runner persistence), guide comments/likes, receipts on the Trips page, mobile layout.
