import { expect, test } from "@playwright/test";
import { PASSWORD, openChatHistory, sendChat, signup, uniqueEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test("accounts, chat cards, saving, trips and sessions", async ({ page, browser }) => {
  const email = uniqueEmail("tayo");

  await test.step("visiting / redirects to login", async () => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  await test.step("signup and onboarding save to the server", async () => {
    await signup(page, { email, homeAirport: "ATL", styles: ["Food & drink"] });
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByTestId("account-menu")).toContainText("@tayo-akigbogun");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("account-menu")).toHaveCount(0);
  });

  await test.step("hotel cards render from the model and a card can be saved", async () => {
    await sendChat(page, "Find hotels in Rome");
    await expect(page.getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
    await page.getByRole("button", { name: /^Save Hotel de Russie/ }).click();
    await expect(page.getByRole("button", { name: /^Remove Hotel de Russie/ })).toBeVisible();
  });

  await test.step("the planner creates a trip on the server", async () => {
    await page.getByRole("banner").getByRole("button", { name: "Create a trip" }).click();
    await page.getByPlaceholder(/Dallas, Lisbon/).fill("Rome");
    await page.getByRole("textbox", { name: "From", exact: true }).fill("2026-10-10");
    await page.getByRole("textbox", { name: "To", exact: true }).fill("2026-10-13");
    await page.getByRole("button", { name: "Create trip", exact: true }).click();
    await page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Trip to Rome" })).toBeVisible();
  });

  await test.step("reload keeps profile, saved item and chat", async () => {
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: /Where to today, Tayo\?/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Saved", exact: true }).click();
    await expect(page.getByText("Hotel de Russie").first()).toBeVisible();
    // The side rail lists the conversation on every content page.
    await openChatHistory(page);
    await expect(page.getByTestId("chat-nav-list").getByRole("link", { name: /Find hotels in Rome|Exploring Rome/ }).first()).toBeVisible();
  });

  await test.step("logout then login works", async () => {
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL(/\/login/);
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: /Go somewhere that stays with you/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByTestId("account-menu")).toContainText("Tayo Akigbogun");
    await page.keyboard.press("Escape");
  });

  await test.step("a wrong password is rejected", async () => {
    const context = await browser.newContext();
    const other = await context.newPage();
    await other.goto("/login");
    await other.getByPlaceholder("you@example.com").fill(email);
    await other.locator('input[type="password"]').fill("nope-nope-nope");
    await other.getByRole("button", { name: "Sign in" }).click();
    await expect(other.getByRole("alert")).toBeVisible();
    await context.close();
  });
});
