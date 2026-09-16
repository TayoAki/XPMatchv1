import type { PlaceReview } from "@/lib/places/types";
import type { Evidence, EvidenceSnippet, EvidenceTopic, PlaceAttribute, PlaceFacts } from "@/lib/places/facts";

/**
 * Deterministic evidence retrieval over a place's reviews, Google's review
 * summary and attributes. No model involved: what the answer card quotes comes
 * straight from here, by index.
 */

const LEXICON: Record<EvidenceTopic, string[]> = {
  noise: ["quiet", "noisy", "noise", "loud", "traffic", "thin walls", "street noise", "peaceful", "calm", "silent", "buses", "construction", "soundproof", "sleep", "kept us up"],
  cleanliness: ["clean", "spotless", "dirty", "dust", "mold", "smell", "hygiene", "filthy", "tidy", "immaculate"],
  service: ["service", "staff", "friendly", "rude", "helpful", "attentive", "concierge", "waiter", "welcoming", "went out of their way", "remembered"],
  value: ["value", "expensive", "pricey", "cheap", "overpriced", "worth it", "affordable", "price", "cost", "bargain", "steal"],
  location: ["location", "central", "walk", "metro", "station", "far from", "close to", "minutes", "distance", "near", "neighborhood", "termini", "steps", "on foot"],
  food: ["food", "delicious", "dish", "menu", "carbonara", "pasta", "breakfast", "tasty", "portions", "cuisine", "flavor", "fresh", "vegetarian", "omakase", "burrata", "wine"],
  crowds: ["crowded", "crowds", "packed", "busy", "queue", "line", "touristy", "tourists", "to ourselves", "empty"],
  booking: ["reservation", "reservations", "book", "booked", "booking", "reserve", "walk-in", "walk-ins", "cancellation", "timed entry", "ticket", "tickets"],
  workspace: ["desk", "wifi", "wi-fi", "work", "laptop", "internet", "calls", "remote", "working"],
  family: ["kids", "children", "family", "stroller", "child", "toddler", "teens", "kid-friendly", "audio guide"],
  accessibility: ["stairs", "elevator", "lift", "wheelchair", "accessible", "ramp", "mobility", "uneven", "steep"],
  pets: ["dog", "dogs", "pet", "pets", "puppy", "pup", "dog-friendly"],
  parking: ["parking", "garage", "valet", "park the car"],
  outdoor: ["terrace", "outdoor", "patio", "garden", "rooftop", "balcony", "view", "courtyard", "outside"],
  time: ["hours", "half a day", "two hours", "how long", "duration", "early", "opening", "late", "morning", "at night", "evening"],
};

/** Attribute keys that answer a topic outright. */
const ATTRIBUTE_TOPICS: Record<string, EvidenceTopic[]> = {
  allowsDogs: ["pets"],
  goodForChildren: ["family"],
  menuForChildren: ["family"],
  goodForGroups: ["booking", "service"],
  liveMusic: ["noise", "outdoor"],
  outdoorSeating: ["outdoor"],
  reservable: ["booking"],
  servesVegetarianFood: ["food"],
  takeout: ["food"],
  delivery: ["food"],
  dineIn: ["food"],
  restroom: ["accessibility"],
  "accessibilityOptions.wheelchairAccessibleEntrance": ["accessibility"],
  "accessibilityOptions.wheelchairAccessibleRestroom": ["accessibility"],
  "accessibilityOptions.wheelchairAccessibleParking": ["accessibility", "parking"],
  "accessibilityOptions.wheelchairAccessibleSeating": ["accessibility"],
  "parkingOptions.freeParkingLot": ["parking"],
  "parkingOptions.paidParkingLot": ["parking"],
  "parkingOptions.freeStreetParking": ["parking"],
  "parkingOptions.paidStreetParking": ["parking"],
  "parkingOptions.valetParking": ["parking"],
  "parkingOptions.freeGarageParking": ["parking"],
  "parkingOptions.paidGarageParking": ["parking"],
  "paymentOptions.acceptsCreditCards": ["value"],
  "paymentOptions.acceptsCashOnly": ["value"],
};

/** Question phrasings that name a topic without using its review vocabulary. */
const QUESTION_HINTS: Record<EvidenceTopic, RegExp> = {
  noise: /\b(quiet|noisy|noise|loud|sleep|peaceful|calm)\b/i,
  cleanliness: /\b(clean|dirty|hygien|spotless|smell)/i,
  service: /\b(service|staff|friendly|rude|helpful|welcoming)\b/i,
  value: /\b(value|expensive|cheap|price|cost|worth|pricey|affordable|budget)\b/i,
  location: /\b(location|central|walk|walkable|far|close|near|metro|distance|center|centre)\b/i,
  food: /\b(food|eat|dish|menu|vegetarian|vegan|gluten|breakfast|dinner|lunch|tasty|cuisine|wine)\b/i,
  crowds: /\b(crowd|crowded|busy|packed|queue|line|touristy)\b/i,
  booking: /\b(book|booking|reserve|reservation|tickets?|walk-in|ahead)\b/i,
  workspace: /\b(desk|wifi|wi-fi|work|laptop|internet|remote)\b/i,
  family: /\b(kid|kids|child|children|family|stroller|toddler|teen)\b/i,
  accessibility: /\b(stairs|elevator|lift|wheelchair|accessible|accessibility|mobility|ramp)\b/i,
  pets: /\b(dog|dogs|pet|pets|puppy)\b/i,
  parking: /\b(park|parking|garage|valet|car)\b/i,
  outdoor: /\b(terrace|outdoor|outside|patio|garden|rooftop|balcony|view)\b/i,
  time: /\b(how long|hours|duration|when|time of day|early|late|opening|morning|evening)\b/i,
};

const ATTRIBUTE_LABEL: Record<string, string> = {
  allowsDogs: "Allows dogs",
  goodForChildren: "Good for children",
  goodForGroups: "Good for groups",
  goodForWatchingSports: "Good for watching sports",
  liveMusic: "Live music",
  menuForChildren: "Children's menu",
  outdoorSeating: "Outdoor seating",
  reservable: "Takes reservations",
  restroom: "Restroom",
  servesBeer: "Serves beer",
  servesBreakfast: "Serves breakfast",
  servesBrunch: "Serves brunch",
  servesCocktails: "Serves cocktails",
  servesCoffee: "Serves coffee",
  servesDessert: "Serves dessert",
  servesDinner: "Serves dinner",
  servesLunch: "Serves lunch",
  servesVegetarianFood: "Serves vegetarian food",
  servesWine: "Serves wine",
  takeout: "Takeout",
  delivery: "Delivery",
  dineIn: "Dine-in",
  curbsidePickup: "Curbside pickup",
  "accessibilityOptions.wheelchairAccessibleEntrance": "Wheelchair-accessible entrance",
  "accessibilityOptions.wheelchairAccessibleRestroom": "Wheelchair-accessible restroom",
  "accessibilityOptions.wheelchairAccessibleParking": "Wheelchair-accessible parking",
  "accessibilityOptions.wheelchairAccessibleSeating": "Wheelchair-accessible seating",
  "parkingOptions.freeParkingLot": "Free parking lot",
  "parkingOptions.paidParkingLot": "Paid parking lot",
  "parkingOptions.freeStreetParking": "Free street parking",
  "parkingOptions.paidStreetParking": "Paid street parking",
  "parkingOptions.valetParking": "Valet parking",
  "parkingOptions.freeGarageParking": "Free garage parking",
  "parkingOptions.paidGarageParking": "Paid garage parking",
  "paymentOptions.acceptsCreditCards": "Accepts credit cards",
  "paymentOptions.acceptsDebitCards": "Accepts debit cards",
  "paymentOptions.acceptsCashOnly": "Cash only",
  "paymentOptions.acceptsNfc": "Accepts contactless",
};

export const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTE_LABEL);

export function attributeLabel(key: string): string {
  return ATTRIBUTE_LABEL[key] ?? key.split(".").pop()!.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

/** Flattens the boolean attribute fields of a Places Details response into labeled facts. */
export function attributesFrom(place: Record<string, unknown>): PlaceAttribute[] {
  const out: PlaceAttribute[] = [];
  for (const key of ATTRIBUTE_KEYS) {
    const [group, field] = key.split(".");
    const raw = field ? (place[group] as Record<string, unknown> | undefined)?.[field] : place[group];
    if (typeof raw === "boolean") out.push({ key, label: attributeLabel(key), value: raw });
  }
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function detectTopics(question: string): EvidenceTopic[] {
  const q = question.toLowerCase();
  const topics: EvidenceTopic[] = [];
  for (const [topic, re] of Object.entries(QUESTION_HINTS) as [EvidenceTopic, RegExp][]) {
    if (re.test(q)) topics.push(topic);
  }
  if (topics.length === 0) {
    for (const [topic, terms] of Object.entries(LEXICON) as [EvidenceTopic, string[]][]) {
      if (terms.some((t) => q.includes(t))) topics.push(topic);
    }
  }
  return topics;
}

/** Sentence-level hits for one topic set inside a piece of text. */
function matchTerms(sentence: string, topics: EvidenceTopic[]): string[] {
  const lower = sentence.toLowerCase();
  const hits: string[] = [];
  for (const topic of topics) {
    for (const term of LEXICON[topic]) {
      const re = new RegExp(`(^|[^a-z])${escapeRe(term)}([^a-z]|$)`, "i");
      if (re.test(lower) && !hits.includes(term)) hits.push(term);
    }
  }
  return hits;
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const STOP = new Set(["the", "a", "an", "is", "it", "are", "there", "do", "does", "they", "this", "that", "for", "with", "of", "to", "in", "on", "at", "and", "or", "i", "we", "you", "how", "what", "any", "have", "has", "be", "was", "were", "place", "hotel", "restaurant"]);

function questionWords(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Rough recency from Google's relative time strings, in days. */
export function relativeDays(text?: string): number {
  if (!text) return 3650;
  const m = text.match(/(\d+|a|an)\s+(day|week|month|year)/i);
  if (!m) return 3650;
  const n = /^(a|an)$/i.test(m[1]) ? 1 : Number(m[1]);
  const unit = m[2].toLowerCase();
  return n * (unit === "day" ? 1 : unit === "week" ? 7 : unit === "month" ? 30 : 365);
}

export function findEvidence(facts: PlaceFacts, question: string): Evidence {
  const topics = detectTopics(question);
  const words = questionWords(question);
  const snippets: EvidenceSnippet[] = [];

  facts.reviews.forEach((review: PlaceReview, reviewIndex) => {
    for (const sentence of splitSentences(review.text)) {
      const terms = matchTerms(sentence, topics);
      const overlap = words.filter((w) => sentence.toLowerCase().includes(w));
      const score = terms.length * 2 + overlap.length;
      if (terms.length === 0 && overlap.length < 2) continue;
      snippets.push({ reviewIndex, sentence, terms: [...new Set([...terms, ...overlap])], author: review.author, rating: review.rating, relativeTime: review.relativeTime });
      (snippets[snippets.length - 1] as EvidenceSnippet & { score: number }).score = score;
    }
  });
  snippets.sort((a, b) => {
    const sa = (a as EvidenceSnippet & { score: number }).score;
    const sb = (b as EvidenceSnippet & { score: number }).score;
    return sb - sa || relativeDays(a.relativeTime) - relativeDays(b.relativeTime);
  });
  const top = snippets.slice(0, 5).map(({ reviewIndex, sentence, terms, author, rating, relativeTime }) => ({ reviewIndex, sentence, terms, author, rating, relativeTime }));

  const summaryHits: string[] = [];
  for (const summary of [facts.reviewSummary, facts.generativeSummary]) {
    if (!summary) continue;
    for (const sentence of splitSentences(summary)) {
      if (matchTerms(sentence, topics).length > 0 || words.filter((w) => sentence.toLowerCase().includes(w)).length >= 2) summaryHits.push(sentence);
    }
  }

  const attributes = facts.attributes.filter((a) => (ATTRIBUTE_TOPICS[a.key] ?? []).some((t) => topics.includes(t)));

  const topicCounts: Partial<Record<EvidenceTopic, number>> = {};
  for (const topic of Object.keys(LEXICON) as EvidenceTopic[]) {
    const count = facts.reviews.filter((r) => matchTerms(r.text, [topic]).length > 0).length;
    if (count > 0) topicCounts[topic] = count;
  }

  return { topics, snippets: top, attributes, summaryHits: summaryHits.slice(0, 3), topicCounts };
}

/** Per-topic mention counts for the Reviews tab (no question needed). */
export function topicCounts(reviews: PlaceReview[]): Partial<Record<EvidenceTopic, number>> {
  const counts: Partial<Record<EvidenceTopic, number>> = {};
  for (const topic of Object.keys(LEXICON) as EvidenceTopic[]) {
    const count = reviews.filter((r) => matchTerms(r.text, [topic]).length > 0).length;
    if (count > 0) counts[topic] = count;
  }
  return counts;
}

/** Which reviews mention a topic (for highlighting). */
export function reviewsOnTopic(reviews: PlaceReview[], topic: EvidenceTopic): number[] {
  return reviews.map((r, i) => (matchTerms(r.text, [topic]).length > 0 ? i : -1)).filter((i) => i >= 0);
}

export function evidenceBasis(facts: PlaceFacts): string {
  const parts: string[] = [];
  if (facts.reviewSummary || facts.generativeSummary) parts.push("Google's review summary");
  if (facts.reviews.length) parts.push(`${facts.reviews.length} recent Google review${facts.reviews.length === 1 ? "" : "s"}`);
  if (facts.attributes.length) parts.push(`${facts.attributes.length} attribute${facts.attributes.length === 1 ? "" : "s"}`);
  return parts.length ? `Based on ${parts.join(", ")}.` : "No Google reviews or details are available for this place.";
}
