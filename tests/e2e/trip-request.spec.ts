import { expect, test } from "@playwright/test";
import { goToChat, openChatHistory, sendChat, signup, uniqueEmail } from "./helpers";

/**
 * A trip request answers with cards at once, and the Where chip belongs to the chat: a new chat does
 * not inherit the destination another chat focused on, and the Where the old app wrote into the
 * stored planner on every map focus is dropped once.
 */
test("trip request: a country answers with city cards; the Where chip belongs to the chat", async ({ page }) => {
  // A returning traveler's browser, as the old app left it: the last chat's city in the planner.
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    const planner = { where: "Charleston", startDate: "", endDate: "", travelers: 2, budgetTier: "" };
    localStorage.setItem("xpmatch:local:v2", JSON.stringify({ planner, proactiveDismissedAt: null }));
  });
  await signup(page, { email: uniqueEmail("korea") });
  const where = page.getByTestId("planner-chips").getByRole("button").first();

  await test.step("the Where the old app stored is gone", async () => {
    await goToChat(page);
    await expect(page.getByRole("heading", { name: /Where to today/ })).toBeVisible();
    await expect(where).toHaveText("Where");
  });

  await test.step("a chat that focuses Rome shows Rome in the Where chip", async () => {
    await sendChat(page, "I want to visit roam");
    await expect(page.getByTestId("map-panel")).toBeVisible({ timeout: 40_000 });
    await expect(where).toHaveText("Rome", { timeout: 20_000 });
  });

  await test.step("a new chat starts without that city", async () => {
    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page.getByRole("heading", { name: /Where to today/ })).toBeVisible();
    await expect(where).toHaveText("Where");
  });

  await test.step("a trip to a country answers with its cities as cards, and the chip follows", async () => {
    await sendChat(page, "plan me a trip to korea");
    const cards = page.getByTestId("destination-card");
    await expect(cards).toHaveCount(3, { timeout: 40_000 });
    for (const city of ["Seoul", "Busan", "Jeju"]) await expect(cards.filter({ hasText: city })).toHaveCount(1);
    await expect(where).toHaveText("South Korea", { timeout: 20_000 });
    await expect(page.getByTestId("map-header")).toContainText("Explore South Korea");
    await expect(page.locator(".xp-chat").getByText(/Assuming about a week/)).toBeVisible({ timeout: 30_000 });
  });

  await test.step("going back to the Rome chat shows Rome again", async () => {
    await openChatHistory(page);
    await page.getByTestId("chat-nav-list").getByRole("link", { name: /Exploring Rome/ }).click();
    await expect(where).toHaveText("Rome", { timeout: 20_000 });
  });
});
