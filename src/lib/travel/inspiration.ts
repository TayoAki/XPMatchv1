export interface InspirationItem {
  slug: string;
  name: string;
  country: string;
  tagline: string;
  bestFor: string[];
  bestMonths: string;
  prompt: string;
  gradient: string;
  /** Wikipedia article title when the plain name is ambiguous (e.g. "Banff" is a disambiguation page). */
  wiki?: string;
}

/** Curated, static inspiration used on the home panel, Explore and Inspiration pages. */
export const INSPIRATION: InspirationItem[] = [
  {
    slug: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    tagline: "Tiled hills, pastel sunsets and grilled sardines",
    bestFor: ["food", "culture", "walkable"],
    bestMonths: "Mar – Jun, Sep – Oct",
    prompt: "Plan a 4-day food-and-neighborhoods trip to Lisbon for me.",
    gradient: "from-amber-200 via-orange-300 to-rose-400",
  },
  {
    slug: "kyoto",
    name: "Kyoto",
    country: "Japan",
    tagline: "Temples at dawn, kaiseki at dusk",
    bestFor: ["culture", "food", "photography"],
    bestMonths: "Late Mar – May, Oct – Nov",
    prompt: "What would a slow 5-day Kyoto itinerary look like for me?",
    gradient: "from-rose-200 via-pink-300 to-red-400",
  },
  {
    slug: "mexico-city",
    name: "Mexico City",
    country: "Mexico",
    tagline: "Tacos al pastor, murals and Sunday markets",
    bestFor: ["food", "art", "nightlife"],
    bestMonths: "Nov – Apr",
    prompt: "Give me a long-weekend plan for Mexico City focused on food and neighborhoods.",
    gradient: "from-lime-200 via-emerald-300 to-teal-500",
  },
  {
    slug: "amalfi",
    name: "Amalfi Coast",
    country: "Italy",
    tagline: "Cliffside villages and lemon groves",
    bestFor: ["romance", "beach", "food"],
    bestMonths: "May – Jun, Sep",
    prompt: "Help me plan a romantic week on the Amalfi Coast, including where to stay.",
    gradient: "from-sky-200 via-cyan-300 to-blue-500",
  },
  {
    slug: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    tagline: "Riads, souks and rooftop mint tea",
    bestFor: ["culture", "shopping", "design"],
    bestMonths: "Oct – Apr",
    prompt: "Suggest riads and a 3-day plan for Marrakech.",
    gradient: "from-orange-200 via-amber-400 to-red-500",
  },
  {
    slug: "banff",
    name: "Banff",
    wiki: "Banff National Park",
    country: "Canada",
    tagline: "Turquoise lakes and big-sky hikes",
    bestFor: ["outdoors", "photography", "family"],
    bestMonths: "Jun – Sep",
    prompt: "Plan a 5-day Banff and Lake Louise trip with moderate hikes.",
    gradient: "from-emerald-200 via-teal-300 to-sky-500",
  },
  {
    slug: "new-orleans",
    name: "New Orleans",
    country: "USA",
    tagline: "Brass bands, beignets and balconies",
    bestFor: ["music", "food", "nightlife"],
    bestMonths: "Feb – May, Oct – Nov",
    prompt: "What should I eat and see on a first trip to New Orleans?",
    gradient: "from-fuchsia-200 via-purple-300 to-indigo-500",
  },
  {
    slug: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    tagline: "Table Mountain, penguins and winelands",
    bestFor: ["outdoors", "wine", "beach"],
    bestMonths: "Nov – Mar",
    prompt: "Plan 6 days in Cape Town and the winelands for me.",
    gradient: "from-blue-200 via-indigo-300 to-violet-500",
  },
  {
    slug: "reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    tagline: "Hot springs, waterfalls and midnight sun",
    bestFor: ["outdoors", "road trip", "photography"],
    bestMonths: "Jun – Aug (sun), Oct – Mar (aurora)",
    prompt: "Design a 5-day Iceland south coast road trip from Reykjavik.",
    gradient: "from-slate-200 via-cyan-200 to-indigo-400",
  },
  {
    slug: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    tagline: "Street food, temples and river breezes",
    bestFor: ["food", "budget", "nightlife"],
    bestMonths: "Nov – Feb",
    prompt: "Give me a budget-friendly 4-day Bangkok plan built around street food.",
    gradient: "from-yellow-200 via-amber-300 to-orange-500",
  },
  {
    slug: "austin",
    name: "Austin",
    wiki: "Austin, Texas",
    country: "USA",
    tagline: "Live music, breakfast tacos and lake days",
    bestFor: ["music", "food", "outdoors"],
    bestMonths: "Mar – May, Oct – Nov",
    prompt: "Plan a weekend in Austin with live music and the best tacos.",
    gradient: "from-orange-200 via-rose-300 to-pink-500",
  },
  {
    slug: "santorini",
    name: "Santorini",
    country: "Greece",
    tagline: "Caldera views and whitewashed lanes",
    bestFor: ["romance", "beach", "photography"],
    bestMonths: "May – Jun, Sep – Oct",
    prompt: "Where should I stay in Santorini and what is worth the hype?",
    gradient: "from-sky-200 via-blue-300 to-indigo-500",
  },
];

export const TRAVEL_STYLE_OPTIONS = [
  "Food & drink",
  "Culture & history",
  "Outdoors & hiking",
  "Beaches",
  "Nightlife",
  "Art & design",
  "Family friendly",
  "Luxury",
  "Budget travel",
  "Road trips",
  "Photography",
  "Wellness",
] as const;
