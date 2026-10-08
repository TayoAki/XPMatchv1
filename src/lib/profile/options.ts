import type { BudgetTier, Companions, DayRhythm, FlightPreference, FoodAdventure, Personality, Transport, Walking } from "@/lib/types";

/**
 * The chip vocabularies of the onboarding quiz. Labels are what the traveler
 * sees and what is stored; keyword lists let the match model and the home picks
 * recognize a place as fitting an interest, a stay type or a kind of restaurant.
 * Options marked `legacy` are answers from the earlier quiz: never offered as a
 * chip again, but kept so profiles that hold them still match.
 */

export interface ProfileOption {
  label: string;
  /** Lower-case words that mark a place category, style or description as matching. */
  keywords: string[];
  /** Places Text Search phrasing for the home picks ("… in Rome"). */
  query?: string;
  /** How one place of this kind is named on a card ("Boutique hotel"); the label when unset. */
  singular?: string;
  /** An answer from the earlier quiz: recognized, never offered. */
  legacy?: boolean;
}

/** The labels a chip group offers (legacy answers are not offered again). */
export const offered = (options: ProfileOption[]): string[] => options.filter((o) => !o.legacy).map((o) => o.label);

const legacy = (options: ProfileOption[]): ProfileOption[] => options.map((o) => ({ ...o, legacy: true }));

/** "How do you like to have fun on the weekends?" */
export const INTERESTS: ProfileOption[] = [
  { label: "Outdoors", keywords: ["park", "garden", "hiking", "trail", "nature", "botanical", "national park", "lake", "waterfall", "beach", "viewpoint", "scenic"], query: "parks and hiking trails" },
  { label: "Live music", keywords: ["music", "concert", "jazz", "venue", "live"], query: "live music venues" },
  { label: "Art & museums", keywords: ["museum", "gallery", "art"], query: "museums and art galleries" },
  { label: "Bars & nightlife", keywords: ["bar", "club", "nightlife", "cocktail", "pub", "lounge"], query: "nightlife and cocktail bars" },
  { label: "Sports games", keywords: ["stadium", "arena", "ballpark", "sports", "football", "soccer", "baseball", "basketball"], query: "stadiums and sports games" },
  { label: "Fitness", keywords: ["gym", "fitness", "yoga", "cycling", "bike", "climb", "kayak", "surf", "run"], query: "bike tours and outdoor activities" },
  { label: "Shopping", keywords: ["shopping", "boutique", "mall", "shop", "department store", "flea"], query: "shopping streets and markets" },
  { label: "Movies & theater", keywords: ["theater", "theatre", "cinema", "opera", "playhouse", "performing arts", "musical"], query: "theaters and performing arts" },
  { label: "Comedy shows", keywords: ["comedy", "stand-up", "improv", "cabaret"], query: "comedy clubs" },
  { label: "Wellness & spa", keywords: ["spa", "wellness", "thermal", "bath", "sauna", "yoga"], query: "spas and thermal baths" },
  ...legacy([
    { label: "Museums & art", keywords: ["museum", "gallery", "art"], query: "museums and art galleries" },
    { label: "History & architecture", keywords: ["historic", "historical", "landmark", "ruin", "castle", "cathedral", "church", "basilica", "monument", "architecture", "palace"], query: "historic landmarks" },
    { label: "Food tours & markets", keywords: ["market", "food tour", "food hall", "culinary"], query: "food markets and food tours" },
    { label: "Nightlife", keywords: ["bar", "club", "nightlife", "cocktail", "pub", "lounge"], query: "nightlife and cocktail bars" },
    { label: "Nature & hiking", keywords: ["park", "garden", "hiking", "trail", "nature", "botanical", "national park", "lake", "waterfall"], query: "parks and hiking trails" },
    { label: "Beaches", keywords: ["beach", "seaside", "coast", "cove"], query: "beaches" },
    { label: "Photography spots", keywords: ["viewpoint", "scenic", "lookout", "view", "observation", "panorama"], query: "scenic viewpoints" },
    { label: "Sports & adventure", keywords: ["adventure", "climb", "kayak", "surf", "bike", "cycling", "stadium", "dive", "ski", "rafting"], query: "outdoor adventures and bike tours" },
    { label: "Family activities", keywords: ["zoo", "aquarium", "amusement", "theme park", "kids", "family", "playground", "science"], query: "family activities and kid-friendly attractions" },
    { label: "Local neighborhoods", keywords: ["neighborhood", "quarter", "district", "old town", "square", "piazza", "plaza", "street"], query: "neighborhoods worth wandering" },
    { label: "Coffee culture", keywords: ["coffee", "cafe", "café", "espresso", "roaster"], query: "specialty coffee shops" },
    { label: "Wine & craft beer", keywords: ["wine", "winery", "vineyard", "brewery", "beer", "enoteca", "taproom"], query: "wine bars and breweries" },
    { label: "Street food", keywords: ["street food", "food stall", "hawker", "food truck", "taco", "night market"], query: "street food" },
  ]),
];

/** "What's your usual accommodation style?" */
export const STAY_TYPES: ProfileOption[] = [
  { label: "Luxury hotels", singular: "Luxury hotel", keywords: ["luxury", "five-star", "5-star", "palace", "grand"], query: "luxury hotels" },
  { label: "Boutique hotels", singular: "Boutique hotel", keywords: ["boutique", "design hotel"], query: "boutique hotels" },
  { label: "Bed & breakfasts", singular: "Bed & breakfast", keywords: ["bed and breakfast", "b&b", "guest house", "guesthouse", "pension"], query: "bed and breakfasts" },
  { label: "Budget-friendly hotels", singular: "Budget-friendly hotel", keywords: ["budget", "affordable", "cheap", "value"], query: "well-rated affordable hotels" },
  { label: "Hostels", singular: "Hostel", keywords: ["hostel"], query: "hostels" },
  { label: "Campgrounds", singular: "Campground", keywords: ["campground", "camping", "campsite", "glamping", "rv park"], query: "campgrounds and glamping" },
  { label: "Eco-lodges", singular: "Eco-lodge", keywords: ["eco", "lodge", "sustainable", "treehouse"], query: "eco-lodges" },
  // A leading space keeps "dinner" from reading as an inn.
  { label: "Inns", singular: "Inn", keywords: [" inn"], query: "inns" },
  { label: "Resorts", singular: "Resort", keywords: ["resort", "all-inclusive"], query: "resorts" },
  { label: "Motels", singular: "Motel", keywords: ["motel", "motor lodge"], query: "motels" },
  { label: "Short-term rentals", singular: "Short-term rental", keywords: ["apartment", "aparthotel", "rental", "villa", "serviced", "flat"], query: "serviced apartments" },
  ...legacy([
    { label: "Boutique hotel", keywords: ["boutique"], query: "boutique hotels" },
    { label: "Design hotel", keywords: ["design", "designer", "stylish", "modern"], query: "design hotels" },
    { label: "Luxury resort", keywords: ["luxury", "resort", "five-star", "5-star", "palace", "grand"], query: "luxury hotels" },
    // Motels and inns have options of their own now.
    { label: "Budget hotel", keywords: ["budget", "affordable", "cheap", "value"], query: "well-rated affordable hotels" },
    { label: "Apartment", keywords: ["apartment", "aparthotel", "flat", "residence", "serviced"], query: "serviced apartments" },
    { label: "Hostel", keywords: ["hostel"], query: "hostels" },
    { label: "B&B / guesthouse", keywords: ["bed and breakfast", "b&b", "guest house", "guesthouse", "pension"], query: "bed and breakfasts" },
    { label: "Business hotel", keywords: ["business", "conference", "executive"], query: "business hotels" },
  ]),
];

export const STAY_MUST_HAVES: ProfileOption[] = [
  { label: "Pool", keywords: ["pool"] },
  { label: "Gym", keywords: ["gym", "fitness"] },
  { label: "Breakfast included", keywords: ["breakfast"] },
  { label: "Kitchen", keywords: ["kitchen", "kitchenette"] },
  { label: "Central location", keywords: ["central", "center", "centre", "downtown", "old town", "walkable"] },
  { label: "Quiet room", keywords: ["quiet", "peaceful", "calm"] },
  { label: "Workspace", keywords: ["desk", "workspace", "coworking", "wifi"] },
  { label: "Free cancellation", keywords: ["free cancellation", "flexible"] },
  { label: "Walkable area", keywords: ["walkable", "walk", "pedestrian"] },
  { label: "Near transit", keywords: ["metro", "subway", "station", "transit", "tram"] },
  { label: "Parking", keywords: ["parking", "garage"] },
];

/** "What kinds of restaurants do you like?" (stored in `cuisines`). */
export const CUISINES: ProfileOption[] = [
  { label: "Fine dining & gourmet", keywords: ["fine dining", "tasting menu", "michelin", "gourmet"], query: "fine dining restaurants" },
  { label: "Local street food", keywords: ["street food", "stall", "hawker", "night market"], query: "street food" },
  { label: "Cafes/bistros", singular: "Café / bistro", keywords: ["cafe", "café", "bistro", "brasserie"], query: "cafés and bistros" },
  { label: "Family restaurants", singular: "Family restaurant", keywords: ["family", "kid-friendly", "diner"], query: "family-friendly restaurants" },
  { label: "Vegetarian / vegan eateries", singular: "Vegetarian / vegan", keywords: ["vegan", "vegetarian", "plant-based"], query: "vegetarian and vegan restaurants" },
  { label: "Food trucks", singular: "Food truck", keywords: ["food truck", "food cart"], query: "food trucks" },
  { label: "Ethnic cuisine", keywords: ["thai", "indian", "mexican", "ethiopian", "vietnamese", "korean", "lebanese", "peruvian", "turkish", "moroccan", "szechuan", "sichuan", "nepalese", "persian"], query: "authentic international restaurants" },
  { label: "Farm-to-table", keywords: ["farm", "seasonal", "organic", "local produce"], query: "farm-to-table restaurants" },
  { label: "Fast casual", keywords: ["fast casual", "counter service", "quick bite", "grab and go"], query: "fast casual restaurants" },
  { label: "Pub / tavern food", singular: "Pub / tavern", keywords: ["pub", "tavern", "gastropub", "taproom"], query: "pubs and taverns" },
  { label: "Bakeries", singular: "Bakery", keywords: ["bakery", "pastry", "patisserie", "pâtisserie", "boulangerie", "panaderia"], query: "bakeries" },
  { label: "Coffee shops", singular: "Coffee shop", keywords: ["coffee", "espresso", "roaster"], query: "specialty coffee shops" },
  ...legacy([
    { label: "Italian", keywords: ["italian", "trattoria", "osteria", "pizzeria", "pasta", "pizza"], query: "trattoria" },
    { label: "Japanese", keywords: ["japanese", "sushi", "ramen", "izakaya", "omakase"], query: "japanese restaurants" },
    { label: "Mexican", keywords: ["mexican", "taco", "taqueria"], query: "mexican restaurants" },
    { label: "Thai", keywords: ["thai"], query: "thai restaurants" },
    { label: "Indian", keywords: ["indian", "curry"], query: "indian restaurants" },
    { label: "French", keywords: ["french", "bistro", "brasserie"], query: "french bistros" },
    { label: "Middle Eastern", keywords: ["middle eastern", "lebanese", "turkish", "mezze", "kebab", "falafel", "israeli"], query: "middle eastern restaurants" },
    { label: "Korean", keywords: ["korean", "bbq"], query: "korean restaurants" },
    { label: "Chinese", keywords: ["chinese", "dim sum", "sichuan", "cantonese", "dumpling"], query: "chinese restaurants" },
    { label: "Seafood", keywords: ["seafood", "fish", "oyster", "crab", "lobster"], query: "seafood restaurants" },
    { label: "Steakhouse", keywords: ["steak", "steakhouse", "grill", "churrascaria"], query: "steakhouses" },
    { label: "Plant-based", keywords: ["vegan", "vegetarian", "plant"], query: "vegetarian and vegan restaurants" },
    { label: "Street food", keywords: ["street food", "stall", "hawker", "food truck"], query: "street food" },
    { label: "Fine dining", keywords: ["fine dining", "tasting menu", "michelin", "gourmet"], query: "fine dining restaurants" },
    { label: "Cafés & bakeries", keywords: ["cafe", "café", "bakery", "pastry", "patisserie", "coffee", "brunch"], query: "cafés and bakeries" },
  ]),
];

/** "Do you have any dietary restrictions I should know about?" */
export const DIETARY_TAGS: ProfileOption[] = [
  { label: "Gluten-free", keywords: ["gluten-free", "gluten free", "celiac"] },
  { label: "Dairy-free", keywords: ["dairy-free", "dairy free", "lactose"] },
  { label: "Vegetarian", keywords: ["vegetarian", "veggie"] },
  { label: "Vegan", keywords: ["vegan", "plant-based"] },
  { label: "Pescatarian", keywords: ["pescatarian", "seafood", "fish"] },
  { label: "Halal", keywords: ["halal"] },
  { label: "Kosher", keywords: ["kosher"] },
  ...legacy([
    { label: "No shellfish", keywords: [] },
    { label: "Nut allergy", keywords: [] },
  ]),
];

/** "Are you a member of any loyalty programs?" Keywords are the brands that earn each program's points. */
export const LOYALTY_PROGRAMS: ProfileOption[] = [
  { label: "Marriott Bonvoy", keywords: ["marriott", "ritz-carlton", "st. regis", "st regis", "westin", "sheraton", "le méridien", "le meridien", "jw marriott", "courtyard", "renaissance", "autograph collection", "luxury collection", "edition", "aloft", "moxy", "four points", "fairfield", "residence inn", "springhill", "ac hotel", "delta hotels", "tribute portfolio", "w hotel"] },
  { label: "Hilton Honors", keywords: ["hilton", "waldorf astoria", "conrad", "lxr", "canopy by hilton", "curio collection", "doubletree", "tapestry collection", "embassy suites", "hampton", "homewood suites", "home2", "tru by hilton", "motto", "signia", "tempo by hilton", "spark by hilton"] },
  { label: "World of Hyatt", keywords: ["hyatt", "andaz", "alila", "thompson hotel", "caption by hyatt", "miraval", "unbound collection"] },
  { label: "IHG One Rewards", keywords: ["intercontinental", "kimpton", "regent", "six senses", "hotel indigo", "crowne plaza", "holiday inn", "voco", "even hotel", "staybridge", "candlewood", "vignette collection"] },
  { label: "Wyndham Rewards", keywords: ["wyndham", "la quinta", "ramada", "days inn", "super 8", "microtel", "wingate", "hawthorn suites", "tryp", "dolce hotel", "baymont", "howard johnson", "travelodge"] },
  { label: "Choice Privileges", keywords: ["comfort inn", "comfort suites", "quality inn", "clarion", "sleep inn", "econo lodge", "rodeway", "mainstay", "suburban studios", "cambria", "ascend collection", "radisson"] },
  { label: "Accor Live Limitless (ALL)", keywords: ["accor", "sofitel", "pullman", "novotel", "mercure", "ibis", "fairmont", "raffles", "swissôtel", "swissotel", "mgallery", "mövenpick", "movenpick", "adagio", "25hours", "mama shelter"] },
  { label: "Best Western Rewards", keywords: ["best western", "sure hotel", "worldhotels"] },
  { label: "GHA Discovery", keywords: ["anantara", "avani", "kempinski", "pan pacific", "parkroyal", "nh hotel", "nh collection", "nhow", "tivoli", "corinthia", "lungarno", "viceroy"] },
];

/** "Who do you usually travel with?" (Couple is stored as `partner`). */
export const COMPANION_OPTIONS: { value: Exclude<Companions, "mixed">; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "partner", label: "Couple" },
  { value: "family", label: "Family" },
  { value: "friends", label: "Friends" },
];

/** "What best describes your typical travel budget?" */
export const BUDGET_OPTIONS: { value: BudgetTier; sign: string; label: string }[] = [
  { value: "budget", sign: "$", label: "On a budget" },
  { value: "mid-range", sign: "$$", label: "Sensibly priced" },
  { value: "premium", sign: "$$$", label: "Upscale" },
  { value: "luxury", sign: "$$$$", label: "Luxury" },
];

/** "What types of things do you sometimes splurge on?" */
export const SPLURGE_OPTIONS = ["Stay", "Restaurants", "Experiences"] as const;

/** The Gemini voices the onboarding interview offers, with a sample of each in /public/onboarding/voices. */
export const VOICE_OPTIONS: { name: string; hint: string }[] = [
  { name: "Aoede", hint: "Breezy" },
  { name: "Puck", hint: "Upbeat" },
  { name: "Sulafat", hint: "Warm" },
  { name: "Charon", hint: "Informative" },
];

/** How the assistant talks; the descriptions are also what the model is told. */
export const PERSONALITY_OPTIONS: { value: Personality; label: string; hint: string }[] = [
  { value: "casual", label: "Casual", hint: "Playful, treats planning as fun." },
  { value: "neutral", label: "Neutral", hint: "Clear, organized, helpful. Opinionated when asked, skips flattery." },
  { value: "professional", label: "Professional", hint: "Competent and efficient. Warm but not familiar." },
];

export const FOOD_ADVENTURE_OPTIONS: { value: FoodAdventure; label: string; hint: string }[] = [
  { value: "safe", label: "Play it safe", hint: "Familiar dishes, places with English menus" },
  { value: "mix", label: "A bit of both", hint: "Some classics, some local surprises" },
  { value: "adventurous", label: "Try anything", hint: "Offal, night markets, no menu needed" },
];

export const DAY_RHYTHM_OPTIONS: { value: DayRhythm; label: string; hint: string }[] = [
  { value: "early", label: "Early riser", hint: "Sights at opening, dinner by 7" },
  { value: "balanced", label: "In between", hint: "Slow mornings, evenings out" },
  { value: "late", label: "Night owl", hint: "Late starts, late dinners, nightlife" },
];

export const WALKING_OPTIONS: { value: Walking; label: string; hint: string }[] = [
  { value: "lots", label: "Love long walks", hint: "Happy to cover 15 km a day" },
  { value: "moderate", label: "Moderate", hint: "A few kilometers, then a break" },
  { value: "little", label: "Keep it short", hint: "Stops close together, transport in between" },
];

export const TRANSPORT_OPTIONS: { value: Transport; label: string; hint: string }[] = [
  { value: "walk-transit", label: "Walk & transit", hint: "Metro, trams, buses" },
  { value: "rideshare", label: "Taxis & rideshare", hint: "Door to door" },
  { value: "car", label: "Rental car", hint: "Road trips and day trips" },
  { value: "mixed", label: "Whatever works", hint: "Depends on the place" },
];

export const FLIGHT_OPTIONS: { value: FlightPreference; label: string; hint: string }[] = [
  { value: "nonstop", label: "Nonstop only", hint: "Even if it costs more" },
  { value: "cheapest", label: "Cheapest fare", hint: "A layover is fine" },
  { value: "comfort", label: "Comfort first", hint: "Premium seats, good times" },
  { value: "flexible", label: "Flexible", hint: "Case by case" },
];

const norm = (s: string) => s.toLowerCase();

/** Labels from `options` whose keywords appear in `text` (already-lowercased text is fine). */
export function matchingOptions(options: ProfileOption[], text: string): ProfileOption[] {
  // A leading space lets keywords that must start a word (" inn") match at the very start too.
  const t = ` ${norm(text)}`;
  return options.filter((o) => o.keywords.some((k) => t.includes(k)));
}

/** The option for a stored label, current or legacy, when it is one we know. */
export function optionByLabel(options: ProfileOption[], label: string): ProfileOption | undefined {
  const l = norm(label);
  return options.find((o) => norm(o.label) === l);
}

/**
 * The words that name a place on a card. The earlier quiz's labels ("Italian", "Luxury resort",
 * "Nature & hiking") describe one place better than the current answers do, so they come first.
 */
export function describePlace(options: ProfileOption[], text: string): string | undefined {
  const hits = matchingOptions(options, text);
  const hit = hits.find((o) => o.legacy) ?? hits[0];
  return hit ? (hit.singular ?? hit.label) : undefined;
}
