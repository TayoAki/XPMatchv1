# Events and experiences: where to pull them from, and how picks are ranked

Goal: a city's itinerary suggests what this traveler will actually enjoy, including real events on
their dates (concerts, festivals, exhibitions, classes, tours), chosen from real reviews and the
traveler's profile rather than blanket rules ("no nightlife"). This doc lists the sources we can pull
from, what each costs and allows, which to build first, and how the ranking uses reviews.

Every source below was checked against its own developer docs, pricing pages and terms on
2026-09-23. "Unverified" means the page could not be read or did not say. Terms change: re-check a
source's terms before signing up and again before launch.

## 1. First: Google's terms limit what we can store and feed to the model (affects the app today)

Checked against the Google Maps Platform Terms (last modified 2026-08-26), the Service Specific
Terms and the Places API policies page (updated 2026-09-17):

- **Caching.** Terms §3.2.3(b): no caching of Google Maps content except as the service terms allow.
  For Places that is the **place ID, kept indefinitely** (general service terms §3), and **latitude
  and longitude for up to 30 days** (§14.3). The Places policies page: "You must not pre-fetch,
  cache, or store Places API content beyond the allowed exceptions." Names, ratings, photos,
  categories, reviews and review summaries are not on the list.
- **No creating content from Maps content.** Terms §3.2.3(c), including "use Google Maps Content to
  improve machine learning and artificial intelligence models". The written exceptions for putting
  Maps content through a model are the **Maps Grounding Lite API** (service terms §10, any compliant
  model) and **Grounding with Google Maps** in the Gemini API and Vertex AI (Gemini models only);
  both require the Google Maps source links with the output.
- **Showing reviews.** Credit each author, say how reviews are ordered and filtered, and for places
  in France show the visit date.

Where the app goes beyond that today:

| What we store or send | Where | Terms say |
| --- | --- | --- |
| Name, coordinates, rating, photos, category, summary of every catalog place, kept and refreshed after 30 days | `places` (`docs/PLACE_CATALOG.md`) | Only the place ID may be kept; coordinates up to 30 days |
| Full place details with up to five reviews and Google's review summary, 30 days | `place_facts` | Not cacheable |
| Copies of a place (name, coordinates, photo, rating) inside trips and their stops, saved items, guides and their places, reactions and reviews, imports and chats | the `place` columns of `trips`, `trip_items`, `saved_items`, `guides`, `guide_items`, `place_feedback`, `imports`, `chats` | Only the place ID may be kept |
| Review text sent to the helper model to pick the quotes that answer "Is it quiet at night?" | Ask about this place | Creating content from Maps content; Grounding Lite is the sanctioned route |

Recommended: a legal read, then the compliant shape: keep place IDs and our own data (reactions,
traveler reviews, check-ins, match results, the plan), expire coordinates after 30 days, fetch names,
ratings, photos and reviews from Google when a place is shown, and answer place questions from our
own reviews or through Google's grounding. Fetching through the Places API costs more per view (about
$0.027 for a name, rating and photo), and much of the catalog's saving (about $1.20 instead of $8–10
per active traveler a month) came from storing content; Google's Places UI Kit, which renders the
details, photos and reviews itself, costs $0.001 a view. `docs/PLACE_DATA.md` has how
competitors handle this, Google's routes and their prices, and the questions for the legal read;
`docs/COGS.md` needs re-running once the display route is chosen. Nothing in the app has been
changed yet; this is for a decision.

The same test applies to every source below: can we store it, rank with it, mix it with others and
put it in a prompt?

## 2. Tours, activities and attraction tickets (bookable, with reviews)

| Source | Offers | Korea / Japan / Europe / US | Access | Cost and commission | Reviews in the API | Terms that matter | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Viator** (Tripadvisor) API v2 | 300,000+ experiences in 2,500 destinations | Yes / Yes / Yes / Yes (Seoul checked) | **Basic: instant self-service key at signup.** Full and Full + Booking: approval and certification | Free; **8%**, 30-day cookie; PayPal weekly, bank monthly ($50 minimum) | Basic: rating and count. Full: review text and traveler photos | Review text must load in the browser through an external script and never appear in page source (so not server-rendered); cache reviews weekly and purge deleted ones; per-endpoint limits (reviews about 30 a minute); booking on viator.com | **5**: ratings on day one, review text after certification |
| **Tiqets** | Museums and attractions in 60+ countries | Some / Some / Yes / Yes | **Self-serve tokens** for catalog and availability; reviews and images on request | Free; share of margin (rate not public); paid monthly | Average and count; text once enabled | Reviews must show the Tiqets logo, mirror removals, stay out of search indexes and only cover Tiqets products; 15 requests a second; refresh images every 14 days | **4**: easiest route to review text, made for "Museums & art" |
| **GetYourGuide** | 75,000+ activities | Yes / Yes / Yes / Yes (Seoul checked) | **Basic needs 100,000 monthly visits** (or 50,000 app downloads); Read needs 1M visits and 300 bookings a month | Free; **8%**, 31-day cookie | Rating and count | 130 calls a minute; "do not scrape the API in an attempt to cache its output"; a notice on pages about one attraction | **3**: deep links and widgets until we have the traffic |
| **Klook** | Tours, tickets, passes | **Strong / Strong** / unverified / unverified | Free affiliate; API and feeds for "selected partners" | 30-day cookie; rates behind login; US$150 payout minimum | Unverified | No reuse of its images or text outside its tools | **3**: Asia depth, API gated |
| **KKday** | 100,000+ products | **Strong / Strong** (Tokyo 500+) / unverified / unverified | Affiliate signup (reviewed); API for select partners; a reseller API for approved agents | 30-day cookie; category rates; US$100 payout minimum | Unverified | The reseller API makes us the seller | **3**: same as Klook |
| **Musement** (TUI) | Tours and tickets in 100+ countries | Weak (Seoul 7) / Tokyo 169 / Rome 515 / New York 308 | Signed contract before the sandbox | Not public | Average, count, breakdown, review text | Catalog cache up to 7 days | **2** |
| **Headout** | 10,000+ experiences in 80+ countries | Yes / Yes / Yes / Yes | Links and widgets; the API is its distribution program (deposit, net prices); public API docs gone (404) | Not public | Unverified | Content "as is" | **2** |
| **Civitatis** | Tours and free tours, Spanish-speaking travelers | Seoul 38 / Tokyo 62 / Paris 113 / some | Direct program; API on request | 8–10%; €1 per free-tour guest | Unverified | Unverified | **2** |
| **Trip.com** | 130,000+ tours and tickets | Unverified | Free affiliate; API is hotels only | 1.5% on attractions, 4% on other activities; US$200 payout minimum | No (unverified) | | **2** |
| Expedia (Rapid Activities preview), Airbnb, Bókun / Rezdy / Peek / FareHarbor | Activities; operator inventory | | Expedia's is a partner preview and XAP applications are paused; Airbnb has no distribution API; operator systems need each operator to opt in | Expedia creators 4% | | | **1** |

Notes:
- **Rewriting partner reviews with AI is risky.** Tiqets says reviews "must always replicate what's on
  Tiqets", Headout's content is used "as is", Klook bans reusing its text. Summaries by our model need
  written permission.
- **Each source needs its own cache lifetime and purge rules** (Viator weekly with purges, Tiqets 14
  days for images, GetYourGuide discourages caching).
- Commission detail and payout windows are also in `docs/REVENUE_MODEL.md`.

## 3. Ticketed and community events

| Source | Offers | Search by place and date | Korea / Japan / Europe / US | Access | Cost and commission | Ranking signals | Terms that matter | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Ticketmaster Discovery API + Feed** | Concerts, sports, arts, family; venues; daily country feeds | Yes: point and radius, city, country, date range | No / No / Yes / Yes | Open key; 5,000 calls a day, 2 per second (docs say 5, FAQ 2); results stop at 1,000 per query | Free; affiliate through Impact (no commission on presales or the first 24 hours) | Relevance; Feed marks `hotevent` (top sellers, 7 days) | Cache for "reasonable periods"; delete within 24 hours on request; revenue only through the affiliate program; the International Discovery API issues no new keys | **4**: the backbone for Europe and the US |
| **SeatGeek** | Events, performers, venues, recommendations | Yes: point and range, date from/to | No / No / unverified / Yes | Legacy self-serve client ID; new portal by request | Free; partner program (rate unverified) | `score` 0–1 (resale activity), listings, prices | Logo; caching unverified (terms page blocked) | **3**: a strong US popularity signal |
| **Fever** | Experiences, candlelight concerts, exhibitions in 55+ countries | Feed only (unverified) | Yes / Yes / Yes / Yes | Affiliate signup through Impact; the product feed needs approval | Free; rate undisclosed | Ratings on its site; in the feed unverified | Unverified | **3**: the only events option here with Korea and Japan |
| **AllEvents** | Events by city and category; claims 40,000 cities, live pages for Seoul and Tokyo | Claimed, unverified | Yes / Yes / Yes / Yes (claimed) | Sample key self-serve; production through sales | Quote | Unverified | Unverified | **3**: test as a global filler |
| **JamBase** | Concerts and festivals; maps Ticketmaster, SeatGeek and Spotify IDs | Yes | unverified / unverified / unverified / Yes | Self-serve, 14-day trial | Free 1,000 calls a month (non-commercial); $6k–30k a year for 20k–150k calls a month | Headliner, capacity, price | Attribution on the free tier | **3**: clean music data, paid |
| **Meetup** | Community events (GraphQL `eventSearch`) | Yes: point and radius, city, dates, RSVP range | Global; depth in Korea and Japan unverified | Needs a Pro account for an OAuth client, approval at their discretion, 500 points a minute | Pro from $55 a group a month | RSVPs, group ratings, members | No commercial use without written consent; must say "not verified by Meetup" | **2**: fits, but needs consent |
| **Eventbrite** | Events, venues, organizers | **No**: public search ended 2019-12-12; events only by known organizer or venue ID | unverified / unverified / Yes / Yes | Open OAuth; 2,000 calls an hour (docs) vs 1,000 (terms) | Free; affiliate fee by insertion order | Sold out, price range | Crawlable link back; store future events only; no competing product | **2**: only for organizers we list ourselves |
| **StubHub / viagogo** | Resale catalog | Partial: point and radius, one date | unverified / unverified / Yes / Yes | Partners only | Affiliate (Partnerize, AWIN); rates unverified | Lowest price | Purchase on their site | **2**; never for Japan (see below) |
| **See Tickets / Eventim** | US affiliate feed, UK program (unverified) | No: pull all, filter by venue | No / No / UK / Yes | Affiliate approval | Rate unverified | None | UK feed may not be passed on (unverified) | **2** |
| **Bandsintown** | Artist events | No geo search; per artist | Global | Written consent; a key is tied to one artist | Unverified | Artist trackers | Approved use only | **2**: needs our own artist list |
| **Songkick** | Events by metro and dates | Yes | Global (unverified) | Paid license only | Undisclosed | Popularity | Cache 24 hours; **no combining with other concert data** | **1** |
| Resident Advisor, DICE, Luma, Partiful, Universe, AXS, Facebook/Instagram events | Nightlife, own events, invites | No public search | | No API, own-event APIs or partners only; Facebook events are for Marketing Partners only; RA and Partiful ban scraping | | | | **1** |

Notes:
- **No ticketing API here has real Korean or Japanese inventory.** Ticketmaster accepts the country
  codes but its feed and affiliate markets leave Asia out. Korea and Japan need their own sources
  (section 5).
- **Japan bans unauthorized resale** of designated tickets above face value (up to a year in jail
  and/or a ¥1M fine), so resale marketplaces must not appear for Japanese events.
- The best popularity signals: Ticketmaster `hotevent`, SeatGeek `score`, Meetup RSVPs and ratings.
  Only Meetup (and possibly Fever) carry real ratings.

## 4. Event intelligence and review data

| Source | Offers | Korea / Japan / Europe / US | Access | Cost | Review data | Terms that matter | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Google Places API (New)** | Places, rating, up to 5 reviews, Gemini `reviewSummary` / `generativeSummary` | Places everywhere; `reviewSummary` only in Japan, the US and the UK; `generativeSummary` only in the US and India | Self-serve | Reviews and summaries are the Enterprise + Atmosphere tier: Place Details $25 per 1,000, Text Search $40 per 1,000 (one search returns up to 20 places with reviews: about 12× cheaper per place) | 5 reviews per place, text and stars | Section 1: no storing, no creating content, credit authors, explain ordering | **4**: best coverage, display-time only |
| **PredictHQ** | Events in 19 categories with rank, local rank, predicted attendance and spend | Global; Korea and Japan depth unverified | 14-day trial; plans through sales | Unpublished | None | No caching; **no putting its data into an LLM without written approval**; "Events by PredictHQ" | **3**: best event signals, needs a contract |
| **Tripadvisor (Terra Discover)** | Locations, ratings, rankings, reviews, photos, summaries | Global, Korean and Japanese reviews | Self-serve Discover; higher tiers through sales | 1,000 free per account, then $15 falling to $9 per 1,000 | Several reviews per location | Only the location ID can be cached; **no commercial AI use without a signed deal; no re-sorting, cherry-picking or merging with other ratings**; the old Content API shut down 2026-08-31 | **2**: conflicts with ranking by profile |
| **Yelp Places API** | Search, ratings, review excerpts, events endpoints | No Korea; Japan, Europe, US | 30-day evaluation | $229–643 a month for 30,000 calls | ~160-character excerpts | 24-hour cache; **no Yelp content in a generative-AI prompt** (terms changed 2026-09-22); no mixing its ratings with other user content | **1** |
| **Foursquare Places** | Places, rating, tips, popularity | Global; Asia depth unverified | Self-serve | $15 falling to $9 per 1,000; premium fields $18.75 | Tips, 0–10 rating | IDs only cached; **its ranking signals may not be mixed with others or used to improve algorithms** | **2** |
| **SerpApi (Google Events)** | Scraped Google event results | Wherever Google shows events | Self-serve | 250 free a month, then $25 per 1,000 | Venue rating | No license to the content; Google is suing SerpApi (pending) | **2**: prototypes only |
| Data Thistle (UK), Evvnt, Time Out | UK listings; a feed that repackages Ticketmaster and Eventbrite; editorial | UK; mostly US and UK | Sign-up or partner | From £50 a month; unpublished | None | Time Out bans any AI use of its site | **1–2** |

The pattern: **almost nobody lets us keep review text, and several forbid putting it in a prompt or
mixing their ratings with ours.** Reviews we can rank with freely are the ones we own (XPMatch
traveler reviews and check-ins) and whatever a partner contract grants.

## 5. Tourism boards, city open data, and Korea and Japan

| Source | Where | Offers | English | Access | Cost and license | Popularity signals | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **KTO TourAPI 4.0** (Korea Tourism Organization, data.go.kr) | Korea | Attractions, food, stays, and **festivals and events searchable by date** (address, coordinates, image, fee) | **Yes**, plus Japanese, Chinese, German, French, Spanish, Russian | Development key auto-approved, 1,000 calls a day per language service; more after a use-case review | **Free, "no restriction"** on use; photos carry KOGL licenses (credit; Type 3 photos may not be edited or cropped) | None; sister KTO APIs give visitor counts, related spots and crowd forecasts | **5**: official, English, dated festivals |
| **KOPIS** (Korea performing arts box office) | Korea | Performances and festivals: dates, price, posters, links to ticket sellers | No | Free key, one per person | Free; a visible KOPIS credit is mandatory (missing it can get the key suspended) | **Box-office ranks and ticket-sales stats** | **4**: real demand data, and the booking links |
| **Seoul culturalEventInfo** (Seoul Open Data Plaza) | Seoul | Cultural events: venue, dates, fee or free, audience, image, link, coordinates | No | Free key; 1,000 rows a call | Free; KOGL Type 1 (commercial use with credit) | None | **4**: the best Seoul feed, refreshed daily |
| Busan FestivalService | Busan | Festivals with dates, place, fees, images | Yes | data.go.kr | Free | None | **3** |
| Naver Search API; Naver Place | Korea | Local search (5 results), blog posts; no Place review API | No | New keys only through NAVER API HUB since 2026-07-31 | Terms ban AI input and training and storing results | Sort by review count | **1**: rules out our use |
| Kakao Local API | Korea | Place lookup and geocoding | No | 100,000 calls a day free (first app) | Caching only for UX | None | **2**: lookup only |
| NOL (ex-Interpark), Yes24, Melon Ticket | Korea | Ticket sales | NOL World | No partner API or feed | | | **1**: deep links (KOPIS gives them) |
| JTTA tourism database (JAPAN 47 GO) | Japan | ~120,000 places, ~10,000 seasonal and event records, an API | Unverified | By inquiry, quote | Unverified | None | **3**: best national Japan events if the terms fit |
| Tokyo Open Data | Tokyo | Municipal event lists, Tokyo Big Sight expos | Mostly no | No key | Free, CC BY 4.0 | None | **3**: legal but patchy |
| JNTO, Peatix, Walkerplus, Tabelog | Japan | Statistics; listings; restaurant ratings | | No events API; Tabelog's API ended 2014 and its terms ban storing | | | **1** |
| **Paris "Que faire à Paris ?"** | Paris | 3,754 events: dates, coordinates, price, credited image, accessibility, tags | French | No key | Free, ODbL (share-alike if we republish a derived database) | Undocumented rank fields | **4**: complete and fresh |
| **Barcelona agenda** (Open Data BCN) | Barcelona | ~6,000 activities with venue, coordinates, dates, timetable | Mostly Catalan | No key | Free, CC BY 4.0 | None | **4** |
| NYC Parks events; NYC permitted events | New York | Parks events (last event 2019, stale); permits (street fairs, parades) | Yes | Socrata token | Free | "Must see" flag | **1–2** |
| London | London | No official open events feed | | | | | **1** |
| **Wikidata** and Wikivoyage | Global | Recurring festivals with place, recurrence and links; travel prose | Yes | SPARQL, no key | CC0; Wikivoyage CC BY-SA | Sitelink counts | **3** for Japan (214 of 1,299 festivals dated), **2** for Korea (5 of 177) |

Notes:
- **No source here gives consumer star ratings for Korea or Japan.** The legal popularity signals are
  KOPIS box office, KTO visitor and crowd data, and Wikidata sitelinks. Ratings there will have to come
  from partners (Viator, Klook, KKday) and our own travelers.
- KTO TourAPI checked directly on data.go.kr (English service: automatic approval, 1,000 calls a day,
  free, no usage restriction, updated 2026-02-26). A third-party report says filtering by `areaCode`
  drops Jeju items; use `lDongRegnCd`.

## 6. How picks will be ranked: real reviews plus the profile

**Today.** A city's plan is built from our catalog of Google places for that city. Each place is
scored with the match model (`src/lib/match.ts`): the traveler's interests are matched against the
place's name, category and Google's one-line summary; budget against price; stay types, must-haves,
cuisines, dietary needs, companions, learned preferences, dealbreakers, taste (places they loved or
disliked) and their thumbs; plus the star rating and review count (4.6+ with 200+ reviews scores
highest, and anything under 4.0 or 50 reviews is dropped when there are enough others). Review text
is not read when ranking. That is how a highly rated "party & language exchange" that Google files as
a tourist attraction landed in a museum lover's Busan day: nothing in its name or category
contradicted the profile, and its rating was high.

**Next.** Every candidate, whether a place, a bookable experience or a dated event, carries evidence
the score reads, taken only from sources whose terms allow it:

1. **Evidence we may use.** Our own: verified XPMatch reviews and check-ins, reactions and swaps
   ("travelers like you", `docs/REVIEWS_PLAN.md`). Partners': the ratings, review counts and
   descriptions a partner contract lets us store and rank with. Google's rating and review count are
   read when the plan is built; Google's reviews are shown with credit but never stored, mined into
   tags or sent to the model, unless a legal read of section 1 says otherwise.
2. **Tags: what it is and who it suits.** "Pub crawl · meet other travelers · late night" or "quiet
   galleries · two hours · good for couples", from our own reviews and the partner descriptions we may
   keep. Keyword rules first (as "Ask about this place" already does in `src/lib/places/evidence.ts`);
   a model only for text whose terms allow it.
3. **The profile against the tags.** Interests (a gallery for "Museums & art"), companions (a
   social night built for solo travelers versus a couple's trip), pace and day rhythm (a 10 pm event
   for an early riser), budget, dealbreakers (crowds, noise), what they loved or disliked before, and
   how travelers like them rated it. Nothing is banned by category: a traveler whose profile says
   nightlife gets the party; a museum-loving couple gets the gallery.
4. **Reasons that cite the evidence.** "Why this score" shows lines such as "Built for solo travelers
   meeting people; you're traveling as a couple" or "Loved by 3 verified travelers like you".

**Events in the plan.** Events get their own pool per city and trip dates. An event has a fixed day
and time, so the builder places it first and fits the day's other stops around it (by area, like
today). Events are ranked by the same model plus the source's popularity signal, and carry the
source's booking link.

## 7. What to build first

| Order | Sources | Why | What it gives the plan |
| --- | --- | --- | --- |
| 0 | Decide on section 1 (Google terms) | It shapes how every source is stored and ranked | A storage and ranking rule every adapter follows |
| 1 | **KTO TourAPI (English) + Seoul culturalEventInfo + KOPIS** | Free, official, open licenses, dated; closes the Korea gap that Google and every ticketing API leave | Festivals, exhibitions and performances on the trip dates in Korea, with box-office popularity and ticket links |
| 1 | **Ticketmaster Discovery** | Free key, geo + date search, 5,000 calls a day; Europe and the US | Concerts, sports, arts and family events, with a top-seller flag |
| 2 | **Viator Basic → Full** | Instant key, ratings and counts on day one, 8%; review text after certification | Bookable tours and classes ranked by real ratings, with a Book button that earns |
| 2 | **Tiqets** | Self-serve; museums and attractions; review text on request | Timed museum tickets for "Museums & art" travelers |
| 3 | **Klook, KKday, Fever** (affiliate now, API when approved); **GetYourGuide** links and widgets | Asia depth; events in Korea and Japan; GetYourGuide's API needs 100,000 monthly visits | More Korea and Japan experiences; affiliate revenue |
| 3 | **Paris, Barcelona open data; Wikidata festivals; Tokyo open data** | Free, permissive, fresh | City events where tourism boards publish them; recurring festivals |
| 4 | **PredictHQ, JamBase, SeatGeek** | Paid or US-only; the best event signals | Attendance and rank for ranking, if the free signals are not enough |

Not worth building on: Eventbrite for discovery (no search since 2019), Songkick (no mixing),
Tripadvisor (no re-sorting or merging, no AI without a deal), Yelp (no content in AI prompts),
Foursquare (no mixing its signals), Naver (no AI use), SerpApi (scraping), Resident Advisor, DICE,
Partiful and Facebook events (no API or closed), and resale sites for Japan.

**Steps, once the sources are chosen:**

1. **Event adapters** (`src/server/events/`): one per source, normalized to one shape (source,
   title, start and end, venue with coordinates, category, price, image with credit, booking link,
   popularity, rating and count when the source has them), each keeping to its source's cache and
   credit rules, with a stand-in per source for the tests. About a day for the first two (KTO,
   Ticketmaster), half a day each after.
2. **Events in the plan builder**: fetch for the planner's dates (no dates, no events; the card says
   "Add dates to see what's on"), score with the match model and the evidence tags, place fixed-time
   items first. One to two days.
3. **Events in the workspace**: an event stop with its date and time, the source's badge and credit,
   Book on {source}, and the reasons. Swap and Not a fit work as for places. One day.
4. **Review evidence and tags**: from our own reviews and the partner fields we may keep; "Why this
   score" lines that cite them. One to two days.
5. **Viator and Tiqets** after the event pool works: experiences as another pool, review text loaded in
   the browser per Viator's rules. Two days, plus Viator's certification.

## Sources checked (2026-09-23)

- Google: cloud.google.com/maps-platform/terms (§3.2.3); cloud.google.com/maps-platform/terms/maps-service-terms
  (general §3, Places §14, Grounding Lite §10); developers.google.com/maps/documentation/places/web-service/policies;
  developers.google.com/maps/billing-and-pricing/pricing; developers.google.com/maps/documentation/places/web-service/review-summaries
- Tours: docs.viator.com/partner-api/technical/; partnerresources.viator.com/travel-commerce/levels-of-access/;
  partner.getyourguide.support (API integration and requirements); github.com/getyourguide/partner-api-spec;
  developers.tiqets.dev (terms, caching, reviews); affiliate.klook.com; kkpartners.kkday.com;
  partner-api.musement.com; partner.headout.com; civitatis.com/en/affiliates/; trip.com/partners/;
  developers.expediagroup.com/rapid/activities
- Events: eventbrite.com/help/en-us/articles/833731/ (API terms) and eventbrite.com/platform/docs/changelog;
  developer.ticketmaster.com (Discovery API v2, Discovery Feed, terms, FAQ); seatgeek.github.io;
  developer.stubhub.com; songkick.com/developer (API terms); data.jambase.com/pricing; meetup.com/graphql/;
  business.feverup.com (affiliate program); allevents.in/pages/events-api; ra.co/terms; partiful.com/terms;
  developers.facebook.com/docs/graph-api/reference/event/; japaneselawtranslation.go.jp (ticket resale act)
- Review and event data: predicthq.com/legal/terms and docs.predicthq.com; serpapi.com/google-events-api;
  docs.terra.tripadvisor.com (caching, terms, review policy); terms.yelp.com/developers/api_terms/20260922_en_us/;
  foursquare.com/legal/terms/apilicenseagreement/; datathistle.com; api.evvnt.com; timeout.com/terms-of-use
- Tourism and open data: data.go.kr/data/15101578 and /15101753 (KTO TourAPI Korean and English);
  data.seoul.go.kr (culturalEventInfo, OA-15486); kopis.or.kr (Open API guide); developers.naver.com/products/terms/;
  developers.kakao.com (local, quota, policies); kankou-data.nihon-kankou-dx.info (JTTA); portal.data.metro.tokyo.lg.jp;
  parisdata.opendatasoft.com (que-faire-a-paris-); opendata-ajuntament.barcelona.cat (agenda-diaria);
  data.cityofnewyork.us; wikidata.org (licensing, query service)
