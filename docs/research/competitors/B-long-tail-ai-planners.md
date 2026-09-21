# Group B: second-tier and long-tail AI trip planners

Research date: 2026-09-21. Prepared for XPMatch (taste profile -> matched stay / things to do / places to eat on a map, itinerary board, shared trips).
Method: WebSearch for discovery; live pages read with WebFetch where the domain allowed it, otherwise Firecrawl (raw copies in `raw/`, each ending with a `seen 2026-09-21 | <url>` line). Reddit could not be opened by either tool (403 / "site not supported"), so Reddit quotes below are verbatim search-index snippets from Firecrawl search (`raw/_reddit-snippets.txt`), each with its thread URL. Every revenue figure without a named reporter is an ESTIMATE with the method shown; nothing below is a fact unless a source is cited for it.

Caveats found while researching:
- The brief describes Otto as "with Kayak co-founder Steve Hafner". Not supported: Otto's executive chairman is Steve Singh (Concur founder, Madrona managing director) and Otto was spun out of Madrona Venture Labs (GeekWire, 2025-12-04). Hafner is separately reported to be building "Lola", an agentic-AI startup for Booking Holdings (Skift, 2026-05-06).
- Roam Around no longer exists as a product: acquired by Layla on 2024-02-12; roamaround.io 301-redirects to layla.ai (checked 2026-09-21); Layla itself was acquired by Expedia Group on 2026-07-31.
- Tripnotes was acquired by Dorsia and shut down in December 2023 (Skift, 2024-01-02).

---

## GuideGeek
- Category: Free consumer AI travel chat assistant inside WhatsApp / Messenger / Instagram / web, monetised through white-label "destination genius" bots licensed to tourism boards (DMOs).
- What it is: Matador Network's GPT-based assistant that answers trip questions and drafts itineraries in chat, with live flight / hotel / rental data. The B2B side sells branded copies (Visit Baltimore "Chessie", Discover Greece "Pythia", Destination Toronto "6ix").
- Founded / HQ / team size: Launched April 2023 by Matador Network (Wikipedia). Matador is a 2006-founded private travel publisher; Growjo lists 132 employees, AI Market Watch "51-200"; GuideGeek headcount not broken out.
- Funding and investors: None found for GuideGeek; AI Market Watch labels it "Bootstrapped". No venture round for Matador Network located this session.
- Ownership and M&A: Owned and operated by Matador Network (independent, private). No acquisitions found. Distribution partnership with Ripe (April 2026, AI Market Watch).
- Business model and pricing: Consumer product is free. guidegeek.com (seen 2026-09-21) shows no prices; Wikipedia: "free to use, doesn't include ads, and doesn't sell user data". B2B: brands.guidegeek.com (seen 2026-09-21) shows no prices, only "Reach out to our founders anytime" / guidegeek@matadornetwork.com; aigearbase lists "Contact sales". DMO contract values are not public.
- Scale signals: "GuideGeek reached 1 million users within six months and has since passed 1.5 million users" (AI Market Watch; Matador PR); "fielded over 10 million travel questions from real travelers in more than 50 languages" (Matador Inc. 5000 release, 2024). DMO partners: "over 30+ DMOs" (brands site, seen 2026-09-21) vs "over 70 such clients" as of April 2024 (Wikipedia) vs "60-70" (AI Market Watch). Destination Toronto pilot: "6ix received over 7,500 messages from more than 2,700 users" in two months (brands site). Matador: "16 million followers", "videos are viewed more than 150 million times per month", revenue growth "133% from 2020 to 2023" (Inc. 5000 release). No app-store listing (messaging-only); G2 shows 0 reviews (seen 2026-09-21).
- Revenue: Matador Network group: "$27.1M per year" estimated, 132 employees (Growjo estimate, seen 2026-09-21; another aggregator quoted $15M in search results). GuideGeek line: not reported. ESTIMATE: 30-70 DMO licences x an assumed $15K-$50K/yr per licence (no public price; assumption from comparable DMO chatbot SaaS) = roughly $0.5M-$3.5M ARR. Confidence: Low.
- Key features:
  - Chat on WhatsApp, Instagram, Messenger and web; 50+ languages
  - Itinerary drafting plus "over 1,000 additional travel-specific integrations" for live flight, hotel and rental data (Wikipedia)
  - Price comparison and "one-conversation booking" links (guidegeek.com)
  - Maps and local navigation tips in chat
  - Human-monitored accuracy: hallucinations cut "from a startling 14% down to a more manageable 2%" (Fox News, 2024-05-16)
  - White-label DMO version: site indexing, FAQ automation, custom itineraries, local-business promotion, analytics (brands.guidegeek.com)
  - Content flywheel from Matador's 180M monthly reach (AI Market Watch)
- What users like:
  - Speed and personalisation: "GuideGeek is a travel genius that makes creating detailed travel plans much faster and more personalized." https://www.foxnews.com/tech/even-with-glitches-planning-your-next-trip-with-ai-is-making-me-rethink-travel
  - No app, no paywall: "Completely Free No Paywalls" / "No App Download Needed" https://aigearbase.com/tool/guidegeek
  - Low-friction access: "GuideGeek, which doesn't require mobile number for asking questions." https://www.reddit.com/r/sharktankindia/comments/1rk5xfp/s05e42_episode_discussion_thread/
  - Familiar chat form factor: "Anyone use guide geek for whatsapp? It's like a revamped chatgpt" https://www.reddit.com/r/TravelHacks/comments/13y2xif/use_chatgpt_to_start_travel_planning_vs_asking/
- What users dislike:
  - Real-world blind spots: "What it didn't know to tell me is what happens if a common rain shower interrupts the hike" https://www.foxnews.com/tech/even-with-glitches-planning-your-next-trip-with-ai-is-making-me-rethink-travel
  - Seen as a GPT wrapper with a margin: "the geniuses in NB Tourism decided to pay extra to have GuideGeek take a cut and then GuideGeek pays Open AI" https://www.reddit.com/r/newbrunswickcanada/comments/1s35tev/nb_government_unveils_new_ai_chatbot_for_tourists/ (thread title: "N.B. government unveils new AI chatbot for tourists, but not without (many) errors")
  - Missing app-grade features: "No Native Mobile App", "Limited Direct Booking Integration", "No Offline Access Available" https://aigearbase.com/tool/guidegeek
- Relevance to XPMatch: Proves chat-first distribution and a DMO licensing channel; its output is chat text, not a structured map + board, which is XPMatch's edge. The DMO white-label model is a copyable B2B revenue line.
- Sources: https://en.wikipedia.org/wiki/GuideGeek (launch, channels, 70 clients, free/no ads); https://guidegeek.com/ (features, free; seen 2026-09-21); https://brands.guidegeek.com/ (B2B features, 30+ DMOs, Toronto metrics; seen 2026-09-21); https://brands.guidegeek.com/press/matador-network-named-to-inc-5000-as-guidegeek-travel-genius-expands-its-reach (users, questions, growth); https://www.ai-market-watch.com/company/guidegeek (1.5M users, bootstrapped, DMO count, Ripe); https://growjo.com/company/Matador_Network (revenue/employee estimate; raw/matador-growjo.md); https://www.g2.com/products/guidegeek/reviews (0 reviews; raw/guidegeek-g2.md); https://www.foxnews.com/tech/even-with-glitches-planning-your-next-trip-with-ai-is-making-me-rethink-travel (quotes, hallucination rate); https://aigearbase.com/tool/guidegeek (pros/cons, contact-sales pricing); Reddit snippet URLs above; https://briefglance.com/companies/matador-network/pulses/54394 (Visit Baltimore "Chessie", 2026-07-07).

## Stippl
- Category: All-in-one consumer travel app (itinerary, map, budget, packing, journal, auto video reels, eSIM) with AI itinerary generation; freemium.
- What it is: Amsterdam app that lets travellers build a day-by-day route on a map, track spend and packing, generate an AI itinerary, and share reels. Organiser, not a booking engine.
- Founded / HQ / team size: Founded 2021 (Stippl blog; Tracxn says 2019), Amsterdam; founders Luuk Verhoeven (CEO), Omar Sheshtawy, Robin van Rijn (EU-Startups 2024-04-02). Legal entity Stippl B.V. (App Store). 5 employees as of June 2026 (Tracxn).
- Funding and investors: "$1.48M in 3 rounds" (Tracxn): EUR 400K (Jan 2023, EU-Startups) and EUR 575K seed on 2024-04-02 led by Marbruck Investments (Australia) and Volve Capital (Netherlands) (EU-Startups); Tracxn also lists ClickPatrol and 3 angels.
- Ownership and M&A: Independent. No acquisitions.
- Business model and pricing: App Store in-app purchases "Stippl Pro $3.99", "Stippl Pro $24.99", "Stippl Pro $34.99" (https://apps.apple.com/us/app/stippl-travel-planner/id6443617088, seen 2026-09-21). Stippl blog (updated 2026-09-04): "PRO (EUR 24.99/year)" unlocks "full AI itinerary generation, advanced AI features, and offline access"; "Free tier covers itinerary planning, budget tracking, and packing list". stippl.io/pricing renders only a cookie banner to a scraper (seen 2026-09-21). Third-party listings quote $9.99/month (wandrly.app). Also sells eSIMs and photobooks.
- Scale signals: Google Play 3.7 stars, 2.16K reviews, 100K+ downloads, updated 2026-09-09, listing claims "1.5M travelers worldwide" (seen 2026-09-21; raw/stippl-gplay.md). App Store 4.6 stars, 477 ratings, v3.1.2 dated Sep 4 (seen 2026-09-21). Own blog claims "1.5M+ travellers, 4.9-star App Store rating" (self-reported, conflicts with the 4.6 seen). April 2024: 250,000 users in 160+ countries (EU-Startups), 70,000 monthly active users (Stippl blog). Employees: 5 (Tracxn).
- Revenue: Not reported. ESTIMATE: 1.5M registered accounts; in 2024 MAU was ~28% of registered (70K/250K), so assume 150K-400K MAU today; 1-3% paying at ~EUR 25/yr -> EUR 40K-300K subscriptions plus eSIM/affiliate margin: roughly EUR 0.1M-0.5M ARR. Confidence: Low.
- Key features:
  - AI itinerary generator (Pro) and manual day/route planner on a map
  - Budget and expense tracking, multi-currency, splitting between travellers
  - Packing lists, travel tracker (countries visited)
  - Auto-generated 3D "travel reels" and printed photobooks
  - eSIM purchase in 190+ countries
  - Collaborative trips with friends; discovery feed from creators; social profiles
  - Offline access (Pro); web, iOS and Android
- What users like:
  - One place instead of spreadsheets: "Users consistently praise escaping the juggling act of multiple spreadsheets, apps, and documents" https://www.wandrly.app/reviews/stippl
  - Enthusiasm despite rough edges: "i'm writing this review before i finish planning my trip because i just love this app so far." https://apps.apple.com/us/app/stippl-travel-planner/id6443617088
  - Budget plus places: "Stippl to plan the places and track the budget. Airalo to buy e-sims. They have helped me a lot" https://www.reddit.com/r/TravelHacks/comments/1dhyj8j/what_apps_do_you_use_to_help_plan_your_trip/
  - Route planning: "Another App i swear by is stippl. It doesnt help for budgets but you can plan our your destinations and days." https://www.reddit.com/r/TravelHacks/comments/1azoqr4/looking_at_a_year_travelling_does_anyone/
  - Whole-trip utility: "It is the only app of the five that stays useful for the entire arc of a three-week trip" https://www.travelanywhere.blog/blog/best-agentic-ai-travel-apps-2026-mindtrip-layla-stippl-stardrift-wanderlog-tested
- What users dislike:
  - Crashes and freezes: "Users report frequent app crashes, white screen problems, and freezing that lasts over two minutes" https://www.wandrly.app/reviews/stippl ; "While the app can sometimes crash, I found that using the desktop version to layout the foundations of your trip" https://apps.apple.com/us/app/stippl-travel-planner/id6443617088
  - Basic-task friction: "I spent 10 minutes just trying to figure out how to add a flight." https://play.google.com/store/apps/details?id=com.stippl.stippl
  - Location and settings gaps: "There's absolutely no locations for "Korea South," you can't change currency from EUR to USD unless you change your units" https://play.google.com/store/apps/details?id=com.stippl.stippl
  - Generic AI, no booking: "Its AI recommendations are less specific than Layla's or Stardrift's" and "It books no flights or hotels" https://www.travelanywhere.blog/blog/best-agentic-ai-travel-apps-2026-mindtrip-layla-stippl-stardrift-wanderlog-tested
- Relevance to XPMatch: Closest Group B product to XPMatch's plan-plus-board scope and a live price anchor (EUR 24.99/yr). Its weak spots, generic AI picks and instability, are exactly where taste-matched packages and a stable map/board can win.
- Sources: https://www.eu-startups.com/2024/04/amsterdam-based-travel-app-stippl-raises-e575k-to-develop-the-ai-planning-journey/ (round, founders, users); https://www.eu-startups.com/2023/01/amsterdam-based-stippl-takes-off-with-e400k-for-its-all-in-one-travel-platform/ (2023 round); https://tracxn.com/d/companies/stippl/__hph1lnMr9unKR3yqtVsknxqupkMBsTbwuxWhepUYQxk (total funding, employees; raw/stippl-tracxn.md); https://www.stippl.io/blog/stippl-expands-to-ai-travel-planning-and-continues-to-grow (MAU, team, business model); https://www.stippl.io/blog/stippl-vs-wanderlog (Pro price, 1.5M claim); App Store and Google Play URLs above (ratings, IAPs, quotes); https://www.wandrly.app/reviews/stippl (review themes); https://www.travelanywhere.blog/... (2026-08-27 comparison); Reddit snippet URLs above.

## Stardrift
- Category: Free chat-first AI travel agent (flights, hotels, Amtrak, activities) that turns research into an editable itinerary; YC-backed; skews to frequent and business travellers.
- What it is: Chat with an agent that pulls live fares and hotel prices, remembers preferences, reads your calendar, then organises picks into a day-by-day itinerary with a map. Booking is a link-out to suppliers.
- Founded / HQ / team size: Founded 2024, San Francisco, Y Combinator S24, team size 3 (YC profile). Founder Leila Clark (ex-Jane Street engineer, Princeton CS); team also lists Felipe Mautner and Claire Guo (stardrift.ai/about). App Store seller is "Kopfkino, Inc."; the Crunchbase profile lives at /organization/moonglow (earlier name, not verified).
- Funding and investors: "Backed by Y Combinator and Bain Capital Ventures" (stardrift.ai/about). Amounts not disclosed; no round found on YC page.
- Ownership and M&A: Independent.
- Business model and pricing: Free. Homepage/trip-planner: "Stardrift is a free AI trip planner that finds flights, hotels, and activities in a single conversation" (seen 2026-09-21); stardrift.ai/pricing returns 404 (seen 2026-09-21); App Store: "Free", no in-app purchases (seen 2026-09-21); Product Hunt launch: "it's entirely free and available today - no waitlist or demos"; smartremotegigs (2026-04-30): free with no caps, "Custom/Enterprise plan available upon request". Revenue path would be supplier referrals.
- Scale signals: App Store "Stardrift: AI Travel Planner" 5.0 stars from 7 ratings, released 2025-04-09, v1.0.22 two days before 2026-09-21; iPhone only (no Android, per Reddit). Product Hunt: 144 followers, launched ~10 months ago, no reviews. YC job ad: Founding Software Engineer $125K-$175K, 1-3% equity. No user or traffic figures published.
- Revenue: None reported. ESTIMATE: no paid tier and link-out booking, so revenue is at most affiliate commissions on a small user base: under $100K ARR. Confidence: Medium (no paid plan, 7 App Store ratings, 3-person team).
- Key features:
  - Chat research for flights, hotels, activities with live prices (hotel, flight, Amtrak availability)
  - Traveller profile that retains standing preferences (e.g. no red-eyes) and calendar sync for conflicts
  - Day-by-day itinerary builder with interactive map and drag ordering
  - Email booking import and PDF itinerary sharing
  - Filters for business travel: airport-to-venue distance, Starlink-equipped flights
  - Multi-city and rail routing
  - Booking via links to airline / hotel sites (prices indicative)
- What users like:
  - Depth of the plan: "Stardrift produces the most detailed whole-trip itineraries of the five apps compared here" https://www.travelanywhere.blog/blog/best-agentic-ai-travel-apps-2026-mindtrip-layla-stippl-stardrift-wanderlog-tested
  - One conversation instead of many searches: "Chatting with it is so much nicer than doing 30 Google queries" https://smartremotegigs.com/software/stardrift/
  - Shortlisting help: "I used an app called Stardrift it was super helpful to help narrow down choices." https://www.reddit.com/r/JapanTravelTips/comments/1wdnv69/tokyo_hotel_recommendations_please/
  - Site testimonial: "This is the best travel planning AI I've come across." https://stardrift.ai/
- What users dislike:
  - Prices not held, booking is a link-out: "Every booking is a link-out" and "Stardrift's displayed prices are indicative, not held" https://www.travelanywhere.blog/blog/best-agentic-ai-travel-apps-2026-mindtrip-layla-stippl-stardrift-wanderlog-tested
  - Not the cheapest fares: "the fares it surfaced weren't the lowest I could find on Google Flights" https://smartremotegigs.com/software/stardrift/
  - Missing trip-management basics: "There is no expense tracking, packing automation or offline cache" https://www.travelanywhere.blog/blog/best-agentic-ai-travel-apps-2026-mindtrip-layla-stippl-stardrift-wanderlog-tested
  - iPhone only: "There's no app for android but you can run it on a web browser and bookmark it." https://www.reddit.com/r/JapanTravelTips/comments/1wh8rq7/where_to_even_start_new_traveler/
- Relevance to XPMatch: Overlaps on preference memory and chat research, but has no monetisation, no Android and link-out booking. XPMatch's matched packages on a map and shared trips are absent here.
- Sources: https://www.ycombinator.com/companies/stardrift (batch, team size, founder, job ad); https://stardrift.ai/ and https://stardrift.ai/about (features, testimonials, investors); https://stardrift.ai/pricing (404, seen 2026-09-21); https://apps.apple.com/us/app/stardrift-ai-travel-planner/id6760489765 (rating, seller, dates, free); https://www.producthunt.com/products/stardrift (launch text, followers; raw/stardrift-producthunt.md); https://smartremotegigs.com/software/stardrift/ (review 2026-04-30); https://www.travelanywhere.blog/... (2026-08-27); https://www.crunchbase.com/organization/moonglow (profile slug only); Reddit snippet URLs above.

## Vacay
- Category: Web GPT travel chatbot plus itinerary planner and "thematic advisors"; freemium consumer tiers plus a $49/mo tier for travel advisors.
- What it is: usevacay.com's chatbot answers destination, hotel, dining, cruise and flight questions in 150+ languages and drafts itineraries with outbound booking links. No native app found.
- Founded / HQ / team size: Operated by Vacay International, Inc. (usevacay.com/about). CEO Drew Shepard (NBC News, 2023-04-04). Live by January 2023 (Reddit r/VisitingIceland). Founding year, HQ and headcount: not found.
- Funding and investors: None found (no Crunchbase, Tracxn or PitchBook profile located).
- Ownership and M&A: Independent; no M&A found. (Search hits for HomeToGo were unrelated.)
- Business model and pricing (https://www.usevacay.com/pricing, seen 2026-09-21): Personal "$0/month" with "Unlimited use of our standard chatbot and itinerary planner, with chat history"; Premium "$9.99/month" with "advanced chatbot assistants, equipped with enhanced AI models" and saved itineraries; Professional "$49/month" (7-day trial) with an "Enterprise-ready chatbot, designed specifically for travel professionals" and white-label content. "Paid plans are currently limited to customers within the United States."
- Scale signals: No app-store listing found; Futurepedia shows "(0)" user reviews (seen 2026-09-21); no user, traffic or headcount figures published; still listed in 2026 roundups (lindy.ai 2026-09-18: "$0/mo free; paid tiers around $9.99/mo and $49/mo").
- Revenue: Not reported. ESTIMATE: no audience signals; assume 200-1,000 paying subscribers at a blended ~$12/mo -> ~$30K-$150K ARR. Confidence: Low.
- Key features:
  - GPT chatbot in 150+ languages; itinerary planner with chat history
  - Thematic advisors (hotels, dining, cruises, flights) and destination-specific chatbots
  - "Direct-to-Source Links" to hotels, restaurants and experiences
  - Save and share results; destination guides; community
  - Advisor tools: bespoke client itineraries, white-label content generation, product input
  - Privacy stance: "we don't currently collect any of the user input fields nor the resulting outputs" (NBC News)
- What users like:
  - Good in-the-moment picks: "Usevacay.com recommended a cacio and pepe, and it was delicious." https://www.nbcnews.com/news/world/artificial-intelligence-chatbot-chatgpt-rome-italy-vacation-rcna77393
  - Guided narrowing: "It also has a chatbot, which helps you narrow down questions so it can provide a more tailored response." (same NBC URL)
  - Organic word of mouth: "I used the Vacay Vacation & Travel Assistant Chatbot (https://www.usevacay.com/chatbot). (No affiliation, just sharing something interesting" https://www.reddit.com/r/VisitingIceland/comments/10of5v2/aibased_itinerary_generator/
  - Quick suggestions: "This chatbot provides instant suggestions for places to visit and activities to enjoy, making it perfect for adventurers" https://www.reddit.com/r/AI_travel_tips/comments/1edaay2/list_of_ai_travel_planners/
- What users dislike:
  - Ignores real-world conditions (NBC's test: a recommended trattoria had block-long lines, no reservations); the CEO's reply: "there is always room for improvement." https://www.nbcnews.com/news/world/artificial-intelligence-chatbot-chatgpt-rome-italy-vacation-rcna77393
  - Geo-restricted paywall: "Paid plans are currently limited to customers within the United States." https://www.usevacay.com/pricing
  - Near-zero review footprint and no mobile app: Futurepedia "(0)" reviews https://www.futurepedia.io/tool/vacay
- Relevance to XPMatch: Low threat; useful as a pricing reference ($9.99 consumer, $49 professional) and as evidence that an unstructured chat answer without verified places under-delivers on the ground.
- Sources: https://www.usevacay.com/pricing (plans; seen 2026-09-21); https://www.usevacay.com/chatbot and https://www.usevacay.com/about (features, legal entity); https://www.nbcnews.com/news/world/artificial-intelligence-chatbot-chatgpt-rome-italy-vacation-rcna77393 (CEO, field test, privacy quote); https://www.futurepedia.io/tool/vacay (0 reviews, pricing); https://www.lindy.ai/blog/trip-planner-app (2026 roundup pricing); Reddit snippet URLs above.

## Wanderboat
- Category: Free AI local-discovery and trip-planning app/web (feed of food, drinks, things to do, events, hotel deals; ask-anything chat in-map); consumer; ad + affiliate model.
- What it is: A Bing-Chat-style "AI companion for travel and outing": a feed and map of places with AI summaries, an AI tour-guide narrative per attraction, and trip creation with hotel search. Best-funded company in Group B.
- Founded / HQ / team size: Founded 2023, San Francisco (Tracxn; PhocusWire 2024-07). Founders You Wu (CEO; ex-Microsoft principal applied scientist on Copilot, Bing Chat, Bing Search) and Xiaochuan Ni (Tracxn). Legal entity UTA AI Inc. (App Store, Google Play; PitchBook "Uta AI"). Employees: 10 (Tracxn, Jun 2026) / 8 (PitchBook).
- Funding and investors: ~$18M total, sources disagree on round labels: Crunchbase shows a Seed round with lead investor Sequoia Capital, 2 investors, news dated 2024-07-12 (raw/wanderboat-crunchbase-round.md); Tracxn: "$18M in 1 round", "Series B, Dec 13, 2024"; PitchBook: Seed 2023-09-08 (amount n/a) and "Early Stage VC (Series A) 24-Mar-2025 $18M", 5 investors. Treat as ~$18M raised, Sequoia-led.
- Ownership and M&A: Independent. No acquisitions.
- Business model and pricing: Free. wanderboat.ai (seen 2026-09-21) shows search, "Create trip", "Find your stays" and no paywall; App Store "Wanderboat: Local Guide App" lists no in-app purchases (seen 2026-09-21); Google Play listing has no IAP line (seen 2026-09-21); founder on Reddit: "Wanderboat is free. You do have to register". Stated model (PhocusWire, 2024-07): "It aims to generate future revenue from affiliate models from hotels and experience bookin[g], and advertising models for promoting content."
- Scale signals: App Store 4.7 stars, 68 ratings, v1.5.6 (Sep 11, 2026); Google Play 4.0 stars, 278 reviews, 100K+ downloads, updated 2026-09-11; Play description claims "trusted by 3.5 million users" (self-reported); subreddit r/Wanderboat; 8-10 employees; 186 tracked competitors (Tracxn). No traffic figures found.
- Revenue: Not reported. ESTIMATE: ad/affiliate on 100K+ Android installs plus iOS; assume 50K-150K MAU x $0.50-$2 ARPU/yr = ~$25K-$300K ARR. Confidence: Low.
- Key features:
  - Feed-style discovery of food and drinks, things to do, local events, hotel deals, with videos and images
  - Ask questions "in-chat, in-document or on-map"; AI condenses reviews into short insights
  - AI tour-guide narratives (history and culture) for attractions
  - Trip creation ("Craft your trips") and hotel search by dates and guests
  - Upload links or documents to get a tailored place list
  - Community forum for posting experiences; location-based Discover with list/map views
  - Web, iOS and Android; proprietary orchestration, AI search and personalisation engines (PhocusWire)
- What users like:
  - Intuitive UI: "The interface is incredibly intuitive." https://apps.apple.com/us/app/wanderboat/id6736818361
  - AI guide content: "The AI tour guide feature is the real star." https://apps.apple.com/us/app/wanderboat/id6736818361
  - Talk-to-find: "ai that helps me find things to do is a great idea. talking its the easiest way for me to think" https://play.google.com/store/apps/details?id=com.wanderboat.app
- What users dislike:
  - Chain-heavy, undifferentiated picks: "also recommended two Starbucks when searching coffee. if they want to differentiate they should default to excluding chains" https://play.google.com/store/apps/details?id=com.wanderboat.app
  - Thin data outside big cities: "waste of my time, very little data or events available - otherwise chock full of AI images and suggestions like where to buy coffee." https://play.google.com/store/apps/details?id=com.wanderboat.app
  - Tone and ads: "clunky and booze-oriented" https://alternativeto.net/software/wanderboat-ai/about
  - UI bugs: "some odd error with menu button being a magnifying glass" https://play.google.com/store/apps/details?id=com.wanderboat.app
- Relevance to XPMatch: The most direct overlap with XPMatch's things-to-do and places-to-eat discovery on a map, with Sequoia money behind it. Its weakness is quality filtering (chains, thin coverage) and no coherent trip package, which is where taste profiles and dealbreakers should win.
- Sources: https://tracxn.com/d/companies/wanderboat/__vJsaIdf_x3juK0ck7RlGUMK3cfwqkd2nSWQfDIB2j3Q (founders, $18M, employees; raw/wanderboat-tracxn.md); https://www.crunchbase.com/funding_round/wanderboat-ai-seed--feff10f5 (Sequoia lead; raw/wanderboat-crunchbase-round.md); https://pitchbook.com/profiles/company/626478-40 (round dates, 8 employees; raw/wanderboat-pitchbook.md); https://www.phocuswire.com/startup-stage-wanderboat-fosters-a-community-oriented-approach-for-inspiration-and-sharing (model, founder background; raw/wanderboat-phocuswire.md); https://wanderboat.ai/ (raw/wanderboat-home.md); App Store and Google Play URLs above (raw/wanderboat-gplay.md); https://www.reddit.com/r/ArtificialInteligence/comments/1bv7fsm/personalized_ai_travel_planner_please_try_and/ (free statement); https://alternativeto.net/software/wanderboat-ai/about.

## Otto (Otto The Agent)
- Category: AI business-travel agent that books, changes and rebooks flights, hotels and cars end to end; calendar-aware; commission model; B2C for unmanaged business travellers plus corporate pilots.
- What it is: A Seattle startup spun out of Madrona Venture Labs that positions Otto as "as good or better an experience than the best ever executive assistant". Not a leisure planner. (Brief correction: the executive chairman is Steve Singh, not Kayak's Steve Hafner; see caveats.)
- Founded / HQ / team size: Founded 2024, Seattle (Tracxn). CEO Michael Gulmann (ex-Expedia Group, Egencia); co-founder Chundong Wang (Tracxn); executive chairman Steve Singh (Concur founder, Madrona MD). Legal entity "Otto Trip Inc" (App Store). 10 employees (Tracxn, Jun 2026).
- Funding and investors: $6M seed led by Madrona, with Direct Travel and angels Erik Blachford (ex-Expedia CEO), Barney Harford (ex-Orbitz CEO / Uber COO), Hugh Crean, Mike Fridgen, Oren Etzioni (Madrona post 2024-08-22; fintech.global 2024-09-02); Tracxn dates the round 2024-06-11.
- Ownership and M&A: Independent; Direct Travel (acquired by a Singh-led Madrona group in April 2024) is investor, servicing partner and pilot channel.
- Business model and pricing: ottotheagent.com (seen 2026-09-21): "Free - no credit card required. No contracts, no agent-assist fees, no minimum spend." with "1 year" complimentary access; no pricing page (/pricing returns 404). GeekWire and BTN (2025-12-04): free for 12 months, "The startup makes money on commissions", a premium paid offering "might" follow. Third-party listings quote a regular price of "$10/month" after the free year (therundown.ai reviewed 2026-08-29; zekaiwork Jun 2026), which is not shown on the live site today. App Store: no in-app purchases.
- Scale signals: App Store 4.6 stars, 11 ratings, v1.1.0913 (Sep 2026); nine-month closed beta, general availability 2025-12-04; two unnamed corporate pilots via Direct Travel; car rentals added July 2026 (BusinessWire release cited on Reddit); Teams app on Microsoft Marketplace; 10 employees. User counts not disclosed.
- Revenue: Not reported; commission-based. ESTIMATE: 3K-10K active business travellers x ~$2.5K annual bookings x 4-6% supplier commission = ~$0.3M-$1.5M gross commission run-rate. Confidence: Low.
- Key features:
  - Conversational booking of flights, hotels and rental cars, with explicit confirmation before payment
  - End-to-end servicing: changes, cancellations, rebooking, unused-credit management
  - Learns preferences, seat choices, loyalty programs and quirks ("rooms that avoid train noise")
  - Outlook / Google Calendar integration; re-plans when meetings move; disruption monitoring
  - Email-in requests returning two flight-and-hotel options; Teams app; MCP hooks for Claude / ChatGPT (therundown)
  - Human escalation to Direct Travel agents at no extra cost
  - Browser, iOS and Android; SMB travel-policy support
- What users like:
  - Actually books: "Not just another trip planner. This one books it for me!" https://apps.apple.com/us/app/otto-the-agent/id6736584200
  - Speed: Barney Harford says it "has simplified the shop and book process down to just a couple of minutes." https://www.businesstravelnews.com/Technology/Otto-Opens-Up-to-Wide-Use-Starts-Corporate-Travel-Pilots
  - Agent feel: "Conversational booking is fun, it feels a bit like having a personal agent working for you." https://www.ottotheagent.com/
  - Hotel Q&A: "I could ask questions about a hotel and Otto would answer them." https://zekaiwork.com/ai-tools/otto-the-agent/
- What users dislike:
  - Business-only scope: "Specialized for business travel; less suited for leisure trips" https://www.therundown.ai/tools/otto
  - Pricing cliff: "Promotional pricing will expire; renewal terms unclear" https://www.therundown.ai/tools/otto
  - Curated results hide inventory: "Curated shortlists may not show all available options" https://www.therundown.ai/tools/otto
  - Outsourced humans: "Human support is outsourced to a partner, not an in-house team." https://zekaiwork.com/ai-tools/otto-the-agent/
  - Reddit presence is mostly staff: "Disclosure: Dev on a travel booking product here (Otto the Agent), so I'm technically the guy trying to sell you the next headache." https://www.reddit.com/r/managers/comments/1vrwat0/anyone_leave_concur_where_did_you_land/
- Relevance to XPMatch: Not a leisure competitor. Benchmark for agentic booking UX (confirm-then-pay, rebooking, preference memory); XPMatch should stay on leisure and borrow the booking flow rather than the segment.
- Sources: https://www.geekwire.com/2025/otto-led-by-former-expedia-exec-rolls-out-new-ai-agent-for-business-travelers-that-mimics-an-executive-assistant/ (2025-12-04: GA, Madrona Venture Labs, Singh, free 12 months, commissions; raw/otto-geekwire.md); https://www.businesstravelnews.com/Technology/Otto-Opens-Up-to-Wide-Use-Starts-Corporate-Travel-Pilots (pilots, Harford quote, escalation; raw/otto-btn.md); https://www.madrona.com/meet-otto-the-ai-travel-agent/ (2024-08-22 investors); https://fintech.global/2024/09/02/ai-travel-assistant-startup-otto-secures-6m-seed-round-led-by-madrona-ventures/ ($6M); https://tracxn.com/d/companies/otto/__9bPkFfXn_Ism8wh9xl5xSgxlPailXLU6Vol8LWw6wu8 (founders, employees, round date; raw/otto-tracxn.md); https://www.ottotheagent.com/ (pricing statements; seen 2026-09-21); https://apps.apple.com/us/app/otto-the-agent/id6736584200 (rating, seller); https://www.therundown.ai/tools/otto and https://zekaiwork.com/ai-tools/otto-the-agent/ ($10/mo claim, pros/cons); https://skift.com/2026/05/06/kayak-co-founders-reunite-booking-holdings-agentic-ai-startup-lola-scoop/ (Hafner is at Lola, not Otto).

## Roam Around
- Category: 2023 GPT itinerary generator (type a city and days, get a day-by-day plan); absorbed into Layla in 2024; Layla absorbed into Expedia Group in 2026.
- What it is: Historically the "OG" one-prompt itinerary bot with 10M+ itineraries. Today roamaround.io is a redirect to layla.ai; the itinerary feature lives inside Layla's chat agent.
- Founded / HQ / team size: Founded 2023 by Shie Gabbai (ex-Google, worked on Waze); five employees at acquisition, all joined Layla (TechCrunch 2024-02-12). HQ not verified.
- Funding and investors: Backed by FLYR.com and Jason Calacanis (TechCrunch headline "FLYR-backed"); amounts undisclosed.
- Ownership and M&A: 2024-02-12: acquired by Layla, terms undisclosed; Gabbai became Layla COO; "the startup is going to slowly phase out the Roam Around brand and integrate it fully with Layla" (TechCrunch). roamaround.io -> HTTP 301 -> https://layla.ai/ (checked 2026-09-21). layla.ai/roamaround: Roam Around "is now part of Layla". 2026-07-31: Expedia Group acquired Layla, terms undisclosed; Layla "will continue operating", ~25 employees, had raised EUR 5M from firstminute capital, M13, Andy Phillipps, Barry Smith, Brent Hoberman, Paris Hilton (Skift 2026-07-31; Expedia IR release).
- Business model and pricing: Roam Around was free. Successor pricing not verifiable live: layla.ai/pricing returns 404 (seen 2026-09-21). Third-party: Layla "$49.99/year" with a 3-day trial (aitravel.tools, 2026-03-02) and "around $49/year" (lindy.ai, 2026-09-18); aitravel.tools also describes a Roam Around token model, "30 tokens for $10, 80 for $20, 150 for $30", one token per plan (not verified).
- Scale signals: At acquisition: "10 million itineraries with half a million people visiting its site every month" (TechCrunch); layla.ai: "Roam Around has crafted over 10 million itineraries". Layla: est. "$2.8M" ARR (Getlatka 2025 estimate); ~25 employees (Skift).
- Revenue: Roam Around standalone at acquisition: ~$0 (free product, affiliate links at most). Confidence: Medium. Layla today: $2.8M ARR is a third-party estimate. Confidence: Low.
- Key features (historical, now inside Layla):
  - One-prompt day-by-day itinerary for any city and trip length, ChatGPT-based
  - Map view of each day; shareable itinerary page
  - Fast, no-signup generation (the original growth hook)
  - Inside Layla: short-video inspiration feed, chat agent, flights via Skyscanner, hotels, day-by-day plans
- What users like:
  - Early adopter pull: "I've been using Roam Around - ChatGPT-powered travel planning" https://www.reddit.com/r/ChatGPT/comments/13cn5xz/i_used_chatgpt_to_automatically_generate_and_map/
  - Category leader recognition: "AI trip planners already exist... apps like Roam Around, Wonderplan, and TripIt" https://www.reddit.com/r/Startup_Ideas/comments/1jb1vzb/would_you_use_an_aipowered_trip_planner/
  - Scale claim: "the original AI trip itinerary planner, trusted by millions" https://layla.ai/roamaround
- What users dislike:
  - Undifferentiated from ChatGPT: "How is this better than just asking chatgpt for an itinerary for my travel" https://www.reddit.com/r/ChatGPT/comments/13cn5xz/i_used_chatgpt_to_automatically_generate_and_map/
  - Brand and product retired: "slowly phase out the Roam Around brand and integrate it fully with Layla" https://techcrunch.com/2024/02/12/travel-startup-layla-acquires-flyr-backed-ai-itinerary-building-bot/
  - Metered plans: "one token buys one trip plan" https://aitravel.tools/best-ai-trip-planner/
- Relevance to XPMatch: Shows the fate of pure itinerary-text generators: commoditised, rolled up twice (Layla, then Expedia). Defensibility must come from taste matching, verified places on a map and shared trips, not the itinerary text itself.
- Sources: https://techcrunch.com/2024/02/12/travel-startup-layla-acquires-flyr-backed-ai-itinerary-building-bot/ (deal, metrics, team, investors); https://www.crunchbase.com/acquisition/layla-7376-acquires-roam-around--4f13cfae (status "Complete", news 2024-02-12/13; raw/roamaround-crunchbase-acq.md); https://layla.ai/roamaround (status page); https://skift.com/2026/07/31/expedia-acquired-ai-trip-planner-layla-exclusive/ (Expedia deal, Layla funding, headcount); https://ir.expediagroup.com/news-and-events/news/news-details/2026/Expedia-Group-acquires-Layla-accelerating-its-AI-powered-trip-planning-and-booking-strategy/default.aspx (release 2026-07-31); https://getlatka.com/companies/layla.ai (ARR estimate); https://aitravel.tools/best-ai-trip-planner/ and https://www.lindy.ai/blog/trip-planner-app (successor pricing); roamaround.io redirect check via curl (2026-09-21).

## Copilot2trip
- Category: Free GPT chat itinerary planner with (claimed) interactive maps; one-person Delaware startup; mobile apps discontinued.
- What it is: A chat box that drafts day-by-day plans with prices and attraction links, launched on Product Hunt in July 2023. Premium tier exists in-product but is not shown publicly.
- Founded / HQ / team size: Founded 2023; Wilmington, Delaware (Getlatka); legal entity Copilot2trip, Inc. (AppBrain). Maker replying to reviews as founder: Islam Midov (Product Hunt); CB Insights lists Midov as former founder/CEO; a startupstarter.co article credits Maxim Surkiz (page now blank, unverified). "1 employees" (Getlatka, updated 2026-08-10).
- Funding and investors: "$0" raised (Getlatka). No investors found.
- Ownership and M&A: Independent.
- Business model and pricing: copilot2trip.com (seen 2026-09-21) is a bare chat UI titled "Your Free AI-Powered Personal Travel Assistant"; /pricing returns 404; no prices displayed anywhere public. Founder on Product Hunt: "Premium subscribers have access to advanced AI & Map". theaitoolsbox (tested June 2026): "The Copilot2trip website does not display any pricing information on its main page or its /pricing page." Users describe a monthly plan sold via pop-ups. iOS listing id6466396130 returns 404 (seen 2026-09-21); AppBrain: removed from Google Play 2024-09-03.
- Scale signals: Product Hunt 4.1/5 from 14 reviews, 1.2K followers (seen 2026-09-21); still listed as "Free to use" in lindy.ai's 2026-09-18 roundup; no app-store ratings (apps gone); no traffic data.
- Revenue: Third-party estimate "$110K" for 2025 with 1 employee (Getlatka). My view: plausible for a few hundred low-price subscribers. Confidence: Low.
- Key features:
  - Chat itinerary generation with day-by-day structure and price hints
  - Clickable attraction links and restaurant suggestions
  - Interactive map (advertised; users report it does not work in chat)
  - "Real-time adaptability" claim; travel guides section; business product page
  - Premium tier with "advanced AI & Map" (in-product only)
  - Web only since 2024 (iOS/Android withdrawn)
- What users like:
  - Fast, priced plans: "gave me such a detailed and proper itinerary with prices" https://www.producthunt.com/products/copilot2trip/reviews
  - Works for less-covered places: "can come up with an itinerary for less popular places too. Tried a couple of cities of Uzbekistan." https://www.producthunt.com/products/copilot2trip/reviews
  - Family fit: "Was able to generate a detailed and fun itinerary full of kid-friendly activities for the family." https://www.producthunt.com/products/copilot2trip/reviews
- What users dislike:
  - Advertised features missing: "Apparently no one told the model it had interactive maps." and "Ran same queries in ChatGPT 3.5 and got nearly identical replies." https://www.producthunt.com/products/copilot2trip/reviews
  - Unrealistic logistics: "the travel times were completely unrealistic - not feasible" https://www.producthunt.com/products/copilot2trip/reviews
  - Billing and support black hole: "After paying for the monthly plan, it has stopped working and there's no way to contact support." https://www.producthunt.com/products/copilot2trip/reviews
  - Cannot cancel: "Once you log in there's no way to access your account settings, unsubscribe from the service" https://www.producthunt.com/products/copilot2trip/reviews
- Relevance to XPMatch: Cautionary tale, not a threat: a GPT wrapper with fake maps and opaque billing. XPMatch's verified places, real map pins and transparent plans are the direct antidote.
- Sources: https://copilot2trip.com/ (chat UI, seen 2026-09-21; raw/copilot2trip-home.md); https://www.producthunt.com/products/copilot2trip/reviews (rating, 14 reviews, quotes, founder replies; raw/copilot2trip-producthunt.md); https://getlatka.com/companies/copilot2trip.com (revenue estimate, HQ, team, $0 funding); https://theaitoolsbox.com/tool/copilot2trip-review/ (no public pricing, June 2026); https://www.appbrain.com/appstore/copilot2trip-ai-trip-planner/ios-6466396130 (entity, Play removal date, via search snippet); https://www.cbinsights.com/company/copilot2trip/people (Midov); https://www.reddit.com/r/GrowthHacking/comments/14zente/copilot2trip_launched_on_product_hunt_today/ (launch); https://www.lindy.ai/blog/trip-planner-app (2026 roundup).

---

## Long tail (one row each; "seen" = live page read 2026-09-21 unless noted)

| Name | What it is | Pricing (verified) | Ownership / funding | Scale signal | One like | One dislike | Sources |
|---|---|---|---|---|---|---|---|
| MonkeyTravel (monkeytravel.app) | Web AI itinerary generator with three budget tiers, verified Google places, group voting for up to 8 | "100% Free", no signup or card; FAQ: "the core AI trip planner will always be free" (seen) | "(c) 2026 MonkeyTravel"; owner and funding not found | "180+ Destinations"; publishes its own 1.1M-search trends report | Zero-friction: no account, PDF export | Web only, "Mobile apps coming soon"; no revenue model yet | https://monkeytravel.app/ ; https://monkeytravel.app/blog/travel-planning-trends-2026 |
| anywayr (anywayr.com) | SMS/group-chat AI group-trip planner ("add us to your group chat") that returns bookable VRBO/Airbnb, Booking.com and Viator options with cost splitting | No prices on site (seen); own blog: "Freemium model likely... (Specifics to be confirmed for 2026)" | Owner and funding not found | None published; landing page + "Early Supporters" page | Group coordination by text is a real gap | Thin landing page; pricing and team undisclosed | https://anywayr.com/ ; https://anywayr.com/blog/best-ai-trip-planners-2026 (2026-04-07, updated 2026-09-21) |
| Paffing (paffing.com) | One-off AI trip guide: day-by-day PDF e-book plus Google Maps file, 29 languages, geographic zone routing (V3 engine) | "GBP 4.49 / USD 5.99" per guide, "Fixed price. No subscription or hidden fees." (seen) | "(c) 2026 Paffing.com"; no funding found | "3.523 Guides generated", "4,9 Google Rating", 6 affiliate partners (Expedia, GetYourGuide, Booking.com, Holafly...) | Offline PDF + map at a one-off price | No free tier; static document, not a live board | https://paffing.com/en/ ; https://paffing.com/en/how-paffing-works-v3-engine/ |
| Tineo (tineo.ai) | Email-to-itinerary organiser (TripIt-style) with AI assistant, collaboration, offline, calendar sync | Free; "Tineo Ultra" "$4.99/month or $39.99/year" (tineo.ai/pricing, seen) | Resolute Studios, LLC (Google Play); no funding found | Google Play "100+" downloads, listed since Jan 2026, no rating yet (raw/tineo-gplay.md) | Forwarding confirmations builds the trip for you | Tiny install base; organiser rather than recommender | https://tineo.ai/ ; https://tineo.ai/pricing ; https://play.google.com/store/apps/details?id=com.tineoc.app |
| Tripstone (tripstone.app) | Web AI itinerary builder with real price estimates, budget calculator, ready-made city plans | Free (site shows no prices; its blog: "100% free") (seen) | Founder Vova Kravchuk; no funding found | "28,000+ travelers created a trip plan", "4.8 average rating" (self-reported) | Budget estimate per plan | Web only; small; SEO-blog heavy | https://tripstone.app/ ; https://tripstone.app/blog/google-trips-alternatives |
| Wandrly (wandrly.app) | Travel list and journal app (saved places on a map, tags, priority, shared lists); not AI-first | No prices; footer says "You are now on our waiting list" (seen) | Wandrly, Inc. "(c) 2025"; no funding found | None; site is mostly SEO reviews of other apps | List filters by priority and tags | Still a waitlist; unclear launch | https://www.wandrly.app/ ; https://www.wandrly.app/tools/wandrly |
| TripProf (tripprof.com) | All-in-one planner: generated guides, itinerary, bookings, receipt scanner, expense split, offline, 11 languages | "Free forever. No ads, no data selling." (seen) | Owner not stated; no funding found | None published | Offline guides + expense splitting | No visible business model; unknown team | https://tripprof.com/en/ ; https://tripprof.com/en/blog/best-trip-planning-apps-2026/ |
| G8Trip (g8trip.com) | Chat planner "Vani" that researches, plans and books flights, hotels, insurance and local SIMs | Free to plan; /pricing returns 404; monetises bookings (seen) | Owner not stated; no funding found | Live counter "10,728 TRIPS PLANNED IN SEP" (seen); "35,000+ trips planned" (search snippet) | Research-plan-book in one chat | No pricing transparency; unknown company | https://g8trip.com/ (raw/g8trip-home.md); https://g8trip.com/best-ai-trip-planners-comparison-2026 |
| Voyaige / "Voyaiger" (voyaige.to) | Free no-signup AI planner: itinerary generation, itinerary vetting (flags conflicts), "Go Mode" navigation, crowd-sourced field notes, live flight search | "100% free", "No signup needed" (seen) | Owner and funding not found | None published | Vetting tool that flags overbooked days | No revenue model; name collides with Voyagier | https://voyaige.to/ ; https://voyaige.to/blog/best-ai-travel-planner-2026 |
| Voyagier (voyagier.com), luxury | Baltimore agentic luxury travel platform: AI (VIA) builds and books on Sabre and Viator inventory, human advisors on top | Embark "Free"; Bespoke "$250+" per trip; Voyagier+ "$1,500" per year membership (voyagier.com/pricing, seen) | Founders Daniel Gardner and Mark Davis; "$1.25 million at a $7 million valuation", seed round targeted late 2026 (technical.ly 2026-04-10) | "$500,000 in revenue during beta"; 4 advisors, aiming for ~12 | Books real inventory, not link-outs | High-touch pricing; tiny team | https://technical.ly/entrepreneurship/voyagier-ai-travel-startup-seed-round/ ; https://www.voyagier.com/pricing ; https://www.phocuswire.com/interviews/startups/voyagier-targets-luxury-travel-ai-travel-planning-booking |
| Vuelo (London) | AI-native booking app that unifies discovery, booking, financing (interest-free instalments up to 12 months, virtual card) and in-trip assistant | App free; revenue from bookings and financing; no subscription found (EU-Startups) | Founders Jasper Dykes (CEO), Edgars Kohs (CTO), ex-Fly Now Pay Later; EUR 64M seed on 2026-03-25 = EUR 6.9M equity (Backed VC, Play Ventures) + EUR 57M debt (Viola Credit) | "onboarding thousands of new travellers each month" | Financing removes the purchase barrier | Headline is mostly debt; fintech first, planner second | https://www.eu-startups.com/2026/03/vuelo-secures-e64-million-in-seed-funding-to-build-an-ai-native-travel-booking-experience/ ; https://www.phocuswire.com/news/finance/vuelo-buy-now-pay-later-travel |
| iplan.ai | Mobile AI itinerary builder (20,000+ cities) | App Store IAPs "Pro Membership $9.99", "AI Powered Itinerary Builder $3.99", "Pro Membership $3.99" (seen); "now paid for new users" (MakeUseOf) | Voyage AI Inc (App Store); no funding found | App Store 4.5 stars, 1.5K ratings, v2.9.2 (2025-11-12) | Fast day plans with a large rating base | "the itinerary is made relying on automobile transportation rather than walking." | https://apps.apple.com/us/app/iplan-ai-ai-travel-planner/id1611716564 ; https://www.makeuseof.com/free-travel-planning-ai-chatgpt-apps/ |
| Tripnotes (tripnotes.ai) | 2023 viral ChatGPT trip planner (Welcome / Matthew Rosenberg) | n/a: product shut down mid-December 2023 | Acquired by Dorsia (restaurant reservations) alongside parent Welcome; terms undisclosed (Skift 2024-01-02) | Viral LinkedIn demo shared by Dennis Crowley, Jan 2023 | Early proof of demand for AI itineraries | "It was just a moment where everything froze" (fundraising) | https://skift.com/2024/01/02/tripnotes-a-buzzy-chatgpt-based-trip-planner-was-acquired-and-shut-down/ |
| Curiosio (curiosio.com), road trips | Computational multi-point road-trip planner "within time & budget" (Norway, Tuscany, France use cases) | Free; "Una Curiosità club" members get "unlimited trip planning and re-planning", price not shown on site (seen); roundups list it as free | Owner not stated; no funding found | None published | Multi-point optimisation, not chat | Dated UX, no mobile app, membership price hidden | https://curiosio.com/ (raw/curiosio-home.md); https://aitravel.tools/best-ai-trip-planner/ |
| Genspark travel planner | General "super agent" workspace whose travel use case builds itineraries and makes reservations; not travel-specific | Pricing page sits behind login (seen); consumer plan price not verified this session | Genspark (MainFunc): $275M Series B (2025-11-20, BusinessWire); $100M extension at $2.6B valuation (June 2026); ~$535M total | "$250M ARR" for 2026 (Getlatka estimate, unverified) | Agentic calls and bookings | Generic; no map/board model for a trip | https://www.businesswire.com/news/home/20251120036880/en/Genspark-Raises-$275M-Series-B-Launches-AI-Workspace-to-Put-Busywork-on-Autopilot ; https://siliconvalleyinvestclub.com/2026/06/16/genspark-ai-raises-100-million-at-a-2-6-billion-valuation/ ; https://getlatka.com/companies/genspark.ai ; https://travelprofessionalnews.com/how-genspark-ai-is-challenging-the-traditional-travel-agent/ |
| Thatch (thatch.co), roundup extra | SF creator-guide marketplace with AI-assisted trip planning | Not verified this session | Seed, "$5.2M" from Wave Capital, Freestyle and 2 others (Tracxn competitor table, seen) | None captured | Creator-made guides as inventory | Marketplace, not personalised planner | https://tracxn.com/d/companies/wanderboat/__vJsaIdf_x3juK0ck7RlGUMK3cfwqkd2nSWQfDIB2j3Q (table row) |
| Roundup extras with visible prices (not verified live) | TRAIVL Pro "$7.99 per month"; PlanTripAI "one-time payment of $10 for a lifetime license"; iMean AI "Free (2 messages/day) / $6.99/mo (annual)"; Wonderplan "Free with credit-based usage; paid top-ups" | as quoted | unknown | n/a | n/a | n/a | https://aimojo.io/ai-trip-planners/ ; https://aitravel.tools/best-ai-trip-planner/ ; https://www.lindy.ai/blog/trip-planner-app |

Skipped as pure content or unverifiable: Maps GPT, Travelnaut, JourneAI, Swifty (named in lindy.ai without prices), Tern (Reddit self-promo only).

---

## Cross-cutting read for XPMatch

- Pricing map (live, 2026-09-21): free-with-no-paid-tier is the norm (GuideGeek, Stardrift, Wanderboat, MonkeyTravel, TripProf, Voyaige, Tripstone, G8Trip); consumer subscriptions cluster at EUR 24.99-$49.99/yr or $4.99-$9.99/mo (Stippl, Tineo, Vacay, iplan.ai, Layla); one-off purchases exist (Paffing $5.99/guide, PlanTripAI $10 lifetime); B2B tiers are "contact sales" (GuideGeek DMOs) or $49/mo (Vacay Professional); luxury human-plus-AI runs $250+/trip or $1,500/yr (Voyagier).
- Money: only Wanderboat (~$18M, Sequoia), Otto ($6M, Madrona), Vuelo (EUR 64M, mostly debt) and Genspark (~$535M, not travel-specific) are venture-scale; everything else is bootstrapped or sub-$2M. Two of the named "competitors" are gone (Roam Around, Tripnotes) and one is a one-person shop (Copilot2trip).
- Biggest like themes: (1) speed and detail of a generated plan; (2) one place for the whole trip instead of spreadsheets and tabs; (3) no paywall / no signup; (4) memory of preferences and calendar (Stardrift, Otto).
- Biggest dislike themes: (1) plans that ignore reality: unrealistic travel times, closed or queue-heavy restaurants, chain-heavy picks, thin data outside big cities; (2) "how is this better than ChatGPT?" when output is plain text; (3) buggy or crashing apps (Stippl, Wanderboat); (4) link-out booking with prices that are not held; (5) opaque billing and no support (Copilot2trip, Otto's pricing cliff).
- Implication: XPMatch's verified places on a map, taste-matched packages and a stable shared board address the top three dislikes directly; the open question in this tier is monetisation, where EUR 25-50/yr consumer plans and DMO/advisor B2B tiers are the only proven price points.

## Raw files
`raw/` holds the Firecrawl copies used above (Google Play and App Store listings, Tracxn, PitchBook, Crunchbase, PhocusWire, GeekWire, BTN, Product Hunt, G2, Growjo, company sites) plus `_reddit-snippets.txt`, `_reddit-search.txt`, `_search2.txt`, `_search-vacay.txt` with the verbatim search snippets quoted for Reddit.
