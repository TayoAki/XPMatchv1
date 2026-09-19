import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The app on a phone: the three-screen quiz, the home feed with picks, the tab bar reaching every
 * page, the proposal fitting the screen, the map opening over the chat, and the trip page tabs.
 * Runs in Chromium with touch and a phone viewport (the device descriptor would switch to WebKit).
 */
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});

// Cold dev-server compiles of six pages plus two model round-trips add up on a slow box.
test.setTimeout(420_000);

const PHONE_WIDTH = 390;

/** Chip groups fold behind "Show all" on phones; open the fold when the chip is not on screen yet. */
async function pick(group: Locator, label: string) {
  const chip = group.getByRole("button", { name: label, exact: true });
  if ((await chip.count()) === 0) {
    const showAll = group.getByRole("button", { name: /^Show all/ });
    if (await showAll.count()) await showAll.click();
  }
  await chip.click();
}

async function expectFits(page: Page, what: string) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, `${what} should not be wider than the phone`).toBeLessThanOrEqual(PHONE_WIDTH);
}

test("phone: three-screen quiz, home feed, tab bar, proposal, map over chat, trip tabs", async ({ page }) => {
  const email = `mobile+${Date.now()}@example.com`;

  await test.step("sign up and finish the quiz in three screens", async () => {
    await page.goto("/signup");
    await page.getByPlaceholder("Tayo Akigbogun").fill("Mia Mobile");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.locator('input[type="password"]').fill("travel-2026-secret");
    await page.getByRole("button", { name: "Create account" }).click();

    const dialog = page.getByRole("dialog", { name: /personalize/i });
    await dialog.waitFor({ timeout: 60_000 });
    await expect(dialog.getByTestId("onboarding-steps").locator("li")).toHaveCount(3);
    await expect(dialog).toContainText("Step 1 of 3");
    const next = dialog.getByRole("button", { name: "Next", exact: true });

    await dialog.getByPlaceholder("Austell, GA").fill("Austell, GA");
    await pick(dialog.getByTestId("style-chips"), "Food & drink");
    await pick(dialog.getByTestId("interest-chips"), "Museums & art");
    await pick(dialog.getByTestId("interest-chips"), "Food tours & markets");
    // The interests list is longer than the fold, so the phone shows a "Show all" chip.
    await expect(dialog.getByTestId("interest-chips").getByRole("button", { name: /^Show all/ })).toBeVisible();
    await next.click();

    await expect(dialog).toContainText("Step 2 of 3");
    await pick(dialog.getByTestId("stay-type-chips"), "Boutique hotel");
    await pick(dialog.getByTestId("cuisine-chips"), "Italian");
    await next.click();

    await expect(dialog).toContainText("Step 3 of 3");
    await dialog.getByPlaceholder("Rome, Italy").fill("Rome, Italy");
    await dialog.getByPlaceholder("October").fill("October");
    await dialog.getByRole("button", { name: "Save preferences" }).click();
    await expect(dialog).toBeHidden();
  });

  await test.step("the home feed shows the picks under the composer", async () => {
    await expect(page.getByTestId("mobile-home")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Where to today, Mia/ })).toBeVisible();
    const stays = page.getByTestId("home-row-stays");
    await stays.scrollIntoViewIfNeeded();
    await expect(stays.getByTestId("home-pick")).toHaveCount(3, { timeout: 60_000 });
    await expect(stays.getByTestId("match-badge").first()).toBeVisible();
    await expectFits(page, "the home feed");
  });

  await test.step("the tab bar reaches every page and the More sheet holds the rest", async () => {
    const bar = page.getByTestId("mobile-tab-bar");
    await expect(bar).toBeVisible();
    await bar.getByRole("link", { name: "Explore" }).click();
    await page.waitForURL(/\/explore/);
    await expectFits(page, "explore");
    await bar.getByRole("link", { name: "Saved" }).click();
    await page.waitForURL(/\/saved/);
    await bar.getByRole("link", { name: "Trips" }).click();
    await page.waitForURL(/\/trips$/);
    await bar.getByRole("button", { name: "More" }).click();
    const sheet = page.getByTestId("more-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Inspiration" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Report a bug" })).toBeVisible();
    await sheet.getByRole("link", { name: "Updates" }).click();
    await page.waitForURL(/\/updates/);
    await expect(sheet).toBeHidden();
    await bar.getByRole("link", { name: "Chat" }).click();
    await page.waitForURL((u) => u.pathname === "/");
  });

  await test.step("a trip proposal fits the screen and the map opens over the chat", async () => {
    const input = page.getByPlaceholder("Ask XPMatch");
    await input.fill("Plan a trip to Rome for two of us in October");
    await page.locator('[data-testid="copilot-send-button"]:not([disabled])').waitFor({ timeout: 30_000 });
    await input.press("Enter");
    const proposal = page.getByTestId("trip-proposal");
    await proposal.waitFor({ timeout: 60_000 });
    await expect(proposal.getByTestId("proposal-stop").first().getByTestId("match-badge")).toBeVisible({ timeout: 60_000 });
    await expectFits(page, "the proposal");

    const mapButton = page.getByTestId("mobile-map-button");
    await expect(mapButton).toBeVisible();
    await mapButton.click();
    const sheet = page.getByTestId("mobile-map-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId("map-panel")).toBeVisible();
    const pinList = sheet.getByTestId("mobile-pin-list");
    await expect(pinList.getByRole("button")).toHaveCount(5, { timeout: 30_000 });
    // A pinned row opens the place as a sheet over the map; closing it returns to the map, then to the chat.
    await pinList.getByRole("button").first().click();
    const placeSheet = page.getByTestId("mobile-place-sheet");
    await expect(placeSheet).toBeVisible();
    await expect(placeSheet.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(placeSheet.getByRole("button", { name: "Add to trip" })).toBeVisible();
    await expectFits(page, "the place sheet");
    await placeSheet.getByRole("button", { name: "Close" }).click();
    await expect(placeSheet).toBeHidden();
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();

    await proposal.getByRole("button", { name: "Save to my trips" }).click();
    await proposal.getByRole("link", { name: /Saved to Trips/ }).click();
    await page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 30_000 });
  });

  await test.step("the trip page opens on the board, with overview and tiles a tap away", async () => {
    const tabs = page.getByTestId("trip-tabs");
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole("tab", { name: "Board" })).toHaveAttribute("aria-selected", "true");
    const panel = page.getByTestId("trip-tab-panel");
    await expect(panel.getByTestId("stop-card").first()).toBeVisible({ timeout: 60_000 });
    await expect(panel.getByTestId("stop-card")).toHaveCount(5);
    await expectFits(page, "the board");

    await tabs.getByRole("tab", { name: "Overview" }).click();
    await expect(panel.getByRole("heading", { name: "Long weekend in Rome" })).toBeVisible();
    await tabs.getByRole("tab", { name: "Tiles" }).click();
    await expect(panel.getByRole("button", { name: /^Bookings/ })).toBeVisible();
    await expectFits(page, "the tiles");
  });
});
