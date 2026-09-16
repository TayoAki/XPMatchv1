# Wave 1 plan: smart filters, comparison, hidden tradeoffs, conversational preferences

Detailed design for the four Wave-1 features from `docs/GAP_ANALYSIS.md`, plus two production fixes the
logs surfaced while planning (chat transcripts lost on deploy; a follow-up-suggestions run that fails
while a trip proposal is waiting for a click). Everything is designed around the cards and the map:
each feature produces or changes cards, and every card stays linked to its pin.

## 0. Foundations

### 0.1 Chat transcripts persist in Postgres
- **Problem.** The runtime keeps transcripts in memory; every deploy restarts the process and empties
  them, so reopening a chat shows nothing. The chat *list* was already in Postgres.
- **Design (as built).** Table `chat_messages (thread_id pk, user_id, messages jsonb, updated_at)`.
  `PersistentAgentRunner` (`src/server/copilot-runner.ts`) extends CopilotKit's `InMemoryAgentRunner`:
  when a run finalizes it writes the thread's message snapshot for the signed-in user (the user travels
  from the route handler to the runner through `AsyncLocalStorage`); when a chat is reopened and the
  in-memory store has no thread (deploy, restart, eviction) it loads the transcript and emits one
  `MESSAGES_SNAPSHOT`, so the client, cards and map pins rebuild exactly as they would from memory. Tool
  calls the traveler never answered (a proposal left open) get a neutral result on restore so the model
  never sees a dangling call. Transcripts are trimmed to ~1.5 MB / 400 messages at user-turn boundaries.
- **Why server-side rather than the client-side save/restore first sketched.** The runner turned out to
  be subclassable, which keeps one source of truth, survives reconnects and needs no extra requests; the
  read-only `GET /api/chats/[threadId]/messages` exists for inspection and tests.

### 0.2 Suggestions wait for human-in-the-loop tools
- **Problem.** When the assistant calls `create_trip`, the run ends while the card waits for "Save to my
  trips". CopilotKit then asks for follow-up suggestions with a transcript that contains a tool call
  without a result, and the model provider rejects it (`AI_MissingToolResultsError`, seen in production).
- **Design.** A tiny "pending human input" store; HITL cards mark themselves pending while executing and
  clear on respond; `useConfigureSuggestions` becomes `available: "disabled"` while anything is pending.
  The new `remember_preference` tool uses the same mechanism.

### 0.3 Unified preference model
- Table `preferences (id, user_id, trip_id null, domain stays|food|flights|activities|general,
  polarity like|dislike|dealbreaker, statement, source onboarding|chat|feedback, created_at)`.
- `GET/POST /api/me/preferences`, `DELETE /api/me/preferences/[id]`; included in `/api/me/state`;
  store actions `addPreference` / `removePreference`.
- Agent context "Learned preferences" (profile-wide, grouped by polarity and domain) on every run; a
  trip chat adds that trip's scoped preferences.
- Profile flag `learnFromChat` (default true). When off, the assistant does not offer to remember.

## 1. Natural-language Smart Filters (Booking.com), done better

**What it looks like.** The traveler types "a quiet hotel near restaurants under $250 a night with a
pool". The assistant answers with hotel cards as before, but above the cards sits an "Understood as"
strip of chips: `Quiet ✕` `Near restaurants ✕` `Under $250/night ✕` `Pool ✕`, and, when something could not
be mapped, a muted "Not applied: 'good vibes'". Removing a chip, or adding one with the small "+ Add"
field, re-runs the search: the assistant produces a new card set and the map pins update. The strip stays
attached to the chat (the constraints are context for every later turn) and can be pushed into the trip's
preferences with "Save to trip".

**How it works.**
1. Frontend tool `set_search_constraints({ kind, constraints: [{ label, type, value?, hard }],
   notUnderstood: string[] })`. The prompt tells the model to call it *before* the card tool whenever the
   traveler states criteria, decomposing the request into one chip per criterion (types: budget, area,
   amenity, vibe, dietary, timing, distance, other). Hard constraints must be satisfied; soft ones are
   preferences.
2. The handler writes the chips into a per-thread constraints store (like the map store) and returns
   "constraints shown; continue". The tool renders the chip strip inline.
3. Editing a chip sends a follow-up message ("Search again with: …") through the existing chat, so the
   model re-runs the card tool with the new constraints; the agent context "Active search constraints"
   carries the current chips into that and later turns, so the traveler never repeats themselves.
4. **Explore** gets the same visible understanding without a model call: the search text is parsed
   deterministically ("under $250", "cheap", "upscale", "4.5+", "highly rated", "open now", "open late",
   cuisines, vibes) into Places Text Search parameters (`priceLevels`, `minRating`, `openNow`) plus the
   residual query; the applied chips show as "Understood as", vibe words show as "searched in text".

**Cards and map.** New results replace the previous card set's pins for that kind; the strip's chips
highlight on hover the cards that satisfy them (soft constraints) is out of scope for this wave.

## 2. Side-by-side comparison (Tripadvisor), done as a structured artifact

**What it looks like.** Every hotel, restaurant and things-to-do card gets a "Compare" toggle. Picking
two or three shows a floating bar ("2 selected · Compare · Clear"). Compare asks the assistant, which
renders a comparison card: columns are the options, rows are *this traveler's priorities* (from the
profile, learned preferences, active constraint chips and the question), then Price, Rating, Location,
Strengths, Compromises and **Missing information**. Cells are colored strong / ok / weak / unknown with
a one-line note. Each option column has View on map, Save and Add to trip, and "Pick this one" sends the
choice back to the chat. The assistant can also produce the card unprompted when asked "compare A and B".

**How it works.**
1. Client compare store per thread: up to three selected options (name, kind, card data, place key).
2. The bar sends "Compare these options for me: A, B, C" and the prompt instructs the model to answer
   with the `compare_options` tool: `{ kind, priorities[], options[{ name, priceEstimateUsd?, area?,
   rating?, cells[{ priority, verdict, note }], strengths[], compromises[], unknowns[] }],
   recommendation }`. Judgements must be hedged and grounded in what the model knows; anything not known
   goes in `unknowns`, never invented.
3. The renderer overlays deterministic data where we have it: rating, review count, price level and
   locality from the resolved pins (Google Places) replace the model's guesses in those rows.
4. Selecting an option column highlights its pin; View on map opens the place sheet.

## 3. Hidden tradeoffs (StayMatch), starting with the assistant

**What it looks like.** Cards show amber "Heads-up" chips under the reasons to like them: "Street noise
reported", "No desk in rooms", "20-minute walk to the metro", "Steep stairs, no elevator". The
onboarding dialog gains "What ruins a trip for you?" chips (noise, no workspace, stairs, crowds, early
starts, long transfers, shared bathrooms, far from the center, no air conditioning, small rooms, spicy
food, tourist traps). Those become dealbreakers the assistant checks every pick against; a pick that
still violates one says so explicitly in its heads-up.

**How it works.**
1. `tradeoffs: string[]` (max 3) on the hotel, restaurant, attraction and flight schemas; the prompt
   requires one or two honest, traveler-specific downsides per option, or none when none is known, and
   forbids hiding a dealbreaker violation.
2. Dealbreakers are `preferences` rows with `polarity = dealbreaker`, shown to the model in context.
3. Grounding flags in review text and Places attributes is Wave 2 (needs the place-facts layer).

## 4. Learn preferences through conversation (Layla), with confirmation and scope

**What it looks like.** When the traveler says "I prefer boutique hotels", the assistant shows a small
card: "Remember that you prefer boutique hotels?" with **Always**, **For this trip** (only inside a trip
chat) and **No thanks**. Nothing is stored until a button is pressed. "Update my assistant" gains a
"What XPMatch has learned" section listing every learned preference with its domain, where it came from,
and a delete button, plus a "Learn from our chats" switch. A trip's preferences section lists the
trip-scoped ones.

**How it works.**
1. Human-in-the-loop tool `remember_preference({ statement, domain, polarity })`; the card's buttons call
   `addPreference` with `tripId` for the trip scope and respond to the model with what was chosen, so it
   acknowledges in one line.
2. `update_traveler_profile` stays for concrete profile fields (home city, airport, dietary needs,
   budget tier) and remains immediate; free-form tastes go through `remember_preference`.
3. Guardrails: sensitive categories are never stored unless "Always" is pressed; the switch turns the
   tool off entirely; deletion is one click.

## 5. Sequencing, effort and verification

| Step | Files (new or changed) | Effort |
| --- | --- | --- |
| 0.1 transcripts | schema `0002`, `api/chats/[threadId]/messages`, `TravelChat` save/restore | 1 day |
| 0.2 HITL guard | `lib/hitl-store.ts`, `TripProposalCard`, `TravelCopilot` | 1 hour |
| 0.3 preferences | schema, `api/me/preferences`, `models`, `store`, `types`, agent context | 1 day |
| 1 smart filters | `lib/constraints-store.ts`, tool + `ConstraintChips`, prompt, Explore parser + nearby params | 2 days |
| 2 comparison | `lib/compare-store.ts`, `CompareToggle`, `CompareBar`, tool + `ComparisonCard`, prompt | 2 days |
| 3 tradeoffs | schemas, prompt, `Tradeoffs` chips on cards, dealbreaker chips in settings | 1 day |
| 4 preferences in chat | `remember_preference` tool + card, memory panel + switch, trip section list | 1 day |

Verification: type-check, lint and build; a stand-in model scenario (`wave1.mjs`) that exercises
constraint chips, compare, tradeoff chips, the remember card with "Always", the memory panel, transcript
restore after a server restart, and Explore's parsed chips; the existing four scenarios stay green.

## 6. Review of this plan

- **Does it stay honest?** Comparison and tradeoffs are model judgements at this stage. The card design
  labels unknowns, uses Places data wherever we have it, and the prompt forbids invented facts; Wave 2
  grounds flags in reviews. This is the right order: the UI and preference model exist first, the
  evidence layer plugs in underneath.
- **Cost.** No new Places calls except Explore's parsed filters (same Text Search call, more parameters).
  Each feature adds at most one small tool call per turn; suggestions are skipped during HITL waits,
  which also removes wasted calls.
- **Risk: constraint re-runs feel chatty.** Editing a chip sends a visible message. Acceptable for the
  MVP and honest about what happens; a silent re-run would need a background run API.
- **Risk: restored transcripts and tool renders.** Restored tool calls include results, so cards render
  in their completed state; the map re-resolves pins (cached server-side). Streaming states never appear
  in restored chats.
- **Scope cut deliberately:** review-grounded flags, chip-to-card highlighting, comparison of trip ideas
  (only chat cards for now), and the "Save to trip" of constraint chips ships as a prompt shortcut.

## 7. Status

Shipped and verified with the stand-in model (`wave1.mjs`, `restore.mjs`) plus the four earlier
scenarios: constraint chips (must-have / preference, not-applied, remove → re-search, one live strip),
Heads-up chips, dealbreakers in onboarding stored as preferences, Compare toggles → bar → comparison card
with Google rating overlay and Map → place sheet, the Remember card with Always → memory panel → delete,
suggestions paused while a card waits, Explore "Understood as" chips, and a chat reopened after a server
restart with its cards and pins.

