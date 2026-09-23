# Place data: how other travel apps get it, store it and use it with AI

`docs/EVENT_SOURCES.md` section 1 lists four places where XPMatch keeps or uses Google place content
beyond what Google's terms allow: the place catalog (names, ratings, photos), the 30-day
`place_facts` cache with Google reviews, copies of place details inside trips, saved items, guides and
chats, and Google review text sent to the model by "Ask about this place". This doc records how
competitors handle the same data, what Google offers instead, and what that means for us.

Checked on 2026-09-23 against the companies' own pages, terms, filings and public web code, and
against Google's terms, pricing and developer docs. "Inferred" marks our reading of public code or
pages, not something the company states. What another company does is not permission for us: some
may have terms we cannot see, and some may simply not comply.

## Short answer

- **Big travel companies use their own data.** Tripadvisor, Booking.com, Expedia, Trip.com and Airbnb
  run their AI on their own reviews and inventory. Expedia adds Yelp and AccuWeather.
- **AI assistants license their data.** ChatGPT's local results use Yelp ratings and reviews under a
  signed deal (Yelp's Q2 2026 letter). Perplexity licenses Yelp, Tripadvisor and OpenTable. Gemini
  uses Google Maps reviews only because it is Google.
- **Apple Maps licenses listings from dozens of providers,** among them Foursquare, Tripadvisor,
  Booking.com, Yext and Tabelog, and shows "Reviews from Yelp".
- **List and rating apps show only their own scores.** Beli, Corner, Mapstr, Atly and The Infatuation
  never show Google ratings. They keep their own place record, some with an outside ID as a
  cross-reference (Beli a Google place ID, The Infatuation a Foursquare ID).
- **AI trip planners are split.** Mindtrip, Wanderlog, Airial and Layla depend on Google. Wanderlog
  shows Google ratings on public pages beside AI descriptions written from reviews; Airial's public
  pages quote reviews by name (Google's, inferred) under an AI summary. Nothing public shows special
  terms with Google, so treat them as risk examples, not precedents. Tripomatic (Sygic Travel) and
  Polarsteps avoid Google and are the only two that clearly own all the data they store and feed
  to AI.
- **Google's own routes:** store the place ID and fetch details again when a place is shown; render
  place details with the Places UI Kit; put Maps content through a model only via Grounding with
  Google Maps (Gemini) or Maps Grounding Lite (any compliant model).

## What Google allows (the clauses that decide it)

- **Storage.** Place IDs may be kept: they are "exempt from the caching restrictions", and Google
  recommends refreshing IDs older than 12 months "at no charge by making a Place Details request,
  specifying only the place ID field". Latitude and longitude may be cached for up to 30 days
  (service terms §14.3). Nothing else: "You must not pre-fetch, cache, or store Places API content"
  (Places policies, 2026-09-17), and the Terms (§3.2.3(a)) say customers will not "copy and save
  business names, addresses, or user reviews".
- **AI.** "Customer will not create content based on Google Maps Content" (§3.2.3(c)). The written
  exceptions are Maps Grounding Lite (service terms §10) and Grounding with Google Maps in the Gemini
  API and Vertex AI (Gemini API terms).
- **Maps.** Places content must not be used with a non-Google map (§14.2), except through the Places
  UI Kit (§15.1).
- **Autocomplete.** An address a user picks in Autocomplete is exempt "solely for that end user's
  specific transaction"; the exemption does not cover place (POI) lookups.

## How competitors do it

### AI trip planners (closest to XPMatch)

| App | Map | Place data | Ratings shown | Stores place content? | AI |
| --- | --- | --- | --- | --- | --- |
| Mindtrip | Google; its terms: "Certain features within the Service are powered by Google's Maps APIs" | Own index of "close to seven million points of interest"; source not stated. Homepage partner logos include Google Places, Tripadvisor, Priceline and Viator | Star rating and count, no source label (Google, inferred) | Yes: public attraction pages with ratings; itineraries with photos offline on iOS | The model is grounded on its own index: "combining the destination's content with Mindtrip's close to seven million points of interest" |
| Wanderlog | Google Maps JS, plus MapLibre with OpenStreetMap tiles | Google place ID, rating, hours; Tripadvisor ID and rating | Both, labelled "From Google" and "From Tripadvisor", plus a Google star histogram and "People typically spend 20 min here" | Yes: public place pages with an AI description written from reviews | "We use traveler reviews from Tripadvisor and Google to rank activities" |
| Airial | Google Maps JS with Places | Reviews in the Places API format (inferred), TikTok, Instagram, Reddit, booking APIs | "N Google reviews" in the app | Yes: public attraction pages quote reviews with author names and an AI "Reviews Summary"; photos copied to its own storage (inferred) | Not stated |
| Layla (Expedia Group since 2026-07-31) | Mapbox and Google Maps (privacy policy) | Booking partners, now Expedia inventory; live web search | Google ratings (third-party test) | Public trip pages; contents unknown | OpenAI, Gemini, Anthropic |
| Stippl | MapLibre with OpenStreetMap tiles | Foursquare IDs, Google place IDs and photo references, Booking.com (from its web code) | Booking.com scores with its logo | Yes: hours, rating and photos saved into trips, offline | Not stated |
| Tripomatic (Sygic Travel) | OpenStreetMap | "Places database by © OpenStreetMap contributors and Sygic Travel"; guides from Wikivoyage (CC BY-SA); photos from Wikimedia Commons and users | None | Yes, all open or own data | Own AI over its own data |
| Polarsteps | Mapbox | Own "spots", OpenStreetMap geocoding, guides by its editors and community | Own community tips | Yes, own content | Learns from the traveler's past trips (opt-in) |

Wanderlog's histogram and visit time are not fields the Places API returns, and Airial's field names
match a third-party scraper's output, so some of that data likely does not come through the API at
all (inferred). Nothing public shows that any of the seven has special Google terms.

### Big platforms and AI assistants

| Platform | Place data | Reviews | AI grounded on | Deals |
| --- | --- | --- | --- | --- |
| Tripadvisor | Own listings | Own, 1B+ | Its own reviews (AI trip builder) | Licenses content to Perplexity; apps in ChatGPT and Claude; supplies Apple Maps |
| Booking.com | Own inventory | Own; only guests who booked may review | OpenAI models plus its own ML, linking to its inventory | Supplies Apple Maps |
| Expedia | Own inventory, plus "AccuWeather and Yelp" | Own, with AI summaries | Romie: its inventory, trip emails and Yelp | Owns Layla since July 2026 |
| Trip.com | Own inventory and Trip.Best rankings | Own | TripGenie, sending travelers to its own lists and bookings | None found |
| Airbnb | Own listings and Experiences | Own, with AI highlights | Its own reviews; no itinerary chatbot | None found |
| ChatGPT | "Trusted third-party providers" | Yelp: "Yelp ratings and reviews recently began powering ChatGPT's local experience" | Search plus licensed data and partner apps | Yelp–OpenAI license |
| Perplexity | Licensed; Mapbox maps | Yelp, Tripadvisor | Web search plus partner APIs | Yelp (2024), Tripadvisor (2025), OpenTable (2025) |
| Gemini | Google Maps itself | Google Maps | Maps, Flights and Hotels | First party |
| Apple Maps | Own data, OpenStreetMap and licensed listings (Foursquare, Tripadvisor, Booking.com, Yext, Tabelog and 60+ more) | "Reviews from Yelp"; MICHELIN and The Infatuation in Guides | Guides are editorial, not AI | Long-term licenses |

Google names Realtor.com, TUI and Neurun as users of Grounding with Google Maps (April 2026). TUI is
also Mindtrip's booking partner; nothing shows Mindtrip itself uses Google's grounding.

### List and rating apps

| App | Map | Place record | Scores shown |
| --- | --- | --- | --- |
| Beli | Apple MapKit JS | Its own business record keyed with a Google place ID (from its web code) | Its members' scores only |
| Corner | Mapbox | Only places its users add; the founders chose not to scrape | Its users' reviews and photos, no stars |
| Mapstr | Apple MapKit JS | Its own index of 60M+ addresses; users bring their Google Maps lists by share link or Google Takeout, not through the Places API | Its users' notes and ratings |
| Atly | Mapbox | Its own records built from user posts | Community votes |
| The Infatuation (JPMorgan Chase) | Apple MapKit JS | Its own editorial database with a Foursquare ID and booking-platform IDs | Its critics |
| Resy, OpenTable | Google Maps (Resy) | Their own restaurant databases | Their own diners (OpenTable: verified diners only) |
| Tabelog | Google Maps on a paid Google plan (Google case study, 2015) | Its own database | Its users and the Tabelog score |

Beli's and Mapstr's web code pairs Google place lookups with an Apple map, which §14.2 does not allow
without other terms (inferred), so they are not a compliance benchmark either. The pattern to copy
from this group is the record, not the map: our own place row, the outside ID as a cross-reference,
our own community's scores.

## The other data sources have the same limits

- **Yelp API** (updated 2026-09-22): may not "submit or ingest any Yelp Content into any Generative
  AI Model" (§9.4) or train on it without written approval (§9.1); no storing beyond 24 hours except
  business IDs "solely for back-end matching purposes" (§5(a)); Yelp ratings may not be shown
  "alongside or in conjunction with other user-generated content" (§5(c)). ChatGPT's use rests on a
  signed license, not on the public API.
- **Tripadvisor Content API** (updated 2026-06-16): no use "in connection with any use of artificial
  intelligence or machine learning", except grounding a model "solely for internal (e.g. not consumer
  or customer facing) non-commercial purposes" in testing; caching only as its caching policy allows;
  no display "near, or in conjunction with, any booking or inventory function" of another company; no
  combining its ratings or reviews with others.
- **Foursquare Open Source Places**: Apache 2.0, 100M+ places, monthly releases; names, categories,
  coordinates and addresses, no ratings or reviews. This is data we could store and put in a prompt.
- **OpenStreetMap, Wikivoyage, Wikimedia Commons**: storable with attribution; OpenStreetMap's ODbL
  and Wikivoyage's CC BY-SA carry share-alike terms.

So licensed review data does not solve the AI question on public terms either; the AI companies that
use Yelp or Tripadvisor content signed deals for it.

## Google's approved routes and what they cost

| Route | What it gives | Rules | Price (list, 2026-09-23) |
| --- | --- | --- | --- |
| Grounding with Google Maps (Gemini API, Vertex AI) | A Gemini model answers from Google Maps data (places, reviews, photos, hours) and returns the text with Maps links and place IDs | Show it only "to the end user who initiated the prompt", with the Maps links; do not modify it or intersperse other content; keep it up to 90 days only to evaluate the display, or up to 6 months in that user's chat history; no scraping or training | 5,000 prompts a month free on Gemini 3, then $14 per 1,000, plus model tokens |
| Maps Grounding Lite (MCP) | Any model that complies with the Maps terms gets an AI place summary with place IDs, coordinates and Maps links (no review text), plus weather and route distance and time. Generally available | The exception to "no creating content" holds if the Maps source links "immediately follow" the output (§10.2.1); cache up to 30 days only to evaluate and optimize the display (§10.2.2); do not separate Maps content from the output, train on it, or mix other content in (§10.3); the model must not cache, store or train on it | 10,000 requests a month free, then $7 per 1,000, down to $2.80 at volume |
| Places UI Kit | Google renders place details, search results and lists, including photos and reviews, with or without a map, even a non-Google one (§15.1). The docs label it Experimental (pre-GA) | Coordinates up to 30 days (§15.2); the content still may not be cached or used to create content (§15.3) | Billed per element loaded, photos and reviews included: $1 per 1,000 (10,000 a month free); the Pro elements $5 per 1,000 (5,000 free) |
| Place IDs | Keep them; refresh any older than 12 months | Exempt from the caching limits | Free: Text Search and Place Details with the ID field only |

For comparison, showing a place's name, rating and one photo through the Places API is about
$0.027 per view (Place Details Enterprise $20 per 1,000 plus a photo at $7 per 1,000), and $0.032
with reviews (Enterprise + Atmosphere, $25 per 1,000). The UI Kit shows the same for $0.001.

## What it means for XPMatch

| Where we go beyond the terms | What competitors do | Compliant option |
| --- | --- | --- |
| The catalog stores names, ratings and photos | Own data (Tripadvisor, Booking.com), licensed data (Apple), open data (Tripomatic), or their own record keyed to an outside ID (Beli, The Infatuation) | Keep the place ID and our own fields (one-liners, tags, reactions, traveler ratings). For the model's candidate pool, use storable names and categories (Foursquare Open Source Places) plus our own fields. Show Google's name, rating and photo when the place is on screen |
| `place_facts` keeps Google reviews for 30 days | Only the Google-dependent planners show Google reviews (Airial on public pages); the big platforms and list apps show only their own | Stop storing them; show them live through the UI Kit's place details, credited as Google requires. Our traveler reviews are ours to keep |
| Trips, saved items, guides and chats keep copies of place details | Their own place record (Beli, Corner, Mapstr, The Infatuation), some with an outside ID as a cross-reference | Store the place ID with our own fields (day, time, note, match, reactions); render details when viewed; refresh IDs older than 12 months |
| "Ask about this place" sends Google review text to the model | Their own reviews (Tripadvisor, Booking.com, Expedia, Trip.com, Airbnb) or licensed ones (ChatGPT and Perplexity with Yelp, Tripadvisor) | Answer from our own traveler reviews first; for the rest, Grounding Lite (any model, no review text) or Grounding with Google Maps (Gemini only, reads reviews), shown unmixed with the Maps links |

Cost: the compliant shape does not have to cost more than today. Resolving a name to a place ID is
free (ID-only Text Search), and the UI Kit shows a place for $0.001 against the $0.027 the Places API
charges for the same content. The trade-offs: the UI Kit is pre-GA; it draws Google's own layout
(style and content options only); every load of an element is billed, so tabs and reopened chats
count again; and our server never sees what it shows, so rating filters and "why it fits" lines
would come from our own data or from request-time reads that are never stored. `docs/COGS.md` needs
re-running once the display route is chosen.

The model's side stays close to Mindtrip's approach: ground the model on a place index of our own.
The difference is what goes into that index: storable open data and our travelers' own content,
not Google's.

Questions for the legal read:

1. May the itinerary builder rank with Google ratings read at request time and never stored?
2. May our match score and "why it fits" sit beside a UI Kit element, labelled as ours?
3. Does resolving a name the model wrote to a place ID (ID-only search) count as using Google
   content?
4. Given the above, which Grounding route fits "Ask about this place"?

## Sources

Google: [Maps Platform Terms](https://cloud.google.com/maps-platform/terms) (§3.2.3, last modified
2026-08-26) · [Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms)
(§10 Grounding Lite, §14 Places, §15 Places UI Kit) · [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) ·
[Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id) ·
[Grounding Lite](https://developers.google.com/maps/ai/grounding-lite) ·
[Gemini API terms](https://ai.google.dev/gemini-api/terms) (Grounding with Google Maps) ·
[Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) ·
[Maps pricing](https://developers.google.com/maps/billing-and-pricing/pricing) ·
[Places UI Kit](https://developers.google.com/maps/documentation/javascript/places-ui-kit/overview) ·
[Grounding announcement, 2026-04-22](https://mapsplatform.google.com/resources/blog/powering-the-next-era-of-agentic-experiences-announcing-new-grounding-capabilities/) ·
[Tabelog case study](https://services.google.com/fh/files/misc/geo_tabelog_2015-0928.pdf)

Other data sources: [Yelp API terms](https://terms.yelp.com/developers/api_terms/) ·
[Yelp Q2 2026 letter](https://www.sec.gov/Archives/edgar/data/1345016/000134501626000059/yelpq22026ex992lettertos.htm) ·
[Tripadvisor API terms](https://docs.terra.tripadvisor.com/docs/api-master-terms) ·
[Tripadvisor caching policy](https://docs.terra.tripadvisor.com/docs/caching-policy) ·
[Foursquare Open Source Places](https://opensource.foursquare.com/os-places/) ·
[Apple Maps attributions](https://gspe21-ssl.ls.apple.com/html/attribution.html)

Trip planners: [Mindtrip terms](https://mindtrip.ai/terms-of-service) ·
[Mindtrip B2B release](https://www.prnewswire.com/news-releases/mindtrip-launches-new-b2b-solution-for-the-tourism-industry-leveraging-advanced-ai-to-turn-travel-inspiration-into-action-302308751.html) ·
[Wanderlog place page](https://wanderlog.com/place/details/2343378/butterfly-world--farm-park) ·
[Airial attraction page](https://airial.travel/attractions/united-states/scranton/steamtown-national-historic-site-aR47bDZa) ·
[Expedia Group acquires Layla](https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-acquires-Layla-accelerating-its-AI-powered-trip-planning-and-booking-strategy/default.aspx) ·
[Layla privacy policy (archived)](https://web.archive.org/web/20260816053533/https://layla.ai/privacypolicy) ·
[Stippl discover page](https://www.stippl.io/discover/albania/ksamil) ·
[Tripomatic attributions](https://tripomatic-assets.s3.amazonaws.com/persistent/app-content/attributions.html) ·
[Polarsteps on Mapbox](https://www.mapbox.com/showcase/polarsteps)

Platforms and list apps: [Expedia AI features](https://techcrunch.com/2024/05/14/expedia-starts-testing-ai-powered-features-for-search-and-travel-planning/) ·
[Booking.com AI Trip Planner](https://news.booking.com/bookingcom-launches-new-ai-trip-planner-to-enhance-travel-planning-experience/) ·
[Tripadvisor and Perplexity](https://skift.com/2025/01/14/tripadvisor-exec-explains-partnership-with-chatgpt-competitor-perplexity/) ·
[Perplexity and OpenTable](https://www.perplexity.ai/hub/blog/book-a-table-with-perplexity-and-opentable) ·
[ChatGPT search](https://help.openai.com/en/articles/9237897-chatgpt-search) ·
[Apple Maps expert ratings](https://www.apple.com/newsroom/2025/05/apple-brings-insights-ratings-and-reviews-from-expert-sources-to-apple-maps/) ·
[Mapstr FAQ](https://mapstr.com/faq) ·
[Corner founders](https://b17news.com/these-founders-built-a-map-app-for-gen-z-to-discover-new-places-like-restaurants-and-shops-theyve-raised-3-8-million/) ·
[OpenTable reviews](https://help.opentable.com/s/article/Ratings-and-Reviews-1505261056054)
