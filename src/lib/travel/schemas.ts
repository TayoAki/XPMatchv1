import { z } from "zod";

/**
 * Parameter schemas for the generative-UI tools the assistant can call from
 * the chat. The model fills these in; the client renders them as rich cards.
 */

export const priceTierSchema = z
  .enum(["$", "$$", "$$$", "$$$$"])
  .describe("Relative price tier from $ (cheap) to $$$$ (splurge)");

export const destinationSchema = z.object({
  name: z.string().describe("City or place name, e.g. 'Lisbon'"),
  country: z.string().describe("Country or region"),
  tagline: z.string().describe("One punchy line describing the vibe"),
  whyItFits: z
    .string()
    .describe("1-2 sentences tying this pick to the traveler's stated preferences"),
  bestTime: z.string().describe("Best months or season to visit, briefly"),
  estimatedDailyBudgetUsd: z
    .number()
    .describe("Realistic mid-range daily budget per person in USD, excluding flights"),
  highlights: z.array(z.string()).describe("3-5 short highlights (places, foods, experiences)"),
  vibes: z.array(z.string()).describe("2-4 vibe tags, e.g. 'food', 'beach', 'nightlife'"),
});

export const showDestinationsSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Warm escapes in November'"),
  destinations: z.array(destinationSchema).min(1).max(6),
});

/** Honest downsides for this traveler ("street noise at night", "20-minute walk to the metro"). */
export const tradeoffsSchema = z
  .array(z.string())
  .max(3)
  .optional()
  .describe(
    "0-3 short heads-ups this traveler should know before choosing: real, specific downsides (noise, distance, stairs, crowds, price creep, limited hours). Name any conflict with their dealbreakers explicitly. Omit when nothing notable is known; never invent.",
  );

export const hotelSchema = z.object({
  name: z.string(),
  area: z.string().describe("Neighborhood or district"),
  style: z.string().describe("Boutique, design, resort, aparthotel, hostel, etc."),
  priceTier: priceTierSchema,
  nightlyEstimateUsd: z.number().describe("Typical nightly rate estimate in USD"),
  rating: z.number().min(0).max(5).optional().describe("Typical guest rating out of 5, if known"),
  whyItFits: z.string(),
  amenities: z.array(z.string()).describe("3-5 notable amenities"),
  tradeoffs: tradeoffsSchema,
});

export const showHotelsSchema = z.object({
  destination: z.string().describe("City the hotels are in"),
  checkIn: z.string().optional().describe("YYYY-MM-DD"),
  checkOut: z.string().optional().describe("YYYY-MM-DD"),
  guests: z.number().int().optional(),
  hotels: z.array(hotelSchema).min(1).max(6),
});

export const flightOptionSchema = z.object({
  airline: z.string(),
  routeSummary: z.string().describe("e.g. 'ATL → DFW nonstop' or 'ATL → CLT → LIS'"),
  stops: z.number().int().min(0),
  durationText: z.string().describe("e.g. '2h 15m'"),
  cabin: z.string().describe("Economy, Premium Economy, Business"),
  estimatedPriceUsd: z.number().describe("Round-trip estimate per person in USD"),
  departureWindow: z.string().describe("e.g. 'Morning departure, evening return'"),
  notes: z.string().optional().describe("Bag policy, why this option, caveats"),
  tradeoffs: tradeoffsSchema,
});

export const showFlightsSchema = z.object({
  origin: z.string().describe("Origin city or airport code"),
  destination: z.string().describe("Destination city or airport code"),
  departDate: z.string().optional().describe("YYYY-MM-DD"),
  returnDate: z.string().optional().describe("YYYY-MM-DD"),
  travelers: z.number().int().optional(),
  options: z.array(flightOptionSchema).min(1).max(5),
});

export const restaurantSchema = z.object({
  name: z.string(),
  cuisine: z.string(),
  neighborhood: z.string(),
  priceTier: priceTierSchema,
  mustTry: z.string().describe("The dish or experience to order"),
  whyItFits: z.string(),
  reservationRecommended: z.boolean(),
  bestFor: z.string().describe("e.g. 'dinner date', 'quick lunch', 'group brunch'"),
  tradeoffs: tradeoffsSchema,
});

export const showRestaurantsSchema = z.object({
  destination: z.string(),
  restaurants: z.array(restaurantSchema).min(1).max(6),
});

export const attractionSchema = z.object({
  name: z.string(),
  category: z.string().describe("Museum, park, viewpoint, tour, market, nightlife..."),
  neighborhood: z.string(),
  description: z.string().describe("One or two sentences"),
  whyItFits: z.string(),
  bestTimeOfDay: z.string(),
  durationHours: z.number().describe("Typical visit length in hours"),
  ticketNote: z.string().describe("Free / book ahead / typical price"),
  tradeoffs: tradeoffsSchema,
});

export const showAttractionsSchema = z.object({
  destination: z.string(),
  attractions: z.array(attractionSchema).min(1).max(8),
});

export const itineraryStopSchema = z.object({
  name: z.string().describe("The place exactly as named on Google Maps (e.g. 'Colosseum', 'Roscioli Salumeria con Cucina'), or a plain activity like 'Check in and drop bags'"),
  kind: z.enum(["hotel", "restaurant", "attraction"]).optional().describe("Set when the stop is a real place so it can be pinned on the map"),
  note: z.string().optional().describe("Timing or tip, e.g. 'at opening, book the arena floor'"),
  startTime: z.string().optional().describe("HH:MM when the day has a schedule"),
  durationMin: z.number().int().optional().describe("Typical time spent, in minutes"),
});

export const itineraryDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().describe("Theme of the day, e.g. 'Old town & sunset views'"),
  stops: z.array(itineraryStopSchema).min(1).max(8).describe("3-6 stops in order; real places get a kind so they appear on the map"),
});

export const scheduleStopsSchema = z.object({
  stops: z
    .array(
      z.object({
        name: z.string().describe("Place exactly as named on Google Maps, or a plain activity"),
        day: z.number().int().min(1).describe("Day number to put it on (a new day is created when needed)"),
        kind: z.enum(["hotel", "restaurant", "attraction"]).optional(),
        note: z.string().optional(),
        startTime: z.string().optional().describe("HH:MM"),
        durationMin: z.number().int().optional(),
      }),
    )
    .min(1)
    .max(10),
});

export type ScheduleStopsArgs = z.infer<typeof scheduleStopsSchema>;

export const createTripSchema = z.object({
  title: z.string().describe("Short trip title, e.g. 'Long weekend in Dallas'"),
  destination: z.string(),
  startDate: z.string().optional().describe("YYYY-MM-DD"),
  endDate: z.string().optional().describe("YYYY-MM-DD"),
  travelers: z.number().int().optional(),
  budgetTier: z.string().optional().describe("budget | mid-range | premium | luxury"),
  summary: z.string().describe("2-3 sentences on the plan and why it fits this traveler"),
  itinerary: z.array(itineraryDaySchema).min(1).max(14),
});

export const updateTravelerProfileSchema = z.object({
  name: z.string().optional(),
  homeCity: z.string().optional(),
  homeAirport: z.string().optional().describe("IATA code like ATL"),
  travelStyles: z.array(z.string()).optional().describe("Replace the full list of styles"),
  pace: z.enum(["relaxed", "balanced", "packed"]).optional(),
  budgetTier: z.enum(["budget", "mid-range", "premium", "luxury"]).optional(),
  companions: z.enum(["solo", "partner", "family", "friends", "mixed"]).optional(),
  dietary: z.string().optional(),
  accommodation: z.string().optional().describe("Preferred stay type, e.g. boutique hotels"),
  notes: z.string().optional().describe("Anything else worth remembering"),
  interests: z.array(z.string()).optional().describe("Things-to-do interests, replaces the list: Museums & art, History & architecture, Food tours & markets, Nightlife, Live music, Nature & hiking, Beaches, Wellness & spa, Shopping, Photography spots, Sports & adventure, Family activities, Local neighborhoods, Coffee culture, Wine & craft beer, Street food"),
  stayTypes: z.array(z.string()).optional().describe("Replaces the list: Boutique hotel, Design hotel, Luxury resort, Budget hotel, Apartment, Hostel, B&B / guesthouse, Business hotel"),
  stayMustHaves: z.array(z.string()).optional().describe("Replaces the list: Pool, Gym, Breakfast included, Kitchen, Central location, Quiet room, Workspace, Free cancellation, Walkable area, Near transit, Parking"),
  cuisines: z.array(z.string()).optional().describe("Replaces the list: Italian, Japanese, Mexican, Thai, Indian, French, Middle Eastern, Korean, Chinese, Seafood, Steakhouse, Plant-based, Street food, Fine dining, Cafés & bakeries"),
  dietaryTags: z.array(z.string()).optional().describe("Replaces the list: Vegetarian, Vegan, Gluten-free, Halal, Kosher, No shellfish, Nut allergy"),
  foodAdventure: z.enum(["safe", "mix", "adventurous"]).optional(),
  dayRhythm: z.enum(["early", "balanced", "late"]).optional().describe("early riser / in between / night owl"),
  walking: z.enum(["lots", "moderate", "little"]).optional().describe("How much walking they enjoy in a day"),
  transport: z.enum(["walk-transit", "rideshare", "car", "mixed"]).optional(),
  flightPreference: z.enum(["nonstop", "cheapest", "comfort", "flexible"]).optional(),
  nextDestination: z.string().optional().describe("Where they are dreaming of going next"),
  nextWhen: z.string().optional().describe("Roughly when, e.g. 'October' or 'spring 2027'"),
});

export const focusMapSchema = z.object({
  location: z
    .string()
    .describe("Canonical destination with region/country as it appears on Google Maps, e.g. 'Rome, Italy' (fix typos: 'roam' → 'Rome, Italy')"),
  reason: z.string().optional().describe("Short note on why the map moved, e.g. 'traveler wants to visit'"),
});

export type FocusMapArgs = z.infer<typeof focusMapSchema>;
export type Destination = z.infer<typeof destinationSchema>;
export type ShowDestinationsArgs = z.infer<typeof showDestinationsSchema>;
export type Hotel = z.infer<typeof hotelSchema>;
export type ShowHotelsArgs = z.infer<typeof showHotelsSchema>;
export type FlightOption = z.infer<typeof flightOptionSchema>;
export type ShowFlightsArgs = z.infer<typeof showFlightsSchema>;
export type Restaurant = z.infer<typeof restaurantSchema>;
export type ShowRestaurantsArgs = z.infer<typeof showRestaurantsSchema>;
export type Attraction = z.infer<typeof attractionSchema>;
export type ShowAttractionsArgs = z.infer<typeof showAttractionsSchema>;
export type CreateTripArgs = z.infer<typeof createTripSchema>;
export type UpdateTravelerProfileArgs = z.infer<typeof updateTravelerProfileSchema>;

/** Deep-partial helper for rendering while tool arguments are still streaming. */
export type Streaming<T> = T extends (infer U)[]
  ? Streaming<U>[]
  : T extends object
    ? { [K in keyof T]?: Streaming<T[K]> }
    : T;

/** Edits to the trip currently in context (all fields optional; itinerary and preferences replace the existing values). */
export const updateTripPlanSchema = z.object({
  title: z.string().optional().describe("New trip title"),
  destination: z.string().optional().describe("New destination, 'City, Country'"),
  startDate: z.string().optional().describe("YYYY-MM-DD"),
  endDate: z.string().optional().describe("YYYY-MM-DD"),
  travelers: z.number().int().optional(),
  budgetTier: z.string().optional().describe("budget | mid-range | premium | luxury"),
  summary: z.string().optional().describe("2-3 sentence overview of the plan"),
  itinerary: z.array(itineraryDaySchema).max(14).optional().describe("Complete day-by-day plan; replaces the current itinerary"),
  preferences: z.string().optional().describe("Trip-specific preferences to remember, e.g. 'no early mornings, vegetarian'; replaces the current notes"),
});

export const addTripIdeasSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().describe("Place name as it appears on Google Maps"),
        kind: z.enum(["hotel", "restaurant", "attraction", "destination"]).describe("What kind of place this is"),
        note: z.string().optional().describe("One line on why it belongs in this trip"),
      }),
    )
    .min(1)
    .max(8),
});

export type UpdateTripPlanArgs = z.infer<typeof updateTripPlanSchema>;
export type AddTripIdeasArgs = z.infer<typeof addTripIdeasSchema>;

/* ------------------------- Wave 1: smart filters ------------------------- */

export const constraintKindSchema = z.enum(["hotels", "restaurants", "attractions", "flights", "destinations"]);

export const searchConstraintSchema = z.object({
  label: z.string().describe("Short chip text as the traveler would say it, e.g. 'Quiet', 'Under $250/night', 'Near restaurants', 'Pool'"),
  type: z.enum(["budget", "area", "amenity", "vibe", "dietary", "timing", "distance", "other"]),
  value: z.string().optional().describe("Normalized value when useful, e.g. '250 USD/night', 'Trastevere', 'vegetarian'"),
  hard: z.boolean().describe("true when the traveler stated it as a requirement; false for a preference"),
});

export const setSearchConstraintsSchema = z.object({
  kind: constraintKindSchema.describe("What is being searched"),
  constraints: z.array(searchConstraintSchema).max(10).describe("One chip per criterion the traveler stated (from this message and earlier ones still in force)"),
  notUnderstood: z.array(z.string()).max(5).optional().describe("Phrases you could not turn into a concrete criterion, e.g. 'good vibes'"),
});

export type SearchConstraintArg = z.infer<typeof searchConstraintSchema>;
export type SetSearchConstraintsArgs = z.infer<typeof setSearchConstraintsSchema>;

/* ------------------------- Wave 1: comparison ------------------------- */

export const compareVerdictSchema = z.enum(["strong", "ok", "weak", "unknown"]);

export const compareOptionSchema = z.object({
  name: z.string().describe("Exactly the option's name as shown on its card"),
  area: z.string().optional().describe("Neighborhood or route"),
  priceEstimateUsd: z.number().optional().describe("Per night, per meal or per ticket, matching the kind"),
  rating: z.number().min(0).max(5).optional(),
  cells: z
    .array(
      z.object({
        priority: z.string().describe("Must match one entry of `priorities`"),
        verdict: compareVerdictSchema.describe("strong = clearly delivers, ok = fine, weak = falls short, unknown = you do not know"),
        note: z.string().describe("One short line of evidence or the compromise"),
      }),
    )
    .describe("One cell per priority, in the same order"),
  strengths: z.array(z.string()).max(3),
  compromises: z.array(z.string()).max(3).describe("What the traveler gives up by choosing this"),
  unknowns: z.array(z.string()).max(3).describe("Things you could not verify (never guess them)"),
});

export const compareOptionsSchema = z.object({
  kind: constraintKindSchema,
  priorities: z.array(z.string()).min(2).max(5).describe("What matters most to THIS traveler, in order, drawn from their profile, learned preferences, active constraints and the question (e.g. 'Quiet at night', 'Walkable to Trastevere', 'Under $250')"),
  options: z.array(compareOptionSchema).min(2).max(3),
  recommendation: z.string().describe("One or two sentences: which to pick for whom, hedged where evidence is thin"),
});

export type CompareOptionsArgs = z.infer<typeof compareOptionsSchema>;
export type CompareOptionArg = z.infer<typeof compareOptionSchema>;

/* ---------------------- Wave 2: questions from reviews ---------------------- */

export const askAboutPlaceSchema = z.object({
  name: z.string().describe("The place exactly as named on its card or on Google Maps"),
  kind: z.enum(["hotel", "restaurant", "attraction"]).optional(),
  destination: z.string().optional().describe("City the place is in, 'City, Country'"),
  question: z.string().describe("The traveler's question about this place, in their words"),
});

export type AskAboutPlaceArgs = z.infer<typeof askAboutPlaceSchema>;

/* -------------------- Wave 1: learn preferences in chat -------------------- */

export const rememberPreferenceSchema = z.object({
  statement: z.string().describe("The preference in the traveler's own terms, in the third person, e.g. 'Prefers boutique hotels over chains'"),
  domain: z.enum(["stays", "food", "flights", "activities", "general"]),
  polarity: z.enum(["like", "dislike", "dealbreaker"]).describe("like = wants more of it, dislike = avoid when possible, dealbreaker = never"),
});

export type RememberPreferenceArgs = z.infer<typeof rememberPreferenceSchema>;

/* ----------------------- Wave 2: taste profile ----------------------- */

export const recordFeedbackSchema = z.object({
  name: z.string().describe("The place exactly as named on its card or on Google Maps"),
  kind: z.enum(["hotel", "restaurant", "attraction", "destination"]),
  verdict: z.enum(["loved", "fine", "disliked"]).describe("loved = would go back, fine = okay, disliked = not for them"),
  reasons: z.array(z.string()).max(4).optional().describe("Short reasons in the traveler's words, e.g. 'Noisy', 'Great location'"),
  note: z.string().optional().describe("One line to remember, in the traveler's words"),
  destination: z.string().optional().describe("City the place is in, when known"),
});

export type RecordFeedbackArgs = z.infer<typeof recordFeedbackSchema>;

/* --------------------- Wave 2: inspiration import --------------------- */

export const importInspirationSchema = z.object({
  url: z.string().describe("The link the traveler pasted, exactly as written (blog post, Reddit thread, YouTube page, article)"),
});

export type ImportInspirationArgs = z.infer<typeof importInspirationSchema>;

/* --------------------- Wave 3: reservation import --------------------- */

export const importReservationSchema = z.object({
  text: z.string().describe("The confirmation the traveler pasted (email body, booking summary, itinerary receipt), complete and unedited"),
});

export type ImportReservationArgs = z.infer<typeof importReservationSchema>;
