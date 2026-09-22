import { expect, test } from "@playwright/test";
import { eventually, login, signup, signupApi, uniqueEmail } from "./helpers";

test("community guides and Explore near you", async ({ page, browser, request, baseURL }) => {
  const author = uniqueEmail("ada");
  const reader = uniqueEmail("sam");
  const title = `Rome in 48 hours ${Date.now() % 10000}`;
  await signupApi(request, { name: "Sam Rivera", email: reader }, baseURL!);
  await signup(page, { name: "Ada Lovelace", email: author });
  let guideUrl = "";

  await test.step("create and publish a guide with two places", async () => {
    await page.goto("/create");
    await expect(page.getByRole("heading", { name: "Create" })).toBeVisible();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Destination").fill("Rome, Italy");
    await page.getByLabel("Destination").press("Tab");
    await page.getByLabel("Description").fill("Two days of ancient stones and long lunches.");
    await page.getByRole("button", { name: "Food & drink", exact: true }).click();
    await page.getByLabel("Place to add").fill("Colosseum");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Colosseum", { exact: true })).toBeVisible({ timeout: 25_000 });
    await page.getByLabel("Note for Colosseum").fill("Go at opening, book the arena floor.");
    await page.getByLabel("Place to add").fill("Roscioli Salumeria con Cucina");
    await page.getByLabel("Kind of place").selectOption("restaurant");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(/Roscioli/).first()).toBeVisible({ timeout: 25_000 });
    await page.getByRole("button", { name: "Publish to the community" }).click();
    await page.waitForURL(/\/guides\/[0-9a-f-]{36}/, { timeout: 20_000 });
    guideUrl = page.url();
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText("2 places")).toBeVisible();
    await expect(page.getByText("Go at opening, book the arena floor.")).toBeVisible();
    await expect(page.getByTestId("guide-map")).toBeVisible();
    await expect(page.getByText("2 pinned").first()).toBeVisible();
  });

  await test.step("Inspiration lists the guide", async () => {
    await page.goto("/inspiration");
    await expect(page.getByTestId("guide-card").filter({ hasText: title })).toBeVisible();
  });

  await test.step("Explore shows places near the home city, saves one and switches tabs", async () => {
    await page.goto("/explore");
    await expect(page.getByRole("button", { name: /Austell/ }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("nearby-card").first()).toBeVisible({ timeout: 40_000 });
    expect(await page.getByTestId("nearby-card").count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId("explore-map")).toBeVisible();
    await page.getByRole("button", { name: "Restaurants" }).click();
    const firstCard = page.getByTestId("nearby-card").first();
    await expect(firstCard).toBeVisible({ timeout: 40_000 });
    await firstCard.getByRole("button", { name: /^Save / }).click();
    await expect(firstCard.getByRole("button", { name: /^Remove .* from saved$/ })).toBeVisible();
    expect(await page.getByRole("button", { name: /^Remove .* from saved$/ }).count()).toBe(1);
    await page.getByLabel("Search nearby").fill("coffee");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByTestId("nearby-card").first()).toBeVisible({ timeout: 40_000 });
    await page.getByRole("button", { name: "Guides" }).click();
    await expect(page.getByText(/No community guides near/)).toBeVisible();
  });

  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();

  await test.step("the reader saves the guide and finds it under Saved > Guides", async () => {
    await login(readerPage, reader, { finishOnboarding: true });
    await readerPage.goto("/inspiration");
    const card = readerPage.getByTestId("guide-card").filter({ hasText: title });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: `Save ${title}` }).click();
    await expect(card.getByRole("button", { name: `Remove ${title} from saved` })).toBeVisible();
    // The save is optimistic; make sure the server has it before navigating away.
    await eventually(
      () => readerPage.request.get("/api/saved").then((r) => r.json() as Promise<{ saved: { kind: string; title: string }[] }>),
      (d) => d.saved.some((s) => s.kind === "guide" && s.title === title),
    );
    await readerPage.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Saved", exact: true }).click();
    await readerPage.getByRole("button", { name: /^guides/i }).click();
    await expect(readerPage.getByText(title).first()).toBeVisible();
    await readerPage.goto(guideUrl);
    await expect(readerPage.getByRole("button", { name: "Saved", exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(readerPage.getByRole("button", { name: "Plan a trip from this guide" })).toBeVisible();
    await readerContext.close();
  });

  await test.step("the author gets a 'saved your guide' update and can edit the guide", async () => {
    await page.goto("/updates");
    await expect(page.getByText(new RegExp(`Sam Rivera saved your guide "${title}"`))).toBeVisible();
    await page.getByRole("link", { name: "Open guide" }).first().click();
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText("1 save")).toBeVisible();
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit guide" })).toBeVisible();
    await page.getByLabel("Title").fill(`${title} (updated)`);
    await page.getByRole("button", { name: "Update guide" }).click();
    await page.waitForURL(/\/guides\//, { timeout: 20_000 });
    await expect(page.getByText(`${title} (updated)`).first()).toBeVisible();
  });
});
