# XPMatch user flows

Every flow a signed-in traveler can take, screen by screen, with what the app does behind the scenes.
Routes are listed at the end.

## 1. Account

**Sign up** — `/signup`: name, email, password (8+ characters). The server hashes the password (bcrypt),
creates the user, a profile row and a session, sets the `xp_session` HttpOnly cookie and lands on the chat.
A handle (`@tayo-akigbogun`) is derived from the name and shown in the sidebar footer.

**Onboarding** — on the first visit the "Personalize your assistant" dialog opens: name, home city, home
airport, travel styles, pace, budget tier, companions, dietary needs, accommodation preference, notes, and
**"What ruins a trip for you?"** chips (street noise, no workspace, stairs, crowds, early starts, long
transfers, spicy food…) that become dealbreakers. "Save preferences" stores the profile and the
dealbreakers on the server; "Skip for now" marks onboarding done. Everything here is sent to the assistant
as context on every message and can be changed later from the sidebar ("Update my assistant") or by simply
telling the assistant ("I'm vegetarian" → `update_traveler_profile`).

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
   review count, category, price, description, hours, Google reviews, location, Save, Add to trip, and
   a follow-up button ("Restaurants nearby"). A **destination's** sheet has **Stays**, **Restaurants**
   and **Things to do** tabs that fill in beside the map: the assistant's own picks from this chat
   ("Picked for you") first, then places near the destination queried with the traveler's preferences
   (accommodation style, dietary needs, budget tier, first travel style — shown as chips). Each row has a
   photo, rating, category and price, Save and Add to trip; tapping it pins the place and opens its
   sheet. "Ask XPMatch for personalized picks" sends the matching prompt to the chat.
8. **Map tools** — hide the map (the discovery feed returns with a "Show map" button), search-and-pin
   any place near the destination, satellite toggle, weather chip.
9. **Trip proposal** — when the traveler asks for a plan the assistant calls `create_trip` and a
   proposal card appears (title, dates, travelers, budget, summary, day-by-day itinerary). **Save to my
   trips** stores it on the server; **Not yet** tells the assistant to adjust.
10. **Follow-ups** — after each answer the assistant proposes 2–3 next steps as chips. While a proposal or
    "Remember this?" card is waiting for a click the chips pause (a suggestions run would otherwise send the
    model an unanswered tool call).
11. **History** — expand **Chats** in the sidebar and click a conversation to reopen it (`/?thread=…`),
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
  ideas pinned, and two extra tools are available: `update_trip_plan` (dates, travelers, budget,
  summary, itinerary, preferences) and `add_trip_ideas` (adds places to the Ideas list).
- **Chats** — every conversation attached to this trip, newest first.
- Tiles (right column): **Ideas** (places added from chat, map, Explore or by searching here; each with
  note, Save, Show on map, remove), **Itinerary** (day-by-day; "Build it with the assistant" or write it
  yourself; edit/reorder days), **Bookings** and **Media** (title, link, note; image links preview),
  **Trip preferences** (free text the assistant reads for this trip, plus **Learned for this trip**: the
  "For this trip" answers from its chats, each removable), **Calendar** (dates, travelers, budget plus a
  month view), **Members** (add by email, role Can edit / Can view; remove; leave).
- **Map** — destination pin plus every idea/booking/media item with a place; click a pin for its sheet.

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
- **Cards** — photo, name, rating and review count, category, locality, price tier; **Save**, **Add to
  trip**; hovering highlights the pin, clicking the photo opens the place sheet on the map.
- **Map** — labeled markers for every card, synced with the list.

## 7. Create (guides and trips)

`/create` has **Guide | Trip** tabs.

**Guide editor** — title, destination (resolved for the cover photo and map center), description, tags
(presets + custom), then places: search a place ("Colosseum", kind Thing to do / Restaurant / Stay) and
it is resolved through Google Places with photo, rating and coordinates; add a note per place; reorder
with the arrows; remove. **Save draft** keeps it private; **Publish to the community** requires at least
one place and lists it under Inspiration. Authors reopen a guide with **Edit** on its page
(`/create?guide=…`).

**Trip tab** — the same planner form as the dialog: Create trip or Start planning.

## 8. Inspiration and guide pages

`/inspiration` lists published community guides (cover, title, destination, author, places, saves) with
search by destination or title and a **Create a guide** button; curated XPMatch collections sit below.

`/guides/[id]` — cover, author, description, tags, the ordered places (photo, rating, category, note;
Save place, Add to trip, Show on map) and a labeled map. **Save guide** keeps it under Saved › Guides
and notifies the author; **Plan a trip from this guide** starts a chat that turns the places into a
trip. Authors see **Edit** and **Delete** instead of Save.

## 9. Saved

`/saved` has **Places | Guides** tabs. Places are grouped by type (Destinations, Stays, Flights,
Restaurants, Things to do) with photo, Add to trip, Open and remove; "Turn saved places into a trip"
sends them to the assistant. Guides show as cards linking to the guide, with remove.

## 10. Updates

`/updates` is the notification feed (unread count badge in the sidebar; opening the page marks all as
read): you were added to a trip, a member added an idea/booking/media or edited the plan, someone saved
your guide. Each item links to the trip or guide.

## 11. Routes

| Route | Screen |
| --- | --- |
| `/login`, `/signup` | Account |
| `/` (`?thread=`, `?trip=`, `?prompt=`) | Chat and map; history expands under Chats in the sidebar; `/chats` redirects here |
| `/trips`, `/trips/[id]` | Trips list and trip page |
| `/explore` | Things near you |
| `/create` (`?guide=`) | Guide editor / trip form |
| `/inspiration`, `/guides/[id]` | Community guides |
| `/saved`, `/updates` | Saved items, notifications |

## 12. What is stored per user

Profile, dealbreakers and learned preferences (profile-wide or per trip), trips (with members, items,
itinerary, preferences), saved places and guides, guides they authored, the chat list (titles, trip links),
chat transcripts (every message, tool call and card, written by the runtime after each run and restored
when a chat is reopened) and notifications — all in Postgres. Live runs stream from the runtime's memory;
the planner bar values, the compare selection, constraint chips of the current session and small UI
preferences (e.g. whether Chats is expanded in the sidebar) stay in the browser.
