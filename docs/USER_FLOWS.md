# XPMatch user flows

Every flow a signed-in traveler can take, screen by screen, with what the app does behind the scenes.
Routes are listed at the end.

## 1. Account

**Sign up** — `/signup`: name, email, password (8+ characters). The server hashes the password (bcrypt),
creates the user, a profile row and a session, sets the `xp_session` HttpOnly cookie and lands on the chat.
A handle (`@tayo-akigbogun`) is derived from the name and shown in the sidebar footer.

**Onboarding** — on the first visit the "Let's personalize your assistant" wizard opens: six short steps
with a progress bar, Back / Next and "Skip for now" on every step.
1. *About you* — name, home city, home airport, who usually comes along.
2. *Style & interests* — budget tier, pace, travel styles, and **things you love doing** (museums & art,
   history & architecture, food tours & markets, nightlife, live music, nature & hiking, beaches, wellness,
   shopping, photography spots, sports & adventure, family activities, local neighborhoods, coffee culture,
   wine & craft beer, street food).
3. *Where you stay* — kind of place (boutique, design, luxury resort, budget hotel, apartment, hostel, B&B,
   business hotel), must-haves (pool, gym, breakfast, kitchen, central, quiet room, workspace, free
   cancellation, walkable, near transit, parking) and free text.
4. *How you eat* — cuisines, dietary needs as chips (vegetarian, vegan, gluten-free, halal, kosher, no
   shellfish, nut allergy) plus free text, and how adventurous (play it safe / a bit of both / try anything).
5. *Logistics & next trip* — early riser / in between / night owl, how much walking, getting around
   (walk & transit / rideshare / rental car / whatever works), flights (nonstop / cheapest / comfort /
   flexible), and **where you are dreaming of going next** with a rough when.
6. *Dealbreakers & notes* — **"What ruins a trip for you?"** chips (street noise, no workspace, stairs,
   crowds, early starts, long transfers, spicy food…) that become dealbreakers, and anything else.

"Save preferences" on the last step stores the profile and the dealbreakers on the server; "Skip for
now" keeps what was filled so far. Everything is sent to the assistant as context on every message
(interests, stay types, must-haves, cuisines, dietary tags, rhythm, walking, transport, flights, next
destination included), drives the home picks and the match score, and can be changed later from
**Update my assistant** (the same six sections stacked, with a section rail) or by simply telling the
assistant ("I'm vegetarian" → `update_traveler_profile`, which accepts every field).

**What XPMatch has learned** — the same dialog lists every preference confirmed in chat (statement,
likes/avoids/dealbreaker, domain, where it came from, and "only for <trip>" when trip-scoped) with a delete
button, plus a **Learn from our chats** switch that stops the assistant from offering to remember things.

**Log in / log out** — `/login` accepts email + password and returns to the page the visitor wanted
(`?next=`). Sessions last 30 days and slide on use. Log out is in the account menu at the bottom of the
sidebar. Signed-out visitors are redirected to `/login` by `src/proxy.ts`; API routes return 401.

## 2. Chat (home)

`/` is the chat: the **active chat** with the **right panel** beside it (discovery feed until the
conversation is about a place, then the live map). Conversation history lives in the main sidebar:
**Chats** expands in place to list every conversation (grouped newest first, trip labels, hover to
delete, "Show all", "+ New chat") so no horizontal space is spent on a separate rail.

1. **Start** — the welcome hero ("Where to today, Tayo?") shows suggestion chips built from the profile,
   the planner bar values and upcoming trips. Type anything travel-related or pick a chip.
2. **Destination** — as soon as a place is clear the assistant calls `focus_map`: the map centers on
   it, a "Looks like you're headed to Rome" callout appears with a **Create trip** button, the chat is
   titled "Exploring Rome" and the planner bar's *Where* fills in.
3. **Recommendations** — the assistant renders cards for destinations, hotels, flights, restaurants and
   things to do. Each card links to live inventory (Google Flights, Booking.com/Google Hotels, Google
   Maps, OpenTable, GetYourGuide) and has **Save** (heart), **View on map**, **Add to trip** and
   **Compare**. Hotels, restaurants and attractions are resolved through Google Places and pinned on the
   map; hovering a card highlights its pin and vice versa. Under the reasons to like a pick, amber
   **Heads-up** chips name its honest downsides for this traveler ("Busy street, ask for a courtyard room",
   "Well over $250/night"); a pick that conflicts with one of the traveler's dealbreakers says so.
   Every hotel, restaurant and attraction card then carries a **match score** ("87% match · Good match")
   computed by the app, never by the model, from the profile (budget vs price, interests, stay types,
   must-haves, cuisines, dietary tags, companions), the learned preferences (a dealbreaker named in the
   heads-ups costs 25 points), the taste profile ("Like Da Enzo, which you loved") and the pin's rating;
   clicking it opens **Why this score** with every reason and its points. Next to it, **Right for you?**
   thumbs up / down record whether the pick landed; thumbs down asks why (too pricey, wrong vibe, too far,
   already been, not my thing). Judgments are stored per place, lower the score of a pick the traveler
   already passed on, dampen factors that keep misleading them (calibration), and reach the assistant as
   "Recommendation feedback" so it never re-recommends a recent miss and corrects for repeated reasons.
4. **Understood as (smart filters)** — when the request carries criteria ("a quiet hotel under $250 a night
   with a pool and good vibes"), the assistant first shows a chip strip: dark chips are must-haves, light
   ones preferences, and "Not applied: 'good vibes'" lists what could not be mapped. Removing a chip, adding
   one with **+ Add** or clicking a chip to flip must-have ⇄ preference sends "Search places to stay in Rome
   again with these filters: …" and a fresh card set (and pins) follows; the strip stays in the assistant's
   context for later turns. Inside a trip chat, **Save to trip** turns the chips into trip preferences.
   Older strips stay in the transcript as a record; only the newest is editable.
5. **Compare** — **Compare** on two or three cards shows a floating bar ("2 selected · Compare · Clear").
   Compare asks the assistant, which answers with a comparison card: options as columns, this traveler's
   priorities as rows with Strong / OK / Weak / Unknown verdicts and a one-line note each, then Price, Rating
   (the Google rating and review count when the option is pinned), Location, Strengths, Compromises and
   **Couldn't verify**. Each column has **Map** (opens the place sheet and highlights the pin), Save, Add to
   trip and **Pick this one**; a hedged recommendation closes the card. "Compare A and B" typed in chat does
   the same.
6. **Remember this?** — when the traveler mentions a lasting taste ("I prefer boutique hotels"), a small card
   asks to remember it with **Always**, **For this trip** (only inside a trip chat) and **No thanks**.
   Nothing is stored until a button is pressed; the choice is stored under Update my assistant (or the
   trip's preferences) and sent to the assistant on every later message.
7. **Place sheet** — clicking a pin or "View on map" opens the Mindtrip-style sheet: photos, rating and
   review count, category, price, description, hours, Google reviews, location, **Rate** (see 12), Save,
   Add to trip, and a follow-up button ("Restaurants nearby"). A **destination's** sheet has **Stays**,
   **Restaurants** and **Things to do** tabs that fill in beside the map: the assistant's own picks from
   this chat ("Picked for you") first, then places near the destination queried with the traveler's
   preferences (accommodation style, dietary needs, budget tier, first travel style — shown as chips).
   Each row has a photo, rating, category and price, Save and Add to trip; tapping it pins the place and
   opens its sheet. "Ask XPMatch for personalized picks" sends the matching prompt to the chat.
   **Ask about this place** (Overview tab of a hotel, restaurant or attraction) answers a question
   ("Is it noisy at night?") from Google's reviews, review summary and attributes with verbatim quotes and
   a confidence label; suggested questions are one tap away and the Reviews tab filters by topic
   (noise, cleanliness, service…). Typing the question in chat ("is the Artemide noisy?") calls
   `ask_about_place` and renders the same answer card.
8. **Reactions and taste** — every hotel, restaurant, attraction and destination card, the place sheet,
   trip ideas, board stops and saved places have **Rate**: *Loved it / It was fine / Not for me*, then
   reason chips (stays: Quiet, Location, Design… or Noisy, Dated, Overpriced…; food, things to do and
   destinations have their own) and an optional note. The verdict saves on click; **Not for me** hides
   the card at once (with **Undo**). A **Fits your taste** line appears on a card when it shares a
   category with a place you loved ("Like Trattoria Da Enzo, which you loved") or matches a reason you keep
   liking. Saying it in chat ("the Artemide was too noisy") records it through `record_feedback` with a
   small chip.
9. **Import inspiration** — paste a link (blog post, Reddit thread, YouTube page, article) and the
   assistant calls `import_inspiration`: the page is read server-side, the places it names are extracted
   and verified through Google Places, and "Imported from <site>" cards appear (photo, rating, category,
   "Mentioned as…", Save, Add to trip, Rate) pinned on the map, with **Couldn't verify** for mentions that
   did not resolve. Below: **Add all to a trip**, **Plan a trip from these** and **Save as a collection**
   (a private guide). Instagram and TikTok links cannot be read; the composer's **+** menu has **Import
   inspiration** for a screenshot instead (also on Create › Import).
10. **Reservations** — paste a confirmation email (flight, hotel, restaurant, car, train, tickets) and the
    assistant calls `import_reservation`: one structured model call reads it and **reservation cards**
    appear (kind icon, provider, confirmation code, dates and times, place or address, travelers, price;
    flights list their legs "ATL → FCO DL 1234"). Hotels, restaurants and venues that Google Places
    recognizes show "Pinned: <name>" and get a pin. **Add to trip** stores the card under the trip's
    Bookings with its details (see Trips). PDFs and screenshots go through Import inspiration › **A
    reservation**.
11. **Map tools** — hide the map (the discovery feed returns with a "Show map" button), search-and-pin
    any place near the destination, satellite toggle, weather chip.
12. **Trip proposal** — when the traveler asks for a plan the assistant calls `create_trip` and a
    proposal card appears (title, dates, travelers, budget, summary, day-by-day itinerary). Its stops
    resolve through Google Places and pin on the map while the traveler decides, so each line shows the
    photo, rating, category, price, time, note and a match score (hover a stop to highlight its pin, click
    it to open the sheet). **Save to my trips** stores it on the server and links straight to the board;
    **Not yet** tells the assistant to adjust.
13. **Follow-ups** — after each answer the assistant proposes 2–3 next steps as chips. While a proposal or
    "Remember this?" card is waiting for a click the chips pause (a suggestions run would otherwise send the
    model an unanswered tool call).
14. **History** — expand **Chats** in the sidebar and click a conversation to reopen it (`/?thread=…`),
    including its cards and map pins, which are rebuilt from the stored transcript; transcripts live in
    Postgres, so chats survive deploys and restarts. Chats started from a trip show the trip name and keep
    the trip in context when reopened. The top-bar chat menu ("New chat ⌄") is the quick switcher; "All
    chats" expands the sidebar list.

## 3. Planner bar and "Create a trip"

The top bar shows *Where / When / Who / Budget*. Clicking any segment (or **Create a trip**) opens the
planner dialog. **Start planning** keeps the values in the bar and sends a planning prompt to the chat;
**Create trip** creates the trip on the server right away and opens its page.

## 4. Trips

**List** — `/trips`: "Your trips" with **Trips | Calendar** tabs and an All / Upcoming / Past filter.
Cards show the destination photo, title, destination and dates, and a member count when shared. The
calendar tab highlights trip date ranges by month.

**Create** — planner dialog → Create trip; the chat's proposal card → Save to my trips; the Create page's
Trip tab; or **Add to trip → New trip** from any place.

**Trip page** — `/trips/[id]`, modeled on Mindtrip:
- Header: title, chips for destination, dates, travelers, budget (each opens the matching section) and
  members; **Edit details** (title, destination, dates, travelers, budget) and a menu with **Delete
  trip** (owner) or **Leave trip** (member).
- Proactive card ("Rome in October — want help getting started…") with Find hotels / Top things to do /
  Build the itinerary / Neighborhood guide.
- **Ask anything else** — opens a new chat attached to the trip. In that chat the assistant sees the
  trip (dates, members, ideas, itinerary, preferences), the map opens on the destination with the trip's
  ideas pinned, and three extra tools are available: `update_trip_plan` (dates, travelers, budget,
  summary, the whole itinerary as structured stops, preferences), `add_trip_ideas` (adds places to the
  Ideas list) and `schedule_stops` ("put the Colosseum on day 2": places are resolved and pinned; the chip
  links to the board).
- **Chats** — every conversation attached to this trip, newest first.
- **Board | Tiles** toggle (right column; the choice is remembered per browser, `?view=board` opens the
  board from chat).
- **Board** — Wanderlog-style: dates, travelers, bookings and ideas chips and a **Walk / Drive /
  Transit** travel mode (remembered per browser); then each **Day** (color dot, date, editable theme)
  with the reservations that start on it (time, name, confirmation code) above a list of numbered stops
  with photo, name, rating, category, start time, duration and note, a travel leg between placed stops
  in the chosen mode ("12 min walk · 0.9 km · via Google" from the Routes API, or "… · est." when it is
  off or fails) and **Directions** (Google Maps through the day's stops in that mode); **Optimize order**
  (nearest neighbor from the first stop); a per-stop pencil for time, duration and note; **Move to… /
  Back to ideas / Remove**; **Rate**; an **Add a stop** form per day (a place kind gets it resolved and
  pinned, "Note only" stays text); **Add day**, **Remove day**; and the **Ideas** tray of unscheduled
  places with **Add to day…**. Stops drag within a day, across days and from Ideas with the pointer (drop
  where the pointer is) or the keyboard (space, arrows, space); every change saves as it happens
  ("Saving…"). Legs are requested per day when its placed stops or the mode change and cached on the
  server for a day. A placed stop's chevron opens **Details**: a photo strip, rating and count, category,
  price level, today's hours and phone (Place Details, cached 30 days), the editorial summary, address,
  Google Maps and website links, the match score with thumbs, and **Ask about it** (opens the trip chat
  with the question).
- Tiles: **Ideas** (places added from chat, map, Explore or by searching here; each with note, Rate, Save,
  Show on map, remove), **Itinerary** (read view: each stop with its photo, time, rating, category, price
  and note, with **Open the board**, **Edit as text**, or "Build it with the assistant"), **Bookings**
  (typed by hand: title, link, note; imported from a confirmation: kind
  icon, provider, confirmation code, dates and times, travelers, price, flight legs, plus a pin when the
  hotel or venue resolved) and **Media** (title, link, note; image links preview), **Trip preferences**
  (free text the assistant reads for this trip, plus **Learned for this trip**: the "For this trip"
  answers from its chats, each removable), **Calendar** (dates, travelers, budget plus a month view),
  **Members** (add by email, role Can edit / Can view; remove; leave).
- **Map** — destination pin, unscheduled ideas/bookings/media with a place, and the itinerary's stops as
  numbered pins colored per day with a line through each day; chips **All · Day 1 · Day 2…** show one day
  at a time; hovering a board card highlights its pin and vice versa; click a pin for its sheet.
- **How was Rome?** — from the day after the trip's end date (for about six weeks) a banner offers to
  rate the trip's placed ideas and stops: three buckets per place with reason chips, then up to three
  "Which did you prefer?" pairs against places already rated in the same domain, which turn into 0–10
  scores; the same prompt sits under Updates (`?rate=1` opens it).

**Members and notifications** — adding a member requires an XPMatch account with that email. The member
gets an Update ("Tayo added you to the trip…") and the trip appears in their Trips. Adding ideas,
bookings, media or editing the plan notifies the other members.

## 5. Add to trip (everywhere)

Every card, place sheet, Explore result, guide place and saved place has **Add to trip**. The picker
lists the traveler's trips (upcoming first, current trip preselected when on a trip page or trip chat)
plus **New trip** (title prefilled from the place's city), and an optional note. The place is added to
the trip's Ideas and pinned on its map; the dialog offers **Open trip**.

## 6. Explore

`/explore` shows what is around the traveler:
- **Location header** — defaults to the profile's home city ("Austell ⌄"); the menu offers Home,
  **Use my location** (browser geolocation) or **another city**.
- **Search** — free text near the location ("cheap sushi open now 4.5+ cozy"). The text is read
  deterministically: price words and "under $30" become Places price levels, "4.5+" / "highly rated" a
  minimum rating, "open now" an open-now filter; vibe words stay in the text query. An **Understood as** line
  shows dark chips for applied filters, light chips for words searched in the text, and the remaining query.
- **Tabs** — For you (experiences + restaurants), Restaurants, Experiences, Stays, Guides (community
  guides nearest to the location).
- **Cards** — photo, name, rating and review count, category, locality, price tier, the match score and
  thumbs; **Save**, **Add to trip**; hovering highlights the pin, clicking the photo opens the place sheet
  on the map.
- **Map** — labeled markers for every card, synced with the list.

## 7. Create (guides and trips)

`/create` has **Guide | Trip | Import** tabs.

**Guide editor** — title, destination (resolved for the cover photo and map center), description, tags
(presets + custom), then places: search a place ("Colosseum", kind Thing to do / Restaurant / Stay) and
it is resolved through Google Places with photo, rating and coordinates; add a note per place; reorder
with the arrows; remove. **Save draft** keeps it private; **Publish to the community** requires at least
one place and lists it under Inspiration. Authors reopen a guide with **Edit** on its page
(`/create?guide=…`).

**Trip tab** — the same planner form as the dialog: Create trip or Start planning.

**Import tab** — paste a link or upload a screenshot / photo (PNG, JPEG, WebP up to 6 MB). The server
reads the page (Reddit through its JSON form, YouTube through its metadata; scripts, styles and navigation
removed; 15k characters at most; http(s) only, no private addresses, three re-checked redirects, 2 MB and
8 s limits) or sends the image to a vision model, extracts up to 20 named places, verifies each through
Google Places (a result counts only when its name matches the mention) and shows the same "Imported from"
cards as the chat, plus **Chat about these** and **Import another**. Instagram and TikTok links get the
screenshot hint before anything is fetched. A link imported within the last seven days is served from the
traveler's history without a new fetch or model call.

The tab's switch **Places from a post | A reservation** turns the same form into the confirmation
importer: paste the confirmation text, or upload the PDF or a screenshot (PDF, PNG, JPEG, WebP up to 6 MB).
PDFs are read as text on the server (no model sees the file), images go to the vision model, and one
structured call extracts up to ten reservations (kind, provider, confirmation code, dates and times, place
or address, travelers, price, flight legs); codes and dates are copied as written, hotels, restaurants and
venues are verified through Google Places and pinned when the name matches. The result is the reservation
cards from the chat with **Add to trip** on each and **Import another**. The same importer is behind the
composer's **+** menu (Import inspiration).

## 8. Inspiration and guide pages

`/inspiration` lists published community guides (cover, title, destination, author, places, saves) with
search by destination or title and a **Create a guide** button; curated XPMatch collections sit below.

`/guides/[id]` — cover, author, description, tags, the ordered places (photo, rating, category, note;
Save place, Add to trip, Show on map) and a labeled map. **Save guide** keeps it under Saved › Guides
and notifies the author; **Plan a trip from this guide** starts a chat that turns the places into a
trip. Authors see **Edit** and **Delete** instead of Save.

## 9. Saved

`/saved` has **Places | Guides | Imports** tabs. Places are grouped by type (Destinations, Stays, Flights,
Restaurants, Things to do) with photo, Rate, Add to trip, Open and remove; "Turn saved places into a trip"
sends them to the assistant. Guides show as cards linking to the guide, with remove. Imports list every
link or screenshot imported (title, site, date, places, unverified count) with **Open in chat** (re-imports
the link from history, or lists the screenshot's places), the source link and remove.

## 10. Updates

`/updates` is the notification feed (unread count badge in the sidebar; opening the page marks all as
read): you were added to a trip, a member added an idea/booking/media or edited the plan, someone saved
your guide. Each item links to the trip or guide. Trips that ended recently show a "How was Rome?" card
on top with **Rate places** (opens the post-trip rating on the trip page) and **Not now**.

## 10a. Bug reports and Admin

The bug icon next to the traveler's name in the sidebar (and in the top bar on small screens) opens
**Report a bug**: what kind of thing it is (something's broken / looks wrong / idea or request), what
happened, what was expected, and an optional screenshot that the browser downscales to 1280 px JPEG before
sending. The page, the current chat id, the browser and the deployed build are attached automatically.
Reports land in `bug_reports`; every admin gets an Update ("Bug report from @tayo: …"). Accounts listed in
`ADMIN_EMAILS` see **Admin** in the sidebar: `/admin` opens with the **Beta numbers** (users in total and
in the last 7 days, sign-ups by UTC day over two weeks, last sign-up, trips, chats, saved places, guides,
open bugs; `GET /api/admin/stats`), lists reports newest first (open / resolved / all, mark resolved /
reopen, show screenshot) and ends with the **Recommendation quality** summary: hit rate of thumbs across
every traveler, by kind and by context (chat, home, explore, board), why picks miss, and the recent misses
with the score that was shown. The same counts are printed once at boot (`[xpmatch] db ready (pg):
users=… trips=… chats=…`), so the Railway deploy log shows them without a database connection.

## 11. Routes

| Route | Screen |
| --- | --- |
| `/login`, `/signup` | Account |
| `/admin` | Bug reports and recommendation quality (admins) |
| `/` (`?thread=`, `?trip=`, `?prompt=`) | Chat and map; history expands under Chats in the sidebar; `/chats` redirects here |
| `/trips`, `/trips/[id]` (`?view=board`, `?rate=1`) | Trips list and trip page (board view, post-trip rating) |
| `/explore` | Things near you |
| `/create` (`?guide=`) | Guide editor / trip form |
| `/inspiration`, `/guides/[id]` | Community guides |
| `/saved`, `/updates` | Saved items, notifications |

## 12. What is stored per user

Profile (the six onboarding sections), dealbreakers and learned preferences (profile-wide or per trip;
reasons that repeat in reactions become preferences with source "feedback"), the computed taste profile,
reactions to places (one row per place: verdict, reasons, note, score, trip), thumbs on recommendations
(one row per place: up / down, the score shown, the match factors that fired, the miss reason, where it was
shown), bug reports (with their screenshot), trips (with members, items — bookings imported from a
confirmation keep their structured details — structured itinerary stops, preferences), saved places and
guides, guides they authored (including private import collections),
imports (source, verified places, unverified mentions), the chat list (titles, trip links), chat
transcripts (every message, tool call and card, written by the runtime after each run and restored when a
chat is reopened) and notifications — all in Postgres. A shared 30-day cache of Place Details (reviews,
summaries, attributes) backs "Ask about a place". Live runs stream from the runtime's memory; the planner
bar values, the compare selection, constraint chips of the current session, the Board | Tiles choice, the
board's travel mode, which post-trip prompts were dismissed and small UI preferences (e.g. whether Chats
is expanded in the sidebar) stay in the browser. Routes API legs are cached in the server process for a
day per mode and coordinates, not per user.

## 13. Your taste (Update my assistant)

The assistant settings dialog ends with **Your taste**: per domain (Stays, Food, Things to do,
Destinations) the number of ratings, liked and disliked reasons with counts, the ranked places with their
scores and the usual price level, then every reaction with a delete button. The assistant receives the same
summary plus the ten latest reactions on every message and is told to lean toward what you loved, avoid
what you disliked and never re-recommend a place marked not for you unless asked.
