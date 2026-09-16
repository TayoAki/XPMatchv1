# Beta readiness

What a small group of beta testers gets, what to check before inviting them, what to tell them, and what
to watch while they use it.

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
  reports and the recommendation hit rate.
- Explore near you, community guides, Saved (places, guides, imports), Updates.
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
   `OPENROUTER_BASE_URL`.
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
- Single region, single Postgres; no email verification or password reset (they were Wave 4, which is
  skipped by decision, together with flight price tracking).

## Next after beta

Review-grounded heads-ups and comparison cells, Yelp Fusion as a second review source, confirmations
forwarded by email, analytics on which cards get saved, added and rated. Password reset, email
verification and flight price tracking stay parked with Wave 4.
