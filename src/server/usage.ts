import type { LanguageModelMiddleware } from "ai";
import { queryAll } from "./db";
import { MODEL_PRICES, tokenCost } from "./pricing";

/**
 * Metering. Every call the server pays for, or would past a free allowance (Google Places, photos,
 * routes, map loads, model tokens, email), is counted per UTC day, provider and SKU in `usage_daily`,
 * next to what the app answered itself (catalog and cache hits, provider "app"). The days each
 * traveler was signed in go to `activity_days`. Counts wait in memory and are written every few
 * seconds in one statement, so no request waits on them; a crash or deploy loses at most those
 * seconds. The admin page prices them (`src/server/metrics.ts`).
 */

export type UsageProvider = "google" | "openrouter" | "resend" | "open-meteo" | "app";

interface Counts {
  calls: number;
  unitsIn: number;
  unitsOut: number;
  costUsd: number;
}

interface PendingRow extends Counts {
  day: string;
  provider: UsageProvider;
  sku: string;
}

const FLUSH_MS = 5000;
const pending = new Map<string, PendingRow>();
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

/** A date as its UTC day, YYYY-MM-DD. */
export const utcDay = (date = new Date()): string => date.toISOString().slice(0, 10);

function add(row: PendingRow) {
  const key = `${row.day}\n${row.provider}\n${row.sku}`;
  const into = pending.get(key);
  if (!into) {
    pending.set(key, { ...row });
    return;
  }
  into.calls += row.calls;
  into.unitsIn += row.unitsIn;
  into.unitsOut += row.unitsOut;
  into.costUsd += row.costUsd;
}

/** Counts one call of a SKU today (or `counts.calls` of them, with tokens and a cost). Never throws, never waits. */
export function recordUsage(provider: UsageProvider, sku: string, counts: Partial<Counts> = {}): void {
  add({
    day: utcDay(),
    provider,
    sku: sku.slice(0, 120),
    calls: Math.max(0, Math.round(counts.calls ?? 1)),
    unitsIn: Math.max(0, Math.round(counts.unitsIn ?? 0)),
    unitsOut: Math.max(0, Math.round(counts.unitsOut ?? 0)),
    costUsd: Math.max(0, counts.costUsd ?? 0),
  });
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flushUsage();
  }, FLUSH_MS);
  timer.unref?.();
}

/** Writes the waiting counts. The admin page calls it before reading, so its numbers include the last few seconds. */
export async function flushUsage(): Promise<void> {
  while (inFlight) await inFlight;
  if (!pending.size) return;
  const rows = [...pending.values()];
  pending.clear();
  const params: unknown[] = [];
  const values = rows.map((r, i) => {
    params.push(r.day, r.provider, r.sku, r.calls, r.unitsIn, r.unitsOut, r.costUsd);
    const n = i * 7;
    return `($${n + 1}::date, $${n + 2}, $${n + 3}, $${n + 4}::bigint, $${n + 5}::bigint, $${n + 6}::bigint, $${n + 7}::double precision)`;
  });
  inFlight = queryAll(
    `INSERT INTO usage_daily (day, provider, sku, calls, units_in, units_out, cost_usd)
     VALUES ${values.join(", ")}
     ON CONFLICT (day, provider, sku) DO UPDATE SET
       calls = usage_daily.calls + EXCLUDED.calls,
       units_in = usage_daily.units_in + EXCLUDED.units_in,
       units_out = usage_daily.units_out + EXCLUDED.units_out,
       cost_usd = usage_daily.cost_usd + EXCLUDED.cost_usd,
       updated_at = now()`,
    params,
  )
    .then(
      () => undefined,
      (err: unknown) => {
        // Kept for the next write rather than lost to a database hiccup.
        for (const r of rows) add(r);
        console.warn("[usage] could not write counts:", err instanceof Error ? err.message : err);
      },
    )
    .finally(() => {
      inFlight = null;
    });
  await inFlight;
}

const activeToday = new Map<string, string>();

/** Marks the traveler active today; one write per traveler and day in each process. */
export function recordActivity(userId: string): void {
  const day = utcDay();
  if (activeToday.get(userId) === day) return;
  if (activeToday.size >= 10_000) activeToday.clear();
  activeToday.set(userId, day);
  queryAll("INSERT INTO activity_days (user_id, day) VALUES ($1, $2::date) ON CONFLICT DO NOTHING", [userId, day]).catch((err: unknown) => {
    activeToday.delete(userId);
    console.warn("[usage] could not record activity:", err instanceof Error ? err.message : err);
  });
}

/* ------------------------------ model tokens ------------------------------ */

type GenerateResult = Awaited<ReturnType<NonNullable<LanguageModelMiddleware["wrapGenerate"]>>>;
type ModelUsage = GenerateResult["usage"];
type StreamResult = Awaited<ReturnType<NonNullable<LanguageModelMiddleware["wrapStream"]>>>;
type StreamPart = StreamResult["stream"] extends ReadableStream<infer P> ? P : never;

/** The call's cost as OpenRouter reported it (usage accounting), else the list price of its tokens. */
export function modelCallCost(modelId: string, usage: ModelUsage | undefined): { inputTokens: number; outputTokens: number; costUsd: number; reported: boolean } {
  const inputTokens = usage?.inputTokens.total ?? 0;
  const outputTokens = usage?.outputTokens.total ?? 0;
  const cost = (usage?.raw as { cost?: unknown } | undefined)?.cost;
  if (typeof cost === "number" && Number.isFinite(cost) && cost >= 0) return { inputTokens, outputTokens, costUsd: cost, reported: true };
  return { inputTokens, outputTokens, costUsd: tokenCost(MODEL_PRICES[modelId] ?? null, inputTokens, outputTokens), reported: false };
}

function recordModelCall(modelId: string, usage: ModelUsage | undefined) {
  const { inputTokens, outputTokens, costUsd } = modelCallCost(modelId, usage);
  recordUsage("openrouter", modelId, { unitsIn: inputTokens, unitsOut: outputTokens, costUsd });
}

/**
 * Counts every call of an OpenRouter model with its tokens and cost. It also asks OpenRouter to
 * include the call's cost in the usage it returns, so the figure is theirs rather than ours.
 */
export function modelUsageMiddleware(modelId: string): LanguageModelMiddleware {
  return {
    specificationVersion: "v3",
    transformParams: async ({ params }) => ({
      ...params,
      providerOptions: { ...params.providerOptions, openrouter: { usage: { include: true }, ...params.providerOptions?.openrouter } },
    }),
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      recordModelCall(modelId, result.usage);
      return result;
    },
    wrapStream: async ({ doStream }) => {
      const result = await doStream();
      const metered = new TransformStream<StreamPart, StreamPart>({
        transform(part, controller) {
          if (part.type === "finish") recordModelCall(modelId, part.usage);
          controller.enqueue(part);
        },
      });
      return { ...result, stream: result.stream.pipeThrough(metered) };
    },
  };
}
