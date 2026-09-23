# Terms and legal research: what we must check to stay within the rules

A checklist of every outside service and every rule XPMatch touches, with what we still need to
find out. "Checked" means we read the source on 2026-09-23 and the finding is recorded;
"Partly" means some of it is known; "Open" means not researched yet. Interpretation calls
(marked **Lawyer**) need a legal read; the rest is fact-finding we can do ourselves. This is not
legal advice.

Place data from Google is covered in depth in `docs/PLACE_DATA.md` (what others do, Google's
routes) and `docs/PLACE_DATA_REDESIGN.md` (the compliant design and its eight legal questions).

## 1. Google Maps Platform (in use: Maps JavaScript, Places, Place Photos, Routes)

| What to find out | Why it matters for us | Status |
| --- | --- | --- |
| What we may store, cache and send to a model | We store and send far more than place IDs today | Checked; redesign planned; eight questions for the **Lawyer** |
| Our Terms of Service must say the app "includes Google Maps features and content" and that its use is subject to the Google Maps End User Additional Terms and the Google Privacy Policy (Terms §3.2.2(a)) | Our Terms (xpmatchme.com, 2026-09-16) do not mention Google | Checked: **fix our Terms** |
| Attribution: the Google Maps logo wherever Google content shows without a map, photo and review author credits, Google content visibly set apart | No surface shows the logo away from the map; the Saved page, guide covers and the guide editor show no photo credit | Checked: fix in Phase 0 of the redesign |
| Google collects end-user data (search terms, IP addresses, coordinates) and the Controller-Controller Data Protection Terms apply (Terms §4.4) | Our Privacy Policy must say so | Open: **fix our Privacy Policy** |
| Prohibited Territories and the ban on apps directed at children (Terms §3.2.1) | We must not serve listed territories; our Terms already require 18+ | Open: read the Prohibited Territories list |
| What Google returns in South Korea and Japan (Routes walking and driving legs, place detail coverage) | Google Maps has long offered limited directions in South Korea; our Korea plans show travel legs | Open: test the Routes API on Seoul and Busan stops |
| Grounding with Google Maps and Maps Grounding Lite rules | Only if place questions use Google's grounding | Checked (rules); not decided |

## 2. AI model providers (in use: OpenRouter, default model `openai/gpt-4o-mini`)

| What to find out | Why it matters for us | Status |
| --- | --- | --- |
| OpenRouter's terms: acceptable use, prompt logging, zero data retention (`provider.zdr`) | Chats, profiles and screenshots go through it; Grounding Lite requires a model that keeps nothing | Partly: zero data retention confirmed per request and account-wide |
| The upstream provider's usage policy, retention and training terms for API traffic | Travelers' messages and uploads reach it | Open |
| Our Privacy Policy naming AI processors and what is sent to them | It names none today | Checked: **fix our Privacy Policy** |
| Telling people they are talking to an AI | EU AI Act Article 50 applies since 2026-08-02 (the Digital Omnibus deferred high-risk rules, not Article 50); US state bot-disclosure laws (for example California's) | Partly: the date is confirmed; check which state laws apply and whether our UI says it plainly enough (**Lawyer**) |
| Liability for AI answers (visas, safety, opening hours, prices) | The concierge gives travel advice | Open: disclaimers and wording (**Lawyer**) |

## 3. Other data sources the app uses today

| Source | What we found | What to do | Status |
| --- | --- | --- | --- |
| Open-Meteo (weather, geocoding fallback) | "You may only use the free API services for non-commercial purposes"; data under CC BY 4.0 | A paid plan or another source, and attribution | Checked: **action needed** |
| Reddit links in import (reads `reddit.com` JSON pages) | Data API Terms (revised 2026-07-20): commercial use needs "a separate agreement with Reddit"; no revenue from the Data APIs "unless there is express written approval"; delete data not needed; no AI training on user content without the rightsholders' permission | Stop reading Reddit links (screenshots only), or apply for approval | Checked: **action needed** |
| Other web pages in import (blogs, articles) | We fetch pages and send headings and descriptions to a model | Each site's terms, robots rules, copyright of what we keep | Open (**Lawyer** for the policy) |
| Screenshot import | Uploads may show Instagram, TikTok or Google Maps content | Our Terms' user-content license; whether reading a Google Maps screenshot counts as using Google content | Open (**Lawyer**) |
| Wikipedia and Wikimedia (city covers, summaries) | Text is CC BY-SA; each image has its own license and usually needs a credit; our Wikipedia images show no credit | Credit and license link on covers; follow the API's User-Agent rules | Partly: **add credits** |
| Booking and review sites we link to (Booking.com, Airbnb, Tripadvisor, OpenTable, GetYourGuide) | Plain search links today | Each affiliate program's terms once links earn money | Open |

## 4. Our own obligations

| Area | What to find out | Why | Status |
| --- | --- | --- | --- |
| Terms of Service and Privacy Policy | Both (2026-09-16) were written for the waitlist site: they cover quiz answers and IP-based location but not chats, AI processing, uploads, imports, traveler reviews, check-ins, shared trips or Google Maps. The Privacy Policy says precise location is not collected, but check-ins read it | They must describe the app | Checked: **rewrite** (**Lawyer**) |
| Privacy laws where testers are | US state laws (California's treats precise geolocation as sensitive), GDPR and UK GDPR if people there sign up, Korea's PIPA, Japan's APPI; lawful basis, processor agreements, transfers, deletion requests | Accounts, chats, profiles, photos and location | Open (**Lawyer**) |
| Check-ins with precise location | We use it once to measure distance and keep only the result; that is still collection under several laws; Korea's Location Information Act may require a report or registration for location-based services | Proof-of-visit reviews | Open (**Lawyer**) |
| Traveler reviews | The FTC's Consumer Reviews and Testimonials Rule (16 CFR 465, in force since 2024-10-21): no fake or bought reviews, no suppressing negative ones, disclose insiders, truthful "verified" badges; a moderation and takedown policy; Section 230 in the US, the DSA's notice-and-action in the EU | We publish reviews with "Checked in" badges | Open (**Lawyer**) |
| Hotel prices | The FTC's Rule on Unfair or Deceptive Fees (16 CFR 464, since 2025-05-12) covers any business that "offers, displays, or advertises" short-term lodging prices, "including third-party platforms"; the total price must be the most prominent | Hotel cards show the model's nightly estimates | Checked: decide between labeled estimates with totals and no prices (**Lawyer**) |
| Affiliate and sponsored placements | FTC Endorsement Guides; the program terms | Planned revenue | Open |
| EU platform rules, if EU users | DSA duties for user content; explaining ranking factors (Google's Places policies ask search products in Europe to) | Reviews, guides, ranked picks | Open |
| Accessibility | WCAG 2.1 AA; whether the European Accessibility Act applies once we sell | Legal exposure and reach | Open |
| Email | CAN-SPAM for marketing (password emails are transactional) | Resend | Open |

## 5. Vendors

| Vendor | What to find out | Status |
| --- | --- | --- |
| Railway (hosting, Postgres) | Terms and acceptable use, data processing agreement, data region | Open |
| Resend (email) | Acceptable use, data processing agreement, sender authentication | Open |
| CopilotKit | License of the packages we use; telemetry (disabled with `COPILOTKIT_TELEMETRY_DISABLED`) | Partly |
| npm dependencies | A license scan for anything that restricts commercial use | Open |

## 6. Before each planned source

Re-read its terms right before building and again before launch, with the same four questions:
may we store it, rank with it, mix it with other sources, and put it in a prompt?

- Event sources (KTO TourAPI, Seoul culturalEventInfo, KOPIS, Ticketmaster): first pass in
  `docs/EVENT_SOURCES.md`.
- Foursquare Open Source Places: Apache 2.0 (keep the license and NOTICE, credit the source).
- Viator, Tiqets, GetYourGuide, Klook and KKday: affiliate terms; Viator's review text must load
  in the browser, not in page source.
- Tripadvisor and Yelp: their public API terms forbid AI use, so they need a signed deal.

## 7. Order

1. **Now, no lawyer needed:** stop reading Reddit links; move weather off the free Open-Meteo API
   (or subscribe); Phase 0 of the place-data redesign (no Google content to the model, Google
   Maps logo, photo credits); Wikipedia credits.
2. **With a lawyer:** rewrite the Terms and Privacy Policy for the app (Google clauses, AI
   processors, uploads, reviews, location, shared trips); the eight Google questions; hotel price
   display; the review rules; AI disclosure and disclaimers.
3. **Before opening to more people:** the privacy-law map for where users are (US states, EU and
   UK, Korea, Japan); vendor agreements; accessibility.
4. **Before revenue:** affiliate disclosures and program terms.

## Sources (read 2026-09-23)

- [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms) (§3.2.1, §3.2.2, §4.4) ·
  [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- [OpenRouter zero data retention](https://openrouter.ai/docs/features/zdr)
- [EU AI Act Article 50](https://artificialintelligenceact.eu/article/50/) ·
  [Commission FAQ on Article 50](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act) ·
  [CSA note on the Digital Omnibus and Article 50](https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-article-50-transparency-20260729/)
- [Open-Meteo terms](https://open-meteo.com/en/terms)
- [Reddit Data API Terms](https://redditinc.com/policies/data-api-terms)
- [FTC fees rule FAQ](https://www.ftc.gov/business-guidance/resources/rule-unfair-or-deceptive-fees-frequently-asked-questions) ·
  [FTC fees rule, effective 2025-05-12](https://www.ftc.gov/news-events/news/press-releases/2025/05/ftc-rule-unfair-or-deceptive-fees-take-effect-may-12-2025)
- Our [Terms of Service](https://www.xpmatchme.com/terms-of-service) and
  [Privacy Policy](https://www.xpmatchme.com/privacy-policy) (both dated 2026-09-16)
