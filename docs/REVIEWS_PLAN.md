# Verified reviews: proof of visit that feeds matching

Goal: travelers review the places they actually went, with proof they were there, and those reviews
make everyone's match scores and itineraries better ("Loved by 3 verified travelers like you").

## Status: v1 is live (reviews, check-ins, booking proof, travelers like you)

What travelers can do now, on every real place's panel (see `docs/USER_FLOWS.md`, Traveler reviews):

- **Check in** ("I'm here: check in"): one location reading, compared with the place on the server
  (`POST /api/places/{id}/checkin`) and dropped; `place_visits` keeps only who, which place, when and
  how far off. Radius by kind: hotel 150 m, restaurant 120 m, attraction 250 m, park / market / square
  600 m, plus the reading's own uncertainty up to 100 m; readings rougher than 200 m are refused, as is
  a check-in that would mean flying faster than 900 km/h since the last one; 20 a day.
- **Booked** proof: a reservation of theirs for that place (imported into a trip they own or belong
  to) whose start date has come.
- **Review**: loved / fine / not for me, up to 1,200 characters, shared with other travelers by default
  (a checkbox; first name and last initial). It is the same row as their reaction
  (`place_feedback.review`, `shared`, `reviewed_at`), so the taste profile learns from it. Delete takes
  the words down and keeps the reaction. 30 reviews an hour at most.
- **Read**: `GET /api/places/{id}/reviews` returns the shared reviews (and the viewer's own) with each
  reviewer's proof, whether they travel like the viewer and what they have in common, ranked own →
  verified → like you → newest, plus the summary line ("Loved by 2 verified travelers like you").
  "Travels like you" is profile overlap for now: at least one interest, cuisine, stay type or style in
  common, weighted with budget, company and pace (`travelerSimilarity`, threshold 0.4).

Not built yet, in order: the **match factor** (reviews by travelers like you moving scores and the
itinerary builder, step 4 below), **I'm here on trip stops** in the phone day view, proof badges and a
line of text in "How was {city}?", a **report** button with an admin queue, the admin numbers, then
photo and receipt proof.

## What already exists

- **Reactions per place** (`place_feedback`): loved / fine / not for me, reasons, a note, the trip,
  and where it came from (card, sheet, trip, post-trip). One row per traveler and place.
- **"How was Rome?"** after a trip ends (`PostTripRating`): the trip's places in three buckets, then
  reasons. It feeds the traveler's own taste profile only.
- **Imported reservations** (`trip_items.details`): provider, confirmation code, dates and the place,
  read from a confirmation email, screenshot or PDF.
- **The match model** (`src/lib/match.ts`): profile, own taste ("Like Da Enzo, which you loved"),
  learned preferences, thumbs and rating. Nothing from other travelers yet.

So the missing parts are proof, and using other travelers' reviews.

## Proof levels

| Proof | How | Strength | Friction |
| --- | --- | --- | --- |
| **Booked** | The review's place matches an imported reservation for it, reviewed after the booking date | Strong | None if they imported the booking |
| **Checked in** | "I'm here" on a trip stop or the place sheet reads the phone's location once and checks it is within 150 m of the place (300 m for attractions, 500 m for parks and trails) | Strong | One tap while there |
| **Photo** | A photo's GPS and time match the place and the trip | Medium | Many apps strip photo location, so it often fails |
| **Receipt** | The existing screenshot reader matches the merchant name and date | Medium | A photo of the receipt |
| **Self-reported** | "I've been here" with no proof | Weak | None |

Only the result is stored ("checked in Sep 23, 40 m away"), never the location itself. Checks against
fake check-ins: at most 20 a day, no two check-ins farther apart than you could travel in the time
between them, and a report button with an admin queue.

## How reviews feed matching and itineraries

- **Travelers like you**: the similarity between two travelers comes from their profiles (interests,
  cuisines, stay types, budget, pace, companions, day rhythm) plus how often they agree on places
  both have rated. For a candidate place, the verdicts of the most similar travelers who reviewed it
  add up to ±12 points to the match score. A verified review counts fully and a self-reported one at
  0.3. The factor only applies once two or more similar travelers have verified reviews of the
  place; otherwise nothing changes.
- **"Why this score"** shows it: "Loved by 3 verified travelers like you" (or "Not a hit with
  travelers like you").
- **The itinerary builder** already ranks by the match score, so those places rise into the days on
  their own. The stop's reason line says why.
- **Admin page**: reviews per city, the verified share, and whether "travelers like you" picks get
  more thumbs up than the others. That tells us whether the factor is working.

At beta scale this factor will rarely trigger outside the most-planned cities. It gets stronger with
every trip, so the first job is getting reviews in: the post-trip prompt, check-ins during the trip,
and a line of text in each review.

## Trust and privacy

- One review per traveler per place. Editing a review keeps its proof.
- Review text is used for matching without names. It is shown to others unless the reviewer unticks
  **Share with other travelers**, and then only as first name, last initial and the proof badge.
- Never reward only good reviews or hide bad ones. The FTC's 2024 rule on reviews bans fake
  reviews, incentives that depend on a review being positive, and hiding negative reviews while
  presenting the rest as complete.

## Build steps (v1: check-ins, bookings, self-reported)

1. Schema: a `visits` table (traveler, place, trip, proof kind, when, distance) and a proof column on
   `place_feedback`. Half a day.
2. **I'm here** on trip stops (phone day view) and the place sheet: one location reading, a distance
   check on the server, rate limits. One day.
3. **Booked** proof from imported reservations, and badges in the post-trip flow ("How was Seoul?"
   marks booked and checked-in places) plus one optional line of text. Half a day.
4. **Travelers like you**: similarity, the match factor, reasons, and the builder's reason line. One
   to two days.
5. Opt-in public reviews on the place sheet, a report button and an admin queue. One day.
6. Tests (unit tests for similarity and the distance check; an e2e run of check-in → review → a
   second traveler's score changes), docs and deploy. Half a day.

Photo and receipt proof can follow as v2, reusing the screenshot reader.

Done so far: step 1 (as `place_visits` plus review columns on `place_feedback`; proof is worked out
when reviews are read, so a later check-in or booking upgrades an older review), step 2 on the place
panel, the Booked half of step 3, the similarity half of step 4, step 5 without the report button and
queue, and step 6's tests (`tests/unit/reviews.test.ts`, `tests/e2e/reviews.spec.ts`).

## Decisions made

1. **Which proof counts for v1?** Check-ins and bookings count as verified; a review without proof
   is shown without a badge and ranks after the verified ones. Photo and receipt proof wait for v2.
2. **Show review text to other travelers?** Yes, so travelers can read each other's reviews: sharing
   is on by default, with the checkbox in the form to keep a review private (then only its author
   sees it). Flip the default in `TravelerReviews.tsx` if opt-in fits better.
