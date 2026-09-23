# Verified reviews: proof of visit that feeds matching

Goal: travelers review the places they actually went, with proof they were there, and those reviews
make everyone's match scores and itineraries better ("Loved by 3 verified travelers like you").

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
- Review text is used for matching without names. It is shown to others only if the reviewer ticks
  **Share with the community**, and then only as first name, last initial and the proof badge.
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

## Decisions needed

1. **Which proof counts for v1?** Recommended: check-ins and bookings as "verified", plus
   self-reported at a lower weight. Alternatives: add photo and receipt proof now (more coverage for
   people who forget to check in, but more work and weaker proof), or self-reported only for now.
2. **Show review text to other travelers?** Recommended: use reviews for matching from day one and
   show the text only when the reviewer opts in, as described above.
