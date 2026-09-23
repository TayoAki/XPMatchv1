import { expect, test } from "@playwright/test";
import { goToChat, openChatHistory, sendChat, signup, uniqueEmail } from "./helpers";

/**
 * A trip request answers with cards at once, and the planner chips belong to the chat: a new chat
 * starts over (no destination, dates or travelers from another chat), only what was filled in on
 * Discover goes with the chat opened from there, and the Where the old app wrote into the stored
 * planner on every map focus is dropped once.
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

  await test.step("dates set with the chips stay with their chat; a new chat starts over", async () => {
    await page.getByTestId("planner-chips").getByRole("button", { name: /When/ }).click();
    const dialog = page.getByRole("dialog", { name: "Create a trip" });
    await expect(dialog.getByPlaceholder(/Dallas, Lisbon/)).toHaveValue("Rome");
    await dialog.getByRole("textbox", { name: "From", exact: true }).fill("2026-11-02");
    await dialog.getByRole("textbox", { name: "To", exact: true }).fill("2026-11-06");
    await dialog.getByRole("button", { name: "Create trip" }).click();
    await page.waitForURL(/\/trips\//);
    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page.getByRole("heading", { name: /Where to today/ })).toBeVisible();
    await expect(where).toHaveText("Where");
    await expect(page.getByTestId("planner-chips")).not.toContainText("Nov");
  });

  await test.step("New chat while the answer is still coming starts clean; the first chat keeps its conversation", async () => {
    await sendChat(page, "I want to visit roam");
    // Straight away: the answer (a map focus, then its follow-up) is still on its way.
    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page.getByRole("heading", { name: /Where to today/ })).toBeVisible();
    await expect(where).toHaveText("Where");
    await expect(page.locator(".xp-chat")).not.toContainText("I want to visit roam");
    await expect(page.getByTestId("chat-header")).toHaveCount(0);

    // The first chat opens with its message and carries on (it may have been cut off before its map
    // focus, so its city comes with the next answer).
    await openChatHistory(page);
    await page.getByTestId("chat-nav-list").getByRole("link", { name: /roam|Rome/ }).first().click();
    await expect(page.getByTestId("copilot-user-message").getByText("I want to visit roam")).toBeVisible({ timeout: 20_000 });
    await sendChat(page, "Find hotels in Rome");
    await expect(page.locator(".xp-chat").getByRole("button", { name: "Open Hotel de Russie" })).toBeVisible({ timeout: 40_000 });
    await expect(where).toHaveText("Rome", { timeout: 20_000 });
  });

  await test.step("what is filled in on Discover goes with the next chat, once", async () => {
    await page.goto("/");
    await page.getByTestId("planner-field-where").click();
    const editor = page.getByRole("dialog", { name: "Where to?" });
    await editor.getByLabel("Destination").fill("Lisbon, Portugal");
    await editor.getByRole("button", { name: "Apply" }).click();
    await page.getByRole("link", { name: "Your AI concierge" }).click();
    await page.waitForURL((u) => u.pathname === "/chat");
    await expect(where).toHaveText("Lisbon, Portugal");
    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page.getByRole("heading", { name: /Where to today/ })).toBeVisible();
    await expect(where).toHaveText("Where");
  });
});
