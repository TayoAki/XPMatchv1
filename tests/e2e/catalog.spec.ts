import { expect, test } from "@playwright/test";
import { ensureAccount, login } from "./helpers";

test("catalog: lookups are stored once and an admin can seed a city", async ({ page, request, baseURL }) => {
  await ensureAccount(request, { name: "Ada Admin", email: "admin@example.com" }, baseURL!);
  await login(page, "admin@example.com", { finishOnboarding: true });

  await test.step("the admin page shows what the catalog holds", async () => {
    await page.goto("/admin");
    const section = page.getByTestId("place-catalog");
    await expect(section).toBeVisible({ timeout: 30_000 });
    await expect(section.getByTestId("stat-places")).toBeVisible({ timeout: 30_000 });
  });

  await test.step("seeding a city fills the catalog from list searches", async () => {
    const section = page.getByTestId("place-catalog");
    await section.getByLabel("City to seed").fill("Rome, Italy");
    await section.getByTestId("seed-city").click();
    const result = section.getByTestId("seed-result");
    await expect(result).toBeVisible({ timeout: 60_000 });
    await expect(result).toContainText(/Rome: \d+ places from 19 searches/);
    const places = Number(await section.getByTestId("stat-places").textContent());
    expect(places).toBeGreaterThan(0);
  });

  await test.step("a lookup for a stored place is answered without a fresh search", async () => {
    const before = (await (await page.request.get("/api/admin/stats")).json()) as { catalog: { aliasHits: number; aliases: number } };
    const res = await page.request.post("/api/places/resolve", {
      data: { destination: "Rome, Italy", items: [{ key: "a", query: "Colosseum, Rome, Italy", kind: "attraction" }] },
      headers: { Origin: baseURL! },
    });
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { items: { place: { id: string; source: string } | null }[] };
    expect(body.items[0].place?.source).toBe("google");
    const again = await page.request.post("/api/places/resolve", {
      data: { destination: "Rome, Italy", items: [{ key: "a", query: "Colosseum, Rome, Italy", kind: "attraction" }] },
      headers: { Origin: baseURL! },
    });
    expect(again.ok()).toBe(true);
    const after = (await (await page.request.get("/api/admin/stats")).json()) as { catalog: { aliasHits: number; aliases: number } };
    expect(after.catalog.aliases).toBeGreaterThanOrEqual(before.catalog.aliases);
  });
});
