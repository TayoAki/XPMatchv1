# Beta readiness

What a small group of beta testers gets, what to check before inviting them, what to tell them, and what
to watch while they use it.

## What is live

- Chat with cards, map, place sheets, smart filters, comparison, heads-ups, remembered preferences,
  questions answered from reviews, inspiration import (links and screenshots).
- Trips: proposal cards, trip pages with the Board (structured stops, drag-and-drop, per-day pins, travel
  estimates), tiles, members and notifications, trip chats with `update_trip_plan`, `add_trip_ideas` and
  `schedule_stops`.
- Taste: reactions everywhere, Your taste, "Fits your taste", post-trip ratings with pairwise ranking.
- Explore near you, community guides, Saved (places, guides, imports), Updates.
- Accounts with email + password, per-user data in Postgres, chat transcripts that survive deploys.

## Before inviting anyone

1. **Deploy is green.** Railway service `xpmatch` builds from `main`; check the latest deployment reads
   SUCCESS and `GET /api/health` returns `{"ok":true,"db":"pg"}`.
2. **Keys.** The keys pasted in chat during development must be rotated (OpenRouter, both Google keys),
   then set as Railway variables only. The browser key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) must be
   restricted to the Railway domain (HTTP referrer) and to the Maps JavaScript API; the server key to the
   Places API (New) with no referrer restriction. A rotated browser key needs a redeploy because it is baked
   into the build.
3. **Model.** `OPENROUTER_MODEL` on a tool-capable model (`openai/gpt-4o-mini` default). Helper calls use
   the same model unless `HELPER_MODEL` is set; screenshots use `HELPER_VISION_MODEL` (default
   `openai/gpt-4o-mini`).
4. **Spend guardrails.** Google Cloud budget alert on the Places project (see `docs/COGS.md`: about $9 per
   active user per month at list prices, dominated by Places); OpenRouter spending limit on the key.
5. **Smoke test on production**, signed in as a fresh user: onboarding → "Find hotels in Rome" → cards with
   pins and photos → Rate a card → Ask about a place on the sheet → Compare two → create a trip from the
   proposal → Board: add an idea to Day 1, drag it, see the pin → paste a blog link in chat → Import cards →
   Add all to a trip → Saved › Imports → Update my assistant › Your taste.
6. **Not set in production:** `IMPORT_ALLOW_LOOPBACK`, `PLACES_BASE_URL`, `OPENROUTER_BASE_URL`.

## What to tell testers

- Prices, hours and availability are estimates; every card links to the live source.
- Instagram and TikTok links cannot be read; use a screenshot through Import inspiration.
- "Not for me" hides a card; Undo is right there and Your taste lists every reaction.
- Trip pages have a Board | Tiles switch; the Board is where the itinerary lives.
- Feedback channel: a short form or shared doc with three fields (what you tried, what you expected, what
  happened) plus the chat title, so the transcript can be found in Postgres.

## What to watch

- Railway logs for `Agent execution failed` (model or tool errors) and `[places]` warnings (Places API
  failures fall back to estimated pins).
- OpenRouter usage per day and Google Places SKU counts per day; the Places cache is in-process, so every
  redeploy starts cold.
- Postgres size (transcripts grow with use; `place_facts` is capped by its 30-day refresh).
- A benign log line, `Cannot send 'RUN_FINISHED' while tool calls are still active`, appears when a
  follow-up suggestions run is superseded by the next run; the chat is unaffected.

## Known limits

- Travel times on the Board are straight-line estimates labeled "est."; no Routes API yet.
- Imports read public pages only; sites that block readers (403) and app-only pages need a screenshot.
- Review answers depend on the five reviews and attributes Google returns; the card says when evidence is
  thin.
- The map needs a valid browser key for the deployed domain; without it the panel shows a list fallback.
- Single region, single Postgres; no email verification or password reset yet.

## Next after beta

Routes API travel times, review-grounded heads-ups and comparison cells, Yelp Fusion as a second review
source, document and email-confirmation imports, password reset and email verification, analytics on which
cards get saved, added and rated.
