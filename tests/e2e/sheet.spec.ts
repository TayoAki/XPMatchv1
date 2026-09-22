import { expect, test } from "@playwright/test";
import { openChatHistory, sendChat, signup, uniqueEmail } from "./helpers";

test("destination sheet tabs, side rail chats and card photos", async ({ page }) => {
  await signup(page, { email: uniqueEmail("tayo"), dietary: "Vegetarian", accommodation: "Boutique hotels", styles: ["Food & drink"] });

  await test.step("focusing on Rome opens the map and the side rail lists the chat", async () => {
    await sendChat(page, "I want to visit roam");
    await expect(page.getByTestId("map-panel")).toBeVisible({ timeout: 40_000 });
    await openChatHistory(page);
    await expect(page.getByTestId("chat-nav-list").getByRole("link", { name: /visit roam|Exploring Rome/ })).toBeVisible();
  });

  await test.step("the Stays tab shows preference-based results", async () => {
    await page.getByTestId("map-panel").getByRole("button", { name: /^Rome/ }).click();
    const sheet = page.getByTestId("place-sheet");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Stays", exact: true }).click();
    await expect(page.getByText("Based on your profile:")).toBeVisible();
    await expect(page.getByText("Boutique hotels", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("destination-tab-row").first()).toBeVisible({ timeout: 40_000 });
    expect(await page.getByTestId("destination-tab-row").count()).toBeGreaterThanOrEqual(3);
  });

  await test.step("Restaurants and Things to do tabs load too", async () => {
    const sheet = page.getByTestId("place-sheet");
    await sheet.getByRole("button", { name: "Restaurants", exact: true }).click();
    await expect(page.getByText("Vegetarian", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("destination-tab-row").first()).toBeVisible({ timeout: 40_000 });
    await sheet.getByRole("button", { name: "Things to do", exact: true }).click();
    await expect(page.getByTestId("destination-tab-row").first()).toBeVisible({ timeout: 40_000 });
  });

  await test.step("hotel cards use Places photos and appear under Picked for you", async () => {
    await page.getByTestId("place-sheet").getByRole("button", { name: "Close", exact: true }).click();
    await sendChat(page, "Find hotels in Rome");
    await expect(page.getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
    await expect(page.locator('img[src*="/api/places/photo"]').first()).toBeVisible({ timeout: 40_000 });
    await page.getByTestId("map-panel").getByRole("button", { name: /^Rome/ }).click();
    const sheet = page.getByTestId("place-sheet");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Stays", exact: true }).click();
    await expect(page.getByText("Picked for you")).toBeVisible();
    await expect(page.getByTestId("destination-tab-row").filter({ hasText: "Hotel de Russie" })).toBeVisible();
  });
});
