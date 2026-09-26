# Mobile plan: Plan A (responsive rescue) folded into Plan B (chat-first phone app)

Status: Plan A and Plan B shipped (verified by `tests/e2e/mobile.spec.ts` at 390 × 844 with touch,
deployed from `main`). Plan C (installable app) is the next candidate.

## Why

Production traffic is mostly iPhone Safari, and the only outside sign-up so far arrived on an
iPhone, created an account, saw the onboarding wizard and left. A capture of the app at an
iPhone 14 viewport (390 × 844, touch) across 13 screens against the deterministic test stack
found:

| Finding | Evidence |
| --- | --- |
| No navigation below 768 px | The sidebar is `hidden md:flex` and nothing replaces it; visible links to Trips, Explore, Saved, Updates, Inspiration or Create on portrait screens: none. |
| Empty home | The right panel (`hidden xl:block`) never renders on phones: no Jump back in, no home picks, no map. |
| Proposal overflow | The trip proposal pushed the layout viewport to 513 px on a 390 px phone; match badges clipped. |
| Buried itinerary | Board, map and tiles render under the header, chips, summary, prompt card, composer and chat list inside an inner scroll region. |
| Heavy quiz | Six steps, each scrolling inside the dialog; step two alone shows about 30 chips. The Where/When/Who/Budget pills are hidden below 640 px. |
| Minor | Landscape phones get the desktop sidebar with the lower items clipped; icon tap targets under 40 px; no safe-area padding; not installable. |

What already works: no horizontal overflow on 12 of 13 screens, legible type everywhere, the
trip page, explore and guides already collapse their side column below 1280 px, and the wizard
scrolls inside the dialog with a pinned Next button.

## Plan A: responsive rescue (first)

Keep the architecture; make every screen usable on a phone.

1. **Bottom tab bar** (`src/components/shell/MobileTabBar.tsx`, rendered under `main` in
   `AppShell`, `md:hidden`): Chat, Trips, Explore, Saved, More. The More sheet holds Updates
   (with the unread badge), Inspiration, Create, Admin (admins only), Update my assistant, Report
   a bug and Log out. `viewport` export with `viewportFit: "cover"` and safe-area padding on the
   bar. Every page becomes reachable on a phone.
2. **Mobile home feed and cards that fit.** Below 1280 px the welcome screen becomes a scrollable
   page: compact hero, the composer, then the discovery feed (Jump back in, the nine home picks
   with match scores, Get inspired) extracted from `DiscoveryPanel` into a shared `DiscoveryFeed`.
   When a chat has pins, a "Map · N pinned" pill opens the map panel over the chat, full screen,
   with a close button (the first piece of Plan B's layering). Fix the trip proposal card and the
   comparison table so nothing forces the viewport wider than the phone.
3. **Trip page tabs on phones.** Below 1280 px a sticky segmented control (Overview, Board,
   Tiles) replaces the stacked layout. Board opens first when the trip has stops or the link
   says `?view=board`; the map is a collapsible 220 px header on the board; the title drops to
   26 px.
4. **Shorter phone quiz.** Below 640 px the wizard runs as three screens (about you + style,
   stays + food, logistics + dealbreakers) with a three-segment progress bar. `ChipGroup` folds
   long lists behind "Show all" on phones, chips and icon buttons grow to 40 px on coarse
   pointers. The admin page gains "What people answered": distributions of interests, budgets,
   stay types and cuisines across every profile.
5. **Mobile end-to-end spec** (`tests/e2e/mobile.spec.ts`, 390 × 844, touch): the tab bar
   reaches every page, the home feed shows picks, the proposal has no horizontal overflow, the
   trip page tabs work, the three-screen quiz completes. Then the full suite, the production
   build, deploy.

## Plan B: chat-first phone app (shipped)

The phone experience is layered instead of split: the chat is the base layer and everything
else opens over it.

1. **Sheets.** `src/components/ui/BottomSheet.tsx`: peek, half and full heights, a drag handle
   that snaps (a drag starts after a few pixels so taps stay clicks), a backdrop, Escape and a
   close button; stacked sheets sit one layer higher. `MobileMapSheet` puts the map in it with
   the pinned list; a pin, a row or "View on map" / a card photo opens `PlaceDetailSheet`
   (compact layout) stacked on top. `TripBoardSheet` opens the board full height from
   "Saved to Trips" and "Open the board" (the trip id lives in `UiState`), with "Open trip" for
   the page; closing returns to the same place in the conversation.
2. **Cards as carousels.** `CardGrid` is a snapping horizontal row below 640 px (next card
   peeking in) and the two-column grid above; `CardPhoto` takes `onOpen` so a tap on the photo
   opens the place (buttons over the photo keep their clicks).
3. **Picks as the first message.** `DiscoveryFeed picksFirst` frames the nine home picks as the
   assistant's opening bubble on the phone home, with the proactive card out of the way.
4. **Conversational quiz.** `PhoneQuiz` asks three questions as chat bubbles (home city + dream
   destination, interests with a Show all fold, budget cards) and saves the profile; `AppShell`
   no longer opens the wizard on phones. Everything else is learned in conversation or under
   Update my assistant.
5. **Day-list board.** Below 640 px `StopCard` drops the drag handle (sorting disabled) and
   shows up / down buttons next to the Move to… menu; `TripBoard.onReorderStop` moves a stop
   one place within its day.
6. Desktop keeps the split layout; the two layouts share components and state.

## Out of scope for now

Installable PWA, offline trips, push notifications, camera-first import and share-sheet
integration (Plan C).

`docs/REACT_NATIVE_PLAN.md` plans the native route instead: an Expo (React Native) app beside the
website, with push, links into the app and native maps.
