import type { ActivityReport, CacheSavings, CostReport, DailySpend, ModelSpend, OpenRouterSpend, SkuUsage } from "@/lib/admin/types";
import { queryAll, queryOne } from "./db";
import { EMAIL_FREE_PER_MONTH, GOOGLE_PRICES, isGoogleSku, monthlyCost, type GoogleSku } from "./pricing";
import { loadUserRoster } from "./stats";
import { flushUsage, utcDay } from "./usage";

/**
 * The admin page's Costs and Activity sections: the calls metered in `usage_daily` priced with
 * `pricing.ts`, OpenRouter's own spend for the key, and the active days in `activity_days`.
 * Everything is by UTC day and month.
 */

export interface UsageRow {
  day: string;
  provider: string;
  sku: string;
  calls: number;
  unitsIn: number;
  unitsOut: number;
  costUsd: number;
}

const num = (value: unknown): number => Number(value ?? 0) || 0;
const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The last `count` UTC days up to and including `today`, oldest first. */
export function lastDays(count: number, today = new Date()): string[] {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Array.from({ length: count }, (_, i) => utcDay(new Date(end - (count - 1 - i) * DAY_MS)));
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/** The plan the app runs on; `HOSTING_MONTHLY_USD` overrides the default of Railway Pro's $20 minimum. */
export function hostingPlan(): { label: string; monthly: number } {
  const monthly = Number(process.env.HOSTING_MONTHLY_USD ?? "20");
  return { label: process.env.HOSTING_PLAN_LABEL?.trim() || "Railway Pro", monthly: Number.isFinite(monthly) && monthly >= 0 ? monthly : 20 };
}

/**
 * What a call answered from our own data would have cost from Google, at list price: a lookup the
 * details of a new place, a photo its media call, a list search a Text Search with the card mask,
 * a place sheet the full Place Details.
 */
const AVOIDED = {
  lookup: GOOGLE_PRICES.place_details_enterprise.per1000 / 1000,
  photo: GOOGLE_PRICES.place_photos.per1000 / 1000,
  list: GOOGLE_PRICES.text_search_enterprise.per1000 / 1000,
  sheet: GOOGLE_PRICES.place_details_atmosphere.per1000 / 1000,
};

const LIST_SKUS = new Set<string>(["text_search_pro", "text_search_enterprise", "text_search_atmosphere", "nearby_search_pro", "nearby_search_enterprise", "nearby_search_atmosphere"]);

function sumBy(rows: UsageRow[], keyOf: (row: UsageRow) => string, valueOf: (row: UsageRow) => number): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) out.set(keyOf(row), (out.get(keyOf(row)) ?? 0) + valueOf(row));
  return out;
}

const listPrice = (row: UsageRow) => (row.provider === "google" && isGoogleSku(row.sku) ? (row.calls * GOOGLE_PRICES[row.sku].per1000) / 1000 : 0);

/** Prices the metered rows: this month by SKU and model, the monthly pace, the last 30 days, and what the caches saved. */
export function buildCostReport(
  rows: UsageRow[],
  opts: { today?: Date; since: string | null; openrouter: OpenRouterSpend | null; hosting: { label: string; monthly: number } },
): CostReport {
  const today = opts.today ?? new Date();
  const todayDay = utcDay(today);
  const month = todayDay.slice(0, 7);
  const monthRows = rows.filter((r) => r.day.startsWith(month));
  const googleRows = monthRows.filter((r) => r.provider === "google" && isGoogleSku(r.sku));

  const google: SkuUsage[] = [...sumBy(googleRows, (r) => r.sku, (r) => r.calls)]
    .filter(([, calls]) => calls > 0)
    .map(([sku, calls]) => {
      const price = GOOGLE_PRICES[sku as GoogleSku];
      return { sku, label: price.label, calls, freePerMonth: price.freePerMonth, ...monthlyCost(sku as GoogleSku, calls) };
    })
    .sort((a, b) => b.cost - a.cost || b.listCost - a.listCost || b.calls - a.calls);
  const googleCost = google.reduce((s, g) => s + g.cost, 0);
  const googleListCost = google.reduce((s, g) => s + g.listCost, 0);

  const modelRows = monthRows.filter((r) => r.provider === "openrouter");
  const models: ModelSpend[] = [...new Set(modelRows.map((r) => r.sku))]
    .map((model) => {
      const mine = modelRows.filter((r) => r.sku === model);
      return {
        model,
        calls: mine.reduce((s, r) => s + r.calls, 0),
        inputTokens: mine.reduce((s, r) => s + r.unitsIn, 0),
        outputTokens: mine.reduce((s, r) => s + r.unitsOut, 0),
        cost: mine.reduce((s, r) => s + r.costUsd, 0),
      };
    })
    .sort((a, b) => b.cost - a.cost || b.calls - a.calls);
  const modelCost = models.reduce((s, m) => s + m.cost, 0);

  const count = (provider: string, sku?: string, from = monthRows) =>
    from.filter((r) => r.provider === provider && (sku === undefined || r.sku === sku)).reduce((s, r) => s + r.calls, 0);

  // The pace: the metered days (up to the last 30) stretched to a 30-day month, free allowances applied.
  const paceDays = opts.since ? Math.min(30, Math.max(1, daysBetween(opts.since, todayDay) + 1)) : 0;
  let monthlyPace = opts.hosting.monthly;
  if (paceDays) {
    const window = new Set(lastDays(paceDays, today));
    const recent = rows.filter((r) => window.has(r.day));
    const scale = 30 / paceDays;
    for (const [sku, calls] of sumBy(recent.filter((r) => r.provider === "google" && isGoogleSku(r.sku)), (r) => r.sku, (r) => r.calls)) {
      monthlyPace += monthlyCost(sku as GoogleSku, Math.round(calls * scale)).cost;
    }
    monthlyPace += recent.filter((r) => r.provider === "openrouter").reduce((s, r) => s + r.costUsd, 0) * scale;
  }

  const days = lastDays(30, today);
  const googleByDay = sumBy(rows, (r) => r.day, listPrice);
  const modelByDay = sumBy(rows.filter((r) => r.provider === "openrouter"), (r) => r.day, (r) => r.costUsd);
  const daily: DailySpend[] = days.map((day) => ({ day, google: googleByDay.get(day) ?? 0, model: modelByDay.get(day) ?? 0 }));

  const lookups = {
    memory: count("app", "lookup_memory"),
    catalog: count("app", "lookup_catalog"),
    known: count("app", "lookup_known"),
    bought: count("app", "lookup_new"),
    fallback: count("app", "lookup_fallback"),
  };
  const photos = { cached: count("app", "photo_cached"), bought: count("google", "place_photos") };
  const lists = { cached: count("app", "list_cached"), bought: googleRows.filter((r) => LIST_SKUS.has(r.sku)).reduce((s, r) => s + r.calls, 0) };
  const sheets = { cached: count("app", "details_cached"), bought: count("google", "place_details_atmosphere") };
  const savings: CacheSavings = {
    lookups,
    photos,
    lists,
    sheets,
    avoided: (lookups.memory + lookups.catalog + lookups.known) * AVOIDED.lookup + photos.cached * AVOIDED.photo + lists.cached * AVOIDED.list + sheets.cached * AVOIDED.sheet,
  };

  const modelMonth = opts.openrouter ? opts.openrouter.month : modelCost;
  return {
    since: opts.since,
    month,
    google,
    googleCost,
    googleListCost,
    models,
    modelCost,
    openrouter: opts.openrouter,
    emails: { sent: count("resend", "email"), freePerMonth: EMAIL_FREE_PER_MONTH },
    weatherCalls: count("open-meteo"),
    hosting: opts.hosting,
    monthToDate: round2(googleCost + modelMonth + opts.hosting.monthly),
    monthlyPace: round2(monthlyPace),
    paceDays,
    daily,
    savings,
  };
}

/* ------------------------------ OpenRouter ------------------------------ */

const OPENROUTER_TTL_MS = 5 * 60_000;
let openrouterCache: { at: number; value: OpenRouterSpend | null } | null = null;

/** OpenRouter's own spend for the app's key (all time, this UTC month, week and day), cached for five minutes. */
export async function loadOpenRouterSpend(): Promise<OpenRouterSpend | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  if (openrouterCache && Date.now() - openrouterCache.at < OPENROUTER_TTL_MS) return openrouterCache.value;
  const base = (process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  let value: OpenRouterSpend | null = null;
  try {
    const res = await fetch(`${base}/key`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`OpenRouter answered ${res.status}`);
    const data = ((await res.json()) as { data?: Record<string, unknown> }).data;
    const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    if (data) {
      value = {
        total: money(data.usage) ?? 0,
        month: money(data.usage_monthly) ?? 0,
        week: money(data.usage_weekly) ?? 0,
        today: money(data.usage_daily) ?? 0,
        limit: money(data.limit),
        limitRemaining: money(data.limit_remaining),
      };
    }
  } catch (err) {
    console.warn("[metrics] OpenRouter spend unavailable:", err instanceof Error ? err.message : err);
  }
  openrouterCache = { at: Date.now(), value };
  return value;
}

/* -------------------------------- loaders -------------------------------- */

/** This month's costs and the last 30 days, with the counts still waiting in memory written first. */
export async function loadCostReport(today = new Date()): Promise<CostReport> {
  await flushUsage();
  // Sixty days back covers both this month and the last 30 days.
  const from = lastDays(60, today)[0];
  const [rows, first, openrouter] = await Promise.all([
    queryAll<Record<string, unknown>>(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day, provider, sku, calls, units_in, units_out, cost_usd
         FROM usage_daily WHERE day >= $1::date`,
      [from],
    ),
    queryOne<{ day: string | null }>("SELECT to_char(min(day), 'YYYY-MM-DD') AS day FROM usage_daily"),
    loadOpenRouterSpend(),
  ]);
  const usage: UsageRow[] = rows.map((r) => ({
    day: String(r.day),
    provider: String(r.provider),
    sku: String(r.sku),
    calls: num(r.calls),
    unitsIn: num(r.units_in),
    unitsOut: num(r.units_out),
    costUsd: num(r.cost_usd),
  }));
  return buildCostReport(usage, { today, since: first?.day ?? null, openrouter, hosting: hostingPlan() });
}

/** Active travelers (today, 7 and 30 days, returning), the path from sign-up to a trip, and how much the assistant answers. */
export async function loadActivityReport(today = new Date()): Promise<ActivityReport> {
  await flushUsage();
  const days = lastDays(30, today);
  const [from, from7, todayDay] = [days[0], days[23], days[29]];
  const [counts, returning, activeByDay, signupsByDay, recorded, cameBack, messages, answerRows, roster] = await Promise.all([
    queryOne<Record<string, unknown>>(
      `SELECT count(DISTINCT user_id) FILTER (WHERE day = $3::date) AS today,
              count(DISTINCT user_id) FILTER (WHERE day >= $2::date) AS last7,
              count(DISTINCT user_id) AS last30
         FROM activity_days WHERE day >= $1::date`,
      [from, from7, todayDay],
    ),
    queryOne<{ n: unknown }>(
      "SELECT count(*) AS n FROM (SELECT user_id FROM activity_days WHERE day >= $1::date GROUP BY user_id HAVING count(*) >= 2) t",
      [from],
    ),
    queryAll<{ day: string; n: unknown }>(
      "SELECT to_char(day, 'YYYY-MM-DD') AS day, count(*) AS n FROM activity_days WHERE day >= $1::date GROUP BY day",
      [from],
    ),
    queryAll<{ day: string; n: unknown }>(
      `SELECT to_char((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day, count(*) AS n
         FROM users WHERE (created_at AT TIME ZONE 'UTC')::date >= $1::date GROUP BY 1`,
      [from],
    ),
    queryOne<{ day: string | null }>(
      "SELECT to_char((applied_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day FROM schema_migrations WHERE id = '0011_usage'",
    ),
    queryOne<{ n: unknown }>("SELECT count(*) AS n FROM (SELECT user_id FROM activity_days GROUP BY user_id HAVING count(*) >= 2) t"),
    queryOne<{ n: unknown }>(
      `SELECT count(*) AS n
         FROM chat_messages cm
         CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(cm.messages) = 'array' THEN cm.messages ELSE '[]'::jsonb END) AS m
        WHERE m->>'role' = 'user'`,
    ),
    queryAll<{ day: string; n: unknown }>(
      "SELECT to_char(day, 'YYYY-MM-DD') AS day, calls AS n FROM usage_daily WHERE provider = 'app' AND sku = 'agent_run' AND day >= $1::date",
      [from],
    ),
    loadUserRoster(),
  ]);
  const active = new Map(activeByDay.map((r) => [r.day, num(r.n)]));
  const signups = new Map(signupsByDay.map((r) => [r.day, num(r.n)]));
  const answers = new Map(answerRows.map((r) => [r.day, num(r.n)]));
  const answersSince = (start: string) => [...answers].filter(([day]) => day >= start).reduce((s, [, n]) => s + n, 0);
  return {
    recordedSince: recorded?.day ?? null,
    today: num(counts?.today),
    last7Days: num(counts?.last7),
    last30Days: num(counts?.last30),
    returning30Days: num(returning?.n),
    daily: days.map((day) => ({ day, active: active.get(day) ?? 0, signups: signups.get(day) ?? 0 })),
    funnel: {
      signedUp: roster.length,
      finishedQuiz: roster.filter((u) => u.quiz === "completed").length,
      chatted: roster.filter((u) => u.chats > 0).length,
      madeTrip: roster.filter((u) => u.trips > 0).length,
      cameBack: num(cameBack?.n),
    },
    answers: { today: answersSince(todayDay), last7Days: answersSince(from7), last30Days: answersSince(from) },
    messages: num(messages?.n),
  };
}
