import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";

/**
 * Offline demo model. It speaks the same tool protocol as a real model so the
 * whole UI (streaming cards, human-in-the-loop trip creation, suggestions)
 * works without an API key. Responses are canned and clearly labeled as demo.
 */

type Scenario = "destinations" | "hotels" | "flights" | "restaurants" | "attractions" | "trip";

const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part === "object" && "text" in part ? String((part as { text: unknown }).text) : ""))
      .join(" ");
  }
  return "";
}

function lastMessage(options: LanguageModelV3CallOptions) {
  const prompt = options.prompt;
  return prompt[prompt.length - 1];
}

/** Last message the traveler actually typed (skips CopilotKit's internal suggestion instruction). */
function lastUserText(options: LanguageModelV3CallOptions): string {
  for (let i = options.prompt.length - 1; i >= 0; i--) {
    const m = options.prompt[i];
    if (m.role !== "user") continue;
    const text = textOf(m.content);
    if (text.includes("copilotkitSuggest")) continue;
    return text;
  }
  return "";
}

const STOP_WORDS = new Set([
  "this",
  "next",
  "for",
  "from",
  "with",
  "and",
  "the",
  "my",
  "me",
  "in",
  "on",
  "a",
  "an",
  "weekend",
  "week",
  "trip",
  "hotels",
  "hotel",
  "flights",
  "flight",
  "restaurants",
  "food",
  "things",
]);

function extractDestination(text: string): string | null {
  const m = text.match(/\b(?:to|in|for|around|near|visit(?:ing)?|about)\s+([A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*){0,2})/);
  if (m) {
    const words = m[1].split(/\s+/).filter((w) => !STOP_WORDS.has(w.toLowerCase()));
    if (words.length) return words.join(" ").replace(/[.,!?]+$/, "");
  }
  const caps = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g);
  if (caps) {
    const candidate = caps.map((c) => c.trim()).find((c) => !STOP_WORDS.has(c.toLowerCase()) && !/^(I|Plan|Find|Show|Give|Help|What|Where|Best|Top)$/.test(c));
    if (candidate) return candidate;
  }
  return null;
}

function pickScenario(text: string): Scenario {
  const t = text.toLowerCase();
  // An explicit request to plan wins over incidental keywords ("food", "hotels") inside it.
  if (/\b(plan|itinerary)\b/.test(t)) return "trip";
  if (/\b(hotels?|stays?|accommodations?|where to sleep|airbnb|resorts?|lodging)\b/.test(t)) return "hotels";
  if (/\b(flights?|fly|airfares?|planes?)\b/.test(t)) return "flights";
  if (/\b(restaurants?|eat|food|dinner|lunch|brunch|tacos?|coffee|bars?)\b/.test(t)) return "restaurants";
  if (/\b(things to do|attractions?|see|do|museums?|neighborhoods?|guide|activities|day in)\b/.test(t)) return "attractions";
  if (/\b(plan|itinerary|trip|days?|week|weekend|create)\b/.test(t)) return "trip";
  return "destinations";
}

const cannedArgs: Record<Scenario, (dest: string, origin: string) => unknown> = {
  destinations: () => ({
    title: "Demo picks that match your style",
    destinations: [
      {
        name: "Lisbon",
        country: "Portugal",
        tagline: "Tiled hills, pastel sunsets and grilled sardines",
        whyItFits: "Walkable neighborhoods and a food scene that punches far above its price tag.",
        bestTime: "March to June, September to October",
        estimatedDailyBudgetUsd: 140,
        highlights: ["Alfama at sunrise", "Time Out Market", "Tram 28", "Belém pastries", "LX Factory"],
        vibes: ["food", "culture", "walkable"],
      },
      {
        name: "Mexico City",
        country: "Mexico",
        tagline: "Tacos al pastor, murals and Sunday markets",
        whyItFits: "Big-city energy with world-class eating at every budget, and an easy flight from most US hubs.",
        bestTime: "November to April",
        estimatedDailyBudgetUsd: 110,
        highlights: ["Roma Norte cafés", "Frida Kahlo Museum", "Xochimilco boats", "Mercado de San Juan"],
        vibes: ["food", "art", "nightlife"],
      },
      {
        name: "Kyoto",
        country: "Japan",
        tagline: "Temples at dawn, kaiseki at dusk",
        whyItFits: "A slower pace with unforgettable culture and food, ideal for a balanced itinerary.",
        bestTime: "Late March to May, October to November",
        estimatedDailyBudgetUsd: 160,
        highlights: ["Fushimi Inari before 7am", "Nishiki Market", "Arashiyama bamboo grove", "Gion at dusk"],
        vibes: ["culture", "food", "photography"],
      },
    ],
  }),
  hotels: (dest) => ({
    destination: dest,
    guests: 2,
    hotels: [
      {
        name: `The Central ${dest}`,
        area: "Downtown",
        style: "Design hotel",
        priceTier: "$$$",
        nightlyEstimateUsd: 240,
        rating: 4.5,
        whyItFits: "Walk to the main sights and restaurants; rooftop bar for a first-night drink.",
        amenities: ["Rooftop bar", "Gym", "Late checkout", "Bike rentals"],
      },
      {
        name: `${dest} Boutique House`,
        area: "Arts district",
        style: "Boutique",
        priceTier: "$$",
        nightlyEstimateUsd: 165,
        rating: 4.4,
        whyItFits: "Quieter street, great coffee downstairs and mid-range rates that leave room for dinners out.",
        amenities: ["Free breakfast", "Coffee bar", "Courtyard", "Pet friendly"],
      },
      {
        name: "Riverside Suites",
        area: "Waterfront",
        style: "Aparthotel",
        priceTier: "$$",
        nightlyEstimateUsd: 150,
        rating: 4.2,
        whyItFits: "Kitchenettes and space to spread out, handy if you like slow mornings in.",
        amenities: ["Kitchenette", "Laundry", "Parking", "River views"],
      },
    ],
  }),
  flights: (dest, origin) => ({
    origin,
    destination: dest,
    travelers: 2,
    options: [
      {
        airline: "Delta",
        routeSummary: `${origin} → ${dest} nonstop`,
        stops: 0,
        durationText: "2h 20m",
        cabin: "Economy",
        estimatedPriceUsd: 240,
        departureWindow: "Morning departure, evening return",
        notes: "Best balance of price and schedule; carry-on included.",
      },
      {
        airline: "Southwest",
        routeSummary: `${origin} → ${dest} nonstop`,
        stops: 0,
        durationText: "2h 30m",
        cabin: "Economy",
        estimatedPriceUsd: 210,
        departureWindow: "Midday departure, late-afternoon return",
        notes: "Two free checked bags if you plan to shop.",
      },
    ],
  }),
  restaurants: (dest) => ({
    destination: dest,
    restaurants: [
      {
        name: "La Esquina Taquería",
        cuisine: "Mexican",
        neighborhood: "Downtown",
        priceTier: "$",
        mustTry: "Al pastor tacos with the house salsa verde",
        whyItFits: "Casual, fast and cheap, perfect for a first lunch after landing.",
        reservationRecommended: false,
        bestFor: "quick lunch",
      },
      {
        name: "Ember & Oak",
        cuisine: "Wood-fired American",
        neighborhood: "Arts district",
        priceTier: "$$$",
        mustTry: "The whole roasted fish for two",
        whyItFits: "A splurge dinner that still feels relaxed; book the patio.",
        reservationRecommended: true,
        bestFor: "dinner date",
      },
      {
        name: "Morning Ritual",
        cuisine: "Café & brunch",
        neighborhood: "Old town",
        priceTier: "$$",
        mustTry: "Shakshuka and a cortado",
        whyItFits: "Great coffee and a slow brunch before a walking day.",
        reservationRecommended: false,
        bestFor: "group brunch",
      },
    ],
  }),
  attractions: (dest) => ({
    destination: dest,
    attractions: [
      {
        name: `${dest} Museum of Art`,
        category: "Museum",
        neighborhood: "Arts district",
        description: "A well-curated collection with a strong modern wing and a calm sculpture garden.",
        whyItFits: "Two focused hours of culture without museum fatigue.",
        bestTimeOfDay: "Late morning",
        durationHours: 2,
        ticketNote: "Free general admission; special exhibits ticketed",
      },
      {
        name: "Old Town Walking Loop",
        category: "Walk",
        neighborhood: "Old town",
        description: "A self-guided loop past the historic square, market hall and riverside path.",
        whyItFits: "Matches a balanced pace and sets up lunch at the market.",
        bestTimeOfDay: "Morning",
        durationHours: 1.5,
        ticketNote: "Free",
      },
      {
        name: "Sunset Viewpoint Park",
        category: "Viewpoint",
        neighborhood: "Hillside",
        description: "The best skyline view in town, with food trucks on weekends.",
        whyItFits: "Low-effort golden-hour photos and a relaxed end to the day.",
        bestTimeOfDay: "Sunset",
        durationHours: 1,
        ticketNote: "Free",
      },
      {
        name: "Saturday Farmers Market",
        category: "Market",
        neighborhood: "Waterfront",
        description: "Local produce, bakers and street food stalls every Saturday morning.",
        whyItFits: "Great for grazing breakfast and picking up snacks for the trip.",
        bestTimeOfDay: "Early morning",
        durationHours: 1.5,
        ticketNote: "Free; bring cash for small vendors",
      },
    ],
  }),
  trip: (dest) => ({
    title: `Long weekend in ${dest}`,
    destination: dest,
    travelers: 2,
    budgetTier: "mid-range",
    summary: `Three relaxed days in ${dest} built around great food, one museum morning and a sunset finish. Stays central so everything is walkable.`,
    itinerary: [
      {
        day: 1,
        title: "Arrive & settle in",
        items: [
          "Check in downtown and drop bags",
          "Late lunch at La Esquina Taquería",
          "Old Town Walking Loop as the light softens",
          "Dinner at Ember & Oak (book the patio)",
        ],
      },
      {
        day: 2,
        title: "Culture & neighborhoods",
        items: [
          "Brunch at Morning Ritual",
          `${dest} Museum of Art (2 hours)`,
          "Coffee and browsing in the arts district",
          "Sunset Viewpoint Park, then casual dinner nearby",
        ],
      },
      {
        day: 3,
        title: "Market morning & departure",
        items: ["Saturday Farmers Market for breakfast", "Last stroll along the waterfront", "Head to the airport by early afternoon"],
      },
    ],
  }),
};

const intro: Record<Scenario, (dest: string) => string> = {
  destinations: () => "Demo mode: here are a few destinations that match a food-and-culture traveler.\n\n",
  hotels: (d) => `Demo mode: three places to stay in ${d} across a couple of price points.\n\n`,
  flights: (d) => `Demo mode: two sensible flight options to ${d}. Check live fares with the links.\n\n`,
  restaurants: (d) => `Demo mode: a lunch, a dinner and a brunch spot in ${d}.\n\n`,
  attractions: (d) => `Demo mode: a balanced set of things to do in ${d}.\n\n`,
  trip: (d) => `Demo mode: here is a draft long weekend in ${d}. Save it if it looks right.\n\n`,
};

const followUps = [
  "I've laid those out as cards above. Want me to turn this into a saved trip, or look at stays and flights next?",
  "Those are on the cards above. Say the word and I'll build a day-by-day plan around them.",
  "Cards are up. I can narrow these down by neighborhood or budget if you tell me what matters most.",
];

function textOnlyStream(text: string, finish: "stop" | "tool-calls" = "stop"): LanguageModelV3StreamPart[] {
  return [
    { type: "stream-start", warnings: [] },
    ...textParts(text),
    { type: "finish", finishReason: { unified: finish, raw: undefined }, usage: USAGE },
  ];
}

function textParts(text: string): LanguageModelV3StreamPart[] {
  // AG-UI rejects empty text deltas, so skip blank chunks (and the whole block when there is no text).
  const words = text.split(/(\s+)/).filter((w) => w.length > 0);
  if (words.length === 0) return [];
  // Unique per response: the id becomes the AG-UI message id, and reusing one merges messages.
  const id = `text-${Math.random().toString(36).slice(2, 10)}`;
  return [
    { type: "text-start", id },
    ...words.map((w): LanguageModelV3StreamPart => ({ type: "text-delta", id, delta: w })),
    { type: "text-end", id },
  ];
}

function toolCallStream(introText: string, toolName: string, args: unknown): LanguageModelV3StreamPart[] {
  return [
    { type: "stream-start", warnings: [] },
    ...textParts(introText),
    {
      type: "tool-call",
      toolCallId: `demo-${Math.random().toString(36).slice(2, 10)}`,
      toolName,
      input: JSON.stringify(args),
    },
    { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: USAGE },
  ];
}

export function createDemoTravelModel(): LanguageModelV3 {
  return new MockLanguageModelV3({
    provider: "xpmatch-demo",
    modelId: "demo",
    doStream: async (options) => {
      const toolNames = new Set((options.tools ?? []).map((t) => t.name));
      const userText = lastUserText(options);
      const dest = extractDestination(userText) ?? "Dallas";

      let chunks: LanguageModelV3StreamPart[];

      if (toolNames.has("copilotkitSuggest")) {
        chunks = toolCallStream("", "copilotkitSuggest", {
          suggestions: [
            { title: `Hotels in ${dest}`, message: `Find me hotels in ${dest} that fit my budget.` },
            { title: "Things to do", message: `What are the top things to do in ${dest} for me?` },
            { title: "Make it a trip", message: `Turn this into a trip plan for ${dest}.` },
          ],
        });
      } else if (lastMessage(options)?.role === "tool") {
        chunks = textOnlyStream(followUps[Math.floor(Math.random() * followUps.length)]);
      } else {
        const scenario = pickScenario(userText);
        const toolName = scenario === "trip" ? "create_trip" : `show_${scenario}`;
        if (toolNames.has(toolName)) {
          chunks = toolCallStream(intro[scenario](dest), toolName, cannedArgs[scenario](dest, "ATL"));
        } else {
          chunks = textOnlyStream(
            "Demo mode is on: no model API key is configured, so I can only show canned examples. Add ANTHROPIC_API_KEY to .env.local for real recommendations.",
          );
        }
      }

      return {
        stream: simulateReadableStream({ chunks, initialDelayInMs: 150, chunkDelayInMs: 12 }),
      };
    },
  });
}
