import type { PlaceKind } from "@/lib/places/types";
import type { RecFeedback, RecVerdict } from "@/lib/recs/types";

/** The traveler's latest thumbs on a place of this kind, matched by name (the card may not have resolved a place id yet). */
export function verdictFor(list: RecFeedback[], kind: PlaceKind, name?: string): RecVerdict | undefined {
  if (!name) return undefined;
  const wanted = name.trim().toLowerCase();
  let latest: RecFeedback | undefined;
  for (const f of list) {
    if (f.kind !== kind || f.name.trim().toLowerCase() !== wanted) continue;
    if (!latest || f.updatedAt > latest.updatedAt) latest = f;
  }
  return latest?.verdict;
}

/** Row order: liked first, undecided next, passed last. */
export function verdictRank(verdict?: RecVerdict): number {
  return verdict === "up" ? 0 : verdict === "down" ? 2 : 1;
}
