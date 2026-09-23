# Events and experiences: where to pull them from, and how picks are ranked

Goal: a city's itinerary suggests the things this traveler will actually enjoy, including real events
on their dates (concerts, festivals, exhibitions, classes, tours), chosen from real reviews and the
traveler's profile rather than blanket rules ("no nightlife"). This doc lists the sources we can pull
from, what each costs and allows, which to build first, and how the ranking uses reviews.

**Status: draft.** The ranking design below is settled; the source list (Eventbrite, Viator,
GetYourGuide, Ticketmaster, tourism boards and the rest, each checked against its official docs for
access, cost, reviews and terms) is being verified and lands in the next revision.

## How picks will be ranked: real reviews plus the profile

**Today.** A city's plan is built from our catalog of Google places for that city. Each place is
scored with the match model (`src/lib/match.ts`): the traveler's interests are matched against the
place's name, category and Google's one-line summary; budget against price; stay types, must-haves,
cuisines, dietary needs, companions, learned preferences, dealbreakers, taste (places they loved or
disliked) and their thumbs; plus the star rating and review count (4.6+ with 200+ reviews scores
highest, and anything under 4.0 or 50 reviews is dropped when there are enough others). Review text
is not read when ranking. It is only fetched when a place's panel opens or someone asks a question
about it. That is how a highly rated "party & language exchange" that Google files as a tourist
attraction landed in a museum lover's Busan day: nothing in its name or category contradicted the
profile, and its rating was high.

**Next.** Every candidate, whether a place, a bookable experience or a dated event, carries evidence,
and the score reads it:

1. **Evidence per candidate, collected once and shared by every traveler.** Up to five Google
   reviews and Google's review summary for places; the source's own ratings and reviews for bookable
   experiences and events; verified reviews from XPMatch travelers. Stored with the source and date,
   refreshed within each source's caching limit.
2. **Tags from that evidence: what it is and who it suits.** For example "pub crawl · meet other
   travelers · late night" or "quiet galleries · two hours · good for couples". Keyword rules first,
   the same way "Ask about this place" already finds review evidence (`src/lib/places/evidence.ts`);
   the helper model only where the rules are unsure. Tags are cached per place, so the cost is per
   place, not per traveler.
3. **The profile against the tags.** Interests (a gallery for "Museums & art"), companions (a
   social night built for solo travelers versus a couple's trip), pace and day rhythm (a 10 pm event
   for an early riser), budget, dealbreakers (crowds, noise), what they loved or disliked before, and
   how travelers like them rated it (`docs/REVIEWS_PLAN.md`). Nothing is banned by category: a
   traveler whose profile says nightlife gets the party; a museum-loving couple gets the gallery.
4. **Reasons that cite the evidence.** "Why this score" shows lines such as "Reviewers mention a pub
   crawl and meeting other travelers, not among your interests" or "Loved by 3 verified travelers like
   you; reviewers mention quiet galleries".

**Events in the plan.** Events get their own pool per city and trip dates. An event has a fixed day
and time, so the builder places it first and fits the day's other stops around it (by area, like
today). Events are ranked by the same model plus the source's popularity signals, and carry the
source's booking link.
