/**
 * Deterministic reading of an Explore search ("cheap sushi open now 4.5+") into
 * Places Text Search parameters plus the words that stay in the text query.
 * No model call: this is what the "Understood as" chips show.
 */

export interface ParsedSearch {
  /** Words left for the text query after filters were pulled out. */
  query: string;
  priceLevels?: string[];
  minRating?: number;
  openNow?: boolean;
  /** Chips: applied filters first, then vibe words that were kept in the text. */
  chips: { label: string; applied: boolean }[];
}

const PRICE_WORDS: { pattern: RegExp; levels: string[]; label: string }[] = [
  { pattern: /\b(cheap|cheap eats|budget|inexpensive|affordable|hole[- ]in[- ]the[- ]wall)\b/i, levels: ["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE"], label: "Inexpensive" },
  { pattern: /\b(mid[- ]?range|moderate(ly priced)?|reasonabl[ey])\b/i, levels: ["PRICE_LEVEL_MODERATE"], label: "Moderate prices" },
  { pattern: /\b(upscale|fancy|high[- ]end|fine dining|splurge)\b/i, levels: ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"], label: "Upscale" },
  { pattern: /\b(luxury|luxurious|five[- ]star|5[- ]star)\b/i, levels: ["PRICE_LEVEL_VERY_EXPENSIVE", "PRICE_LEVEL_EXPENSIVE"], label: "Luxury" },
];

const VIBE_WORDS = /\b(quiet|cozy|romantic|lively|trendy|hip|casual|family[- ]friendly|kid[- ]friendly|dog[- ]friendly|scenic|hidden gem|local favorite|authentic|rooftop|waterfront|outdoor seating|late[- ]night|brunch)\b/gi;

function roundRating(value: number): number {
  return Math.min(5, Math.max(0, Math.round(value * 2) / 2));
}

export function parseSearch(input: string): ParsedSearch {
  let text = ` ${input.trim().replace(/\s+/g, " ")} `;
  const chips: ParsedSearch["chips"] = [];
  const result: ParsedSearch = { query: "", chips };

  // Price: "$", "$$", "under $30", "cheap", "upscale"...
  const dollars = text.match(/(?:^|\s)(\${1,4})(?=\s|$)/);
  if (dollars) {
    const n = dollars[1].length;
    result.priceLevels = [["PRICE_LEVEL_INEXPENSIVE"], ["PRICE_LEVEL_MODERATE"], ["PRICE_LEVEL_EXPENSIVE"], ["PRICE_LEVEL_VERY_EXPENSIVE"]][n - 1];
    chips.push({ label: `Price ${dollars[1]}`, applied: true });
    text = text.replace(dollars[0], " ");
  }
  const under = text.match(/\b(under|below|less than|max|up to)\s*\$?\s*(\d{1,4})(?:\s*(?:a|per|\/)\s*(night|person|head|pp))?/i);
  if (under) {
    const amount = Number(under[2]);
    const perNight = /night/i.test(under[3] ?? "");
    const levels = perNight
      ? amount <= 120
        ? ["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE"]
        : amount <= 250
          ? ["PRICE_LEVEL_MODERATE", "PRICE_LEVEL_EXPENSIVE"]
          : undefined
      : amount <= 20
        ? ["PRICE_LEVEL_INEXPENSIVE"]
        : amount <= 45
          ? ["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE"]
          : amount <= 90
            ? ["PRICE_LEVEL_MODERATE", "PRICE_LEVEL_EXPENSIVE"]
            : undefined;
    if (levels && !result.priceLevels) result.priceLevels = levels;
    chips.push({ label: `Under $${amount}${perNight ? "/night" : ""}`, applied: !!levels });
    text = text.replace(under[0], " ");
  }
  for (const word of PRICE_WORDS) {
    const m = text.match(word.pattern);
    if (!m) continue;
    if (!result.priceLevels) result.priceLevels = word.levels;
    chips.push({ label: word.label, applied: true });
    text = text.replace(m[0], " ");
  }

  // Rating: "4.5+", "4 stars and up", "highly rated", "top rated", "best".
  const rating = text.match(/\b([2-5](?:\.\d)?)\s*(?:\+|stars?\s*(?:and up|or (?:better|higher|more)|\+)|or (?:better|higher))/i);
  if (rating) {
    result.minRating = roundRating(Number(rating[1]));
    chips.push({ label: `${result.minRating}★ and up`, applied: true });
    text = text.replace(rating[0], " ");
  } else {
    const praised = text.match(/\b(highly[- ]rated|top[- ]rated|best|well[- ]reviewed|great reviews)\b/i);
    if (praised) {
      result.minRating = 4.5;
      chips.push({ label: "4.5★ and up", applied: true });
      text = text.replace(praised[0], " ");
    }
  }

  // Hours: "open now", "open late" (late stays in the text; Places has no late filter).
  const openNow = text.match(/\b(open (?:right )?now|currently open|open at the moment)\b/i);
  if (openNow) {
    result.openNow = true;
    chips.push({ label: "Open now", applied: true });
    text = text.replace(openNow[0], " ");
  }

  // Vibe words stay in the query (Text Search understands them) but are shown so the traveler knows.
  const vibes = new Set<string>();
  for (const m of text.matchAll(VIBE_WORDS)) vibes.add(m[0].toLowerCase());
  for (const v of vibes) chips.push({ label: v.charAt(0).toUpperCase() + v.slice(1), applied: false });

  result.query = text
    .replace(/\b(near me|nearby|around here|close by|please|find|show me|looking for|i want|i'd like)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return result;
}
