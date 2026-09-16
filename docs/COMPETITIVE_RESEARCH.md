# Competitive research: how nine competitors implement the features we want to borrow

Compiled 2026-09-16. Each section describes the feature **as it works today**, with the sources read.
Method note: the research sandbox could not render the competitors' pages directly, so facts come from
indexed excerpts of the cited pages (official sites, app store listings, help centers, newsrooms) and
recent third-party reviews. Anything that could not be corroborated is called out in the Confidence notes.
Companion documents: `docs/GAP_ANALYSIS.md` (what XPMatch does today, the gaps, and the plan) and
`docs/USER_FLOWS.md`.

| Competitor | Feature to borrow | One-line summary of how they do it |
| --- | --- | --- |
| Beli | Personal taste profile | Three-bucket reaction, then pairwise comparisons insert each place into a personal ranked list; a 0–10 score, cuisine/city taste profile, per-friend match scores and predicted "rec scores" fall out of that list |
| Mindtrip | Inspiration → plan ("Start Anywhere") | Drop a link, screenshot, photo, PDF, video or share-sheet item; AI extracts places against Mindtrip's POI database and outputs a chat, a collection or a trip |
| Wanderlog | Itinerary and map together | One scrolling trip document (reservations, notes, lists, day-by-day, budget) beside a map with per-day colored pins, connecting lines, travel times, email/Gmail reservation import |
| Booking.com | Natural-language Smart Filters | One free-text box in the app; GPT models map the request onto Booking's existing filter taxonomy; no visible "what I understood"; sibling Property Q&A answers from listing, reviews and photos |
| Yelp | Questions answered through reviews | "Ask Yelp Assistant" on business pages with suggested questions; RAG over reviews, photos and business info with inline citations and highlighted passages; a safety classifier first; Review Insights topic scores 1–100 |
| Tripadvisor | Side-by-side comparison | No true comparison table; the AI Assistant answers "compare these two hotels" prompts in prose grounded in reviews, with live prices and a map; Which? found unhedged verdicts |
| StayMatch | Hidden tradeoffs | Scans Airbnb + Booking.com reviews and photos for per-criterion signals (noise, desk, light, cleanliness), scores evidence confidence, returns a 5–10 stay shortlist with keep/skip reasons; paid per scan |
| Layla | Preferences learned in conversation | Infers a travel profile from chats, clicks and trip ratings without confirmation; account-wide; a "Travel profiling" opt-out toggle; memory notes stored separately from transcripts; acquired by Expedia (Jul 2026) |
| Google Travel | Flight price tracking | Track exact dates or "Any dates" routes; email and mobile alerts with predictions; low/typical/high insights; price-guarantee pilot; since April 2026 alerts can be created in AI Mode chat with a confirmation |

## Beli — Personal taste profile

### What it is
Beli (iOS/Android, founded 2021) replaces star ratings with forced pairwise comparisons. Every place you
log is slotted into a personal ranked list, which yields a 0–10 score, a "Taste Profile", per-friend
"Match Scores" and per-restaurant "Rec Scores". Ratings are visible only to followers.

### How it works today
1. **Log a place ("Been").** Tap the plus icon, pick the venue and its category. Categories are ranked
   separately: Restaurants, Bars, Bakeries, Coffee & Tea, Ice Cream & Dessert.
2. **Pick one of three reactions:** "I liked it!", "It was fine", "I didn't like it." This seeds where in
   your list the comparison search starts.
3. **Pairwise comparisons.** Beli shows an already-ranked place and asks which you prefer. Users report
   3–4 comparisons per new place, with an escape for pairs that are too hard to compare. An independent
   write-up (HackerNoon, Mar 2026) describes a binary insertion sort with linear interpolation over the
   ranked list producing the 0.0–10.0 score, so scores are relative to your own list, not absolute. Beli
   publishes no algorithm details; press uses "Elo" loosely.
4. **Capture the "why".** After ranking you can add "good for" labels (atmosphere, cash only, large
   portions, takeout, date night, last-minute reservations), tag who you dined with, write notes, name
   favorite dishes and add captioned photos. Tags organize and filter lists; there is no evidence they
   feed the score.
5. **Lists.** "Been" is sorted high to low; "Want to Try" is a bookmark. Both render as a map and filter
   by cuisine, location, price and tags.
6. **What you get back.** *Taste Profile*: rankings summarized by cuisine, city and country. *Match
   Score* per friend: a compatibility measure that weights whose ratings predict yours. Per unranked
   restaurant: a **Rec Score** (Beli's predicted score for you) and a **Friend Score** (friends' average).
   City and global leaderboards rank users by places ranked.
7. **Recommendations** draw on your ranking history plus friends and similar-taste users; one profile
   says recs begin after roughly 15 ranked places (not confirmed by Beli).
8. **2024–2026 additions:** "Midyear Snack" and year-end "Beli Plated" recaps, Featured Lists, a paid
   guides product. Scale: about 58M ratings (May 2025) to 120M+ (Jul 2026).

### Evidence
- https://apps.apple.com/us/app/beli/id1478375386 — official description: ranked Been / Want to Try lists and maps, tags, notes, favorite dishes, Taste Profile, Match Score, recs (seen 2026-09-16).
- https://beliapp.com/ — positioning ("knows your tastes"); paid-guides terms page (seen 2026-09-16).
- https://hackernoon.com/belis-binary-search-rating-system-explained — binary insertion sort, three buckets, interpolation to 0–10 (2026-03-12).
- https://ixd.prattsi.org/2026/09/a-design-critique-of-beli-restaurant-discovery-and-social-platform/ — plus icon → three reactions → comparisons; Featured Lists (Sept 2026).
- https://nyunews.com/culture/dining/2025/04/11/beli-dating/ — Rec Score vs Friend Score; reaction wording; tagging companions (2025-04-11).
- https://en.wikipedia.org/wiki/Beli_(app) — two scores, similar-taste matching, leaderboards (seen 2026-09-16).
- https://thezillennialzine.com/2024/01/23/beli-app-review/ — five categories, compatibility, cuisine-weighted recs (2024-01-23).
- https://spoonuniversity.com/school/emory/rate-save-and-recommend-restaurants-on-app-beli/ — "good for" labels, notes, dishes, photos.
- https://avirn.medium.com/beli-friction-log-b7703bc16122 — 3–4 comparisons; incomparable pairs complaint.
- https://www.tovima.com/wsj/the-app-that-makes-rating-restaurants-fun-again-and-gets-better-the-more-you-use-it/ — WSJ syndication: 58M ratings, similar-taste recs (May 2025).
- https://www.founderbrew.com/stories/beli-founders-judy-thelen-eliot-frost-partnership-superpower — 120M+ ratings (Jul 2026).

### Borrowable details
- A three-bucket reaction before pairwise comparison keeps comparisons local and cuts the questions to ~3–4.
- The score is derived from position in a ranked list, never typed in.
- Categories are ranked separately so users never compare a coffee shop with a steakhouse (the top complaint).
- Two scores on every unvisited place: "predicted for you" and "friends' average".
- Per-friend compatibility, surfaced on the friend profile.
- Structured "good for" labels plus free notes and favorite dishes capture the "why", kept separate from the score.

## Mindtrip — Turn inspiration into a plan ("Start Anywhere")

### What it is
Mindtrip (web + iOS) lets you hand it a link, screenshot, photo, PDF, video or Google Maps list and have
its AI extract the places and produce a chat, a collection or a trip itinerary. Branded "Start
Anywhere" (Jul 2024), extended in Oct 2025 with an iOS share extension.

### How it works today
1. **Entry points.** (a) Web/app "Create" or chat: paste a link (blog, Reddit, Instagram, TikTok, YouTube)
   or upload a photo, screenshot, PDF itinerary or a notes-app list. (b) iOS share sheet (Oct 2025):
   Mindtrip is a share target for articles, Instagram posts, TikToks, YouTube videos and Google Pins.
   (c) Receipts (Oct 2024): upload a booking confirmation or email it in; details are logged and an
   itinerary is built around the dates and locations. (d) Google Maps saved-places import → a themed
   collection. (e) Creator "magic links" embedded in content.
2. **Extraction.** OpenAI models grounded in Mindtrip's own place database (6.5M places in 2024; 11M POIs
   plus 40,000+ guides by mid-2025). TikTok works only when the video has text overlays; YouTube uses
   transcripts; screenshots and tickets are read multimodally. Each imported item is enriched with photos
   and details.
3. **Output.** Inspiration becomes "a chat, collection or trip plan". Shared content is saved by type, can be
   added to an existing trip or a collection (by destination, theme or vibe), and you can ask questions
   about it. Itineraries are editable and mapped; Trips hold details, chats, media, ideas, itineraries,
   bookings, with group chat.
4. **Limits (third-party tests, 2026).** One link or screenshot produces one output at a time; there is no
   capture from inside Instagram (you share or paste); a reel test returned a narrative analysis with
   inferred details rather than a clean place list, so reviewers advise fact-checking.
5. **Timeline.** Start Anywhere 2024-07-31; receipts Oct 2024; iOS app 2025-06-25; share-to-app
   2025-10-16; Events 2025-11-06; Hotels B2B 2025-11-18.
6. **Browser extension:** none found on mindtrip.ai, the Chrome Web Store or in press.

### Evidence
- https://mindtrip.ai/start-anywhere, https://mindtrip.ai/create, https://mindtrip.ai/ios — "drop a link… start with a photo, screenshot or PDF"; Google Maps import (seen 2026-09-16).
- https://apps.apple.com/us/app/mindtrip-ai-travel-companion/id6503107567 — "Start Anywhere… into a chat, collection or trip plan" (seen 2026-09-16).
- https://www.prnewswire.com/news-releases/mindtrip-launches-start-anywhere-a-powerful-new-way-to-build-travel-itineraries-from-any-point-of-inspiration-302210025.html — launch mechanics, receipts, creator links (2024-07-31).
- https://techcrunch.com/2024/07/31/travel-startup-mindtrips-new-feature-lets-you-build-an-itinerary-from-a-screenshot-youtube-or-tiktok-video/ — overlay/transcript limits, 6.5M places (2024-07-31).
- https://www.phocuswire.com/ai-travel-planner-mindtrip-receipts-funding — receipt/email function (Oct 2024).
- https://www.phocuswire.com/mindtrip-ai-travel-discovery-planning — share-to-app, saved by type, enrichment (2025-10-16).
- https://getplotline.app/blog/mindtrip-review and https://stardrift.ai/resources/mindtrip-review — one-at-a-time output, accuracy limits (2026).
- https://mapyourvoyage.com/blog/best-apps-to-plan-trips-from-social-media — no in-Instagram flow; overlay/transcript dependence (2026).

### Borrowable details
- One drop zone for every input type: URL, screenshot, photo, PDF, notes list, shared Google Pin.
- Register as an OS share-sheet target so capture happens from TikTok/Instagram/Safari without app-switching.
- Let the user choose the output shape after extraction: chat about it, save as a collection, or add to a trip.
- Enrich every extracted place with your own POI record (photo, rating, review count) so the output is evidenced.
- Accept booking confirmations and anchor the itinerary to their dates and cities.
- Be explicit about extraction limits (TikTok needs text overlays) instead of guessing.

## Wanderlog — Itinerary and map together

### What it is
Wanderlog (web, iOS, Android; free with a Pro tier) is a single trip document — reservations, notes, place
lists, day-by-day itinerary, budget — rendered beside a Google Maps-based map. Everything added is
pinned, and map and itinerary stay in sync.

### How it works today
1. **Plan structure.** One scrolling plan with reorderable sections: "Reservations and attachments"
   (flight, lodging, rental-car icons plus files), Notes blocks anywhere (and inside places), place lists
   ("save food and attractions in lists"), the Itinerary (one block per date) and Budget. On web the map
   sits beside the plan; on mobile the map is a tab.
2. **Getting items in.** Add a place by search or from a Wanderlog guide; it is "immediately pinned" on the
   map. Forward confirmation emails to a per-trip address (trip+123@wanderlog.com) to auto-add flights,
   hotels and rental cars, or connect Gmail (Pro), which scans only flight and hotel confirmations.
3. **Arranging days.** Drag the six-dot handle to reorder or move a place; or tick checkboxes → "Move
   to" a list or day (multi-select). Add start/end times; a web "compact view" collapses each day.
4. **What the map shows.** Pins colored per list or day (color and icon customizable), a layers button to
   show or hide any list or day, lines connecting pins in itinerary order. The itinerary shows travel
   time and distance between consecutive stops for driving, walking or transit, with a Directions button
   that opens Google or Apple Maps. "Optimize route" (Pro) reorders a single day between a chosen start and
   end to minimize travel time.
5. **Collaboration.** Invite by email or link with view-only or edit permission; edits sync in real time.
6. **Offline.** Pro members download the plan, notes, places and attachments; offline maps are a Pro add-on.
7. **Budget.** Trip budget, expenses attached to places, activities or reservations, totals vs budget, bill
   splitting with tripmates.
8. **Extras.** Pro is annual (about $39.99/yr per a 2024 FAQ; verify). A ChatGPT-powered assistant drafts
   itineraries; a Chrome extension shows Airbnb totals and Southwest fares; a "Trip Journal" logs stops.

### Evidence
- https://help.wanderlog.com/hc/en-us/articles/4625693334811 — per-trip forwarding address; reservations section (seen 2026-09-16).
- https://help.wanderlog.com/hc/en-us/articles/13302942899099 — Gmail scan limited to flights and hotels.
- https://help.wanderlog.com/hc/en-us/articles/13545624787867 — Optimize route: Pro, start/end, one day.
- https://help.wanderlog.com/hc/en-us/articles/5159565134875 — travel time and distance by mode; Directions.
- https://help.wanderlog.com/hc/en-us/articles/5154847997723 — pin color/icon per list or day; layers toggle.
- https://help.wanderlog.com/hc/en-us/articles/5159751100443 — drag handle, Move to, multi-select.
- https://help.wanderlog.com/hc/en-us/articles/5154820301851 — start/end times; compact view.
- https://help.wanderlog.com/hc/en-us/articles/4625495771163 — invite with view/edit permission.
- https://help.wanderlog.com/hc/en-us/articles/13545182856859 — offline download (Pro).
- https://help.wanderlog.com/hc/en-us/sections/5154400242843 — budget, expenses, splitting.
- https://play.google.com/store/apps/details?id=com.wanderlog.android — "immediately pinned… lines connect pins"; real-time collaboration (seen 2026-09-16).
- https://wanderlog.com/ and https://wanderlog.com/blog/faq/ — color-coded map by day/category; AI assistant; extension; Pro price.

### Borrowable details
- A per-trip inbound email address for reservations, plus an optional inbox scan limited to flight and hotel confirmations.
- Per-list and per-day pin color/icon with a layers toggle, so the map can show "Day 3 only".
- Inline travel time and distance between consecutive stops with a mode switch and a one-tap handoff to Google/Apple Maps.
- Checkbox multi-select → "Move to day/list" as a keyboard-free alternative to drag-and-drop.
- Notes blocks insertable anywhere in the plan and on each place.
- Optimize route scoped to one day with a user-chosen start and end.

### Confidence notes (Beli, Mindtrip, Wanderlog)
- Beli: the percentage form of Match Score, the skip option and "3–4 comparisons" come from user write-ups, not Beli; the ~15-place threshold is from one press profile; ratings counts vary by outlet.
- Mindtrip: no browser extension exists as far as we can tell; Google Maps import mechanics are undocumented; the overlay/transcript limits date from 2024 and may have improved; Android status is unclear.
- Wanderlog: numbered day pins and the web side-by-side layout come from third-party reviews; free-vs-Pro offline behavior is described inconsistently by Wanderlog itself; the Pro price is from a 2024 FAQ.

## StayMatch — Find hidden tradeoffs

### What it is
StayMatch (staymatch.ai) is a live, paid web app billed as "AI accommodation search for better stays",
aimed at remote workers, digital nomads and long stays. Instead of adding checkbox filters, it reads
guest reviews and listing photos across Airbnb and Booking.com and returns a short ranked list in which
each stay's "strengths, tradeoffs, and reasons to keep or skip" are surfaced before you open the listing.
All evidence is the company's own site (privacy policy last updated April 15, 2026; blog posts dated 2026);
no press, Product Hunt or founder posts were found.

### How it works today
1. **Inputs.** The user picks from "18+ smart filters" (reliable Wi-Fi, desk with chair, quiet
   environment, natural light, kitchen, laundry, proximity to gyms, supermarkets and transit); the copy
   frames it as "tell us what matters", e.g. "Quiet, a desk that's actually usable, natural light, a
   supermarket within a 5-minute walk". Whether free-text priorities are accepted was not visible.
2. **Data sources.** One "scan" covers Airbnb and Booking.com together. No other OTAs are named.
3. **Review mining.** It "mines reviews for specific signals: noise mentions, desk quality comments,
   light references, cleanliness patterns".
4. **Photo cross-check.** It "inspects listing photos against stated criteria. If a listing claims a
   'dedicated workspace' but the photos show a dining chair pushed against a wall, that gets factored in."
5. **Evidence confidence.** "Review confidence scoring signals how reliable the evidence is behind a
   listing's ranking. A listing with 4 relevant reviews on a specific signal like noise gets a different
   confidence score than one with 40."
6. **Output.** "A ranked shortlist of 5 to 10 real matches" (5 per scan on the $20 plan, 10 on the $30
   plan). "Each match surfaces real tradeoffs, not just star ratings. A listing might score well on
   workspace quality but carry a noise risk flagged in reviews." No numeric match percentage was found.
7. **Business model.** One free scan without a card; $10 24-hour pass (3 scans); $20/month (6 scans);
   $30/month (12 scans); $50/month (25 scans); annual billing discounted.

### Evidence
- https://staymatch.ai/ — "reads reviews and inspects photos to surface tradeoffs, dealbreakers"; Airbnb + Booking.com (seen 2026-09-16).
- https://staymatch.ai/how-it-works/ — "tell us what matters… reasons to keep or skip each stay".
- https://staymatch.ai/pricing/ — plan tiers, scans and matches per scan.
- https://staymatch.ai/blog/booking-com-smart-filters-vs-staymatch-which-actually-surfaces-the-right-stay/ — confidence scoring, photo-vs-claim example, "noise risk flagged in reviews" (2026).
- https://staymatch.ai/blog/the-best-ai-hotel-finder-tools-in-2026-a-no-hype-comparison/ — "18+ smart filters", free scan (2026).
- https://staymatch.ai/use-cases/long-stays/ — noise, layout and light as first-order criteria.
- https://staymatch.ai/privacy-policy — last updated April 15, 2026.

### Borrowable details
- Model hidden tradeoffs as per-criterion signals (noise, workspace, light, cleanliness) mined from review text, not one sentiment score.
- Attach an evidence-confidence indicator per signal (4 relevant reviews vs 40).
- Cross-check host claims against photos and flag mismatches as a distinct output.
- Cap results at a 5–10 item shortlist with "why keep / why skip" per item.
- Meter usage by "scan" with one free scan before the paywall.

## Layla — Learning preferences through conversation

### What it is
Layla (layla.ai) is a Berlin-based conversational AI travel agent (Layla AI GmbH, founded 2023, absorbed
Roam Around) that plans and books trips via chat on web, iOS and Android. Expedia Group acquired it on
July 31, 2026 and says it will keep operating. Its site claims it "learns your preferences with every
search, tapping into patterns like: Do you prefer boutique hotels or big-brand chains? Are you drawn to
quiet retreats or urban adventures?… learning from feedback, trip ratings, and even the kinds of
restaurants or activities you click on most."

### How it works today
1. **Capture.** Preferences are inferred from chat and behavior; no explicit setup form is described. The
   privacy policy says Layla "may derive travel-preference information (for example preferred travel
   styles or destinations) from what you share" and "builds a personal travel profile from your chats and
   trips (such as travel personality, interests, marketing segment and likelihood to book)".
2. **Scope.** The profile is account-wide and "stored with your account until you turn it off or delete
   your account". No evidence was found that Layla confirms before saving a preference, or of a
   per-trip-only memory — the confirm-and-scope behavior in our table is our own design, not Layla's.
3. **Visibility and control.** A profile page exists (subscription, delete account) but a visible,
   editable list of inferred preferences could not be verified. The documented control is an opt-out
   toggle: "you can opt out at any time via the 'Travel profiling' option in your cookie and consent
   settings".
4. **Use.** The profile tailors itineraries, hotels and activities; bookable inventory comes from
   Booking.com, Skyscanner and GetYourGuide. Premium is $9.99/month or $49.99/year (unlimited trips and
   human expert consultations).
5. **Storage and AI stack (privacy policy).** Conversations and trips are kept for the life of the
   account; "results of internal conversation analyses are kept for a limited period and then deleted";
   AI processing uses OpenAI, Google (Gemini) and Anthropic, plus Pinecone "for secure storage of
   AI-prepared notes", and providers "do not use your data to train their models". Account deletion
   removes conversations and trips "usually within 24 hours".
6. **Platforms.** Web chat; iOS and Android apps (Google Play lists "Save Places from Social Media" and a
   personalized destination-video feed); Instagram DMs (@justasklayla). WhatsApp and TikTok import were
   not verifiable in current sources.

### Evidence
- https://layla.ai/about — "learns your preferences with every search… boutique hotels or big-brand chains"; Booking.com, Skyscanner, GetYourGuide (seen 2026-09-16).
- https://layla.ai/privacypolicy — profiling, retention, Pinecone/OpenAI/Gemini/Anthropic, "Travel profiling" opt-out, 24-hour deletion.
- https://layla.ai/faq — $9.99/month or $49.99/year; iOS and Android apps.
- https://play.google.com/store/apps/details?id=ai.layla.android.app — "Save Places from Social Media".
- https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-acquires-Layla-accelerating-its-AI-powered-trip-planning-and-booking-strategy/default.aspx — acquisition (2026-07-31).
- https://skift.com/2026/07/31/expedia-acquired-ai-trip-planner-layla-exclusive/ — ~25 staff, keeps operating (2026-07-31).
- https://techcrunch.com/2023/11/29/layla-taps-into-ai-and-creator-content-to-build-a-travel-recommendation-app/ — Instagram channel; founders (2023-11-29).

### Borrowable details
- Infer preferences from chat, clicks and trip ratings, but name the derived attributes (style, interests) in plain language.
- Provide one named toggle ("Travel profiling") that halts profiling without deleting the account.
- Keep memory ("AI-prepared notes") in a separate store from raw transcripts, with shorter retention.
- State explicitly that model vendors do not train on user data.
- Commit to a deletion SLA ("usually within 24 hours").

## Google Travel / Search AI Mode — Flight price tracking

### What it is
Google Flights price tracking emails you when fares for a saved flight, route or flexible-date search
change significantly, alongside price insights and a price-guarantee pilot. Since 2025–26 it extends
into AI Mode: natural-language "Flight Deals", Canvas trip plans, chat-initiated alerts and agentic hotel
booking (flights still hand off to airline and OTA sites).

### How it works today
1. **Track a specific trip.** Search origin, destination and dates in Google Flights, then toggle "Track
   prices"; tracking covers specific flights, routes and dates and requires a signed-in account. Tracked
   items are managed at google.com/travel/flights/saves.
2. **Track a flexible route.** Choose "Any dates": you get an email when the route's minimum price drops
   significantly over a month; otherwise a regular email with the best available prices.
3. **Notifications.** Email and mobile notifications, plus alerts when prices for a tracked route are
   likely to go up, or when a current fare expires soon and the new fare is likely to cost more.
4. **Insights.** "Best" vs "Cheapest" tabs; Tips with predictions such as "prices are unlikely to drop"
   shown only when Google can predict with high confidence from past price trends; a dates grid and price
   graph; "cheapest time to book" insights. The low/typical/high label is relative to the route's
   historical range.
5. **Price guarantee (pilot).** On badged itineraries Google is confident the price is the lowest before
   departure; book on Google, accept the guarantee, and if the price falls before the first flight
   departs the difference is paid via Google Pay (press: US departures, minimum $5 difference, $500 per
   account per year).
6. **Flight Deals (Aug 14, 2025).** Natural-language search inside Google Flights ("week-long trip this
   winter to a city with great food, nonstop only") using a custom Gemini 2.5 over real-time Google
   Flights data, ranked by savings; expanded Nov 17, 2025 to 200+ countries.
7. **AI Mode.** Nov 2025: Canvas itineraries combining flights, hotels and Maps reviews; April 2026: ask AI
   Mode "track these flight prices for me", confirm, and get an email if prices change, plus per-hotel
   price tracking; late Aug 2026: hotel booking inside AI Mode with the partner (Booking.com, Expedia,
   Hilton, Marriott…) as merchant of record and Google Pay checkout; flight tracking in AI Mode covers
   180+ countries with prices from 300+ airlines and sites, while flight purchases still complete on
   airline/OTA sites. Opt-in Personal Intelligence lets AI Mode read Gmail bookings.

### Evidence
- https://support.google.com/travel/answer/6235879 — Track flights & prices: specific vs "Any dates", email rules (seen 2026-09-16).
- https://support.google.com/travel/answer/7664728 — best fares, Tips predictions, price graph.
- https://support.google.com/travel/answer/9430556 — price guarantee pilot mechanics.
- https://blog.google/products-and-platforms/products/search/google-flights-ai-flight-deals/ — Flight Deals launch (2025-08-14).
- https://blog.google/products-and-platforms/products/search/agentic-plans-booking-travel-canvas-ai-mode/ — Canvas, booking roadmap, Flight Deals global (2025-11-17).
- https://blog.google/products-and-platforms/products/search/summer-travel-tips-google-search-ai/ — chat-initiated price alerts, hotel tracking (April 2026).
- https://blog.google/products-and-platforms/products/search/book-travel-ai-mode/ — hotel booking flow, tracking in AI Mode (Aug 2026).
- https://skift.com/2026/08/27/googles-agentic-hotel-booking-tool-comes-to-ai-mode/ — merchant of record; flights not yet (2026-08-27).
- https://skift.com/2025/11/20/google-agentic-ai-travel-booking-no-intention-become-ota/ — "no intention of becoming an OTA" (2025-11-20).

### Borrowable details
- Two tracking modes: exact dates vs "Any dates", each with its own alert threshold (route minimum over a month).
- Send "nothing dropped" digests plus predictive alerts ("likely to rise", "fare expiring soon").
- Label every price low/typical/high and gate predictions on model confidence.
- Make alert creation a conversational action with explicit confirmation before saving.
- Keep comparison in the assistant but hand payment to the partner as merchant of record.
- Guarantee only badged, high-confidence fares and cap liability.

### Confidence notes (StayMatch, Layla, Google)
- StayMatch: no independent press or founder information; numeric match percentages, free-text priority input and personal weightings are unverified.
- Layla: confirmation before saving, an editable preference list, per-trip memory, WhatsApp and TikTok import and a "PriceLock" claim could not be verified; the policy date is uncertain.
- Google: the guarantee limits ($5 / $500 / US only) and the low/typical/high window come from press, not Google's help pages; whether AI Mode flight booking launched after Aug 27, 2026 was not verifiable.

## Booking.com — Natural-language Smart Filters

### What it is
Smart Filter (Booking.com's singular name; OpenAI's case study says "Smart Filters") is a GenAI layer on
accommodation search in the Booking.com mobile app: the traveler types what they want in plain language
and the system applies Booking.com's existing structured filters. Announced October 30, 2024 together
with Property Q&A and Review Summaries, following the AI Trip Planner (2023).

### How it works today
1. **Input:** a free-text description in the app, e.g. "Hotels in Amsterdam with a great gym, a rooftop
   bar, and canal views from the room." Where the box sits in the search flow is not documented.
2. **Mapping:** "GenAI then scans Booking.com's entire inventory to automatically apply the most relevant
   filters… delivering a tailored list of properties." Third parties describe it as translating text into
   existing filter categories (property type, facilities, distance). No source mentions price or "vibe"
   filter types.
3. **Showing what it understood:** not documented anywhere readable. Whether applied filters appear as
   editable chips is unverified — this is the opening our version targets.
4. **Models:** OpenAI's case study says Booking.com "integrated OpenAI's GPT models with Booking.com's
   proprietary data on properties, pricing, and availability" and lists Smart Filters as an outcome.
5. **Unmappable requests:** no official behavior published; a third-party test reports a "halal-friendly
   hotel near a mosque" query returning nothing.
6. **Availability:** as of Oct 30, 2024, live in the US, UK, Australia, New Zealand and Singapore via the
   mobile app; 2025–26 expansion and web availability are unverified.
7. **Related features:** Property Q&A (same launch, same markets): ask "Are there charging stations for
   electric vehicles onsite?" and GenAI "retrieves relevant information from the property listing,
   traveler reviews, and photos" into concise answers. Review Summaries were "testing" at launch,
   highlighting things like parking or wheelchair accessibility. AI Trip Planner: June 2023 beta for US
   Genius members, partially powered by the ChatGPT API, later in more markets and languages.

### Evidence
- https://news.booking.com/bookingcom-enhances-travel-planning-with-new-ai-powered-features--for-easier-smarter-decisions/ — primary release (2024-10-30).
- https://news.booking.com/bookingcom-launches-new-ai-trip-planner-to-enhance-travel-planning-experience/ — AI Trip Planner launch (2023-06-27).
- https://openai.com/index/booking-com/ — OpenAI case study naming Smart Filters, Property Q&A, review summarization.
- https://news.booking.com/bookingcom-debuts-agentic-ai-innovations-adding-to-its-robust-suite-of-genai-tools-for-customers/ — Oct 9, 2025 agentic release (no Smart Filter update seen).
- https://partner.booking.com/en-gb/help/property-page/general-info/guest-qa-feature — the older human Guest Q&A.
- https://staymatch.ai/blog/booking-com-smart-filters-vs-staymatch-which-actually-surfaces-the-right-stay/ — competitor's description of the filter mapping and its limits.

### Borrowable details
- One free-text box that resolves to the existing filter taxonomy keeps results explainable and the filter UI familiar.
- Seed the box with a compound example ("great gym, a rooftop bar, and canal views") to teach multi-constraint requests.
- Pair the filter with per-property Q&A over listing + reviews + photos so unfilterable long-tail questions still get answered.
- The gap Booking.com leaves: no visible "here is what I understood / could not map". That is the opening.

## Yelp — Questions answered through reviews

### What it is
Yelp Assistant is an LLM chatbot that answers free-form questions about a specific business ("where to
park", "vegetarian options") from Yelp reviews, photos, business-page data and the business's website.
Business-page Q&A launched Oct 21, 2025; on Apr 21, 2026 it moved into a dedicated "Assistant" tab
covering every category with in-chat booking. Review Insights (Dec 10, 2024) adds per-topic sentiment
scores derived from reviews.

### How it works today
1. **Entry points:** on eligible business pages, logged-in iOS/Android users see "Ask Yelp Assistant" with
   personalized suggested questions per business; since Apr 2026 an "Assistant" tab at the center of the
   app answers across every category.
2. **Permitted data:** "reviews, photos, business page information and the business's website"; Yelp's
   engineers list reviews, photos, structured info, menus and Ask the Community.
3. **Pipeline (Yelp Engineering, Mar 2026):** question-analysis agents run as parallel async chains; a
   Trust & Safety classifier labels the question first and, for flagged cases, cancels content work and
   returns templated safe answers; retrieved evidence is composed into a prompt and the LLM synthesizes
   "a concise answer complete with citations", augmented with relevant photos, streamed token by token;
   fine-tuned small models cut cost and latency; automated quality evaluation runs over answers.
4. **Evidence display:** "concise, relevant answers with supporting photos and reviews"; "relevant sections
   and even photos from Yelp reviews highlighted in the AI response".
5. **Review Insights:** LLMs score reviewer sentiment per topic (food, service, ambiance, wait time,
   drinks; for services: customer experience, pricing, facilities, job quality) as aggregated scores from
   1 to 100 displayed above reviews; tapping a score opens all reviews on that topic; the topic is inferred
   even when not named. Launched iOS-only for restaurants using OpenAI models.
6. **Model governance:** a rubric of correctness, relevance, conciseness, customer safety and compliance;
   pilots per model; tone tuned to feel human.
7. **Limits:** no published behavior for questions the reviews cannot answer; desktop web coverage unverified.

### Evidence
- https://blog.yelp.com/news/fall-product-release-2025/ — "Ask Yelp Assistant", data sources, prompts (2025-10-21).
- https://blog.yelp.com/news/spring-product-release-2026/ — Assistant tab, review-backed answers (2026-04-21).
- https://engineeringblog.yelp.com/2026/03/building-baa-from-prototype-to-product.html — RAG, citations, safety classifier, streaming (Mar 2026).
- https://blog.yelp.com/news/end-of-year-product-release-2024/ and https://techcrunch.com/2024/12/10/yelp-adds-ai-powered-review-insights-to-restaurants/ — Review Insights (2024-12-10).
- https://blog.yelp.com/news/spring-product-release-2025/ — services Review Insights (Spring 2025).
- https://www.fastcompany.com/91425163/yelps-ai-assistant-local-business — highlighted review sections (Oct 2025).
- https://venturebeat.com/ai/how-yelp-reviewed-competing-llms-for-correctness-relevance-and-tone-to-develop-its-user-friendly-ai-assistant — model rubric.

### Borrowable details
- Per-business suggested questions lower the blank-box barrier.
- Declare the evidence corpus in-product and stay inside it.
- Put citations, highlighted review passages and photos inside the answer, not behind a link.
- A safety classifier in front of generation, with early stop and a templated redirect.
- Topic sentiment scores (1–100) as tap targets that filter reviews: a reusable "show me the evidence" primitive.
- Stream tokens and use small fine-tuned models for question analysis to keep latency down.

## Tripadvisor — Side-by-side comparison

### What it is
No literal side-by-side comparison table could be verified. The closest capability is the Tripadvisor AI
Assistant, a free chat on tripadvisor.com/AIAssistant that lists "Compare these two hotels for a couples'
trip" as an example prompt and lets users "see options on a map and compare them visually", grounded in
"over 1 billion real traveler reviews, ratings, and popularity data" with real-time availability and
pricing. A Tripadvisor app in ChatGPT is pitched to "discover, compare, and find the best hotel deals".

### How it works today
1. **Input:** an open-ended chat prompt, no account required. Priorities are captured only through the
   prompt's qualifier ("for a couples' trip") and the page being viewed; no structured priority picker.
2. **Grounding:** retrieval-augmented generation over Tripadvisor content; Tripadvisor "doesn't serve
   Point of Interest recommendations directly from LLMs, instead leveraging Tripadvisor content, traveler
   reviews and forum posts" (semantic search over listing title, description, reviews and metadata).
3. **Review selection** (Tripadvisor to Which?, July 2026): the assistant "draws from a selection of
   reviews based on detail and recency, and matches by language and context", and is "a product in
   development".
4. **Output:** conversational answers with hotels, live pricing and booking links, things to do,
   restaurants and itineraries, plus a map view. No source describes a comparison table, explicit
   strength/compromise lists or a "missing information" state. In Which?'s test the answer was an
   unhedged prose verdict (food poisoning "quite unlikely" at a hotel with 102 food-poisoning mentions in
   March 2026 reviews).
5. **Per-property AI review summaries** exist alongside the assistant; Which? found a summary calling
   service "friendly" where reviews reported harassment; Tripadvisor said it was "actively looking into"
   mismatches.
6. **Lineage:** July 2023 OpenAI-powered day-by-day itinerary generator in Trips; the conversational
   assistant arrived around May 2025. "Comparing 2+ hotels" appears in Tripadvisor's forum only as a user
   request.

### Evidence
- https://www.tripadvisor.com/AIAssistant — "Compare these two hotels" prompt, map compare, free (seen Sept 2026).
- https://tripadvisor.mediaroom.com/2026-04-23-How-AI-Is-Changing-the-Way-We-Plan-Travel — assistant capabilities (2026-04-23).
- https://medium.com/tripadvisor/meet-the-tripadvisor-ai-assistant-your-ultimate-trip-planning-companion-244d4f6eba28 — RAG, page-aware answers.
- https://medium.com/tripadvisor/evolving-tripadvisor-search-building-a-semantic-search-engine-for-travel-recommendations-830f464318b7 — semantic retrieval.
- https://www.which.co.uk/policy-and-insight/article/tripadvisor-ai-tool-gives-glowing-reviews-to-dangerous-hotels-which-finds-adbnO9E3Dr2O — Which? investigation and Tripadvisor's statement (July 2026).
- https://www.euronews.com/travel/2026/07/03/tripadvisor-ai-summaries-give-glowing-reviews-to-dangerous-hotels-consumer-watchdog-finds — coverage (2026-07-03).
- https://www.tripadvisor.com/ChatGPT — ChatGPT app copy.
- https://www.tripadvisor.com/ShowTopic-g1-i12104-k11255859-Comparing_2_hotels_new_feature-Help_us_make_Tripadvisor_better.html — user request for a compare feature.

### Borrowable details
- Accept comparison intent in plain language with a trip-context qualifier, and let the current page set context.
- Never let the model invent places: retrieve candidates and evidence from the review corpus, then write.
- Pair the chat answer with live price and a map so users can compare visually.
- Publish the review-selection policy (recency, detail, language) and show negative-mention counts and recency instead of an unhedged verdict.
- Treat "compare" as a structured output (dimensions, evidence, what is unknown). Tripadvisor does not do this today, so it is a differentiator.

### Confidence notes (Booking.com, Yelp, Tripadvisor)
- Booking.com: placement of the Smart Filter box, visibility/editability of applied filters, handling of unmappable parts, the model version and any 2025–26 expansion are unverified.
- Yelp: desktop availability, the behavior when reviews lack an answer, and Android coverage of Review Insights are unverified.
- Tripadvisor: the absence of a side-by-side table is "no evidence found", not proof; the assistant's exact answer format and its launch date are unverified.
