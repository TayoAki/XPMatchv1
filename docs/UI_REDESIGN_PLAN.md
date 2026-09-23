# UI redesign plan: Serene Resort Modernism for XPMatch

Written September 21, 2026. Reference: `docs/design/discover-reference.webp` (the desktop mockup
supplied in chat, about 1586 × 992) and the "Serene Resort Frontend Implementation Guide" supplied
with it. The guide is a generic React handoff written without knowledge of this codebase; this plan
maps it onto what XPMatch already has (Next.js 16 App Router, Tailwind 4, CopilotKit v2, the
`--xp-*` token layer, the Modal and BottomSheet primitives, the planner state, the Playwright suite)
and says exactly what changes, in what order, and what we deliberately do differently.

---

## 1. What the mockup shows, and what it means for XPMatch

Observed on the reference: a compact white header (wordmark left, Discover · My trips · Saved
centered, avatar with first name and chevron, a teal "Create a trip" pill); a two-column hero on a
warm stone surface (eyebrow "TRAVEL, AT YOUR PACE", a 60 px two-line headline, a serif subtitle, a
prompt composer with a sparkle mark and a circular teal send button, four planning controls Where /
When / Guests / Budget, a teal "Create a trip →" pill and an underlined "or chat with your AI
concierge" link) beside a Mediterranean terrace photograph with a small serif motto and a
"PAROS, GREECE" caption; a section "Find your kind of extraordinary" with "View all destinations →"
and three photographic cards (By the water, Close to nature, Immersed in culture) each with a heart;
a floating teal "✦ Your AI concierge ⌃" pill in the lower right.

What it means for us:

1. **The home page becomes a Discover page, not a chat.** Today `/` is the conversation itself
   (`HomeClient` → `TravelChat` with `WelcomeHero` as the empty state and the discovery feed in the
   right panel). The mockup puts the conversation behind a prompt and a launcher. The conversation
   moves to its own route, `/chat`, and keeps everything it has (cards, map panel, packages, board
   sheet, trip scope).
2. **The left sidebar goes; a top header comes.** Navigation shrinks to three destinations plus the
   profile menu, the Updates bell and the Create a trip pill. Chat history, Inspiration, Explore,
   Create, Admin and the bug report move into the concierge page and the profile menu (section 3).
3. **The four planning controls already exist as state.** `TripPlanner` in the store (where,
   startDate, endDate, travelers, budgetTier) drives the TopBar segments and the Create a trip
   dialog today; the hero controls edit the same object. Budget stays a tier (Budget / Mid-range /
   Premium / Luxury), which is what the match model consumes, not a currency amount as in the guide.
4. **Our differentiators stay above the fold on Discover.** The mockup only shows three themed cards.
   XPMatch's personalized sections (the matched package or picks "For you in <destination>", Jump
   back in, community guides) follow the cards on the same page, restyled. That is what the
   competitor research says nobody else has, so it is not demoted.
5. **The concierge is a full page first, a slide-over second.** Our chat renders cards, packages,
   comparisons and a map; a 420 px dialog would cripple it. Sending the hero prompt navigates to
   `/chat`. The floating launcher opens the same conversation; on desktop it can later become a
   slide-over panel that shares the thread (phase 4, optional).

---

## 2. Decisions taken in this plan (override any before phase 2 starts)

| Decision | Default in this plan | Why |
| --- | --- | --- |
| Home route | `/` = Discover; `/chat` = the conversation; `/?thread=` and `/?prompt=` links redirect to `/chat` | The mockup's home is Discover; old links keep working |
| Desktop navigation | Top header replaces the sidebar on every page | One shell, as in the mockup |
| Chat history | "Recent" menu on the `/chat` page header (already built in `TopBar`) plus the Jump back in row on Discover | No sidebar to hold the list |
| Guests | The existing travelers count, editable in a stepper | Children and ages are not in the trip model; add later if suppliers need them |
| Budget | Tier chips | Matches `budgetTier` and the match model |
| Where | Free text with destination suggestions from the existing resolve endpoint | Same as the planner dialog, plus suggestions |
| Card hearts | Save the collection as a saved item of a new kind `collection` | The guide's model; shows under Saved |
| Hero prompt send | Navigates to `/chat?prompt=` with the planner state already in the store | Reuses `useSendMessage` |
| Create a trip (hero and header) | Opens the existing Create a trip dialog prefilled from the planner; creates the trip and opens its page, or "Start planning" sends the plan prompt to `/chat` | Same flow, two entry points, as the guide requires |
| Concierge launcher | Fixed pill on Discover and content pages; hidden on `/chat`; navigates to `/chat` | Full-width conversation |
| Phones | Also land on Discover; the first run shows the three-question quiz card in the hero slot until onboarded; the tab bar becomes Discover · Trips · Saved · Concierge · More | Consistency with desktop; keeps the phone first run |
| Photography | Google Places photos through the existing `/api/places/photo` proxy, keyed to real destinations (the hero follows the traveler's next destination; each collection card shows a representative destination), with the photo's author attribution rendered; Wikipedia thumbnails stay the fallback; no stock files, no generated images | The app already buys and caches Places photos for every card; the mockup's images are generated and cannot ship |
| Logo | The existing brand mark: the sparkle icon and the "xpmatch." wordmark, recolored to the brand ink | No other logo asset exists in the repo |
| Fonts | Inter and Source Serif 4 through `next/font/google`; vendored files if the build sandbox blocks the download | Inter is named in the CSS today but never loaded |
| Dialogs | Our Modal and BottomSheet primitives, not native `<dialog>` | Already accessible and tested |

---

## 3. Information architecture: today → new

| Today | New | Where it lives |
| --- | --- | --- |
| Sidebar: Chats (with history), Trips, Explore, Saved, Updates, Inspiration, Create, Admin, New chat, promo card, account block, footer links | Header: Discover, My trips, Saved; bell (Updates with unread count); profile menu; Create a trip | `SiteHeader` |
| TopBar: chat title menu, planner segments, Create a trip | Discover hero: planner controls; `/chat` header strip: chat title menu with Recent, compact planner chips, New chat | `DiscoverPage`, `ChatPage` |
| `/` chat | `/chat` (same `HomeClient` content under the header) | route move |
| Inspiration, Explore, Create (guide) | Profile menu items; "View all destinations" → `/explore`; collection cards → `/inspiration?collection=…`; "Create a guide" stays on `/inspiration` and `/create` | links |
| Admin, Report a bug, Update my assistant, Terms, Privacy, Log out | Profile menu | `SiteHeader` |
| Mobile tab bar: Chat, Trips, Explore, Saved, More | Discover, Trips, Saved, Concierge, More (Explore, Inspiration, Updates, Create, Admin, Update my assistant, Report a bug, Log out) | `MobileTabBar` |
| WelcomeHero + DiscoveryFeed | DiscoverPage sections (section 5) | new components |

Redirects: `/?thread=x` → `/chat?thread=x`; `/?prompt=…&trip=…` → `/chat?prompt=…&trip=…`;
`/chats` already redirects and now points at `/chat`. `useSendMessage` pushes `/chat?prompt=` when
away from `/chat`. `ChatNavList`, `TopBar`'s Recent menu, `DiscoveryFeed`'s chat cards and
`TripChatScope` links change from `/?thread=` to `/chat?thread=`.

---

## 4. Design system changes (app-wide, phase 1)

### 4.1 Tokens

`src/app/globals.css` keeps the `--xp-*` prefix (it exists to avoid CopilotKit's `--background`
and `--border`). New and changed values:

| Token | Value | Tailwind name | Used for |
| --- | --- | --- | --- |
| `--xp-bg` | `#FFFFFF` | `background` | header, discovery, content |
| `--xp-surface-warm` (new) | `#F7F6F3` | `surface-warm` | hero panel, quiet sections |
| `--xp-fg` | `#081316` (was `#111111`) | `foreground` | headings, primary text |
| `--xp-muted` | `#496261` (was `#6B7280`) | `muted` | supporting copy, eyebrow |
| `--xp-secondary` (new) | `#626966` | `secondary` | field values, captions |
| `--xp-brand` (new) | `#073E45` | `brand` | buttons, links, selected states, pins |
| `--xp-brand-hover` (new) | `#052F35` | `brand-hover` | hover and pressed |
| `--xp-border` | `#DEDFDA` (was `#E5E7EB`) | `border` | controls, separators |
| `--xp-focus` (new) | `#126773` | `focus` | keyboard focus rings |
| `--xp-error` (new) | `#9F2E29` | `error` | inline validation |
| `--xp-surface`, `--xp-surface-2` | `#F3F4F6`, `#E9EAEC` → warmed to `#F1F1EE`, `#E6E6E1` | `surface`, `surface-2` | chips, hover fills |
| `--xp-radius-sm/lg/pill` (new) | 10 px, 18 px, 999 px | via utilities | cards and fields, composer, pills |
| `--xp-shadow-composer`, `--xp-shadow-floating` (new) | `0 1px 4px rgb(8 19 22 / 5%)`, `0 3px 12px rgb(8 19 22 / 18%)` | utilities | composer, launcher |

Also: `--cpk-*` overrides so the CopilotKit composer's send button, links and focus use the brand
teal; map markers in `globals.css` (`.xp-marker-pin` selected and focus states from `#111111` to the
brand teal, the default pin from `#7fd8c8` to a lighter teal `#9ED6CF`).

### 4.2 Fonts and type

`src/app/layout.tsx` loads Inter (400, 500, 600) and Source Serif 4 (400, italic 400) with
`next/font/google` and exposes `--font-app` and `--font-serif`; `globals.css` maps `--font-serif`
into Tailwind as `font-serif`. If the build environment blocks Google Fonts, vendor the two variable
woff2 files under `src/fonts/` and switch to `next/font/local`; the first production build decides.

Type scale from the guide, in rem at a 16 px root:

| Element | Size | Weight and leading | Face |
| --- | --- | --- | --- |
| Navigation | 0.875 | 500 / 1.4 | sans |
| Eyebrow | 0.75 | 600 / 1.5, uppercase, tracking .3em | sans |
| Hero heading | clamp(2.5rem, 3.8vw, 3.875rem) | 600 / 1.04, tracking −.045em | sans |
| Hero supporting copy | clamp(1.125rem, 1.5vw, 1.5rem) | 400 / 1.4 | serif, muted |
| Prompt text | 1.0625 | 400 / 1.5 | serif |
| Field label / value | 0.8125 / 0.75 | 500 / 400 | sans, value in secondary |
| Buttons | 0.9375 | 500 | sans |
| Section heading | 2.125 | 600 / 1.15, tracking −.035em | sans |
| Card title / description | 1.75 / 1 | 400 | serif, white over gradient |

### 4.3 Component restyle (no layout change yet)

- `Button`: primary → `bg-brand text-white hover:bg-brand-hover`; focus ring uses `focus`; pill
  radius stays. Outline and secondary pick up the new border and surface tokens.
- `Chip`, `TextInput`, `TextArea`, `Field`: border and focus tokens, radius 10 px.
- 49 occurrences of `bg-neutral-900`, 9 of `bg-foreground` and the 6 blue avatar circles
  (`bg-blue-600`) across 37 files move to `bg-brand` or the avatar token. Done with one sweep and a
  visual pass over: TopBar, DiscoveryPanel (Show map), HomePicks, PackageCard, MatchBadge, cards
  under `src/components/chat/cards`, the map PinStrip and PlaceDetailSheet, trip board, guides,
  explore, saved, updates, admin.
- `PageFrame`: title 1.75rem, description in muted serif, page gutter 36 px on desktop.
- The `xp-skeleton` and hover fills use the warmed surfaces.

Phase 1 ships alone: every page looks calmer and teal, nothing moves, every existing test passes.

---

## 5. New and changed components

### 5.1 `SiteHeader` (replaces `Sidebar` and `TopBar` on desktop)

64 px, three-track grid (`1fr auto 1fr`), 36 px side padding, static in document flow inside the
existing fixed-height shell (the page body scrolls, not the window; the header sits above the
scrolling `main`).

- Brand: the existing sparkle plus "xpmatch." wordmark (the logo we have), accessible name
  "XPMatch home", ink-colored on white.
- Nav: Discover (`/`), My trips (`/trips`), Saved (`/saved`); `aria-current="page"` and a 1 px brand
  underline on the active link; `/guides` counts as Discover.
- Right group: Updates bell with the unread count badge; profile button (avatar circle with the
  initial, first name, chevron) opening a menu with Update my assistant, Inspiration, Explore near
  you, Create a guide, Admin (admins only), Report a bug, Terms, Privacy, Log out; "Create a trip"
  teal pill (44 px, plus icon) that opens the Create a trip dialog.
- Below 1100 px: brand, a compact Create a trip pill, and a menu button that opens a sheet with the
  three destinations and the profile items; on phones the tab bar carries navigation and the header
  keeps only the brand and the pill.

### 5.2 `DiscoverPage` (`/`)

Sections in order, all inside one scroll container:

1. **Hero**: grid `minmax(0,.473fr) minmax(0,.527fr)` above 1100 px; left panel on `surface-warm`
   with eyebrow, headline "Go somewhere that stays with you." (desktop line break only), serif
   subtitle "Thoughtful journeys, shaped around you.", `PromptComposer`, `PlannerFields`, the CTA
   row; right panel `HeroImage` with the motto layer and the caption.
2. **Find your kind of extraordinary**: heading, "View all destinations →" to `/explore`, three
   `CollectionCard`s.
3. **For you in <destination>**: the existing `HomePicks` (three things to do, three stays, three
   places to eat with match badges), restyled to the card language; when the package opener is
   available for the destination in focus, the package card renders here instead.
4. **Jump back in**: the existing row (trips, chats, saved destinations), restyled.
5. **From the community**: the newest published guides (three), linking to `/inspiration`.

The proactive card's suggestion chips move under the composer as three quiet chips ("Find hotels",
"Top things to do", "Neighborhood guide" when a destination is in focus; "Weekend ideas", "Plan a
trip", "Find cheap flights" otherwise). The illustration and "Where to today" copy are retired.

Phones: the same sections stacked; the hero photo follows the copy at 4:3; fields in two columns;
the CTA row stacks. A not-yet-onboarded phone user sees the `PhoneQuiz` card in place of the hero
copy until the three questions are answered (the desktop first run keeps opening the assistant
dialog as today).

### 5.3 `PromptComposer`

A form with a visually hidden label "Describe your ideal escape", a sparkle mark
(`aria-hidden`), a serif textarea (rows 2, max height 160 px, Ctrl or Cmd+Enter sends, Enter is a
newline) and a circular teal submit button "Send to your AI concierge" disabled while empty. Submit
calls `useSendMessage` with the text; because the page is not `/chat`, the hook pushes
`/chat?prompt=…` and the conversation sends it once. Failure keeps the text.

### 5.4 `PlannerFields` and editors

Four `PlannerField` buttons (icon, label, value, chevron; `aria-haspopup="dialog"`,
`aria-expanded`, `aria-controls`), 64 px tall, in a four-column grid (two columns between 1100 and
1279 px and on phones, one column under 380 px). Values derive from the store:

| Field | Value when empty | Editor | Commit |
| --- | --- | --- | --- |
| Where | Any destination | Text input with suggestions from `/api/places/resolve` (kind destination) and an "I'm open to anywhere" clear | `updatePlanner({ where })` |
| When | Any dates | Two labeled date inputs (From, To) with "Flexible dates" clear; end must follow start | `updatePlanner({ startDate, endDate })` |
| Guests | 2 guests | Stepper 1–16 travelers | `updatePlanner({ travelers })` |
| Budget | Any budget | Four tier chips with "No preference" | `updatePlanner({ budgetTier })` |

Editors are a small `Popover` on desktop (anchored to the field, flips left when near the right
edge) and a `BottomSheet` on phones; both have a title, Cancel, Apply, initial focus, Escape and
focus return; edits stay local until Apply. Only one editor opens at a time. The Create a trip
dialog keeps its own copy of the same fields for the structured flow.

### 5.5 CTA row

"Create a trip →" (`Button` primary, 52 px) opens the Create a trip dialog prefilled from the
planner; with a destination set and no dates, it still opens the dialog so the person can confirm
before a trip is created. "or chat with your AI concierge" (text action) sends `buildPlanPrompt`
when a destination is set, otherwise navigates to `/chat`.

### 5.6 `HeroImage`

The photo is a Google Places photo of the destination in focus, so the hero changes with the
traveler: the order is the next upcoming trip, then the profile's next destination, then the
planner's Where, then the home city, then a curated default (Paros, Greece, as in the mockup). The
page resolves that destination through `/api/places/resolve` (catalog first, so a destination costs
one lookup per 30 days across all users) and renders `place.photos[0]` through the photo proxy at a
1920 px maximum width, `object-fit: cover`, `fetchPriority="high"`, with an `alt` naming the
destination. Layers in HTML: the serif motto "More than a trip / A brighter you", the caption with
the resolved destination name and country, and the photo's author attribution (section 6). 535 px
tall on desktop, 16:9 between 768 and 1099 px, 4:3 on phones, 12 px radius on desktop only. While
the photo loads the slot keeps its height on the warm surface; if Places returns no photo the
Wikipedia thumbnail is used; if that fails too, a flat brand-colored panel keeps the text readable.

### 5.7 `CollectionCard`

An `<article>` with a link (image, gradient, serif title and description) and a sibling heart
button (`aria-pressed`, "Save By the water"), 1.95:1 image ratio, 10 px radius, subtle scale on
hover only when hover is available. Each card's photo is the Google Places photo of a representative
destination, resolved and proxied the same way as the hero, with its attribution line. Data in
`src/lib/travel/collections.ts`:

| Collection | Inspiration tags | Representative destination (photo) | Link |
| --- | --- | --- | --- |
| By the water | beach, romance | Amalfi Coast, Italy | `/inspiration?collection=water` |
| Close to nature | outdoors, road trip, photography | Banff National Park, Canada | `/inspiration?collection=nature` |
| Immersed in culture | culture, art, food | Kyoto, Japan | `/inspiration?collection=culture` |

Later, once the Inspiration scoring exists, the representative destination becomes the highest
matching destination in the collection for that traveler, so the three photos personalize too. The
Inspiration page reads the `collection` query and filters its curated rows by those tags; the heart
saves a `collection` item (new `SavedKind`), and the Saved page shows collections in their own group.

### 5.8 `ConciergeLauncher`

Fixed, lower right (18 px offsets and safe-area insets), teal pill with sparkle, "Your AI
concierge", chevron; hidden on `/chat` and while any dialog or sheet is open; navigates to `/chat`
(with the current trip scope when on a trip page). Content pages get 96 px of bottom padding so
nothing hides behind it.

### 5.9 `/chat` page

`HomeClient` unchanged in content, mounted under the header at `src/app/(app)/chat/page.tsx` with
the search params it reads today. A slim strip under the header carries the chat title menu with
Recent chats and New chat (moved from `TopBar`) and the compact planner chips. The right panel (map
or discovery feed) stays. The `Ask XPMatch` placeholder becomes "Ask your concierge".

### 5.10 Mobile

`MobileTabBar`: Discover (`/`), Trips, Saved, Concierge (`/chat`), More. The More sheet gains Explore
and keeps Inspiration, Create, Updates, Admin, Update my assistant, Report a bug, Log out. The
launcher is not rendered on phones (the tab carries it).

---

## 6. Assets

No image files are added to the repo. Every photograph comes from the Google Places API through the
existing server proxy, the same way the recommendation cards already work, so nothing on the page
shows a place that does not exist.

| Asset | Source | Fallback |
| --- | --- | --- |
| Hero | Places photo of the destination in focus, proxied at 1920 px, caption from the resolved place | Wikipedia thumbnail through `PlaceImage`, then a flat brand panel |
| Collection cards | Places photo of each collection's representative destination, proxied at 1200 px | `PlaceImage` for the same destination |
| Picks, Jump back in, guides | Unchanged: Places photos of the places themselves | Unchanged |
| Wordmark | The existing sparkle and "xpmatch." text | — |
| Avatar | Initial in a brand-colored circle; an uploaded photo later | — |

What the Places policies require and what changes to meet them:

- **Attribution.** Google requires the photo's author attribution to be shown with any Places photo.
  The app does not render it today: `photos.name` is in the field masks but `authorAttributions`
  is not. Phase 1 adds `places.photos.authorAttributions` to the search and card masks (same
  Essentials tier as `photos`, no cost change), stores `{ displayName, uri }` per photo on
  `ResolvedPlace` and in the catalog row, and renders a small attribution line on every proxied photo
  (hero, cards, picks, sheets). This is a compliance fix that the redesign makes visible.
- **Caching.** Photo URIs stay cached 24 hours in Postgres and the proxy keeps its 24-hour
  `Cache-Control`; image bytes are never stored. Place IDs are the only durable part, as in
  `docs/COGS.md`.
- **Cost.** The hero and the three cards are four photos per destination per day shared by every
  visitor through the proxy cache, plus one catalog-first destination lookup per destination per
  30 days. At list price that is under a cent per destination per day; the CDN in front of the photo
  route (already in the cost plan) removes most of it.

---

## 7. Responsive rules

| Viewport | Header | Hero | Fields | Cards |
| --- | --- | --- | --- | --- |
| ≥ 1280 | Full | 47.3 / 52.7 split | 4 columns | 3 columns |
| 1100–1279 | Full, tighter gaps | Same split | 2 columns | 3 columns |
| 768–1099 | Brand, pill, menu | Copy first, photo below at 16:9 | 4 columns if it fits, else 2 | 2 columns |
| < 768 | Brand and pill; tab bar | Single column, photo at 4:3 | 2 columns | 1 column |
| < 380 | Same | Same | 1 column | 1 column |

The shell stays fixed-height with an internal scroll container as today, so the tab bar and the
chat composer keep their current behavior. No `overflow-x: hidden` on the page; the page shell is
centered above 1720 px. Reduced motion disables the card scale and button transitions.

---

## 8. Accessibility and states

- Skip link to `#main-content`; landmarks: header, nav ("Main"), main, the launcher as a button.
- Every control keyboard-reachable; focus ring in `focus` color with 4 px offset; hearts and the
  launcher have visible focus over photographs.
- 44 px targets for icon buttons; contrast checked on the rendered photographs, not the tokens.
- Real labels on the composer and every editor field; errors joined with `aria-describedby`.
- States implemented before the page counts as done: composer empty, focused, filled, sending,
  failed; field default, selected, expanded, invalid; destination search idle, loading, results,
  empty, failed; Create a trip ready, validating, processing, failed; heart unsaved, saved, saving,
  failed with rollback; photo loading, loaded, unavailable (flat brand background keeps the text
  readable).

---

## 9. Test migration

| Spec | Today | Change |
| --- | --- | --- |
| `helpers.ts` | `goto("/")` then `getByPlaceholder("Ask XPMatch")` | A `goToChat(page)` helper that opens `/chat`; placeholder "Ask your concierge" |
| `full.spec.ts`, `onboarding.spec.ts`, `restore.spec.ts`, `reservations.spec.ts`, `taste.spec.ts`, `mobile.spec.ts` | Chat interactions on `/` | Use the helper; assertions on the empty state ("Where to today", `mobile-home`) move to the Discover hero and the `/chat` empty state |
| `mobile.spec.ts` | Tab labels Chat, Explore; More sheet links | Discover, Concierge; Explore in the More sheet |
| `trips.spec.ts` | nav link "Trips" | "My trips" |
| `guides.spec.ts` | nav link "Saved" inside `navigation`, heading "Create" | Unchanged for Saved; "Create" heading stays on `/create` |
| New `discover.spec.ts` | — | Hero renders with a photo and attribution from the Places mock; composer sends to `/chat` and the message appears; each planner field applies and cancels; date order validation; Create a trip from the hero opens the dialog prefilled; collection card link and heart; launcher navigates; phone layout at 390 px |
| `mock-places.mjs` | Fixtures carry `photos.name` | Add `authorAttributions` to the fixtures so the attribution line is testable |
| Visual check | — | A Playwright script captures `/` at 1586 × 992 after fonts and images load and saves it next to the reference for the overlay comparison |

Unit tests are unaffected. The full e2e suite runs before every phase push.

---

## 10. Build sequence

| Phase | Work | Effort | Verification and deploy |
| --- | --- | --- | --- |
| 0 | Confirm the decisions in section 2 | an hour, the founder | — |
| 1 | Tokens, fonts, Button and field restyle, the neutral-to-brand sweep, CopilotKit and marker colors; photo author attributions in the field masks, the catalog and on every proxied photo | 1–1.5 days | tsc, lint, unit, full e2e, build; deploy (visual only) |
| 2 | `SiteHeader`, `/chat` route with redirects, `MobileTabBar` relabel, chat page strip with Recent and planner chips, remove Sidebar and TopBar, test helper migration | 1.5–2 days | full e2e updated; deploy |
| 3 | Discover page: hero, composer, planner fields and editors (Popover on desktop, BottomSheet on phones), CTA row, hero image, collection cards with save, restyled picks and Jump back in, community row, launcher, phone first run, `discover.spec.ts` | 2–3 days | full e2e; screenshot overlay at 1586 × 992; deploy |
| 4 | Polish: type calibration against the reference, responsive checks at 1440, 1280, 1024, 768, 390, 320, contrast on final photographs, reduced motion, docs (`USER_FLOWS.md`, README screenshots); optional desktop slide-over concierge sharing the thread | 1 day (+1 for the slide-over) | full e2e; deploy |

Each phase is one or more commits on the working branch, main synced after its verification, Railway
deploy checked. Total about six working days of build time.

---

## 11. Deviations from the guide, on purpose

- No `features/discover` folder or CSS Modules: components go under `src/components/discover/` and
  `src/components/shell/`, styled with Tailwind utilities on the `--xp-*` tokens like the rest of
  the app.
- No native `<dialog>`: the existing Modal and BottomSheet primitives already handle focus, Escape
  and return.
- Budget is a tier, Guests is a travelers count; currency amounts and child ages are out of scope
  until a supplier needs them.
- The concierge opens as the full `/chat` page, not a 420 px dialog; a desktop slide-over is the
  optional last step.
- The header is inside the fixed-height app shell rather than the window flow, so phones keep the
  tab bar and composer behavior built in the mobile plan.
- Photographs come from Google Places through the proxy, not from static files, so there is no
  `<picture>`, AVIF or `srcset` pipeline; the proxy serves the photo at the requested maximum width
  and the layout reserves the slot's height while it loads.
- The API contracts in the guide are illustrative; XPMatch keeps its existing routes
  (`/api/places/resolve`, `/api/trips`, `/api/saved`, the CopilotKit runtime).

---

## 12. Reference geometry for the visual comparison

At 1586 × 992: header 0–64; hero 64–599 with the left panel 0–750 and the photo 750–1586; left
content 60–695 wide; eyebrow at y 112, heading at 137, subtitle at 275; composer 59–695 × 324–407;
fields 59–695 × 424–488; CTA row 507–560; section heading at y 632; cards 37–1549 × 685–939 with
15 px gaps; launcher about 204 × 46 with 18 px offsets. Compare boundaries first (header bottom, hero
split, hero bottom, card top, card widths), then type (headline weight and wrap, subtitle baseline,
section heading, card captions), then focal points, radii, button heights and spacing. Fix parent
geometry before compensating with child margins.

---

## 13. Delivery notes (September 21, 2026)

Phases 1–4 shipped in two commits on the working branch (the design system and photo attributions,
then the shell, the Discover page and the polish). What the build does differently from the plan
above, and why:

- **Fields four across from 1500 px, not 1280.** "Any destination" does not fit four fields in a
  480–560 px hero panel; between 1024 and 1499 px the fields sit two across, which the 1024 and
  1440 captures show reads better than truncated values. Each field puts the chevron on the label
  row so the value gets the full width.
- **Suggestion chips under the composer** (section 5.2) add one 46 px row to the hero, so at
  1586 × 992 the hero ends at 640 (reference 599) and the collection cards start at 748 (reference
  685). Header, eyebrow, heading, composer and left gutter land on the reference values (64, 112,
  137, 326 and 60). The chips scroll sideways on phones.
- **Header at 768–1099 px keeps the full navigation.** Three links fit beside the wordmark, the bell,
  the avatar and a shorter pill, so the menu-button-and-sheet variant of section 5.1 was not needed;
  phones still get the tab bar.
- **The wordmark stays at the left** (the reference header has none) and the avatar is the initial in
  a brand circle, as section 6 planned.
- **The launcher is a link**, not a button: it navigates to `/chat` (scoped to the trip whose page is
  open) and is hidden on the chat, on phones and while a dialog or sheet is open.
- **Inspiration `?collection=`** narrows the curated destination rows to the collection's tags and
  offers "All inspiration"; community guides are not tagged by collection, so the guide grid stays.
- **Saved** lists collections in their own group with an internal Open link.
- **The chat's phone empty state keeps the compact feed** (picks first after the quiz, Jump back in,
  Get inspired) under the greeting; the quiz itself moved into the Discover hero.
- **Composer keys** follow the guide: Ctrl or ⌘ + Enter sends, Enter is a newline (a screen-reader
  hint says so); the send button is always teal and disabled while empty.
- **Test stub**: `mock-places.mjs` gained Paros, Amalfi Coast, Banff National Park and Kyoto so the
  hero and the collection cards carry photos with attributions in the suite; its photos are gradient
  placeholders, production shows the real Places photographs.
- **Verification**: `discover.spec.ts` (desktop flow plus a 390 px phone flow), the migrated suite
  (helpers open `/chat` on demand, the header's Create a trip and Recent menu replace the sidebar
  selectors), captures at 1586, 1440, 1280, 1024, 768, 390 and 320 compared against
  `docs/design/discover-reference.webp`.

### Round 2 (same day): the side rail, the chips, carousels and motion

Feedback after the first deploy: the picks should sit in rows rather than stack, the score's link to
the picks was invisible, the side navigation was wanted back on every page but Discover, and the
planner values belonged under the chat bar. Shipped:

- **Side rail** on every page but Discover, under the header: New chat, Chats with the conversation
  list (the old sidebar's history, newest first, remove on hover, Show all), Trips, Explore, Saved,
  Updates, Inspiration, Create, Admin; collapsible to icons (remembered per browser). The chat strip
  is gone, the concierge launcher shows on Discover only, phones keep the tab bar.
- **Planner chips under the composer** on `/chat` ("Charleston · When · 2 travelers · Budget"), set
  values bold, each opening the Create a trip dialog on its field; the CopilotKit disclaimer slot is
  blanked and the line rendered under the chips.
- **Carousel picks**: each "For you in" row is a snap-scrolling carousel of up to six picks (arrows on
  pointer devices, edge fades), sorted best first with a Top pick mark, the two strongest score
  reasons as chips on every card, a notice when a row's picks cannot be told apart, and the badge
  reading "Great match · 87%" so the label leads.
- **Motion**: one easing token, reveal-on-scroll sections with staggered entrances in the hero,
  photos that fade (the hero settles from a slight zoom), pops for menus, popovers and the badge
  detail, a lift for modals and sheets, a fade for every route change, card lifts on hover, the rail
  width animating, shimmer skeletons; all disabled under `prefers-reduced-motion`.

### Round 3: card rows in the chat, thumbs that order the row

"I want to go to Japan" rendered its destination cards as a two-column grid inside the chat; the
expectation was a row. Shipped:

- **Every recommendation set in chat is a row** (`CardRow` in `src/components/chat/cards/shared.tsx`,
  on the shared `Carousel`): destinations, hotels, restaurants, things to do and flights snap card by
  card on every width, with arrows on pointer devices tucked inside the message column. The package
  card, imported places and reservations keep the two-column grid (`CardGrid`).
- **Thumbs on every card**: destination cards gained the match line (badge + thumbs) the other kinds
  already had.
- **Thumbs order the row**: liked cards first, undecided next, passed cards last and dimmed
  (`opacity-55 saturate-50`, `data-verdict` on the card wrapper); the same thumb again undoes it.
  `src/lib/recs/verdict.ts` reads the latest judgment by kind and name; `src/lib/use-flip.ts` animates
  the reorder (FLIP on `data-flip-key` children, 480 ms, skipped under reduced motion). The "For you in"
  picks on Discover follow the same rule; their Top pick mark stays on the model's best among the picks
  not passed on.
- **Popovers that escape the row**: "Why this score" and "Why is X a miss?" now float from the
  document root (`src/components/ui/Floating.tsx`), anchored to their trigger and flipping above it when
  there is no room below, so a scrolling row or the chat can no longer clip them.

### Round 4: the frontend handoff (two-face destination cards, the map scoped to a city)

Built from the "xpmatch — Conversational travel planning and interactive destination cards" handoff
(v1.0, 22 September 2026) with three decisions taken over the spec: hover reveals the profile on
desktops and a tap does on phones, the swipe row stays on phones, and the profile scrolls inside a
fixed-height card. The match score and thumbs stay on the cards (the spec's "no percentages" was
overruled).

- **`DestinationCard`** (`src/components/chat/cards/DestinationCards.tsx`): a 560 px `article` with a
  face viewport (`.xp-flip`, Y rotation, 300 ms, `backface-visibility`; a crossfade under reduced
  motion) and a footer outside the rotating element. State: `face` (photo | profile) and `reveal`
  (closed | hover | pinned); fine pointers reveal after 250 ms and hide 300 ms after leaving the whole
  card unless pinned; City profile, the photo, the name, a tab, a row or focus pin it; Photo returns
  and re-arms hover only after the pointer leaves; the hidden face is `inert` and `aria-hidden`; the
  explicit flips move focus to the counterpart control.
- **Data**: `show_destinations` gained optional `suggestedStay`, `cityFeel` and `knownFor` for the
  quick facts (`bestTime` is the fourth); the tabs read the Discover picks endpoint through
  `src/lib/recs/destination-picks.ts` (one request per destination per session, on pin or tab, never
  on hover); Overview shows the model's highlights as "Find options" drafts (`draft.ts` fills the
  composer without sending) until the picks arrive.
- **Map scope** (`src/lib/map-store.ts`): `activeDestination`, `filter` and `tripId` per thread;
  scoped pins (`MapPlace.scope`) replace a city's earlier set; `visiblePlaces` applies the scope (a
  card pin within 40 km counts) and the filter; a new answer's unscoped pins clear the scope. The map
  header ("Explore {city}", the count, `MapFilters`) and the phone sheet share it; `TripTray` shows
  the thread's trip.
- **Add to trip**: no trips yet → the trip is created from the destination and the item added in one
  step (`AddToTripDialog`); the chosen trip is remembered on the thread (`threadId` on the request).
- Not built from the spec: the 216 px navigation (the rail stays), the microphone and the
  conversation-level Save (dropped, as the spec allows), the 3D flip on touch (tap flips without
  hover timers), and the "View in conversation" action in the place panel.
- **The other cards follow the hierarchy** (feedback on the first deploy: the hotel card still had six
  buttons): hotel, restaurant and attraction cards keep one main action, Add to trip, with Rate in the
  bottom-right corner and Compare across from the category line; View on map is gone (the photo opens
  the panel), and Check rates, Google Hotels, Reserve and Tickets & tours moved into the place panel's
  Overview, built from the place's name and locality. Amenity chips are capped at three.
- **Heads-ups as a tooltip** (feedback: the amber warning chips made the cards long and hard to
  scan): the downsides fold into one "2 heads-ups" chip at the end of the tag row; the list opens as
  a tooltip on hover or keyboard focus, and a tap pins it open on phones (`Tradeoffs` in
  `src/components/chat/cards/shared.tsx`, `Floating` with `role="tooltip"`).
- **Wide cards, actions at the bottom of the panel** (feedback: the data did not fit, and Rate /
  Save / Add to trip belong at the very bottom of the map side): hotel, restaurant and attraction
  rows use `CardRow wide` (twice the width from `sm` up, capped at the row) with the photo as a
  240 px column on the left and the details beside it; names are one line with an ellipsis and the
  full name as the tooltip. The place panel's Rate, Save and Add to trip moved from its header to a
  bar at its very bottom (`place-actions`), on desktop and in the phone sheet; the next-question pill
  floats above the bar, outlined.
- **The flipped card's mirrored credit, second pass** (reported again after the first fix):
  `backface-visibility` alone cannot be relied on, because the spec tests a descendant against its own
  transform, so a descendant a browser draws on its own layer (the photo credit, a blurred chip) can
  show through the city profile mirrored. The face turned away is now hidden outright
  (`visibility: hidden` 50 ms into the turn, once it is past edge-on); the face coming round shows at
  once so focus can move to it. `destinations.spec` checks the credit is hidden while the profile shows.
- **Side rail: one highlight, more room** (the open chat's fill ran into the Chats row's fill, and a long
  title ran out to the rail's edge): while a conversation under Chats is highlighted, the Chats row keeps
  its accent bar and color but no fill; the list sits 12 px below it with 6 px between rows and 4 px
  between the rail's rows; titles truncate inside the rail (`minmax(0, 1fr)` column). `wave1.spec` checks
  the long title stays inside the rail, the gap, and that only one of the two is filled.
