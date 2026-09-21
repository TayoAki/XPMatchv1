// Stand-in for the Google Places API (New): text search, nearby search, details and photos
// for a small Rome + Austell fixture set, so end-to-end runs are deterministic and free.
import http from "node:http";

const PORT = Number(process.env.PORT || 4546);

const loc = (lat, lng) => ({ latitude: lat, longitude: lng });
const comps = (city, region, country) => [
  { longText: city, shortText: city, types: ["locality"] },
  { longText: region, shortText: region, types: ["administrative_area_level_1"] },
  { longText: country, shortText: country, types: ["country"] },
];

const review = (author, rating, text, when = "2 months ago") => ({
  rating,
  relativePublishTimeDescription: when,
  text: { text },
  authorAttribution: { displayName: author, photoUri: "" },
});

/** Every fixture: search fields plus the details-only fields (reviews, hours, attributes, summaries). */
export const PLACES = [
  {
    id: "rome",
    kind: "destination",
    types: ["locality", "political"],
    primaryType: "locality",
    displayName: { text: "Rome" },
    formattedAddress: "Rome, Metropolitan City of Rome Capital, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.9028, 12.4964),
    viewport: { low: loc(41.77, 12.35), high: loc(42.03, 12.64) },
    editorialSummary: { text: "Italy's capital, layered with ancient ruins, Renaissance art and trattorias." },
    photos: [{ name: "places/rome/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=rome",
  },
  {
    id: "austell",
    kind: "destination",
    types: ["locality", "political"],
    primaryType: "locality",
    displayName: { text: "Austell" },
    formattedAddress: "Austell, GA, USA",
    addressComponents: comps("Austell", "Georgia", "United States"),
    location: loc(33.8126, -84.6344),
    viewport: { low: loc(33.78, -84.68), high: loc(33.84, -84.59) },
    photos: [{ name: "places/austell/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=austell",
  },
  // Destinations the Discover page shows every visitor: the hero default and the three collection cards.
  {
    id: "paros",
    kind: "destination",
    types: ["locality", "political"],
    primaryType: "locality",
    displayName: { text: "Paros" },
    formattedAddress: "Paros, Greece",
    addressComponents: comps("Paros", "South Aegean", "Greece"),
    location: loc(37.0853, 25.15),
    editorialSummary: { text: "Cycladic island of marble villages, windsurfing bays and quiet beaches." },
    photos: [{ name: "places/paros/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=paros",
  },
  {
    id: "amalfi-coast",
    kind: "destination",
    types: ["locality", "political"],
    primaryType: "locality",
    displayName: { text: "Amalfi Coast" },
    formattedAddress: "Amalfi Coast, Italy",
    addressComponents: comps("Amalfi", "Campania", "Italy"),
    location: loc(40.634, 14.6027),
    editorialSummary: { text: "Cliffside villages, lemon groves and the Tyrrhenian Sea." },
    photos: [{ name: "places/amalfi-coast/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=amalfi-coast",
  },
  {
    id: "banff-national-park",
    kind: "destination",
    types: ["locality", "political"],
    primaryType: "locality",
    displayName: { text: "Banff National Park" },
    formattedAddress: "Banff National Park, Improvement District No. 9, AB, Canada",
    addressComponents: comps("Banff", "Alberta", "Canada"),
    location: loc(51.4968, -115.9281),
    editorialSummary: { text: "Turquoise lakes and big-sky hikes in the Canadian Rockies." },
    photos: [{ name: "places/banff-national-park/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=banff-national-park",
  },
  {
    id: "kyoto",
    kind: "destination",
    types: ["locality", "political"],
    primaryType: "locality",
    displayName: { text: "Kyoto" },
    formattedAddress: "Kyoto, Japan",
    addressComponents: comps("Kyoto", "Kyoto Prefecture", "Japan"),
    location: loc(35.0116, 135.7681),
    editorialSummary: { text: "Temples at dawn, kaiseki at dusk." },
    photos: [{ name: "places/kyoto/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=kyoto",
  },
  {
    id: "hotel-de-russie",
    kind: "hotel",
    types: ["hotel", "lodging"],
    primaryType: "hotel",
    displayName: { text: "Hotel de Russie" },
    formattedAddress: "Via del Babuino, 9, 00187 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.9103, 12.4776),
    rating: 4.6,
    userRatingCount: 2140,
    primaryTypeDisplayName: { text: "Hotel" },
    priceLevel: "PRICE_LEVEL_VERY_EXPENSIVE",
    editorialSummary: { text: "Luxury hotel with a secret garden between Piazza del Popolo and the Spanish Steps." },
    photos: [{ name: "places/hotel-de-russie/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }, { name: "places/hotel-de-russie/photos/p2", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=russie",
    websiteUri: "https://example.test/russie",
    internationalPhoneNumber: "+39 06 328881",
    regularOpeningHours: { weekdayDescriptions: ["Monday: Open 24 hours", "Tuesday: Open 24 hours"] },
    reviewSummary: { text: { text: "Guests praise the garden courtyard and the location; rooms facing the piazza can be noisy at night." } },
    reviews: [
      review("Marta L.", 5, "The secret garden is magical and breakfast on the terrace was the highlight of our stay. Very quiet at night in the garden-side rooms."),
      review("James K.", 4, "Beautiful hotel, impeccable service. Our room faced the piazza and traffic noise kept us up until late, so ask for the courtyard side."),
      review("Sofia R.", 5, "The spa is excellent and the staff remembered our names. Expensive, but worth it for a special occasion.", "3 weeks ago"),
      review("Daniel P.", 3, "Lovely building but the room was small for the price and the wifi dropped during my work calls.", "5 months ago"),
      review("Aiko T.", 5, "Perfect location, ten minutes on foot to the Spanish Steps and Villa Borghese. Dog-friendly too, they brought a bowl for our pup.", "1 month ago"),
    ],
    allowsDogs: true,
    goodForChildren: true,
    accessibilityOptions: { wheelchairAccessibleEntrance: true, wheelchairAccessibleRestroom: true },
    parkingOptions: { valetParking: true },
    paymentOptions: { acceptsCreditCards: true },
  },
  {
    id: "hotel-artemide",
    kind: "hotel",
    types: ["hotel", "lodging"],
    primaryType: "hotel",
    displayName: { text: "Hotel Artemide" },
    formattedAddress: "Via Nazionale, 22, 00184 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.9007, 12.4921),
    rating: 4.6,
    userRatingCount: 5320,
    primaryTypeDisplayName: { text: "Hotel" },
    priceLevel: "PRICE_LEVEL_EXPENSIVE",
    editorialSummary: { text: "Boutique hotel on Via Nazionale with a rooftop terrace and a small spa." },
    photos: [{ name: "places/hotel-artemide/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=artemide",
    websiteUri: "https://example.test/artemide",
    internationalPhoneNumber: "+39 06 489911",
    regularOpeningHours: { weekdayDescriptions: ["Monday: Open 24 hours"] },
    reviewSummary: { text: { text: "Travelers like the rooftop terrace, the breakfast and the walkable location; a few mention street noise from Via Nazionale." } },
    reviews: [
      review("Lena W.", 5, "Rooftop terrace with a hot tub and a view over the domes. Breakfast was generous. Courtyard rooms are quiet."),
      review("Omar S.", 4, "Great value for central Rome. Via Nazionale is busy, so the front rooms hear the buses early in the morning."),
      review("Chloe M.", 5, "Staff went out of their way, the free minibar is a nice touch and Termini is a short walk.", "2 weeks ago"),
      review("Ravi N.", 4, "Comfortable beds and a good desk for working. The elevator is tiny.", "4 months ago"),
      review("Giulia F.", 5, "Spotless and central. Vegetarian options at breakfast were plentiful.", "6 days ago"),
    ],
    allowsDogs: false,
    goodForChildren: true,
    accessibilityOptions: { wheelchairAccessibleEntrance: true },
    paymentOptions: { acceptsCreditCards: true, acceptsCashOnly: false },
  },
  {
    id: "hotel-hassler",
    kind: "hotel",
    types: ["hotel", "lodging"],
    primaryType: "hotel",
    displayName: { text: "Hotel Hassler Roma" },
    formattedAddress: "Piazza della Trinità dei Monti, 6, 00187 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.9061, 12.4833),
    rating: 4.7,
    userRatingCount: 1980,
    primaryTypeDisplayName: { text: "Hotel" },
    priceLevel: "PRICE_LEVEL_VERY_EXPENSIVE",
    photos: [{ name: "places/hotel-hassler/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=hassler",
    reviews: [review("Paul D.", 5, "Top of the Spanish Steps, rooftop restaurant with the best view in Rome. Quiet rooms.")],
  },
  {
    id: "roscioli",
    kind: "restaurant",
    types: ["restaurant", "food"],
    primaryType: "restaurant",
    displayName: { text: "Roscioli Salumeria con Cucina" },
    formattedAddress: "Via dei Giubbonari, 21, 00186 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.8937, 12.4737),
    rating: 4.5,
    userRatingCount: 6100,
    primaryTypeDisplayName: { text: "Italian restaurant" },
    priceLevel: "PRICE_LEVEL_EXPENSIVE",
    editorialSummary: { text: "Deli-restaurant famous for carbonara, burrata and a deep wine list." },
    photos: [{ name: "places/roscioli/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=roscioli",
    regularOpeningHours: { weekdayDescriptions: ["Monday: 12:30–4:00 PM, 7:00–11:30 PM"] },
    reviewSummary: { text: { text: "Diners rave about the carbonara and the cheese board; tables are tight and booking well ahead is essential." } },
    reviews: [
      review("Ines B.", 5, "Best carbonara of the trip. Book weeks ahead, we got in only because of a cancellation."),
      review("Tom H.", 4, "Wonderful food but the tables are very close together and it gets loud."),
      review("Mei C.", 5, "The burrata and the wine pairing were superb. Great vegetarian pasta options too.", "1 month ago"),
      review("Luca V.", 4, "Pricey for Rome, but the quality justifies it.", "3 months ago"),
      review("Anna S.", 5, "Staff helped with a shellfish allergy without fuss.", "2 weeks ago"),
    ],
    servesVegetarianFood: true,
    reservable: true,
    outdoorSeating: false,
    goodForGroups: false,
    dineIn: true,
    takeout: true,
  },
  {
    id: "da-enzo",
    kind: "restaurant",
    types: ["restaurant", "food"],
    primaryType: "restaurant",
    displayName: { text: "Trattoria Da Enzo al 29" },
    formattedAddress: "Via dei Vascellari, 29, 00153 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.8878, 12.4778),
    rating: 4.5,
    userRatingCount: 4400,
    primaryTypeDisplayName: { text: "Trattoria" },
    priceLevel: "PRICE_LEVEL_MODERATE",
    photos: [{ name: "places/da-enzo/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=enzo",
    reviews: [
      review("Bea M.", 5, "Tiny Trastevere trattoria, cacio e pepe to die for. Expect a queue, no reservations."),
      review("Karl J.", 4, "Loud and cramped but that's the charm. Cash and cards accepted."),
    ],
    reservable: false,
    outdoorSeating: true,
    servesVegetarianFood: true,
  },
  {
    id: "sushisen",
    kind: "restaurant",
    types: ["sushi_restaurant", "restaurant"],
    primaryType: "sushi_restaurant",
    displayName: { text: "Sushisen" },
    formattedAddress: "Via Giuseppe Giulietti, 21A, 00154 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.8721, 12.4805),
    rating: 4.6,
    userRatingCount: 900,
    primaryTypeDisplayName: { text: "Sushi restaurant" },
    priceLevel: "PRICE_LEVEL_MODERATE",
    photos: [{ name: "places/sushisen/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=sushisen",
    reviews: [review("Yuki O.", 5, "Cozy and quiet, the omakase is a steal for the price.")],
    servesVegetarianFood: false,
    reservable: true,
  },
  {
    id: "colosseum",
    kind: "attraction",
    types: ["tourist_attraction", "historical_landmark"],
    primaryType: "historical_landmark",
    displayName: { text: "Colosseum" },
    formattedAddress: "Piazza del Colosseo, 1, 00184 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.8902, 12.4922),
    rating: 4.7,
    userRatingCount: 402000,
    primaryTypeDisplayName: { text: "Historical landmark" },
    editorialSummary: { text: "The Flavian amphitheatre, Rome's most visited monument." },
    photos: [{ name: "places/colosseum/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=colosseum",
    regularOpeningHours: {
      weekdayDescriptions: ["Monday: 8:30 AM–7:15 PM", "Tuesday: 8:30 AM–7:15 PM", "Wednesday: 8:30 AM–7:15 PM", "Thursday: 8:30 AM–7:15 PM", "Friday: 8:30 AM–7:15 PM", "Saturday: 8:30 AM–7:15 PM", "Sunday: 8:30 AM–7:15 PM"],
    },
    reviewSummary: { text: { text: "Visitors call it unmissable; most advise booking timed tickets and going early to avoid the crowds and the heat." } },
    reviews: [
      review("Nadia K.", 5, "Unmissable. Book the timed entry online, the queue without it was two hours in the sun."),
      review("Pete R.", 4, "Crowded by 10am; the underground tour is worth the extra ticket. About two hours in total."),
      review("Hana L.", 5, "Went at opening and had the arena nearly to ourselves.", "3 weeks ago"),
      review("Sam O.", 3, "Lots of stairs and uneven ground, hard with a stroller.", "2 months ago"),
      review("Ella G.", 5, "Kids loved it, the audio guide kept them engaged.", "1 month ago"),
    ],
    goodForChildren: true,
    accessibilityOptions: { wheelchairAccessibleEntrance: true },
  },
  {
    id: "pantheon",
    kind: "attraction",
    types: ["tourist_attraction", "historical_landmark"],
    primaryType: "historical_landmark",
    displayName: { text: "Pantheon" },
    formattedAddress: "Piazza della Rotonda, 00186 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.8986, 12.4769),
    rating: 4.8,
    userRatingCount: 250000,
    primaryTypeDisplayName: { text: "Historical landmark" },
    photos: [{ name: "places/pantheon/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=pantheon",
    reviews: [review("Tim W.", 5, "Free-ish (small ticket now), quick visit, spectacular dome. Go early, it gets packed.")],
  },
  {
    id: "villa-borghese",
    kind: "attraction",
    types: ["park", "tourist_attraction"],
    primaryType: "park",
    displayName: { text: "Villa Borghese" },
    formattedAddress: "Piazzale Napoleone I, 00197 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.9142, 12.4923),
    rating: 4.7,
    userRatingCount: 98000,
    primaryTypeDisplayName: { text: "Park" },
    photos: [{ name: "places/villa-borghese/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=borghese",
    reviews: [review("Rosa P.", 5, "Green escape with a lake and the Galleria Borghese. Rent a bike.")],
  },
  {
    id: "trastevere",
    kind: "attraction",
    types: ["neighborhood", "tourist_attraction"],
    primaryType: "neighborhood",
    displayName: { text: "Trastevere" },
    formattedAddress: "Trastevere, 00153 Roma RM, Italy",
    addressComponents: comps("Rome", "Lazio", "Italy"),
    location: loc(41.8867, 12.4692),
    rating: 4.7,
    userRatingCount: 12000,
    primaryTypeDisplayName: { text: "Neighborhood" },
    photos: [{ name: "places/trastevere/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=trastevere",
    reviews: [review("Nico D.", 5, "Cobbled lanes, lively at night, great for an evening stroll and aperitivo.")],
  },
  {
    id: "sweetwater",
    kind: "attraction",
    types: ["park", "tourist_attraction", "hiking_area"],
    primaryType: "park",
    displayName: { text: "Sweetwater Creek State Park" },
    formattedAddress: "1750 Mt Vernon Rd, Lithia Springs, GA 30122, USA",
    addressComponents: comps("Lithia Springs", "Georgia", "United States"),
    location: loc(33.7536, -84.6283),
    rating: 4.8,
    userRatingCount: 9800,
    primaryTypeDisplayName: { text: "State park" },
    photos: [{ name: "places/sweetwater/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=sweetwater",
    reviews: [review("Dee A.", 5, "Mill ruins hike is gorgeous after rain. Get there early on weekends.")],
  },
  {
    id: "marlow",
    kind: "restaurant",
    types: ["restaurant", "american_restaurant"],
    primaryType: "restaurant",
    displayName: { text: "Marlow's Tavern Austell" },
    formattedAddress: "3999 Austell Rd, Austell, GA 30106, USA",
    addressComponents: comps("Austell", "Georgia", "United States"),
    location: loc(33.8399, -84.6091),
    rating: 4.5,
    userRatingCount: 1500,
    primaryTypeDisplayName: { text: "American restaurant" },
    priceLevel: "PRICE_LEVEL_MODERATE",
    photos: [{ name: "places/marlow/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=marlow",
    reviews: [review("Ken B.", 4, "Reliable burgers and a good patio.")],
    outdoorSeating: true,
  },
  {
    id: "six-flags",
    kind: "attraction",
    types: ["amusement_park", "tourist_attraction"],
    primaryType: "amusement_park",
    displayName: { text: "Six Flags Over Georgia" },
    formattedAddress: "275 Riverside Pkwy, Austell, GA 30168, USA",
    addressComponents: comps("Austell", "Georgia", "United States"),
    location: loc(33.7706, -84.5518),
    rating: 4.3,
    userRatingCount: 60000,
    primaryTypeDisplayName: { text: "Amusement park" },
    photos: [{ name: "places/six-flags/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=sixflags",
    reviews: [review("Jo F.", 4, "Great coasters, long lines in summer.")],
    goodForChildren: true,
  },
  {
    id: "hampton-austell",
    kind: "hotel",
    types: ["hotel", "lodging"],
    primaryType: "hotel",
    displayName: { text: "Hampton Inn Austell" },
    formattedAddress: "1801 Wildwood Pkwy, Austell, GA 30168, USA",
    addressComponents: comps("Austell", "Georgia", "United States"),
    location: loc(33.7899, -84.5901),
    rating: 4.2,
    userRatingCount: 700,
    primaryTypeDisplayName: { text: "Hotel" },
    priceLevel: "PRICE_LEVEL_MODERATE",
    photos: [{ name: "places/hampton-austell/photos/p1", authorAttributions: [{ displayName: "A Google user", uri: "https://maps.google.com/maps/contrib/0" }] }],
    googleMapsUri: "https://maps.google.com/?cid=hampton",
    reviews: [review("Val C.", 4, "Clean, quiet, free breakfast.")],
  },
];

const KIND_WORDS = {
  hotel: /\b(hotel|hotels|stay|stays|lodging|resort|resorts|inn|hostel|hostels|boutique|apartments?|b&b|guesthouses?)\b/i,
  restaurant: /\b(restaurants?|food|eat|dinner|lunch|trattorias?|sushi|pizza|cafes?|cafés?|bakeries|bar|bars|brunch|bistros?|steakhouses?|vegetarian|vegan|japanese|italian|mexican)\b/i,
  attraction: /\b(things to do|attractions?|museums?|galleries|gallery|art|parks?|landmarks?|sights|tours?|hiking|hikes|trails?|viewpoints?|markets?|neighborhoods?|beaches|spas?|nightlife)\b/i,
};

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

function distanceKm(a, b) {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const SEARCH_FIELDS = ["id", "displayName", "formattedAddress", "addressComponents", "location", "viewport", "rating", "userRatingCount", "primaryTypeDisplayName", "photos", "editorialSummary", "googleMapsUri", "websiteUri", "priceLevel", "types"];

function project(place, fields) {
  const out = {};
  for (const f of fields) if (place[f] !== undefined) out[f] = place[f];
  return out;
}

function detailsOf(place) {
  const { kind: _kind, ...rest } = place;
  return rest;
}

/** Text search: exact-name matches first, then kind words, then anything near the bias. */
function textSearch(body) {
  const q = norm(body.textQuery);
  const bias = body.locationBias?.circle?.center;
  const tokens = q.split(" ").filter(Boolean);
  const scored = PLACES.map((p) => {
    const name = norm(p.displayName.text);
    let score = 0;
    if (q && name.includes(q)) score += 100;
    // Destination lookups arrive as "Rome, Italy" or "Austell, GA": the city name leads the query.
    if (p.kind === "destination" && q.startsWith(name)) score += 200;
    for (const t of tokens) if (t.length > 2 && name.includes(t)) score += 10;
    for (const [kind, re] of Object.entries(KIND_WORDS)) if (re.test(q) && p.kind === kind) score += 5;
    if (/\brome\b|\broma\b|\bitaly\b/.test(q) && p.addressComponents[2].longText === "Italy") score += 2;
    if (/\baustell\b|\bgeorgia\b|\bga\b/.test(q) && p.addressComponents[1].longText === "Georgia") score += 2;
    if (bias && p.kind !== "destination") {
      const d = distanceKm(bias, p.location);
      if (d < 40) score += 1;
      else score -= 50;
    }
    if (p.kind === "destination" && !/\brome\b|\broma\b|\baustell\b|\bparos\b|\bamalfi\b|\bbanff\b|\bkyoto\b/.test(q)) score -= 20;
    // "hotels in Rome" is a query for hotels, not for the city: Google would not answer with the locality.
    if (p.kind === "destination" && Object.values(KIND_WORDS).some((re) => re.test(q))) score -= 50;
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  let places = scored.map((x) => x.p);
  if (body.priceLevels?.length) places = places.filter((p) => !p.priceLevel || body.priceLevels.includes(p.priceLevel));
  if (body.minRating) places = places.filter((p) => (p.rating ?? 0) >= body.minRating);
  const limit = body.maxResultCount ?? body.pageSize ?? 10;
  return places.slice(0, limit);
}

function nearbySearch(body) {
  const center = body.locationRestriction?.circle?.center;
  const radiusKm = (body.locationRestriction?.circle?.radius ?? 25000) / 1000;
  const types = new Set(body.includedPrimaryTypes ?? []);
  return PLACES.filter((p) => p.kind !== "destination" && center && distanceKm(center, p.location) <= radiusKm && (types.size === 0 || types.has(p.primaryType)))
    .sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0))
    .slice(0, body.maxResultCount ?? 20);
}

// Placeholder "photos": an SVG gradient with the place's name, so cards and demo recordings look like
// something without any network. The proxy passes the content type through, so <img> renders it.
const PALETTES = [
  ["#f59e0b", "#ef4444"],
  ["#0ea5e9", "#6366f1"],
  ["#10b981", "#0ea5e9"],
  ["#a855f7", "#ec4899"],
  ["#84cc16", "#14b8a6"],
  ["#f97316", "#e11d48"],
];
function photoSvg(placeId) {
  const place = PLACES.find((p) => p.id === placeId);
  const name = place?.displayName?.text ?? placeId;
  let h = 0;
  for (const c of placeId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="640" cy="140" r="90" fill="#fff" fill-opacity="0.18"/>
  <circle cx="160" cy="470" r="140" fill="#fff" fill-opacity="0.12"/>
  <text x="40" y="540" font-family="Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#fff" fill-opacity="0.92">${esc(name)}</text>
</svg>`;
}

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const send = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };
    try {
      if (req.method === "POST" && url.pathname === "/v1/places:searchText") {
        return send(200, { places: textSearch(JSON.parse(body || "{}")).map((p) => project(p, SEARCH_FIELDS)) });
      }
      if (req.method === "POST" && url.pathname === "/v1/places:searchNearby") {
        return send(200, { places: nearbySearch(JSON.parse(body || "{}")).map((p) => project(p, SEARCH_FIELDS)) });
      }
      const photo = url.pathname.match(/^\/v1\/places\/([^/]+)\/photos\/([^/]+)\/media$/);
      if (req.method === "GET" && photo) {
        return send(200, { photoUri: `http://localhost:${PORT}/photo/${photo[1]}-${photo[2]}.png` });
      }
      if (req.method === "GET" && url.pathname.startsWith("/photo/")) {
        const placeId = url.pathname.slice("/photo/".length).replace(/-p\d+\.png$/, "");
        const svg = photoSvg(placeId);
        res.writeHead(200, { "Content-Type": "image/svg+xml", "Content-Length": Buffer.byteLength(svg) });
        return res.end(svg);
      }
      const details = url.pathname.match(/^\/v1\/places\/([^/]+)$/);
      if (req.method === "GET" && details) {
        const place = PLACES.find((p) => p.id === decodeURIComponent(details[1]));
        if (!place) return send(404, { error: { message: "not found" } });
        return send(200, detailsOf(place));
      }
      // Routes API stand-in: legs from straight-line distance and a speed per mode, so tests are deterministic.
      if (req.method === "POST" && url.pathname === "/directions/v2:computeRoutes") {
        if (!req.headers["x-goog-api-key"]) return send(403, { error: { message: "missing key" } });
        const b = JSON.parse(body || "{}");
        const pt = (w) => ({ lat: Number(w?.location?.latLng?.latitude), lng: Number(w?.location?.latLng?.longitude) });
        const points = [pt(b.origin), ...(b.intermediates || []).map(pt), pt(b.destination)];
        if (points.some((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng))) return send(400, { error: { message: "bad waypoint" } });
        const speed = b.travelMode === "WALK" ? 5 : b.travelMode === "TRANSIT" ? 15 : 30;
        const toRad = (d) => (d * Math.PI) / 180;
        const legs = [];
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1];
          const c = points[i];
          const h = Math.sin(toRad(c.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(c.lat)) * Math.sin(toRad(c.lng - a.lng) / 2) ** 2;
          const km = 2 * 6371 * Math.asin(Math.sqrt(h)) * 1.25;
          legs.push({ distanceMeters: Math.round(km * 1000), duration: `${Math.max(60, Math.round((km / speed) * 3600))}s` });
        }
        return send(200, { routes: [{ legs }] });
      }
      return send(404, { error: { message: `no route for ${req.method} ${url.pathname}` } });
    } catch (err) {
      return send(500, { error: { message: String(err) } });
    }
  });
});

server.listen(PORT, () => console.log(`mock places listening on ${PORT}`));
