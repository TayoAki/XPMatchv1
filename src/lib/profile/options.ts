import type { DayRhythm, FlightPreference, FoodAdventure, Transport, Walking } from "@/lib/types";

/**
 * The chip vocabularies of the in-depth onboarding. Labels are what the
 * traveler sees and what is stored; keyword lists let the match model and the
 * home picks recognize a place as fitting an interest, a stay type or a cuisine.
 */

export interface ProfileOption {
  label: string;
  /** Lower-case words that mark a place category, style or description as matching. */
  keywords: string[];
  /** Places Text Search phrasing for the home picks ("… in Rome"). */
  query?: string;
}

export const INTERESTS: ProfileOption[] = [
  { label: "Museums & art", keywords: ["museum", "gallery", "art"], query: "museums and art galleries" },
  { label: "History & architecture", keywords: ["historic", "historical", "landmark", "ruin", "castle", "cathedral", "church", "basilica", "monument", "architecture", "palace"], query: "historic landmarks" },
  { label: "Food tours & markets", keywords: ["market", "food tour", "food hall", "culinary"], query: "food markets and food tours" },
  { label: "Nightlife", keywords: ["bar", "club", "nightlife", "cocktail", "pub", "lounge"], query: "nightlife and cocktail bars" },
  { label: "Live music", keywords: ["music", "concert", "jazz", "venue"], query: "live music venues" },
  { label: "Nature & hiking", keywords: ["park", "garden", "hiking", "trail", "nature", "botanical", "national park", "lake", "waterfall"], query: "parks and hiking trails" },
  { label: "Beaches", keywords: ["beach", "seaside", "coast", "cove"], query: "beaches" },
  { label: "Wellness & spa", keywords: ["spa", "wellness", "thermal", "bath", "sauna", "yoga"], query: "spas and thermal baths" },
  { label: "Shopping", keywords: ["shopping", "boutique", "mall", "shop", "department store", "flea"], query: "shopping streets and markets" },
  { label: "Photography spots", keywords: ["viewpoint", "scenic", "lookout", "view", "observation", "panorama"], query: "scenic viewpoints" },
  { label: "Sports & adventure", keywords: ["adventure", "climb", "kayak", "surf", "bike", "cycling", "stadium", "dive", "ski", "rafting"], query: "outdoor adventures and bike tours" },
  { label: "Family activities", keywords: ["zoo", "aquarium", "amusement", "theme park", "kids", "family", "playground", "science"], query: "family activities and kid-friendly attractions" },
  { label: "Local neighborhoods", keywords: ["neighborhood", "quarter", "district", "old town", "square", "piazza", "plaza", "street"], query: "neighborhoods worth wandering" },
  { label: "Coffee culture", keywords: ["coffee", "cafe", "café", "espresso", "roaster"], query: "specialty coffee shops" },
  { label: "Wine & craft beer", keywords: ["wine", "winery", "vineyard", "brewery", "beer", "enoteca", "taproom"], query: "wine bars and breweries" },
  { label: "Street food", keywords: ["street food", "food stall", "hawker", "food truck", "taco", "night market"], query: "street food" },
];

export const STAY_TYPES: ProfileOption[] = [
  { label: "Boutique hotel", keywords: ["boutique"], query: "boutique hotels" },
  { label: "Design hotel", keywords: ["design", "designer", "stylish", "modern"], query: "design hotels" },
  { label: "Luxury resort", keywords: ["luxury", "resort", "five-star", "5-star", "palace", "grand"], query: "luxury hotels" },
  { label: "Budget hotel", keywords: ["budget", "affordable", "cheap", "value", "motel", "inn"], query: "well-rated affordable hotels" },
  { label: "Apartment", keywords: ["apartment", "aparthotel", "flat", "residence", "serviced"], query: "serviced apartments" },
  { label: "Hostel", keywords: ["hostel"], query: "hostels" },
  { label: "B&B / guesthouse", keywords: ["bed and breakfast", "b&b", "guest house", "guesthouse", "pension"], query: "bed and breakfasts" },
  { label: "Business hotel", keywords: ["business", "conference", "executive"], query: "business hotels" },
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

export const CUISINES: ProfileOption[] = [
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
];

export const DIETARY_TAGS: ProfileOption[] = [
  { label: "Vegetarian", keywords: ["vegetarian", "veggie"] },
  { label: "Vegan", keywords: ["vegan", "plant-based"] },
  { label: "Gluten-free", keywords: ["gluten-free", "gluten free", "celiac"] },
  { label: "Halal", keywords: ["halal"] },
  { label: "Kosher", keywords: ["kosher"] },
  { label: "No shellfish", keywords: [] },
  { label: "Nut allergy", keywords: [] },
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
  const t = norm(text);
  return options.filter((o) => o.keywords.some((k) => t.includes(k)));
}

/** The option for a stored label, when it is still one we know. */
export function optionByLabel(options: ProfileOption[], label: string): ProfileOption | undefined {
  const l = norm(label);
  return options.find((o) => norm(o.label) === l);
}
