import { expect, test } from "@playwright/test";
import { eventually, openChatHistory, sendChat, signup, uniqueEmail } from "./helpers";

test("smart filters, heads-ups, comparison, remembered preferences and Explore parsing", async ({ page }) => {
  // page.request shares the browser's session cookie.
  const preferences = async () => (await (await page.request.get("/api/me/preferences")).json()) as { preferences: { statement: string; polarity: string; tripId?: string }[] };

  await test.step("onboarding stores a dealbreaker", async () => {
    await signup(page, { email: uniqueEmail("tayo"), dealbreakers: ["Street noise at night"] });
    await eventually(preferences, (r) => r.preferences.some((p) => p.polarity === "dealbreaker" && p.statement === "Street noise at night"));
  });

  await test.step("criteria become chips, then hotel cards with heads-ups", async () => {
    await sendChat(page, "Find a quiet hotel in Rome under $250 a night with a pool and good vibes");
    const strip = page.locator('[data-testid="constraint-strip"][data-live="true"]');
    await expect(strip).toBeVisible({ timeout: 40_000 });
    await expect(strip.getByText("Under $250/night")).toBeVisible();
    await expect(strip.getByText("Not applied:")).toBeVisible();
    await expect(page.getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
    // The heads-ups are one chip; the list is a tooltip on hover, gone again on Escape. Hover once
    // the turn is over: the cards re-render when the tool call completes, which resets a hover.
    await expect(page.getByText(/Done — those are on the cards above/)).toBeVisible({ timeout: 30_000 });
    const headsUp = page.getByRole("button", { name: "2 heads-ups for Hotel de Russie" });
    await expect(headsUp).toBeVisible();
    await expect(page.getByText("Piazza traffic noise in front rooms")).toHaveCount(0);
    await headsUp.hover();
    const tip = page.getByRole("tooltip", { name: "Heads-up for Hotel de Russie" });
    await expect(tip.getByText("Piazza traffic noise in front rooms")).toBeVisible();
    await expect(tip.getByText("Well over $250/night")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
    await page.mouse.move(8, 8);
  });

  await test.step("the side rail lists the long chat title on one line inside the rail, set off from Chats", async () => {
    await openChatHistory(page);
    const rail = page.getByTestId("side-rail");
    const open = page.getByTestId("chat-nav-list").locator('a[aria-current="page"]');
    await expect(open).toHaveCount(1);
    const railBox = (await rail.boundingBox())!;
    const openBox = (await open.boundingBox())!;
    // The title is cut with an ellipsis inside the rail rather than running out to its edge.
    expect(openBox.x + openBox.width).toBeLessThanOrEqual(railBox.x + railBox.width - 8);
    expect(await open.locator("span").first().evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // One fill only: the open chat is highlighted, the Chats row above it keeps its accent bar
    // but no fill, and the two sit apart.
    const chatsRow = rail.getByRole("link", { name: "Chats", exact: true }).locator("..");
    const chatsBox = (await chatsRow.boundingBox())!;
    expect(openBox.y - (chatsBox.y + chatsBox.height)).toBeGreaterThanOrEqual(10);
    expect(await chatsRow.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await open.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  });

  await test.step("removing a chip searches again with the remaining filters", async () => {
    await page.locator('[data-testid="constraint-strip"][data-live="true"]').getByRole("button", { name: "Remove Pool" }).click();
    await expect(page.getByText(/Search places to stay in Rome again with these filters/)).toBeVisible();
    await expect(page.locator('[data-testid="constraint-strip"]').nth(1)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText("Where to stay in Rome").nth(1)).toBeVisible({ timeout: 40_000 });
    const fresh = page.locator('[data-testid="constraint-strip"][data-live="true"]');
    await expect(fresh).toHaveCount(1);
    await expect(fresh.getByText("Under $250/night")).toBeVisible();
    await expect(fresh.getByText("Pool", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Done — those are on the cards above/).nth(1)).toBeVisible({ timeout: 30_000 });
  });

  await test.step("compare: toggles, bar and a comparison card linked to the map", async () => {
    await page.getByRole("button", { name: "Compare", exact: true }).nth(2).click();
    await page.getByRole("button", { name: "Compare", exact: true }).nth(2).click();
    const bar = page.getByTestId("compare-bar");
    await expect(bar.getByText("2 selected")).toBeVisible();
    await bar.getByRole("button", { name: "Compare", exact: true }).click();
    const card = page.getByTestId("comparison-card");
    await expect(card).toBeVisible({ timeout: 40_000 });
    await expect(card.getByText("Quiet at night")).toBeVisible();
    await expect(card.getByText("Pick this one").first()).toBeVisible();
    await expect(card.getByText("on Google").first()).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(/Artemide is the safer pick/)).toBeVisible({ timeout: 30_000 });
    await card.getByRole("button", { name: "Map" }).first().click();
    await expect(page.getByTestId("place-sheet")).toBeVisible();
    await page.getByTestId("place-sheet").getByRole("button", { name: "Close", exact: true }).click();
  });

  await test.step("remember a preference with Always; the memory panel lists it and can forget it", async () => {
    await sendChat(page, "I prefer boutique hotels over big chains");
    const card = page.getByTestId("remember-card");
    await expect(card).toBeVisible({ timeout: 40_000 });
    await card.getByRole("button", { name: "Always" }).click();
    await expect(card.getByText("Remembered")).toBeVisible();
    await expect(page.getByText(/Got it — noted for next time/)).toBeVisible({ timeout: 30_000 });
    await eventually(preferences, (r) => r.preferences.some((p) => /boutique/i.test(p.statement) && !p.tripId));
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: /Update my assistant|Personalize/ }).click();
    const panel = page.getByTestId("memory-panel");
    await expect(panel.getByText("Prefers boutique hotels over big chains")).toBeVisible();
    await panel.getByRole("button", { name: /Forget Prefers boutique/ }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await eventually(preferences, (r) => !r.preferences.some((p) => /boutique/i.test(p.statement)));
  });

  await test.step("follow-up suggestions come back once the card is answered", async () => {
    await expect(page.getByRole("button", { name: "Hotels in Rome" }).first()).toBeVisible({ timeout: 30_000 });
  });

  await test.step("Explore parses filters into Understood-as chips", async () => {
    await page.goto("/explore");
    const box = page.getByLabel("Search nearby");
    await expect(box).toBeVisible({ timeout: 30_000 });
    await box.fill("cheap sushi open now 4.5+ cozy");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const understood = page.getByTestId("explore-understood");
    await expect(understood.getByText("Inexpensive", { exact: true })).toBeVisible();
    await expect(understood.getByText("4.5★ and up", { exact: true })).toBeVisible();
    await expect(understood.getByText("Open now", { exact: true })).toBeVisible();
    await expect(understood.getByText("Cozy", { exact: true })).toBeVisible();
    await expect(understood.getByText("· “sushi cozy”")).toBeVisible();
  });
});
