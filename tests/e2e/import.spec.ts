import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { eventually, sendChat, signup, uniqueEmail } from "./helpers";

const SITE = `http://localhost:${process.env.SITE_PORT || 4547}`;
const LOG = path.join(process.cwd(), ".data", `e2e-${process.env.APP_PORT || 3200}`, "model-requests.log");

/** Structured (JSON-mode) model calls so far: the extraction requests the import makes. */
function extractionCalls(): number {
  try {
    return readFileSync(LOG, "utf8")
      .split("\n")
      .filter(Boolean)
      .filter((line) => (JSON.parse(line) as { stream?: boolean }).stream !== true).length;
  } catch {
    return 0;
  }
}

const importsJson = (page: Page) => page.request.get("/api/import").then((r) => r.json() as Promise<{ imports: { site: string; places: unknown[] }[] }>);

test("inspiration import: link in chat, add all to a trip, screenshot on Create, Saved › Imports, hints, guard and cache", async ({ page, baseURL }) => {
  test.setTimeout(240_000);
  await signup(page, { email: uniqueEmail("import") });
  const postUrl = `${SITE}/rome-post`;

  await test.step("a link pasted in chat becomes verified place cards with pins", async () => {
    await sendChat(page, `Found this: ${postUrl}`);
    const cards = page.getByTestId("imported-places");
    await expect(cards).toBeVisible({ timeout: 60_000 });
    await expect(cards).toContainText("Imported from localhost");
    await expect(cards.getByTestId("imported-place")).toHaveCount(4);
    await expect(cards).toContainText("Roscioli Salumeria con Cucina");
    await expect(cards).toContainText("Mentioned as: the carbonara everyone talks about");
    await expect(cards.getByTestId("unverified-places")).toContainText("Il Posto Segreto");
    await expect(page.getByText(/Those are on the cards above/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("map-pin-list")).toContainText("Villa Borghese");
  });

  await test.step("Add all to a trip puts every verified place in a new trip's ideas", async () => {
    await page.getByRole("button", { name: "Add all to a trip" }).click();
    const dialog = page.getByRole("dialog", { name: "Add to trip" });
    await expect(dialog).toContainText("4 places");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    const done = page.getByRole("dialog", { name: "Added to your trip" });
    await expect(done).toContainText("4 places", { timeout: 30_000 });
    await done.getByRole("link", { name: "Open trip" }).click();
    await page.waitForURL(/\/trips\//, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /^Ideas 4 places/ })).toBeVisible({ timeout: 20_000 });
  });

  await test.step("Create › Import reads a screenshot", async () => {
    await page.goto("/create");
    await page.getByRole("button", { name: "Import", exact: true }).click();
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 200, height: 120 } });
    await page.getByLabel("Screenshot to import").setInputFiles({ name: "saved-list.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Find the places" }).click();
    const result = page.getByTestId("import-result");
    await expect(result).toBeVisible({ timeout: 60_000 });
    await expect(result).toContainText("Imported from a screenshot");
    await expect(result.getByTestId("imported-place")).toHaveCount(4);
  });

  await test.step("Saved › Imports lists both imports", async () => {
    await page.goto("/saved");
    await page.getByRole("button", { name: /^imports/i }).click();
    const list = page.getByTestId("import-history");
    await expect(list).toContainText("Three slow days in Rome");
    await expect(list).toContainText("saved-list.png");
    await eventually(
      () => importsJson(page),
      (d) => d.imports.length === 2 && d.imports.every((i) => i.places.length === 4),
    );
  });

  await test.step("Instagram links get the screenshot hint", async () => {
    await page.goto("/create");
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await page.getByLabel("Link to import").fill("https://www.instagram.com/p/abc123/");
    await expect(page.getByTestId("import-hint")).toContainText("instagram.com posts can't be read from a link");
  });

  await test.step("API: blocked page, binary file and private address are refused honestly; a repeated link is served from history", async () => {
    const headers = { Origin: baseURL! };
    const forbidden = await page.request.post("/api/import", { headers, data: { url: `${SITE}/forbidden` } });
    expect(forbidden.status()).toBe(422);
    expect(((await forbidden.json()) as { error: string }).error).toMatch(/blocks automated readers/);

    const binary = await page.request.post("/api/import", { headers, data: { url: `${SITE}/binary` } });
    expect(binary.status()).toBe(415);

    const privateAddress = await page.request.post("/api/import", { headers, data: { url: "http://169.254.169.254/latest/meta-data" } });
    expect(privateAddress.status()).toBe(400);
    expect(((await privateAddress.json()) as { error: string }).error).toMatch(/Private/);

    const before = extractionCalls();
    const again = await page.request.post("/api/import", { headers, data: { url: postUrl } });
    expect(again.status(), await again.text()).toBe(201);
    const body = (await again.json()) as { import: { cached?: boolean; places: unknown[] } };
    expect(body.import.cached).toBe(true);
    expect(body.import.places).toHaveLength(4);
    expect(extractionCalls()).toBe(before);

    const redirected = await page.request.post("/api/import", { headers, data: { url: `${SITE}/redirect` } });
    expect(redirected.status(), await redirected.text()).toBe(201);
  });
});
