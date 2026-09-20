# Beta readiness

What a small group of beta testers gets, what to check before inviting them, what to tell them, and what
to watch while they use it.

## Pre-beta checklist (September 20, 2026)

Done since the audit: `ADMIN_EMAILS` set (Tayo, Faven); password resets by admin link and by
"Forgot password?" email through Resend (`RESEND_API_KEY`, `EMAIL_FROM` set); the chat-first phone
app; the home picks race after the quiz.

**Must do before the first invite**

1. (You) Send yourself a "Forgot password?" email from `app.xpmatchme.com` and open the link. The
   sandbox cannot reach Resend, so this is the one path that has not run against the real provider;
   if nothing arrives, Resend › Emails shows the attempt and the reason (usually a sender domain
   mismatch: `EMAIL_FROM` must be on the domain verified in Resend).
2. (You) Rotate every key that was pasted in chat and put the new values in Railway: OpenRouter, both
   Google keys, Resend. Redeploy after rotating the browser key (it is baked into the build).
3. (You) Restrict the keys in Google Cloud Console: browser key → Websites `app.xpmatchme.com/*` and
   `xpmatch-production.up.railway.app/*`, API Maps JavaScript only; server key → Places API (New) and
   Routes API, and enable the Routes API on the project. Then open the map on both domains once.
4. (You) Spend caps: a spending limit on the OpenRouter key and a budget alert on the Google Cloud
   project. Nothing in the app caps a signed-in account's model or Places calls.
5. (You) Turn on backups for the Postgres volume in the Railway dashboard (Postgres service › Volume ›
   Backups). One instance, one volume, no backups today.
6. (You, 15 minutes) Walk the phone flows on a real iPhone (Safari) and an Android phone: sign up, the
   three questions, a proposal, the map and place sheets, the board sheet, a reorder. The phone work is
   verified in emulated Chromium only.
7. (You) Smoke test production as a fresh account on desktop: the wizard → home picks → "Find hotels
   in Rome" → Rate a card → Ask about a place → Compare two → a trip from the proposal → the board →
   report a bug → see it under Admin.
8. (You) Re-run Update my assistant on your own and Faven's accounts; they predate the in-depth quiz,
   so their picks are generic.
9. (Me, small) Login throttling on `/api/auth/login` with the rate limiter the reset flow added, and
   `npm audit fix` for the six transitive advisories, re-running the suite.
10. (Me, draft; you, review) Terms and Privacy pages behind the sidebar footer, with the one paragraph
    testers need: chats and uploaded confirmations go to the model provider; screenshots in bug reports
    are kept until resolved; how to ask for deletion.

**Should do in the first week**

11. (You) Error monitoring: Sentry (free tier) or at least Railway notifications on failed deploys and
    restarts, so crashes are not discovered by testers.
12. (Me, small) "Delete my account" under Update my assistant, so deletion requests are not manual SQL.
13. (Me, small, optional) An invite code on sign-up (`BETA_INVITE_CODE`) if the URL gets shared beyond
    the invited group; today anyone with the link can create an account.
14. (You) Set `OPENROUTER_SITE_URL` to `https://app.xpmatchme.com` (attribution only; cosmetic).
15. (Both) Agree the feedback loop: the in-app bug button reaches Admin and the Updates of every
    admin; decide who checks it daily and where product feedback (not bugs) goes.

**What to tell testers** is in the section further down; the short version: prices and hours are
estimates, the match score is our estimate, use the thumbs, use the bug button, and confirmations you
paste are sent to the model provider.

## Audit (September 19, 2026)

**Verdict: ready for a small, invited beta (people you can reach directly, roughly 10–25) once the four
blockers below are done. Not ready for an open sign-up beta: there are no per-user rate limits, no
password reset and a single instance.**

What was checked and passed:

- Code: `tsc`, `eslint` and the unit tests (81) clean; the end-to-end suite (13 specs against the
  stand-in model, the Places stub and the fixture site, desktop and a 390 × 844 touch phone) green; a
  production build green.
- Production (Railway `xpmatch`, `main`): the last deployments read SUCCESS; over the last 72 hours 387
  requests, 0 server errors (5xx), 15 client errors (4xx); one replica in `sfo` behind
  `app.xpmatchme.com` and `xpmatch-production.up.railway.app`; none of the dev-only variables
  (`IMPORT_ALLOW_LOOPBACK`, `PLACES_BASE_URL`, `ROUTES_BASE_URL`, `OPENROUTER_BASE_URL`) is set.
- Security posture: passwords hashed with bcrypt (cost 12); sessions are random tokens stored hashed,
  30 days sliding, in an HttpOnly, SameSite=Lax cookie, Secure in production; every route except
  `/login`, `/signup`, their API calls, `/api/health` and `/api/config` sits behind the session gate
  (`src/proxy.ts`), including the photo proxy and the Places endpoints, so the Google keys cannot be
  driven anonymously; API writes check the request origin; bodies are validated with zod; uploads are
  capped (screenshots, 6 MB import images); imported links go through an SSRF guard with a rate limit;
  admin routes check `ADMIN_EMAILS` on the server; the server Google key never reaches the browser; the
  repository holds no secrets (scanned on every commit).
- Logs: only two kinds of noise, bogus server-action probes (`Server Reference ID did not match`) and
  streams aborted by the client (`Error: aborted`). Neither is a failure.

Blockers, in order (about an hour of work, none of it code):

1. **`ADMIN_EMAILS`** (done the same day): set to the team's account emails, so bug reports, the beta
   numbers, the member roster and the quiz answers are visible under `/admin`.
2. **Keys.** Rotate the OpenRouter key and both Google keys that were pasted in chat during
   development; restrict the browser key to `app.xpmatchme.com` and the Railway domain (Maps
   JavaScript API only) and the server key to Places API (New) and Routes API; enable the Routes API.
   A rotated browser key is baked into the build, so redeploy after changing it.
3. **Spend caps at the providers.** Nothing in the app limits how many model or Places calls a signed-in
   account can make (the only rate limit is on imports). For an invited beta a spending limit on the
   OpenRouter key and a Google Cloud budget alert are enough (`docs/COGS.md`: about $9 per active user
   per month at list prices); an open beta needs per-user limits in the app first.
4. **Forgotten passwords** (done): "Forgot password?" on the sign-in page emails a single-use,
   30-minute link through Resend, and an admin can issue the same link by hand from `/admin` › Members ›
   **Reset link**; `/reset?token=…` sets the new password and signs every other device out. Needs
   `RESEND_API_KEY` set on Railway (paste it in the Railway dashboard, never in chat) and `EMAIL_FROM` on
   the domain verified in Resend (default `XPMatch <no-reply@xpmatchme.com>`); without the key the
   form still answers normally but nothing is sent.

First week after inviting:

5. **Dependency advisories**: `npm audit --omit=dev` reports 6 (1 high: `undici`, pulled in by
   `@copilotkit/runtime` through the Vertex provider the app does not use; 5 moderate in `@ai-sdk/*`).
   All transitive, all with a fix available; apply `npm audit fix` and re-run the e2e suite.
6. **Error monitoring**: none beyond Railway logs. Add Sentry (or Railway alerts on 5xx and restarts) so
   crashes are not discovered by testers.
7. **Backups**: Postgres is one Railway volume with no backups configured. Turn on volume backups or a
   nightly `pg_dump` before people enter real trips and confirmations.
8. **Real devices**: the phone flows are verified in emulated Chromium (touch, 390 × 844) only. Walk
   the quiz, a proposal, the map and place sheets, the board sheet and a reorder on an iPhone (Safari)
   and an Android phone; the things most likely to differ are the sheet drag, the viewport height
   with Safari's toolbar and the composer's focus zoom.
9. **Terms and Privacy** in the sidebar footer are placeholder text, not pages. Testers' chats and
   uploaded confirmations are sent to the model provider; a one-page privacy note and a retention
   rule for screenshots and confirmations are due.
10. **Account deletion**: no self-service way to delete an account; handle requests by hand in Postgres
    until there is one.
11. **Login throttling**: no lockout or throttle on `/api/auth/login` (bcrypt slows guessing, nothing
    stops it). Fine for a private beta; add before an open one.
12. Cosmetic: `/api/config` (public) reveals the model name; the chat disclaimer shows it too.

Also worth doing before the first invite: re-run Update my assistant on the team's own accounts (they
predate the in-depth quiz, so their home picks are generic), and keep the URL private since sign-up has
no invite code.

## What is live

- Chat with cards, map, place sheets, smart filters, comparison, heads-ups, remembered preferences,
  questions answered from reviews, inspiration import (links and screenshots), reservation import (pasted
  confirmations, PDFs, screenshots → reservation cards → Bookings).
- Trips: proposal cards, trip pages with the Board (structured stops, drag-and-drop, per-day pins, travel
  legs by Walk / Drive / Transit from the Routes API with estimates as fallback, reservations on their
  day), tiles, members and notifications, trip chats with `update_trip_plan`, `add_trip_ideas` and
  `schedule_stops`.
- Taste: reactions everywhere, Your taste, "Fits your taste", post-trip ratings with pairwise ranking.
- Six-step onboarding (interests, stay types and must-haves, cuisines and dietary tags, rhythm, walking,
  transport, flights, next destination), home picks (three things to do, three stays, three places to eat
  for the destination in focus), a match score with "Why this score" and thumbs up / down on every
  recommendation, board stop details, resolved stops on the trip proposal.
- Bug reports from the sidebar with screenshots; `/admin` for the accounts in `ADMIN_EMAILS` with the
  reports, the recommendation hit rate, the beta numbers, the Members roster (with password reset
  links) and the quiz answers.
- Explore near you, community guides, Saved (places, guides, imports), Updates.
- A chat-first phone app (`docs/MOBILE_PLAN.md`): bottom tab bar and More sheet, the first run as
  three questions in the chat with the picks as the assistant's first message, card rows that swipe,
  the map, places and the itinerary board as sheets over the chat, trip pages as tabs with a board
  that reorders with up / down buttons.
- Accounts with email + password, per-user data in Postgres, chat transcripts that survive deploys.

## Before inviting anyone

1. **Deploy is green.** Railway service `xpmatch` builds from `main`; check the latest deployment reads
   SUCCESS and `GET /api/health` returns `{"ok":true,"db":"pg"}`.
2. **Keys.** The keys pasted in chat during development must be rotated (OpenRouter, both Google keys),
   then set as Railway variables only. The browser key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) must be
   restricted to the Railway domain (HTTP referrer) and to the Maps JavaScript API; the server key to the
   Places API (New) **and the Routes API** with no referrer restriction. A rotated browser key needs a
   redeploy because it is baked into the build.
3. **Routes API.** Enable "Routes API" on the Google Cloud project that owns the server key. Until it is
   enabled the board keeps straight-line estimates ("est.") and the logs show `[routes] computeRoutes 403`;
   `ROUTES_API_ENABLED=0` silences that deliberately.
4. **Model.** `OPENROUTER_MODEL` on a tool-capable model (`openai/gpt-4o-mini` default). Helper calls
   (review answers, imports, reservations) use the same model unless `HELPER_MODEL` is set; screenshots and
   confirmation images use `HELPER_VISION_MODEL` (default `openai/gpt-4o-mini`).
5. **Spend guardrails.** Google Cloud budget alert on the Places project (see `docs/COGS.md`: about $9 per
   active user per month at list prices, dominated by Places; the Routes API adds cents); OpenRouter
   spending limit on the key.
6. **Smoke test on production**, signed in as a fresh user: onboarding → "Find hotels in Rome" → cards with
   pins and photos → Rate a card → Ask about a place on the sheet → Compare two → create a trip from the
   proposal → Board: add two ideas to Day 1, drag one, see the pins, check the leg reads "via Google" and
   switch Walk → Drive → paste a blog link in chat → Import cards → Add all to a trip → Saved › Imports →
   Create › Import › **A reservation** with a real hotel confirmation → Add to trip → the Bookings tile
   shows the code and dates and the board lists it on its day → Update my assistant › Your taste.
7. **Not set in production:** `IMPORT_ALLOW_LOOPBACK`, `PLACES_BASE_URL`, `ROUTES_BASE_URL`,
   `OPENROUTER_BASE_URL`, `RESEND_BASE_URL`.
8. **Admins.** Set `ADMIN_EMAILS` on Railway to the team's account emails (comma-separated) so bug
   reports reach someone: those accounts get an Update per report and the Admin item in the sidebar.
   Without it reports are still stored, but nobody is told.
9. **Smoke test the new pieces** as a fresh user: walk all six onboarding steps with "Rome, Italy" as
   the next destination → the home page shows "For you in Rome" with three rows of three, each card with
   a match badge → open "Why this score" → thumbs down one with a reason → the badge drops → "Plan a
   trip to Rome" → the proposal's stops fill in with photos and ratings → Save → board → a stop's
   Details → report a bug with a screenshot → sign in as an admin → `/admin` lists it with the hit rate.

## What to tell testers

- Prices, hours and availability are estimates; every card links to the live source.
- Instagram and TikTok links cannot be read; use a screenshot through Import inspiration.
- Confirmations: paste the email text, or upload the PDF or a screenshot under Import › A reservation (or
  paste it in chat). Codes and dates are copied as written; check them against the original, and know that
  the text is sent to the model provider like any chat message.
- "Not for me" hides a card; Undo is right there and Your taste lists every reaction.
- The match score is XPMatch's own estimate from the profile, not a rating: tap it to see why, and use the
  thumbs on every card to say whether a pick was right. Thumbs are what teaches it.
- The bug icon next to your name (sidebar) sends a report with a screenshot straight to the team; the
  page you were on is attached automatically.
- Trip pages have a Board | Tiles switch; the Board is where the itinerary lives. Travel legs marked "via
  Google" are routed; "est." means a straight-line guess. A stop's chevron opens its full details.
- Feedback channel: a short form or shared doc with three fields (what you tried, what you expected, what
  happened) plus the chat title, so the transcript can be found in Postgres.

## What to watch

- Railway logs for `Agent execution failed` (model or tool errors), `[places]` warnings (Places API
  failures fall back to estimated pins) and `[routes]` warnings (Routes API failures fall back to
  estimated legs; a steady `403` means the API is not enabled on the key's project).
- OpenRouter usage per day and Google Places SKU counts per day; the Places cache is in-process, so every
  redeploy starts cold.
- Postgres size (transcripts grow with use; `place_facts` is capped by its 30-day refresh; bug report
  screenshots are up to 1.5 MB each).
- `/admin`: open bug reports and the recommendation hit rate. A hit rate under about 60%, or one miss
  reason dominating (too pricey, too far), is a signal to retune `src/lib/match.ts` or the home-pick
  queries in `src/server/recommend.ts`.
- A benign log line, `Cannot send 'RUN_FINISHED' while tool calls are still active`, appears when a
  follow-up suggestions run is superseded by the next run; the chat is unaffected.

## Known limits

- Travel legs are routed by Google without live traffic (drive legs are traffic-unaware); transit is asked
  one leg at a time and falls back to an estimate where no transit route exists. A leg reads "est." whenever
  the Routes API is off, unreachable or rejects the request.
- Reservation import reads what the model can extract from the text (up to 40k characters of a PDF, ten
  reservations per import); it does not follow links in the email, and changes or cancellations are not
  tracked. Reservations are stored on the trip only after Add to trip.
- The match score is a heuristic over what the profile and Google Places expose (category, price level,
  rating, editorial summary, the card's own text); it cannot see amenities Google does not list, so a
  "Pool" must-have only scores when a description mentions it. Calibration needs three judgments per
  factor before it changes anything.
- Home picks depend on Places Text Search understanding the profile-driven queries; small towns may
  return fewer than three per row.
- Bug reports are stored and shown under Admin only; nobody is emailed.
- Imports read public pages only; sites that block readers (403) and app-only pages need a screenshot.
- Review answers depend on the five reviews and attributes Google returns; the card says when evidence is
  thin.
- The map needs a valid browser key for the deployed domain; without it the panel shows a list fallback.
- Single region, single Postgres; no email verification at sign-up (flight price tracking and
  verification were Wave 4, skipped by decision). Password resets are self-service by email.

## Next after beta

Review-grounded heads-ups and comparison cells, Yelp Fusion as a second review source, confirmations
forwarded by email, analytics on which cards get saved, added and rated. Password reset, email
verification and flight price tracking stay parked with Wave 4.
