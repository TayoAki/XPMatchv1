/**
 * Name matching for the place catalog: turns "Roscioli, Trastevere, Rome, Italy" into the
 * name to look for and decides whether a stored place is the same one. Pure functions so
 * they can be unit-tested without a database.
 */

const GENERIC = new Set([
  "the", "a", "an", "of", "and", "at", "in", "on", "to", "by",
  "il", "la", "le", "lo", "el", "los", "las", "les", "der", "die", "das",
  "de", "del", "della", "dei", "di", "da", "du", "des", "al", "alla", "y", "e",
  "hotel", "restaurant", "cafe", "bar", "trattoria", "osteria", "ristorante", "pizzeria", "bistro", "museum", "park",
]);

/** Lowercase, no accents, no punctuation, single spaces, no leading article. */
export function normalizeName(value: string): string {
  const base = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.replace(/^(the|a|an|il|la|le|lo|el|los|las|les) /, "");
}

/** The place name inside a lookup query: the part before the first comma. */
export function primaryName(query: string): string {
  return query.split(",")[0].trim();
}

export function nameTokens(normalized: string): string[] {
  return normalized.split(" ").filter(Boolean);
}

function contentTokens(normalized: string): string[] {
  const all = nameTokens(normalized);
  const kept = all.filter((t) => !GENERIC.has(t));
  return kept.length ? kept : all;
}

/** Dice coefficient over token sets: 1 when identical, 0 when nothing shared. */
export function diceSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared += 1;
  return (2 * shared) / (setA.size + setB.size);
}

export interface NamedCandidate {
  id: string;
  nameNorm: string;
  userRatingCount?: number;
}

type Rule = "exact" | "prefix" | "contains" | "tokens";
const RULE_RANK: Record<Rule, number> = { exact: 4, prefix: 3, contains: 2, tokens: 1 };

function matchRule(query: string, name: string): Rule | null {
  if (name === query) return "exact";
  const queryTokens = nameTokens(query);
  if (query.length >= 6 && name.startsWith(`${query} `)) return "prefix";
  if (queryTokens.length >= 2) {
    if (name.includes(query)) return "contains";
    if (name.length >= 6 && query.includes(name)) return "contains";
  }
  if (diceSimilarity(contentTokens(query), contentTokens(name)) >= 0.8) return "tokens";
  return null;
}

/**
 * The stored place a lookup query refers to, or null when nothing is close enough.
 * Exact names win, then a name the query is a prefix of, then containment for
 * multi-word queries, then a token overlap of 80%+ ignoring generic words. Ties go
 * to the place more people have rated.
 */
export function pickCatalogMatch<T extends NamedCandidate>(query: string, candidates: T[]): T | null {
  const q = normalizeName(primaryName(query));
  if (q.length < 3) return null;
  let best: { candidate: T; rank: number } | null = null;
  for (const candidate of candidates) {
    const rule = matchRule(q, candidate.nameNorm);
    if (!rule) continue;
    const rank = RULE_RANK[rule];
    if (!best || rank > best.rank || (rank === best.rank && (candidate.userRatingCount ?? 0) > (best.candidate.userRatingCount ?? 0))) {
      best = { candidate, rank };
    }
  }
  return best?.candidate ?? null;
}
