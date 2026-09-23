# XPMatch user flows

Every flow a signed-in traveler can take, screen by screen, with what the app does behind the scenes.
Routes are listed at the end.

## 1. Account

**Sign up** — `/signup`: name, email, password (8+ characters). The server hashes the password (bcrypt),
creates the user, a profile row and a session, sets the `xp_session` HttpOnly cookie and lands on Discover.
A handle (`@tayo-akigbogun`) is derived from the name and shown in the account menu.

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

On a phone (under 640 px) the wizard does not open at all: the Discover hero asks three questions as
chat bubbles (where you start from and where you dream of going, what you love doing as chips that fold
behind **Show all**, how you like to spend as four budget cards), each answer echoes back as your bubble,
**Done** saves the profile and Discover shows the hero with "For you in Rome"; the Concierge tab's empty
state then opens with the nine home picks as the assistant's first message ("Here's what I'd pick for
you in Rome…"); **Skip for now** saves what was filled. The full six sections stay
one tap away under More › Update my assistant, where they come as three screens (about you + style,
where you stay + how you eat, logistics + dealbreakers) while the quiz is unfinished.

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
(`?next=`). Sessions last 30 days and slide on use. Log out is in the account menu in the header (the
More sheet on phones). Signed-out visitors are redirected to `/login` by `src/proxy.ts`; API routes return 401.
Sign-in is throttled (ten tries per email and a hundred per network address every 15 minutes, answered
with 429 "Too many sign-in attempts"); sign-up allows a hundred accounts per address per hour. The
sign-up form and the account menu link to the Terms of Service and Privacy Policy on
`www.xpmatchme.com`.

**Forgot your password** — **Forgot password?** on the sign-in page (`/forgot`) asks for your email and
answers "if an account exists, a reset link is on its way" whether or not one does, so the form cannot
be used to find out who has an account (`POST /api/auth/forgot`, rate-limited per address and per
email; the email goes out through Resend from `EMAIL_FROM`). The link opens `/reset?token=…` without
signing in, shows which account it is for, takes a new password (typed twice, 8+ characters) and signs
that browser in; every other device is signed out at the same time. Links work once and expire after
30 minutes (`password_resets` stores only a hash of the token; a new link replaces an unused older one).
An admin can also issue the same link by hand: `/admin` › Members › **Reset link** on your row, sent
however you talk. Without `RESEND_API_KEY` the form still answers normally but nothing is sent.

## 2. Discover (home) and the concierge (`/chat`)

**Shell** — every signed-in page sits under the header (wordmark · Discover, My trips, Saved · the
Updates bell · the account menu · the teal **Create a trip** pill). Every page but Discover also has
the side rail on the left (tablet and up): **New chat**, then **Chats** with the conversation list
under it (newest first, trip labels, remove on hover, Show all, collapsible with the chevron), Trips,
Explore, Saved, Updates (unread badge), Inspiration, Create and Admin; **Collapse** folds the rail to
icons and the choice is remembered per browser. Phones keep the tab bar instead.

**Discover** — `/` is the home page, under the header (wordmark · Discover, My trips, Saved · the
Updates bell · the account menu with Update my assistant, Inspiration, Explore near you, Create a guide,
Admin, Report a bug, Terms, Privacy, Log out · the teal **Create a trip** pill). Its hero carries the
eyebrow, "Go somewhere that stays with you.", a serif prompt composer ("Describe your ideal escape",
Ctrl/⌘ + Enter or the round send button hands the text to the concierge), three suggestion chips (Find
hotels / Top things to do / Neighborhood guide for the destination in focus, or Weekend ideas / Plan a
trip / Find cheap flights), the **Where / When / Guests / Budget** fields (each opens a small editor:
a popover on desktop, a sheet on phones, with Cancel and Apply; Where suggests the resolved place, When
rejects an end date before the start, Guests is a 1–16 stepper, Budget the four tiers or no preference),
**Create a trip** (opens the dialog prefilled from the fields) and **or chat with your AI concierge**
(sends the planning prompt when a destination is set, otherwise opens the chat). Beside the copy sits
the Google Places photograph of the destination the traveler is headed to (next trip, then the dream
destination, the planner's Where, the home city, then Paros) with the motto, a caption naming the place
and the photo's author attribution, as the Places policies require. Below the hero: **Find your kind of
extraordinary** (By the water, Close to nature, Immersed in culture: each a real destination's Places
photo with a heart that saves the collection and a link to the matching Inspiration rows; "View all
destinations" opens Explore), **For you in {city}** (three carousel rows of up to six picks each,
sorted best first, every card showing its match label and score, the two strongest reasons behind it
as chips, a **Top pick** mark on the leader, thumbs, Save and Add to trip; a row whose picks the
profile cannot tell apart says so and links to Update my assistant), **Jump back in** (trips, recent
chats, saved destinations) and **From the community** (the newest published guides). A floating
**Your AI concierge** pill (lower right, not on phones) opens the chat from Discover; the other pages
have the side rail.

**The concierge** — `/chat` is the conversation: the **active chat** with the **right panel** beside
it (discovery feed until the conversation is about a place, then the live map), the side rail's Chats
list for history and New chat, and the trip planner values as chips under the composer ("Charleston ·
When · 2 travelers · Budget": set values bold, unset ones as labels, each opening the Create a trip
dialog on that field). The empty state greets by name ("Where to today, Tayo?") with the suggestion
chips and the composer.

On a phone the concierge page is the chat and everything else opens over it in sheets: the greeting,
suggestion chips and the composer sit at the top of one scrolling page with the picks (as the
assistant's first message), Jump back in and Get inspired below them. Recommendation cards come as the
same row as on desktop, swiped card by card; tapping a card's photo opens the place detail as a sheet. Once the
conversation has pins, a **Map · N pinned** pill (top right) opens the map in a half-height sheet with
the pinned places listed under it (drag the handle for peek, half or full); tapping a pin or a row
stacks the place sheet on top, closing it returns to the map, closing the map returns to the same place
in the conversation. "Saved to Trips · open the board" on a proposal and "Open the board" on a
scheduling chip open the itinerary board as a full-height sheet (short map, then the days) with
**Open trip** for the full page.

1. **Start** — the empty state ("Where to today, Tayo?") shows suggestion chips built from the profile,
   the planner values and upcoming trips. Type anything travel-related, pick a chip, or arrive from the
   Discover composer (`/chat?prompt=…` sends the text once the chat is ready).
2. **Destination** — as soon as a place is clear the assistant calls `focus_map`: the map centers on
   it, a "Looks like you're headed to Rome" callout appears with a **Create trip** button, the chat is
   titled "Exploring Rome" and the **Where** chip under the composer shows Rome. The chips belong to
   the chat: every new chat starts over (Where, When, Who and Budget blank), going back to the Rome
   chat shows Rome again (after a reload too: the chat keeps its destination), and the one thing that
   carries into a new chat is what was filled in on Discover (or in the Create a trip dialog on another
   page) for the chat opened from there, once. **New chat** while an answer is still coming stops that
   answer first, so nothing of it lands in the new chat; the first chat keeps what it had and carries
   on when the traveler writes in it again. The latest message wins over all of it: "plan me a trip
   to Korea" plans Korea whatever the planner or an upcoming trip says. The assistant answers with cards, not questions: what is missing
   (dates, length, who is going) it assumes from the planner and the profile, then says so in one
   sentence under the cards ("Assuming about a week for two with flexible dates"). Every trip request
   answers with the same **Curated for you** destination cards, each a complete itinerary (below): a
   country or a large region comes back as three or four city cards at once (Seoul, Busan, Jeju), and
   a city asked for by name ("plan me a trip to Dallas", "4 days in Lisbon") as that one city's card.
   The assistant writes the days itself (`create_trip`, a proposal to confirm) only when the traveler
   asks it to write or change them, or when a card could not build an itinerary.
2a. **The package** — asked for by name ("build me a package for Rome"), the assistant shows one
   personalized package (`show_package`): the app, not the model, picks the best stay, things to do (two, three or
   four by pace) and three places to eat from its own place catalog, scored by the match model with a
   walkable-from-the-stay bonus, one category per slot, a spread of prices and the traveler's day
   rhythm. Three tabs hold the variants (**Your match**, the second interest leading such as "More
   nature & hiking", and a shift: "Quieter and closer", "A notch up" or "Easier on the budget"),
   each with its average match. Every slot shows photo, kind, match score, rating, price, a one-line
   why, and **Swap** (two ready alternates, "Not this kind" to drop the category), **Lock** (kept
   through every rebuild and variant), thumbs (**Not for me** swaps it out and records the miss),
   **Add to trip**, Save and **Show on the map**. Chips under the set narrow the whole package
   (**Easier on the budget** / **A notch up**, **Relaxed** / **Balanced** / **Packed**, **Walkable
   from the stay**) and the "Built from" facts are toggles (leave Museums out and the things to do
   re-pick). **Make itinerary** saves the package as a trip in one click: the itinerary builder
   (below) lays exactly these places over the days (the stay first on day 1, a dinner each day),
   the trip joins the chat's trip tray and the button becomes **Open itinerary**. The package's places
   are the map's pins for that message; a swap or rebuild
   replaces them. The follow-up card tools (hotels, restaurants, things to do) stay for "more
   hotels" or "swap the dinner" requests. A city the catalog has never seen is seeded first (a few
   list searches), so the first traveler there pays cents and the next ones nothing.
3. **Recommendations** — the assistant renders cards for destinations, hotels, flights, restaurants and
   things to do, each set as one **row** that scrolls sideways (snapping card by card, arrows on
   pointer devices, a swipe on phones) rather than a grid to scroll down through. A hotel, restaurant
   or attraction card runs twice as wide from tablet width up, with the photo as a column on the left
   so the details fit on a few lines (on phones the photo sits on top and the row swipes). Cards,
   rows, map pins and trip stops show a place's **short name**: Google's listing name without the chain
   and area parts ("Josun Palace", not "Josun Palace, a Luxury Collection Hotel, Seoul Gangnam"), a
   name in capitals title-cased and a bracketed translation dropped; anything still too long is cut to
   one line with an ellipsis, and the full name is its tooltip and the panel's title. A stop title the
   traveler typed is shown as written. The
   card keeps to one main action, **Add to trip**, with **Rate** in its bottom-right corner,
   **Compare** across from the category line and the **Save** heart on the photo; tapping the photo
   opens the place panel, whose **Rate**, **Save** and **Add to trip** sit in a bar at its very bottom
   and whose Overview holds the live inventory links (Check rates on Booking.com and Google Hotels for
   a stay, Reserve on OpenTable for a restaurant, Tickets & tours on GetYourGuide for an attraction,
   plus the website and Google Maps). Flight cards link to Google Flights. Hotels,
   restaurants and attractions are resolved through Google Places and pinned on the map; hovering a
   card highlights its pin and vice versa. A pick's honest downsides for this traveler ("Busy street,
   ask for a courtyard room", "Well over $250/night") fold into one amber **heads-ups** chip at the end
   of its tag row, so the card stays short; the list opens as a tooltip on hover or keyboard focus, or
   on a tap on phones (another tap, Escape or a press elsewhere closes it). A pick that conflicts with
   one of the traveler's dealbreakers says so there.
   Every destination, hotel, restaurant and attraction card then carries a **match score** ("Good match
   · 87%") computed by the app, never by the model, from the profile (budget vs price, interests, stay
   types, must-haves, cuisines, dietary tags, companions), the learned preferences (a dealbreaker named
   in the heads-ups costs 25 points), the taste profile ("Like Da Enzo, which you loved") and the pin's
   rating; clicking it opens **Why this score** with every reason and its points. Next to it, **Right
   for you?** thumbs up / down record whether the pick landed; thumbs down asks why (too pricey, wrong
   vibe, too far, already been, not my thing). The thumbs also order the row: a thumbs-down slides the
   card to the end of the row and greys it out, a thumbs-up brings it to the front, and the same thumb
   again undoes it (the move is animated; the "For you in" picks on Discover follow the same rule).
   Judgments are stored per place, lower the score of a pick the traveler already passed on, dampen
   factors that keep misleading them (calibration), and reach the assistant as "Recommendation
   feedback" so it never re-recommends a recent miss and corrects for repeated reasons.
   **Destination cards** are each a complete itinerary built for this traveler. The photo face (city
   name, region, a one-line tagline, the plan in a line such as "4-day itinerary · stay at Josun
   Palace", the plan's match badge and thumbs, "Curated for you" when the pick is tied to the profile)
   flips to **Built for you**: "Your match" with the reasons most of the plan shares, why the city
   fits, Itinerary / Stays / Activities / Dining tabs, then quick facts (suggested stay, city feel,
   known for, best season); the back scrolls inside the card. The **Itinerary** tab is the plan: where
   they'll stay, then Day 1…N, each stop with its time, photo, short name, category, a one-line why and
   its match score, lunch and dinner near that day's stops. The other tabs list this traveler's scored
   picks for the city (three rows, then Show all). Below 1280 px wide, on a desktop the back appears
   after a moment's hover and hides again on leaving, unless a click, a tab, a row or keyboard focus
   pinned it; on a phone the **Itinerary** and **Photo** controls flip it. From 1280 px up the card
   does not turn on hover: it says "Click to open your itinerary" and a click opens the plan workspace
   (below).
   The **itinerary builder** (`POST /api/itineraries`, one lookup from the daily budget, built when the
   card scrolls into view and kept for the session) works from the place catalog, seeding a city it
   has never seen. It scores every stay, thing to do and place to eat with the match model (profile,
   taste, learned preferences, feedback), picks the stay (score, day-rhythm fit, central), spreads the
   things to do over the days by area (as many a day as their pace allows, the best area first), orders
   each day as a route from the stay, gives every day a dinner and a lunch when there are enough places
   to eat (the local food gets a nudge: Korean in Seoul), never repeats a place or another branch of it,
   and sets times by the day rhythm (early days start 08:30, late ones 10:30). The days are the
   planner's dates when set, otherwise the card's suggested stay, at most a week; the card's score is
   the plan's average.
   **The plan workspace** (from 1280 px wide): clicking a card (its photo, name or Itinerary) puts its
   plan in the center of the screen and moves the chat into a column on the right, where it stays
   readable and keeps working (typing there, or the next answer's cards, leave the plan open). The
   chat column widens while the traveler is in it (a click or the focus in the conversation or its
   composer) and narrows again as soon as they work on the plan; a plan opens with it narrow, and a
   place open in it keeps it narrow. The
   workspace has a wide photo with the name, tagline and "Curated for you", the plan in a line, Your
   match, the tabs, quick facts, then **Make itinerary** and **Save**; the card in the chat gets a teal
   outline and "Open next to the chat". On the **Itinerary** tab come "Where you'll stay" and then a
   card per day ("Day 2 · Vatican Museums · St. Peter's Basilica", its number of stops, **Map**).
   A day's Map opens that day's own map on top of its stops: the stay and the day's stops numbered like
   the list, with the walk between them. One day's map is open at a time (Day 1 to begin with), so the
   plan loads one map, not one per day. Every place in the plan shows its time, photo, short name,
   category, rating, why it fits and its match score, with three things to do:
   - **Swap**: three ready alternates of the same kind that the plan does not use yet (near that stop,
     each with its photo, category, reason and score); **Use this** puts one in that slot, at the same
     time, and the place it replaced becomes the first option, so a swap can be undone. A place the
     plan already has elsewhere or one marked not a fit is never offered. Under the options, **See all
     stays** (or things to do, restaurants) opens that tab to choose from every place of its kind:
     "Choose a stay to replace Hotel Artemide · Cancel", with **Use as my stay** (or **Use this**) on
     each row, "Your stay" on the current one and "In your plan" on places the plan already has.
     Choosing returns to the Itinerary tab with the new place highlighted and a "Swapped in" tag.
     The Stays tab always offers **Use as my stay**, and so does a hotel's own panel ("Your stay in the
     Rome plan" on the current one); while a stop is being replaced, a place's panel offers **Use
     instead of {stop}**.
   - **Good pick / Miss** thumbs: a miss (Not a fit) swaps the place for its first alternate that is
     not a miss too, on the spot, without rebuilding the rest of the days.
   - **Move**: a day's stops can be put in any order. Drag one by its handle (within the day or onto
     another day's stop or list), move it a step with the arrows around its number (at a day's edge
     a step crosses into the day before or after), or send it to another day with its **Day** picker
     (it goes to the end of that day). The day is re-timed from its first start, back to back with 20
     minutes between stops, a meal never earlier than it was planned for; the numbers, the day's map
     and its title follow, and so does Make itinerary. The keyboard works too (the handle, Space,
     the arrow keys, Space).
   - **Details & reviews** (or a click on its name, or its pin on the day's map) opens the place in
     the column on the right, over the chat, so the plan stays in view beside it: photos, rating, its
     match score with **Good fit / Not a fit**, the overview with the traveler reviews line, the
     Reviews and Location tabs, Save and Add to trip. The stop and its pin are marked in the plan, and
     picking another stop or pin switches the place. **Back to chat** returns to the conversation
     (so does asking one of the panel's follow-up questions, to show the answer); a place marked Not a
     fit here leaves the plan and its panel closes with its replacement in the plan.
   The plan line ("stay at …"), the day titles, the score, the card in the chat and Make itinerary all
   follow the swaps and moves. The Stays, Activities and Dining tabs list the traveler's scored picks for the city;
   a row opens its place the same way. Escape goes back from a place (from the plan or the place's
   panel), then closes the plan (not while typing in the chat); so does the close button, which gives
   the chat its full width back. Below
   1280 px there is no workspace: the Itinerary control turns the card over in place, and every row of
   the plan there has its own Swap button (the same options and See all).
   **Traveler reviews.** Every real place's panel (beside the plan, over the map or in a phone sheet)
   carries what travelers on XPMatch say about it. The overview has one line: "3 traveler reviews · 2
   verified", "Loved by 2 verified travelers like you" and **Read reviews**, or "No traveler reviews
   yet." with **Leave the first review**. The **Reviews** tab has "From travelers on XPMatch" first,
   then the reviews "From Google":
   - **Proof.** "I'm here: check in" takes one location reading, compares it with the place on the
     server and drops it; only when and how far off it was are kept. It has to be within 150 m of a
     hotel, 120 m of a restaurant, 250 m of an attraction or 600 m of a park, market or square, plus the
     reading's own uncertainty up to 100 m; a reading rougher than 200 m, a place too far ("You're about
     1.2 km from Hotel Artemide. Check in when you're there."), or a check-in that would mean flying
     faster than a plane since the last one is refused; 20 a day at most. A booking of theirs for that
     place (imported from a confirmation) whose date has come counts as proof too. Proof shows as a
     **Checked in** or **Booked** badge on their review.
   - **Writing.** How was it (Loved it / It was fine / Not for me), a few words (up to 1,200
     characters) and "Share with other travelers (as your first name and last initial)", on by
     default; **Post review**, later **Update review**. The verdict is also their reaction to the place,
     so the taste profile and the match scores learn from it. **Delete** takes the words down and keeps
     the reaction; an unshared review reads "Only you can see this" and nobody else gets it.
   - **Reading.** Their own review first ("You"), then verified reviews, then those by travelers who
     **travel like them** (at least one interest, cuisine, kind of stay or travel style in common, and
     enough overall with budget, company and pace), newest first. Reviewers show as "Tayo A.".
   Selecting a card makes it the active city: once it is closed, the map header reads
   "Explore {city}" with its recommended places behind one **All / Stays / Dining / Experiences**
   filter that the card's tabs mirror (a card opens on the tab the filter shows); a row shows that
   exact place on the map and opens its panel (with its own Save and Add to trip); "All places" returns
   to the whole conversation. Every card ends in the same two actions: **Make itinerary** (filled) and
   **Save** (outlined). Make itinerary saves the plan as a trip, "{n} days in {city}", in one click (no
   picker, no extra lookups): the stay first on day 1, every stop with its place, time and note, the
   planner's dates and travelers when set; the trip becomes the conversation's trip and the button
   turns into **Open itinerary**. A city the catalog cannot fill yet says "Not enough places here yet to
   plan the days", and Make itinerary asks the concierge for the days instead. Hotel, restaurant and
   attraction cards keep **Add to trip** for a single place: a traveler with no trip yet gets "Trip to
   {city}" created and the item added in one step. The trip a conversation adds to is remembered and
   shown as a small tray on the map (title, nights or "Dates flexible", travelers, View trip).
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
14. **History** — click a conversation under **Chats** in the side rail to reopen it
    (`/chat?thread=…`), including its cards and map pins, which are rebuilt from the stored transcript;
    transcripts live in Postgres, so chats survive deploys and restarts. Chats started from a trip show
    the trip name and keep the trip in context when reopened. Jump back in on Discover lists the three
    most recent chats too. Links from before the redesign (`/?thread=…`, `/chats`) redirect.

## 3. Planner fields and "Create a trip"

The Discover hero's *Where / When / Guests / Budget* fields and the chips under the concierge
composer edit the same planner values (kept in the browser). **Create a trip** (the header pill, the hero button, the
Trips page) opens the planner dialog prefilled from them. **Start planning** keeps the values and sends
a planning prompt to the chat; **Create trip** creates the trip on the server right away and opens its
page.

## 4. Trips

**List** — `/trips`: "Your trips" with **Trips | Calendar** tabs and an All / Upcoming / Past filter.
Cards show the destination photo, title, destination and dates, and a member count when shared. The
calendar tab highlights trip date ranges by month.

**Create** — planner dialog → Create trip; the chat's proposal card → Save to my trips; the Create page's
Trip tab; or **Add to trip → New trip** from any place.

**Trip page** — `/trips/[id]`. On a wide screen it is one workspace with three fixed places for
things, so nothing competes for attention:
- **Header** (one band across the top): "Your trips", the title, **Edit details** (title,
  destination, dates, travelers, budget), a menu with **Delete trip** (owner) or **Leave trip**
  (member), then chips for destination, dates, travelers, budget (each opens the matching tile
  section on the right) and members, with the summary on one line.
- **Board on the left** — the itinerary is the main column and is always in view (the post-trip
  "How was Rome?" banner sits above it when the trip has ended).
- **Tiles on the right** — Ideas, Itinerary, Bookings, Media, Trip preferences, Calendar and Members,
  opening in place. A **Tiles | Map · N pinned** switch at the top of the column brings the **map over
  the tiles** and back. Clicking a stop on the board (anywhere on its card) or "Show on the map" on
  an idea brings the map over with that pin marked and panned into view, without opening its sheet;
  tapping the pin on the map opens the sheet. Opening a tile section brings the tiles back.
  `?view=board` from a chat link opens with the map showing.
- **The assistant in one box along the bottom** — the four starters (Find hotels / Top things to do /
  Build the itinerary / Neighborhood guide), the **Ask about this trip** input and the trip's recent
  chats as links. Asking opens a new chat attached to the trip. In that chat the assistant sees the
  trip (dates, members, ideas, itinerary, preferences), the map opens on the destination with the trip's
  ideas pinned, and three extra tools are available: `update_trip_plan` (dates, travelers, budget,
  summary, the whole itinerary as structured stops, preferences), `add_trip_ideas` (adds places to the
  Ideas list) and `schedule_stops` ("put the Colosseum on day 2": places are resolved and pinned; the chip
  links to the board).
- On a phone the page is three tabs, **Overview | Board | Tiles** (the overview holds the title, chips,
  the proactive card, the ask box and the chats), and opens on the board when the trip has stops (or
  `?view=board`); the map is a short header above the board with **Hide map / Show map**, and stops
  have no drag handle: **up / down** buttons reorder them within the day and **Move to…** sends them to
  another day, back to ideas or away.
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

`/updates` is the notification feed (unread count on the header bell and the More tab; opening the page marks all as
read): you were added to a trip, a member added an idea/booking/media or edited the plan, someone saved
your guide. Each item links to the trip or guide. Trips that ended recently show a "How was Rome?" card
on top with **Rate places** (opens the post-trip rating on the trip page) and **Not now**.

## 10a. Bug reports and Admin

**Report a bug** in the account menu (the More sheet on phones) opens the report: what kind of thing
it is (something's broken / looks wrong / idea or request), what
happened, what was expected, and an optional screenshot that the browser downscales to 1280 px JPEG before
sending. The page, the current chat id, the browser and the deployed build are attached automatically.
Reports land in `bug_reports`; every admin gets an Update ("Bug report from @tayo: …"). Accounts listed in
`ADMIN_EMAILS` see **Admin** in the account menu: `/admin` opens with the **Beta numbers** (users in total and
in the last 7 days, sign-ups by UTC day over two weeks, last sign-up, trips, chats, saved places, guides,
open bugs; `GET /api/admin/stats`), then a **Members** roster (`GET /api/admin/users`): every account
newest first with name, handle, email, sign-up date, quiz status (completed / skipped / not started — from
`profiles.onboarded` and whether the saved preferences hold real answers), home city, trip / chat / saved
counts, last activity and an **Access** column with **Reset link** (`POST /api/admin/users/[id]/reset`:
a single-use, 30-minute password reset link the admin sends to the traveler by hand, with Copy and New
link). The **Place catalog** section follows: how many places and destinations are stored, how many
lookups resolve without Google (remembered queries and how often they were served), the package
numbers (shown, travelers, swaps, locks, thumbs, trips, keep rate, trip rate, variant picks) and a
**Seed city** form (`POST /api/admin/seed`: 19 list searches for a destination, about twenty places
each, reported as stays / restaurants / things to do). It then lists reports newest first (open /
resolved / all, mark resolved / reopen, show screenshot) and ends with the **Recommendation quality**
summary: hit rate of thumbs across every traveler, by kind and by context (chat, home, explore,
board), why picks miss, and the recent misses with the score that was shown. The same counts are printed once at boot (`[xpmatch] db ready (pg):
users=… trips=… chats=…`), so the Railway deploy log shows them without a database connection.

## 11. Routes

| Route | Screen |
| --- | --- |
| `/login`, `/signup`, `/forgot`, `/reset` (`?token=`) | Account, the "Forgot password?" form, and the page a reset link opens |
| `/admin` | Bug reports and recommendation quality (admins) |
| `/` | Discover: hero with the composer and planner fields, collections, picks, Jump back in, community guides |
| `/chat` (`?thread=`, `?trip=`, `?prompt=`) | The concierge: chat and map, history in the side rail; `/?thread=`, `/?prompt=` and `/chats` redirect here |
| `/trips`, `/trips/[id]` (`?view=board`, `?rate=1`) | Trips list and trip page (board view, post-trip rating) |
| `/explore` | Things near you |
| `/create` (`?guide=`) | Guide editor / trip form |
| `/inspiration` (`?collection=`), `/guides/[id]` | Community guides and the curated rows (narrowed to a Discover collection) |
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
values, the compare selection, constraint chips of the current session, the board's travel mode and
which post-trip prompts were dismissed stay in the browser. Routes API legs are cached in the server
process for a day per mode and coordinates, not per user.

## 13. Your taste (Update my assistant)

The assistant settings dialog ends with **Your taste**: per domain (Stays, Food, Things to do,
Destinations) the number of ratings, liked and disliked reasons with counts, the ranked places with their
scores and the usual price level, then every reaction with a delete button. The assistant receives the same
summary plus the ten latest reactions on every message and is told to lean toward what you loved, avoid
what you disliked and never re-recommend a place marked not for you unless asked.
