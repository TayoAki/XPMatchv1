import type { SpendStats, SpendBySku } from "@/lib/admin/types";
import { queryAll, queryOne } from "./db";

/**
 * What every paid Google call actually costs us, counted as it happens.
 *
 * Before this, nothing in the app counted a Google call: `docs/COGS.md` priced the app by
 * reading the code and Google's rate card, which is an estimate, not a measurement. The
 * catalog changed the code underneath those estimates (a card lookup is now a free ids-only
 * Text Search plus a Place Details only for a place we have never stored), so the old numbers
 * describe an app that no longer exists.
 *
 * Every function here fails soft: a counter problem never breaks a lookup.
 */

/** The Google SKUs this app can bill at, named as Google names them. */
export type Sku =
  | "text_search_ids_only"
  | "text_search_enterprise"
  | "nearby_search_enterprise"
  | "place_details_enterprise"
  | "place_details_atmosphere"
  | "place_photos"
  | "routes_essentials";

/**
 * List price per 1,000 calls, Google Maps Platform core services, read September 2026.
 *
 * These are LIST prices and they ignore the monthly free tiers (10,000 Essentials, 5,000 Pro,
 * 1,000 Enterprise). Treat the totals here as an upper bound and reconcile them against the
 * real Cloud bill before quoting them anywhere: the point of this table is to make the two
 * comparable, not to replace the invoice.
 */
export const SKU_PRICE_PER_1000: Record<Sku, number> = {
  text_search_ids_only: 0,
  text_search_enterprise: 35,
  nearby_search_enterprise: 35,
  place_details_enterprise: 35,
  place_details_atmosphere: 40,
  place_photos: 7,
  routes_essentials: 5,
};

/** Human labels for the admin page, in the order it shows them. */
export const SKU_LABELS: Record<Sku, string> = {
  text_search_ids_only: "Text Search, ids only",
  text_search_enterprise: "Text Search Enterprise",
  nearby_search_enterprise: "Nearby Search Enterprise",
  place_details_enterprise: "Place Details Enterprise",
  place_details_atmosphere: "Place Details + Atmosphere",
  place_photos: "Place Photos",
  routes_essentials: "Routes Essentials",
};

const ATMOSPHERE = /\b(reviews|reviewSummary|editorialSummary)\b/;

/**
 * Which SKU a Places call bills at, from the URL and the field mask it was sent with.
 * The mask is what decides the tier, so this reads the same thing Google's billing does.
 */
export function classifyPlacesCall(url: string, fieldMask: string): Sku {
  if (url.includes(":searchText")) {
    return fieldMask.replace(/\s/g, "") === "places.id" ? "text_search_ids_only" : "text_search_enterprise";
  }
  if (url.includes(":searchNearby")) return "nearby_search_enterprise";
  return ATMOSPHERE.test(fieldMask) ? "place_details_atmosphere" : "place_details_enterprise";
}

function warn(what: string, err: unknown) {
  console.warn(`[api-spend] ${what}:`, err instanceof Error ? err.message : err);
}

/**
 * Counts one call against today's total for its SKU. Fire and forget: the caller never waits
 * for it and never fails because of it.
 */
export function recordCall(sku: Sku, calls = 1): void {
  if (calls <= 0) return;
  void queryOne(
    `INSERT INTO api_calls (day, sku, calls) VALUES (current_date, $1, $2)
     ON CONFLICT (day, sku) DO UPDATE SET calls = api_calls.calls + EXCLUDED.calls`,
    [sku, calls],
  ).catch((err) => warn(`record ${sku}`, err));
}

const n = (v: unknown): number => Number(v ?? 0) || 0;
const round = (v: number, places = 2): number => Math.round(v * 10 ** places) / 10 ** places;

/**
 * Calls and estimated spend by SKU over the last `days`, plus the two numbers the business
 * plan has been assuming rather than measuring: cost per active user and cost per place.
 */
export async function loadSpendStats(days = 30): Promise<SpendStats> {
  const empty: SpendStats = {
    days,
    bySku: [],
    totalCalls: 0,
    paidCalls: 0,
    estimatedCost: 0,
    activeUsers: 0,
    costPerActiveUser: null,
    newPlaces: 0,
    costPerNewPlace: null,
    catalogHitRate: null,
  };
  try {
    const rows = await queryAll<Record<string, unknown>>(
      `SELECT sku, sum(calls) AS calls FROM api_calls
       WHERE day >= current_date - ($1::int - 1) GROUP BY sku`,
      [days],
    );
    const counted = (Object.keys(SKU_PRICE_PER_1000) as Sku[])
      .map((sku) => {
        const calls = n(rows.find((r) => r.sku === sku)?.calls);
        return { sku, price: SKU_PRICE_PER_1000[sku], label: SKU_LABELS[sku], calls, cost: round((calls * SKU_PRICE_PER_1000[sku]) / 1000) };
      })
      .filter((r) => r.calls > 0);

    const bySku: SpendBySku[] = counted.map(({ sku, label, calls, cost }) => ({ sku, label, calls, cost }));
    const totalCalls = counted.reduce((sum, r) => sum + r.calls, 0);
    const paidCalls = counted.filter((r) => r.price > 0).reduce((sum, r) => sum + r.calls, 0);
    const estimatedCost = round(counted.reduce((sum, r) => sum + r.cost, 0));

    const totals = await queryOne<Record<string, unknown>>(
      `SELECT (SELECT count(DISTINCT user_id) FROM chats WHERE updated_at >= now() - ($1::int * interval '1 day')) AS active_users,
              (SELECT count(*) FROM places WHERE created_at >= now() - ($1::int * interval '1 day')) AS new_places,
              (SELECT COALESCE(sum(hits), 0) FROM place_aliases) AS alias_hits`,
      [days],
    );
    const activeUsers = n(totals?.active_users);
    const newPlaces = n(totals?.new_places);
    const aliasHits = n(totals?.alias_hits);

    // A lookup either came from a remembered query (free) or cost a paid Places call.
    const lookups = aliasHits + paidCalls;

    return {
      days,
      bySku,
      totalCalls,
      paidCalls,
      estimatedCost,
      activeUsers,
      costPerActiveUser: activeUsers > 0 ? round(estimatedCost / activeUsers) : null,
      newPlaces,
      costPerNewPlace: newPlaces > 0 ? round(estimatedCost / newPlaces, 3) : null,
      catalogHitRate: lookups > 0 ? Math.round((aliasHits / lookups) * 100) : null,
    };
  } catch (err) {
    warn("stats failed", err);
    return empty;
  }
}
