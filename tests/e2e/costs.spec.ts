import { expect, test } from "@playwright/test";
import { completeOnboarding, ensureAccount, eventually, login } from "./helpers";

interface Metrics {
  costs: {
    google: { sku: string; calls: number }[];
    models: { model: string; calls: number; inputTokens: number }[];
    openrouter: { total: number } | null;
    savings: { lookups: { memory: number; catalog: number; known: number; bought: number } };
  };
  activity: { today: number; funnel: { signedUp: number } };
}

test("costs: the admin page meters what the app pays for and who uses it", async ({ page, request, baseURL }) => {
  await ensureAccount(request, { name: "Ada Admin", email: "admin@example.com" }, baseURL!);
  // The admin may have been through the wizard in an earlier spec of the same run.
  await login(page, "admin@example.com");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
  const onboarded = async () => ((await (await page.request.get("/api/me/state")).json()) as { profile: { onboarded: boolean } }).profile.onboarded;
  if (!(await onboarded())) await completeOnboarding(page);
  await eventually(onboarded, (done) => done === true);
  const headers = { Origin: baseURL! };
  const metrics = async () => (await (await page.request.get("/api/admin/metrics")).json()) as Metrics;

  await test.step("Google searches, place details, a model call and a map load are counted", async () => {
    const seed = await page.request.post("/api/admin/seed", { data: { destination: "Rome, Italy" }, headers });
    expect(seed.ok()).toBe(true);
    // A question about a place buys its full details once and asks the helper model.
    const ask = await page.request.post("/api/places/ask", {
      data: { name: "Hotel de Russie", kind: "hotel", destination: "Rome, Italy", question: "Is it quiet at night?" },
      headers,
    });
    expect(ask.ok()).toBe(true);
    const map = await page.request.post("/api/usage/map", { headers });
    expect(map.status()).toBe(204);

    const { costs, activity } = await metrics();
    const calls = (sku: string) => costs.google.find((g) => g.sku === sku)?.calls ?? 0;
    // The seed's list searches carry ratings and prices: the Text Search Enterprise SKU (unless an earlier spec seeded Rome and they came from the cache).
    expect(calls("text_search_enterprise") + calls("nearby_search_enterprise")).toBeGreaterThan(0);
    expect(calls("place_details_atmosphere")).toBeGreaterThan(0);
    expect(calls("dynamic_maps")).toBeGreaterThan(0);
    const model = costs.models.find((m) => m.model === "openai/gpt-4o-mini");
    expect(model?.calls ?? 0).toBeGreaterThan(0);
    expect(model?.inputTokens ?? 0).toBeGreaterThan(0);
    // The stand-in reports the key's own spend like OpenRouter does.
    expect(costs.openrouter?.total).toBeCloseTo(1.2345);
    expect(activity.today).toBeGreaterThan(0);
    expect(activity.funnel.signedUp).toBeGreaterThan(0);
  });

  await test.step("a second lookup of the same place is answered without Google", async () => {
    const before = (await metrics()).costs.savings.lookups;
    const lookup = { destination: "Rome, Italy", items: [{ key: "a", query: "Pantheon, Rome, Italy", kind: "attraction" }] };
    expect((await page.request.post("/api/places/resolve", { data: lookup, headers })).ok()).toBe(true);
    expect((await page.request.post("/api/places/resolve", { data: lookup, headers })).ok()).toBe(true);
    const after = (await metrics()).costs.savings.lookups;
    const answeredByUs = (l: typeof before) => l.memory + l.catalog + l.known;
    expect(answeredByUs(after)).toBeGreaterThan(answeredByUs(before));
  });

  await test.step("the Costs and Activity sections show it", async () => {
    await page.goto("/admin");
    const costs = page.getByTestId("costs");
    await expect(costs).toBeVisible({ timeout: 30_000 });
    await expect(costs.getByTestId("cost-month")).toContainText("$", { timeout: 30_000 });
    await expect(costs.getByTestId("cost-model")).toContainText("$1.23");
    await expect(costs.getByTestId("cost-skus")).toContainText("Place Details Enterprise + Atmosphere");
    await expect(costs.getByTestId("cost-skus")).toContainText("Dynamic Maps");
    await expect(costs.getByTestId("cost-models")).toContainText("openai/gpt-4o-mini");
    await expect(costs.getByTestId("cost-daily")).toBeVisible();

    const activity = page.getByTestId("activity");
    await expect(activity.getByTestId("active-today")).not.toHaveText("0");
    await expect(activity.getByTestId("activity-funnel")).toContainText("Signed up");
    await expect(activity.getByTestId("activity-daily")).toBeVisible();
  });
});
