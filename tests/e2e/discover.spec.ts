import { expect, test, type Page } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

type SavedRow = { kind: string; title: string };

async function savedRows(page: Page): Promise<SavedRow[]> {
  const res = await page.request.get("/api/saved");
  return ((await res.json()) as { saved: SavedRow[] }).saved;
}

test("discover: hero photo and attribution, planner fields, create a trip, collections, composer, launcher", async ({ page }) => {
  await signup(page, { email: uniqueEmail("discover") });

  await test.step("the hero shows the home city's Places photo with its author attribution", async () => {
    const hero = page.getByTestId("hero-image");
    await expect(hero.locator("img")).toBeVisible({ timeout: 20_000 });
    await expect(hero.getByTestId("photo-credit")).toContainText("A Google user");
    await expect(page.getByTestId("hero-caption")).toContainText(/Austell/);
    await expect(page.getByRole("link", { name: "XPMatch home" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Discover" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("side-rail")).toHaveCount(0);
  });

  await test.step("planner fields apply and cancel, and the dates must be in order", async () => {
    const where = page.getByTestId("planner-field-where");
    await expect(where).toContainText("Any destination");
    await where.click();
    const whereEditor = page.getByRole("dialog", { name: "Where to?" });
    await whereEditor.getByLabel("Destination").fill("Rome, Italy");
    await whereEditor.getByRole("button", { name: "Apply" }).click();
    await expect(whereEditor).toHaveCount(0);
    await expect(where).toContainText("Rome, Italy");

    await page.getByTestId("planner-field-when").click();
    const when = page.getByRole("dialog", { name: "When?" });
    await when.getByLabel("From").fill("2026-10-13");
    await when.getByLabel("To").fill("2026-10-10");
    await expect(when.getByRole("alert")).toContainText("end date");
    await expect(when.getByRole("button", { name: "Apply" })).toBeDisabled();
    await when.getByLabel("To").fill("2026-10-15");
    await when.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("planner-field-when")).toContainText("Oct 13 – Oct 15");

    await page.getByTestId("planner-field-guests").click();
    const guests = page.getByRole("dialog", { name: "How many?" });
    await guests.getByRole("button", { name: "More travelers" }).click();
    await guests.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("planner-field-guests")).toContainText("3 guests");

    await page.getByTestId("planner-field-budget").click();
    const budget = page.getByRole("dialog", { name: "Budget" });
    await budget.getByRole("button", { name: "Luxury", exact: true }).click();
    await budget.getByRole("button", { name: "Cancel" }).click();
    await expect(budget).toHaveCount(0);
    await expect(page.getByTestId("planner-field-budget")).toContainText("Any budget");

    // Escape closes an editor and gives focus back to its field.
    await page.getByTestId("planner-field-budget").click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Budget" })).toHaveCount(0);
    await expect(page.getByTestId("planner-field-budget")).toBeFocused();
  });

  await test.step("Create a trip from the hero opens the dialog prefilled from the fields", async () => {
    await page.getByTestId("discover-hero").getByRole("button", { name: "Create a trip" }).click();
    const dialog = page.getByRole("dialog", { name: "Create a trip" });
    await expect(dialog.getByPlaceholder(/Dallas, Lisbon/)).toHaveValue("Rome, Italy");
    await expect(dialog.getByRole("textbox", { name: "From", exact: true })).toHaveValue("2026-10-13");
    await expect(dialog.getByRole("textbox", { name: "To", exact: true })).toHaveValue("2026-10-15");
    await expect(dialog.getByRole("spinbutton")).toHaveValue("3");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
  });

  await test.step("collection cards carry a photo, save under Saved and open the matching Inspiration rows", async () => {
    const cards = page.getByTestId("collection-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.first().locator("img")).toBeVisible({ timeout: 20_000 });
    await expect(cards.first().getByTestId("photo-credit")).toContainText("A Google user");
    await cards.first().getByRole("button", { name: "Save By the water" }).click();
    await expect(cards.first().getByRole("button", { name: "Remove By the water from saved" })).toBeVisible();
    await expect.poll(async () => (await savedRows(page)).some((s) => s.kind === "collection" && s.title === "By the water"), { timeout: 15_000 }).toBe(true);

    await cards.first().getByRole("link", { name: /By the water/ }).click();
    await page.waitForURL(/\/inspiration\?collection=water/);
    await expect(page.getByRole("heading", { name: "By the water", level: 1 })).toBeVisible();
    await expect(page.getByTestId("collection-rows")).toContainText("Amalfi Coast");

    await page.goto("/saved");
    await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible();
    await expect(page.getByText("By the water")).toBeVisible();
  });

  await test.step("the hero composer sends the prompt to the concierge", async () => {
    await page.goto("/");
    const send = page.getByRole("button", { name: "Send to your AI concierge" });
    await expect(send).toBeDisabled();
    await page.getByLabel("Describe your ideal escape").fill("Find hotels in Rome");
    await send.click();
    await page.waitForURL(/\/chat/);
    // Scoped to the chat: the side panel's picks carry a "Where to stay in Rome" row of their own.
    await expect(page.locator(".xp-chat").getByText("Where to stay in Rome")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("concierge-launcher")).toHaveCount(0);
    // The chat opened from Discover starts from the fields filled in there.
    const chips = page.getByTestId("planner-chips");
    await expect(chips).toContainText("Rome");
    await expect(chips).toContainText("3 travelers");
  });

  await test.step("content pages carry the side rail; Discover keeps the launcher; the planner chips sit under the composer", async () => {
    await page.goto("/trips");
    const rail = page.getByTestId("side-rail");
    await expect(rail).toBeVisible();
    await expect(page.getByTestId("concierge-launcher")).toHaveCount(0);
    await expect(rail.getByRole("link", { name: "Trips" })).toHaveAttribute("aria-current", "page");
    await rail.getByRole("button", { name: "Collapse navigation" }).click();
    await expect(rail).toHaveAttribute("data-collapsed", "true");
    await rail.getByRole("button", { name: "Expand navigation" }).click();
    await expect(rail).not.toHaveAttribute("data-collapsed", "true");
    await rail.getByRole("link", { name: "Chats" }).click();
    await page.waitForURL((u) => u.pathname === "/chat");
    await expect(page.getByPlaceholder("Ask your concierge")).toBeVisible();
    // A new chat starts over: the fields went with the chat opened from Discover, not with every chat.
    const chips = page.getByTestId("planner-chips");
    await expect(chips.getByRole("button").first()).toHaveText("Where");
    await expect(chips).not.toContainText("travelers");
    await chips.getByRole("button", { name: /Budget/ }).click();
    await expect(page.getByRole("dialog", { name: "Create a trip" })).toBeVisible();
    await page.getByRole("dialog", { name: "Create a trip" }).getByRole("button", { name: "Close" }).click();
    await page.goto("/");
    const launcher = page.getByRole("link", { name: "Your AI concierge" });
    await expect(launcher).toBeVisible();
    await launcher.click();
    await page.waitForURL((u) => u.pathname === "/chat");
  });

  await test.step("picks come as carousel rows, best first, with the reasons on the card", async () => {
    await page.goto("/");
    // The chats opened since started over, so the fields are blank again: pick the destination.
    await page.getByTestId("planner-field-where").click();
    const whereEditor = page.getByRole("dialog", { name: "Where to?" });
    await whereEditor.getByLabel("Destination").fill("Rome, Italy");
    await whereEditor.getByRole("button", { name: "Apply" }).click();
    const things = page.getByTestId("home-row-things");
    await things.scrollIntoViewIfNeeded();
    await expect(things.getByTestId("home-pick").first()).toBeVisible({ timeout: 60_000 });
    const scores = await things.getByTestId("match-badge").evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-score"))));
    expect(scores.length).toBeGreaterThanOrEqual(3);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    await expect(things.getByTestId("match-badge").first()).toContainText(/match|Worth a look|Probably not you/);
    await expect(things.getByTestId("pick-reasons").first()).toContainText(/Rated|budget|Free|\$/);
    await expect(things.getByRole("region", { name: /Things to do in/ })).toBeVisible();
  });

  await test.step("old chat links redirect to the concierge", async () => {
    await page.goto("/?prompt=hello");
    await page.waitForURL(/\/chat/);
    await page.goto("/chats");
    await page.waitForURL((u) => u.pathname === "/chat");
  });
});

test.describe("discover on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the quiz sits in the hero until answered, then the fields stack in two columns and nothing overflows", async ({ page }) => {
    await page.goto("/signup");
    await page.getByPlaceholder("Tayo Akigbogun").fill("Pia Phone");
    await page.getByPlaceholder("you@example.com").fill(uniqueEmail("discover-phone"));
    await page.locator('input[type="password"]').fill("travel-2026-secret");
    await page.getByRole("button", { name: "Create account" }).click();

    const quiz = page.getByTestId("hero-quiz");
    await quiz.waitFor({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Go somewhere that stays with you/ })).toHaveCount(0);
    await quiz.getByRole("button", { name: "Skip for now" }).click();
    await expect(quiz).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Go somewhere that stays with you/ })).toBeVisible();

    const fields = page.getByTestId("planner-fields");
    const whereBox = await page.getByTestId("planner-field-where").boundingBox();
    const whenBox = await page.getByTestId("planner-field-when").boundingBox();
    const guestsBox = await page.getByTestId("planner-field-guests").boundingBox();
    expect(whereBox && whenBox && guestsBox).toBeTruthy();
    expect(Math.abs(whereBox!.y - whenBox!.y)).toBeLessThan(2);
    expect(guestsBox!.y).toBeGreaterThan(whereBox!.y + 40);
    await expect(fields).toBeVisible();

    // Editors open as a sheet on phones.
    await page.getByTestId("planner-field-guests").click();
    const sheet = page.getByTestId("planner-sheet");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "More travelers" }).click();
    await sheet.getByRole("button", { name: "Apply" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByTestId("planner-field-guests")).toContainText("3 guests");

    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
    await expect(page.getByTestId("concierge-launcher")).toBeHidden();
    await expect(page.getByTestId("mobile-tab-bar").getByRole("link", { name: "Concierge" })).toBeVisible();
  });
});
