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

test("phone: quiz in the Discover hero, picks, tab bar, card rows, proposal, sheets over the chat, trip tabs", async ({ page }) => {
  const email = `mobile+${Date.now()}@example.com`;

  await test.step("sign up and answer the three questions in the chat", async () => {
    await page.goto("/signup");
    await page.getByPlaceholder("Tayo Akigbogun").fill("Mia Mobile");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.locator('input[type="password"]').fill("travel-2026-secret");
    await page.getByRole("button", { name: "Create account" }).click();

    // No wizard dialog on a phone: the questions are bubbles in the Discover hero.
    const quiz = page.getByTestId("phone-quiz");
    await quiz.waitFor({ timeout: 60_000 });
    await expect(page.getByRole("dialog", { name: /personalize/i })).toHaveCount(0);
    await quiz.getByLabel("Home city").fill("Austell, GA");
    await quiz.getByLabel("Dreaming of").fill("Rome, Italy");
    await quiz.getByRole("button", { name: "Next" }).click();
    await expect(quiz).toContainText("From Austell, GA · dreaming of Rome, Italy");

    const interests = quiz.getByTestId("quiz-interests");
    await pick(interests, "Museums & art");
    // "Street food" sits past the fold, so picking it opens "Show all" first.
    await expect(interests.getByRole("button", { name: /^Show all/ })).toBeVisible();
    await pick(interests, "Street food");
    await quiz.getByRole("button", { name: "Next" }).click();
    await expect(quiz).toContainText("Museums & art, Street food");

    await quiz.getByTestId("quiz-budget").getByRole("button", { name: /^Mid-range/ }).click();
    await quiz.getByRole("button", { name: "Done" }).click();
    await expect(quiz).toBeHidden();
  });

  await test.step("Discover shows the hero and the picks for the dream destination", async () => {
    await expect(page.getByRole("heading", { name: /Go somewhere that stays with you/ })).toBeVisible();
    await expect(page.getByTestId("hero-image")).toBeVisible();
    await expect(page.getByTestId("collection-card")).toHaveCount(3);
    await expect(page.getByTestId("home-picks")).toContainText("Rome");
    const stays = page.getByTestId("home-row-stays");
    await stays.scrollIntoViewIfNeeded();
    await expect(stays.getByTestId("home-pick")).toHaveCount(3, { timeout: 60_000 });
    await expect(page.getByTestId("home-row-things").getByTestId("home-pick")).toHaveCount(4);
    await expect(stays.getByTestId("match-badge").first()).toBeVisible();
    await expectFits(page, "the Discover page");
  });

  await test.step("the tab bar reaches every page and the More sheet holds the rest", async () => {
    const bar = page.getByTestId("mobile-tab-bar");
    await expect(bar).toBeVisible();
    await bar.getByRole("link", { name: "Saved" }).click();
    await page.waitForURL(/\/saved/);
    await bar.getByRole("link", { name: "Trips" }).click();
    await page.waitForURL(/\/trips$/);
    await bar.getByRole("button", { name: "More" }).click();
    const sheet = page.getByTestId("more-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Inspiration" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Report a bug" })).toBeVisible();
    await sheet.getByRole("link", { name: "Explore" }).click();
    await page.waitForURL(/\/explore/);
    await expect(sheet).toBeHidden();
    await expectFits(page, "explore");
    await bar.getByRole("button", { name: "More" }).click();
    await sheet.getByRole("link", { name: "Updates" }).click();
    await page.waitForURL(/\/updates/);
    await bar.getByRole("link", { name: "Discover" }).click();
    await page.waitForURL((u) => u.pathname === "/");
    await expect(page.getByRole("heading", { name: /Go somewhere that stays with you/ })).toBeVisible();
    await bar.getByRole("link", { name: "Concierge" }).click();
    await page.waitForURL((u) => u.pathname === "/chat");
    // The chat's empty state greets by name and opens with the picks as the assistant's first message.
    await expect(page.getByTestId("mobile-home")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Where to today, Mia/ })).toBeVisible();
    await expect(page.getByTestId("first-picks")).toContainText("what I'd pick for you in Rome");
    await expectFits(page, "the chat home");
  });

  await test.step("recommendation cards swipe as a row and a tap opens the place over the chat", async () => {
    const input = page.getByPlaceholder("Ask your concierge");
    await input.fill("Find hotels in Rome");
    await page.locator('[data-testid="copilot-send-button"]:not([disabled])').waitFor({ timeout: 30_000 });
    await input.press("Enter");
    await expect(page.getByText("Where to stay in Rome")).toBeVisible({ timeout: 60_000 });
    const row = page.getByTestId("card-row").first();
    // Two cards side by side in a row wider than the phone, scrolling inside the row, not the page.
    await expect.poll(async () => row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expectFits(page, "the hotel cards");
    // The heads-ups are one chip; a tap opens the list over the chat and another tap closes it.
    // Tap once the turn is over: the cards re-render when the tool call completes.
    await expect(page.getByText(/Done — those are on the cards above/)).toBeVisible({ timeout: 30_000 });
    const headsUp = page.getByRole("button", { name: "1 heads-up for Hotel Artemide" });
    await headsUp.scrollIntoViewIfNeeded();
    await headsUp.tap();
    const tip = page.getByRole("tooltip", { name: "Heads-up for Hotel Artemide" });
    await expect(tip.getByText("Busy street, ask for a courtyard room")).toBeVisible();
    await headsUp.tap();
    await expect(tip).toBeHidden();
    const photo = page.getByRole("button", { name: "Open Hotel Artemide" });
    await photo.scrollIntoViewIfNeeded();
    await photo.click();
    const placeSheet = page.getByTestId("mobile-place-sheet");
    await expect(placeSheet).toBeVisible();
    await expect(placeSheet.getByRole("heading", { name: "Hotel Artemide" })).toBeVisible();
    await placeSheet.getByRole("button", { name: "Close" }).click();
    await expect(placeSheet).toBeHidden();
    await page.getByTestId("mobile-map-sheet").getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("mobile-map-sheet")).toBeHidden();
  });

  await test.step("a trip proposal fits the screen and the map opens over the chat", async () => {
    const input = page.getByPlaceholder("Ask your concierge");
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
    // The two hotels from the previous step plus the proposal's five stops.
    await expect(pinList.getByRole("button")).toHaveCount(7, { timeout: 30_000 });
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
    // "Saved to Trips" opens the board as a sheet over the chat; "Open trip" leads to the full page.
    await proposal.getByRole("button", { name: /Saved to Trips/ }).click();
    const board = page.getByTestId("trip-board-sheet");
    await expect(board).toBeVisible();
    await expect(board.getByTestId("stop-card").first()).toBeVisible({ timeout: 60_000 });
    await expect(board.getByTestId("stop-card")).toHaveCount(5);
    await expectFits(page, "the board sheet");
    await board.getByRole("button", { name: "Close" }).click();
    await expect(board).toBeHidden();
    await expect(proposal).toBeVisible();
    await proposal.getByRole("button", { name: /Saved to Trips/ }).click();
    await board.getByRole("link", { name: "Open trip" }).click();
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
    // No drag handles on a phone: stops move with up / down buttons and the Move to… menu.
    await expect(panel.getByRole("button", { name: /^Drag / })).toHaveCount(0);
    await expect(panel.getByTestId("stop-card").first()).toContainText("Colosseum");
    await expect(panel.getByRole("button", { name: "Move Colosseum up" })).toBeDisabled();
    await panel.getByRole("button", { name: "Move Colosseum down" }).click();
    await expect(panel.getByTestId("stop-card").first()).toContainText("Roscioli");
    await expect(panel.getByTestId("stop-card").nth(1)).toContainText("Colosseum");

    await tabs.getByRole("tab", { name: "Overview" }).click();
    await expect(panel.getByRole("heading", { name: "Long weekend in Rome" })).toBeVisible();
    await tabs.getByRole("tab", { name: "Tiles" }).click();
    await expect(panel.getByRole("button", { name: /^Bookings/ })).toBeVisible();
    await expectFits(page, "the tiles");
  });
});
