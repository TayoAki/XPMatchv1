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

export const hotelSchema = z.object({
  name: z.string(),
  area: z.string().describe("Neighborhood or district"),
  style: z.string().describe("Boutique, design, resort, aparthotel, hostel, etc."),
  priceTier: priceTierSchema,
  nightlyEstimateUsd: z.number().describe("Typical nightly rate estimate in USD"),
  rating: z.number().min(0).max(5).optional().describe("Typical guest rating out of 5, if known"),
  whyItFits: z.string(),
  amenities: z.array(z.string()).describe("3-5 notable amenities"),
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
});

export const showAttractionsSchema = z.object({
  destination: z.string(),
  attractions: z.array(attractionSchema).min(1).max(8),
});

export const itineraryDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().describe("Theme of the day, e.g. 'Old town & sunset views'"),
  items: z.array(z.string()).describe("3-6 concrete stops in order with a short note each"),
});

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
});

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
