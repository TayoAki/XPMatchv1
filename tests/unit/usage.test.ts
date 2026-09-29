import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ queryAll: vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>(async () => []), queryOne: vi.fn(async () => null) }));
vi.mock("@/server/db", () => db);

import { PLACE_FIELD_MASKS } from "@/server/places";
import { googleSkuFor, monthlyCost, tokenCost } from "@/server/pricing";
import { flushUsage, modelCallCost, modelUsageMiddleware, recordUsage } from "@/server/usage";
import { buildCostReport, lastDays, type UsageRow } from "@/server/metrics";

const SEARCH = "https://places.googleapis.com/v1/places:searchText";
const NEARBY = "https://places.googleapis.com/v1/places:searchNearby";
const DETAILS = "https://places.googleapis.com/v1/places/ChIJ123";

/** The rows the last usage write sent, as [day, provider, sku, calls, tokens in, tokens out, cost]. */
function writtenRows(): unknown[][] {
  const call = db.queryAll.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO usage_daily"));
  if (!call) return [];
  const params = call[1] as unknown[];
  const rows: unknown[][] = [];
  for (let i = 0; i < params.length; i += 7) rows.push(params.slice(i, i + 7));
  return rows;
}

const usage = (input: number, output: number, cost?: number) => ({
  inputTokens: { total: input, noCache: input, cacheRead: 0, cacheWrite: undefined },
  outputTokens: { total: output, text: output, reasoning: 0 },
  raw: cost === undefined ? { prompt_tokens: input } : { prompt_tokens: input, cost },
});

beforeEach(async () => {
  await flushUsage();
  db.queryAll.mockClear();
});

describe("googleSkuFor", () => {
  it("prices the app's own field masks at the tier their priciest field sets", () => {
    expect(googleSkuFor(SEARCH, PLACE_FIELD_MASKS.search)).toBe("text_search_enterprise");
    expect(googleSkuFor(NEARBY, PLACE_FIELD_MASKS.search)).toBe("nearby_search_enterprise");
    expect(googleSkuFor(SEARCH, PLACE_FIELD_MASKS.idsOnly)).toBe("text_search_ids");
    expect(googleSkuFor(DETAILS, PLACE_FIELD_MASKS.cardDetails)).toBe("place_details_enterprise");
    expect(googleSkuFor(DETAILS, PLACE_FIELD_MASKS.details)).toBe("place_details_atmosphere");
  });

  it("knows the cheaper tiers, the wildcard and fields it has never seen", () => {
    expect(googleSkuFor(DETAILS, "id,photos")).toBe("place_details_ids");
    expect(googleSkuFor(DETAILS, "location,formattedAddress")).toBe("place_details_essentials");
    expect(googleSkuFor(DETAILS, "displayName")).toBe("place_details_pro");
    // Searches have no Essentials tier: a location is Pro there.
    expect(googleSkuFor(SEARCH, "places.id,places.location")).toBe("text_search_pro");
    expect(googleSkuFor(SEARCH, "*")).toBe("text_search_atmosphere");
    expect(googleSkuFor(DETAILS, "id,someNewField")).toBe("place_details_enterprise");
  });
});

describe("monthlyCost and tokenCost", () => {
  it("charges only the calls past the free allowance", () => {
    expect(monthlyCost("place_details_atmosphere", 800)).toEqual({ billable: 0, cost: 0, listCost: 20 });
    expect(monthlyCost("place_details_atmosphere", 1200)).toEqual({ billable: 200, cost: 5, listCost: 30 });
    expect(monthlyCost("text_search_ids", 50_000)).toEqual({ billable: 0, cost: 0, listCost: 0 });
  });

  it("prices tokens per million", () => {
    expect(tokenCost({ input: 0.15, output: 0.6 }, 1_000_000, 500_000)).toBeCloseTo(0.45);
    expect(tokenCost(null, 1000, 1000)).toBe(0);
  });
});

describe("recordUsage and flushUsage", () => {
  it("adds up calls of the same SKU and writes them in one statement", async () => {
    recordUsage("google", "place_photos");
    recordUsage("google", "place_photos");
    recordUsage("resend", "email");
    await flushUsage();
    const rows = writtenRows();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r[2] === "place_photos")?.[3]).toBe(2);
    expect(rows.find((r) => r[2] === "email")?.[1]).toBe("resend");
  });

  it("keeps the counts for the next write when the database fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    db.queryAll.mockRejectedValueOnce(new Error("connection reset"));
    recordUsage("google", "compute_routes", { calls: 3 });
    await flushUsage();
    expect(warn).toHaveBeenCalled();
    db.queryAll.mockClear();
    await flushUsage();
    expect(writtenRows()[0]?.slice(1, 4)).toEqual(["google", "compute_routes", 3]);
    warn.mockRestore();
  });
});

describe("model metering", () => {
  it("takes OpenRouter's reported cost, else the list price of the tokens", () => {
    expect(modelCallCost("openai/gpt-4o-mini", usage(1000, 500, 0.0012) as never)).toMatchObject({ costUsd: 0.0012, reported: true });
    const estimated = modelCallCost("openai/gpt-4o-mini", usage(1_000_000, 1_000_000) as never);
    expect(estimated.reported).toBe(false);
    expect(estimated.costUsd).toBeCloseTo(0.75);
    expect(modelCallCost("some/other-model", usage(1000, 1000) as never).costUsd).toBe(0);
  });

  it("asks OpenRouter for the cost and keeps the caller's own options", async () => {
    const mw = modelUsageMiddleware("openai/gpt-4o-mini");
    const params = await mw.transformParams!({ type: "stream", params: { prompt: [], providerOptions: { openrouter: { user: "u1" } } }, model: {} } as never);
    expect(params.providerOptions).toEqual({ openrouter: { usage: { include: true }, user: "u1" } });
  });

  it("counts a generated answer", async () => {
    const mw = modelUsageMiddleware("openai/gpt-4o-mini");
    const doGenerate = async () => ({ content: [], finishReason: { unified: "stop", raw: "stop" }, usage: usage(200, 60, 0.00005), warnings: [] });
    await mw.wrapGenerate!({ doGenerate, doStream: async () => ({}), params: {}, model: {} } as never);
    await flushUsage();
    expect(writtenRows()[0]).toEqual([expect.any(String), "openrouter", "openai/gpt-4o-mini", 1, 200, 60, 0.00005]);
  });

  it("counts a streamed answer when its finish part arrives, passing every part through", async () => {
    const mw = modelUsageMiddleware("openai/gpt-4o-mini");
    const parts = [
      { type: "text-delta", id: "t", delta: "Hello" },
      { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: usage(100, 20, 0.000027) },
    ];
    const doStream = async () => ({
      stream: new ReadableStream({
        start(controller) {
          for (const part of parts) controller.enqueue(part);
          controller.close();
        },
      }),
    });
    const result = await mw.wrapStream!({ doGenerate: async () => ({}), doStream, params: {}, model: {} } as never);
    const seen: unknown[] = [];
    const reader = result.stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      seen.push(value);
    }
    expect(seen).toEqual(parts);
    await flushUsage();
    expect(writtenRows()[0]).toEqual([expect.any(String), "openrouter", "openai/gpt-4o-mini", 1, 100, 20, 0.000027]);
  });
});

describe("lastDays", () => {
  it("counts back across a month end, oldest first", () => {
    expect(lastDays(3, new Date("2026-03-01T12:00:00Z"))).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
  });
});

describe("buildCostReport", () => {
  const row = (day: string, provider: string, sku: string, calls: number, costUsd = 0): UsageRow => ({ day, provider, sku, calls, unitsIn: 0, unitsOut: 0, costUsd });
  const rows: UsageRow[] = [
    row("2026-08-20", "google", "place_photos", 50),
    row("2026-09-02", "google", "place_details_atmosphere", 700),
    row("2026-09-10", "google", "place_details_atmosphere", 500),
    row("2026-09-10", "google", "text_search_ids", 500),
    row("2026-09-12", "openrouter", "openai/gpt-4o-mini", 10, 0.5),
    row("2026-09-12", "app", "lookup_memory", 5),
    row("2026-09-12", "app", "lookup_catalog", 30),
    row("2026-09-12", "app", "lookup_known", 10),
    row("2026-09-12", "app", "lookup_new", 5),
    row("2026-09-12", "app", "photo_cached", 90),
    row("2026-09-13", "resend", "email", 2),
    row("2026-09-14", "open-meteo", "forecast", 7),
  ];
  const today = new Date("2026-09-15T18:00:00Z");
  const hosting = { label: "Railway Pro", monthly: 20 };

  it("prices this month by SKU after the free allowances", () => {
    const report = buildCostReport(rows, { today, since: "2026-08-20", openrouter: null, hosting });
    expect(report.month).toBe("2026-09");
    const sheets = report.google.find((g) => g.sku === "place_details_atmosphere");
    expect(sheets).toMatchObject({ calls: 1200, billable: 200, cost: 5, listCost: 30, freePerMonth: 1000 });
    expect(report.google.find((g) => g.sku === "text_search_ids")).toMatchObject({ calls: 500, cost: 0, freePerMonth: null });
    // Last month's photos are not this month's.
    expect(report.google.find((g) => g.sku === "place_photos")).toBeUndefined();
    expect(report.googleCost).toBe(5);
    expect(report.modelCost).toBe(0.5);
    expect(report.monthToDate).toBe(25.5);
    expect(report.emails).toEqual({ sent: 2, freePerMonth: 3000 });
    expect(report.weatherCalls).toBe(7);
  });

  it("prefers OpenRouter's own monthly figure for the model", () => {
    const openrouter = { total: 1.2, month: 0.7, week: 0.2, today: 0, limit: null, limitRemaining: null };
    expect(buildCostReport(rows, { today, since: "2026-08-20", openrouter, hosting }).monthToDate).toBe(25.7);
  });

  it("stretches the metered days to a 30-day month, allowances applied", () => {
    const report = buildCostReport(rows, { today, since: "2026-08-20", openrouter: null, hosting });
    expect(report.paceDays).toBe(27);
    // Sheets: 1,200 × 30/27 ≈ 1,333 calls, 333 past the allowance at $25 per 1,000; model $0.50 × 30/27; hosting $20.
    expect(report.monthlyPace).toBeCloseTo(20 + 8.325 + 0.5556, 2);
    expect(buildCostReport([], { today, since: null, openrouter: null, hosting }).monthlyPace).toBe(20);
  });

  it("lists the last 30 days and what the caches saved", () => {
    const report = buildCostReport(rows, { today, since: "2026-08-20", openrouter: null, hosting });
    expect(report.daily).toHaveLength(30);
    expect(report.daily[29].day).toBe("2026-09-15");
    expect(report.daily.find((d) => d.day === "2026-09-12")?.model).toBe(0.5);
    expect(report.daily.find((d) => d.day === "2026-09-02")?.google).toBeCloseTo(17.5);
    expect(report.savings.lookups).toEqual({ memory: 5, catalog: 30, known: 10, bought: 5, fallback: 0 });
    expect(report.savings.photos).toEqual({ cached: 90, bought: 0 });
    // 45 lookups at a Place Details ($0.020) and 90 photos at $0.007.
    expect(report.savings.avoided).toBeCloseTo(0.9 + 0.63);
  });
});
