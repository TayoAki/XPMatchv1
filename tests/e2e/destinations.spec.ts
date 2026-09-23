import { expect, test, type Locator, type Page } from "@playwright/test";
import { goToChat, sendChat, signup, uniqueEmail } from "./helpers";

const chatColumn = (page: Page) => page.getByTestId("chat-column");

/** Waits for a card's turn to finish: mid-turn, neither face takes a click. */
const turned = (card: Locator) => card.locator(".xp-flip").evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)).then(() => undefined));

/** The destination cards: each a complete itinerary built for the traveler; opened, the plan becomes the workspace in the center with the chat beside it. */
test("destination cards: an itinerary per city, opened as the plan workspace with day maps, swaps, place details, save and make itinerary", async ({ page }) => {
  await signup(page, { email: uniqueEmail("dest"), cuisines: ["Italian"] });
  await goToChat(page);
  await sendChat(page, "Where should we go this fall?");

  const cards = page.getByTestId("destination-card");
  await expect(cards).toHaveCount(2, { timeout: 40_000 });
  const rome = cards.filter({ hasText: "Ancient streets" });
  const kyoto = cards.filter({ hasText: "Temples, gardens" });
  const credit = rome.locator(".xp-flip__front").getByTestId("photo-credit");
  const workspace = page.getByTestId("plan-workspace");
  const detail = page.getByTestId("card-detail");
  const chat = page.getByTestId("chat-column");
  const stay = detail.getByTestId("itinerary-stay").getByTestId("itinerary-stop");
  // A place picked in the plan opens in the chat's column, beside the plan.
  const sheet = chat.getByTestId("side-place").getByTestId("place-sheet");

  await test.step("the photo face carries the itinerary, its score and the thumbs, the footer the two actions", async () => {
    await expect(rome).toHaveAttribute("data-face", "photo");
    await expect(credit).toBeVisible({ timeout: 20_000 });
    await expect(rome.getByTestId("itinerary-summary")).toContainText(/\d-day itinerary · stay at /, { timeout: 40_000 });
    await expect(rome.getByTestId("destination-match").getByTestId("match-badge")).toBeVisible({ timeout: 20_000 });
    await expect(rome.getByRole("button", { name: "Miss: Rome" })).toBeVisible();
    await expect(rome.getByRole("button", { name: "Make Rome itinerary" })).toBeEnabled({ timeout: 20_000 });
    await expect(rome.getByRole("button", { name: "Save Rome" })).toBeVisible();
    await expect(rome).toContainText("Click to open your itinerary");
    // The two cards sit side by side in a row.
    const tops = await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  await test.step("with room for the workspace, hovering leaves the card alone", async () => {
    await rome.hover();
    await page.waitForTimeout(700);
    await expect(rome).toHaveAttribute("data-face", "photo");
    await page.mouse.move(2, 2);
  });

  await test.step("a click opens the plan in the center, the chat moves to the right", async () => {
    await rome.getByRole("button", { name: "Itinerary for Rome" }).click();
    await expect(workspace).toBeVisible();
    await expect(chat).toHaveAttribute("data-side", "true");
    const [planBox, chatBox] = [await workspace.boundingBox(), await chat.boundingBox()];
    expect(planBox && chatBox ? planBox.x + planBox.width <= chatBox.x + 1 && planBox.width > chatBox.width : false).toBe(true);
    await expect(rome).toHaveAttribute("data-detail", "open");
    await expect(rome).toHaveAttribute("data-face", "photo");
    await expect(detail.getByRole("heading", { name: "Rome", level: 2 })).toBeVisible();
    await expect(detail.getByRole("button", { name: "Close Rome" })).toBeFocused();
    await expect(detail).toContainText("Curated for you");
    await expect(detail.getByTestId("itinerary-summary")).toContainText(/\d-day itinerary · stay at /);
    await expect(detail.getByTestId("quick-facts")).toContainText("3–4 nights");
    await expect(detail.getByTestId("your-match")).toContainText("%");
    const plan = detail.getByTestId("itinerary-plan");
    await expect(plan).toContainText("Where you'll stay");
    await expect(stay).toHaveCount(1);
    await expect(plan.getByTestId("itinerary-day").first()).toContainText("Day 1");
    await expect(plan.getByTestId("itinerary-day").first().getByTestId("itinerary-stop").first()).toContainText(/\d{2}:\d{2}/);
    await expect(plan.getByTestId("itinerary-stop").filter({ hasText: "Dinner" }).first()).toBeVisible();
    // The chat stays readable beside the plan.
    const opacity = await page.getByTestId("copilot-user-message").first().evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(opacity).toBe(1);
  });

  await test.step("each day opens its own map above its stops, one at a time", async () => {
    const days = detail.getByTestId("itinerary-day");
    const firstMap = days.first().getByTestId("day-map");
    await expect(firstMap).toBeVisible();
    // Its pins: the stay and the day's stops, numbered like the list.
    const stops = await days.first().getByTestId("itinerary-stop").count();
    await expect(firstMap.getByTestId("map-pin-list").locator("li")).toHaveCount(stops + 1);
    await expect(firstMap.getByTestId("map-pin-list")).toContainText("1.");
    if ((await days.count()) > 1) {
      await days.nth(1).getByRole("button", { name: "Show the map of day 2" }).click();
      await expect(days.nth(1).getByTestId("day-map")).toBeVisible();
      await expect(firstMap).toHaveCount(0);
    }
  });

  await test.step("a stop opens beside the plan, in the chat's column; the plan stays usable and another pick switches the place", async () => {
    const day = detail.getByTestId("itinerary-day").filter({ has: page.getByTestId("day-map") }).first();
    const stops = day.getByTestId("itinerary-stop");
    const nameOf = async (stop: Locator) => ((await stop.getByRole("button", { name: /^Details for / }).getAttribute("aria-label")) ?? "").replace(/^Details for /, "");
    const [first, second] = [stops.first(), stops.nth(1)];
    const [firstName, secondName] = [await nameOf(first), await nameOf(second)];
    await first.getByRole("button", { name: /^Details for / }).click();
    await expect(sheet.getByRole("heading", { name: firstName })).toBeVisible({ timeout: 20_000 });
    await expect(first).toHaveAttribute("data-selected", "true");
    // Side by side: the plan in the center, the place on the right where the chat was.
    await expect(detail.getByTestId("itinerary-plan")).toBeVisible();
    const [planBox, placeBox] = [await workspace.boundingBox(), await sheet.boundingBox()];
    expect(planBox && placeBox ? planBox.x + planBox.width <= placeBox.x + 1 : false).toBe(true);
    // The day's map marks the same place.
    await expect(day.getByTestId("day-map").getByTestId("map-pin-list").locator('li[data-selected="true"]')).toContainText(firstName);
    await second.getByRole("button", { name: /^Details for / }).click();
    await expect(sheet.getByRole("heading", { name: secondName })).toBeVisible({ timeout: 20_000 });
    await expect(second).toHaveAttribute("data-selected", "true");
    await expect(first).not.toHaveAttribute("data-selected", "true");
    await sheet.getByRole("button", { name: "Back to chat" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByPlaceholder("Ask your concierge")).toBeVisible();
    await expect(page.getByTestId("copilot-user-message").first()).toBeVisible();
  });

  await test.step("the stay swaps for a ready alternate, the plan and the card follow, and swaps back", async () => {
    const original = (await stay.getAttribute("data-place-id")) ?? "";
    await stay.getByRole("button", { name: /^Swap / }).click();
    const options = stay.getByTestId("swap-options");
    await expect(options.getByRole("button", { name: /^Swap in / }).first()).toBeVisible();
    const pickName = ((await options.getByRole("button", { name: /^Swap in / }).first().getAttribute("aria-label")) ?? "").replace(/^Swap in /, "");
    await options.getByRole("button", { name: /^Swap in / }).first().click();
    await expect(stay).not.toHaveAttribute("data-place-id", original);
    await expect(stay).toContainText(pickName);
    await expect(detail.getByTestId("itinerary-summary")).toContainText(`stay at ${pickName}`);
    await expect(rome.getByTestId("itinerary-summary")).toContainText(`stay at ${pickName}`);
    // The place it replaced is now one of its alternates.
    await stay.getByRole("button", { name: /^Swap / }).click();
    await stay.getByTestId("swap-options").getByRole("button", { name: /^Swap in Hotel Artemide/ }).click();
    await expect(stay).toHaveAttribute("data-place-id", original);
  });

  await test.step("See all stays opens the Stays tab to choose from every hotel; the one chosen becomes the stay", async () => {
    const original = (await stay.getAttribute("data-place-id")) ?? "";
    await stay.getByRole("button", { name: /^Swap / }).click();
    await stay.getByTestId("swap-options").getByRole("button", { name: "See all stays" }).click();
    await expect(detail.getByRole("tab", { name: "Stays" })).toHaveAttribute("aria-selected", "true");
    await expect(detail.getByTestId("choose-banner")).toContainText("Choose a stay to replace Hotel Artemide");
    await expect(detail.locator(`[data-testid="destination-reco-row"][data-place-id="${original}"]`)).toContainText("Your stay", { timeout: 40_000 });
    const use = detail.getByRole("button", { name: /^Use .+ as my stay$/ }).first();
    const chosen = ((await use.getAttribute("aria-label")) ?? "").replace(/^Use /, "").replace(/ as my stay$/, "");
    await use.click();
    await expect(detail.getByRole("tab", { name: "Itinerary" })).toHaveAttribute("aria-selected", "true");
    await expect(detail.getByTestId("choose-banner")).toHaveCount(0);
    await expect(stay).not.toHaveAttribute("data-place-id", original);
    await expect(stay).toHaveAttribute("data-recent", "true");
    await expect(stay).toContainText("Swapped in");
    await expect(stay.getByRole("button", { name: `Details for ${chosen}` })).toBeVisible();
    await expect(detail.getByTestId("itinerary-summary")).not.toContainText("Hotel Artemide");
    // The stay as built is the first option to go back to.
    await stay.getByRole("button", { name: /^Swap / }).click();
    await stay.getByTestId("swap-options").getByRole("button", { name: /^Swap in / }).first().click();
    await expect(stay).toHaveAttribute("data-place-id", original);
    await expect(stay).not.toContainText("Swapped in");
  });

  await test.step("a hotel's own panel makes it the stay, and the stay's panel says it is", async () => {
    const original = (await stay.getAttribute("data-place-id")) ?? "";
    await detail.getByRole("tab", { name: "Stays" }).click();
    const current = detail.locator(`[data-testid="destination-reco-row"][data-place-id="${original}"]`);
    await current.getByRole("button", { name: /^Show / }).click();
    await expect(sheet.getByTestId("plan-stay")).toContainText("Your stay in the Rome plan");
    await expect(sheet.getByRole("button", { name: "Use as my stay" })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Back to chat" }).click();
    const other = detail.locator(`[data-testid="destination-reco-row"]:not([data-place-id="${original}"])`).first();
    const otherId = (await other.getAttribute("data-place-id")) ?? "";
    await other.getByRole("button", { name: /^Show / }).click();
    await sheet.getByRole("button", { name: "Use as my stay" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(detail.getByRole("tab", { name: "Itinerary" })).toHaveAttribute("aria-selected", "true");
    await expect(stay).toHaveAttribute("data-place-id", otherId);
    await stay.getByRole("button", { name: /^Swap / }).click();
    await stay.getByTestId("swap-options").getByRole("button", { name: /^Swap in / }).first().click();
    await expect(stay).toHaveAttribute("data-place-id", original);
  });

  await test.step("a stop's See all opens its tab to choose from; the plan's own places are marked; Cancel returns", async () => {
    const stop = detail.getByTestId("itinerary-day").first().locator('[data-testid="itinerary-stop"][data-kind="attraction"]').first();
    await stop.getByRole("button", { name: /^Swap / }).click();
    await stop.getByTestId("swap-options").getByRole("button", { name: "See all things to do" }).click();
    await expect(detail.getByRole("tab", { name: "Activities" })).toHaveAttribute("aria-selected", "true");
    const banner = detail.getByTestId("choose-banner");
    await expect(banner).toContainText("Choose something to do to replace");
    const rows = detail.getByTestId("destination-reco-row");
    await expect(rows.first()).toBeVisible({ timeout: 40_000 });
    for (const row of await rows.all()) {
      await expect(row.getByRole("button", { name: /^Use .+ instead of / }).or(row.getByText("In your plan"))).toBeVisible();
    }
    await banner.getByRole("button", { name: "Cancel" }).click();
    await expect(detail.getByRole("tab", { name: "Itinerary" })).toHaveAttribute("aria-selected", "true");
    await expect(detail.getByTestId("choose-banner")).toHaveCount(0);
  });

  await test.step("the Stays tab lists every pick; a row opens its place beside the list, Back returns to the chat", async () => {
    await detail.getByRole("tab", { name: "Stays" }).click();
    const rows = detail.getByTestId("destination-reco-row");
    await expect(rows.first()).toBeVisible({ timeout: 40_000 });
    await expect(rows.first()).toHaveAttribute("data-kind", "hotel");
    await expect(detail.getByRole("button", { name: /^Show all/ })).toHaveCount(0);
    const show = rows.first().getByRole("button", { name: /^Show / });
    const name = (await show.getAttribute("aria-label"))?.replace(/^Show /, "").replace(/ on map$/, "") ?? "";
    await show.click();
    await expect(sheet.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });
    await expect(sheet.getByRole("button", { name: "Add to trip" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: `Not a fit: ${name}` })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Hide map" })).toHaveCount(0);
    await expect(rows.first()).toBeVisible();
    await sheet.getByRole("button", { name: "Back to chat" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(detail.getByRole("tab", { name: "Stays" })).toHaveAttribute("aria-selected", "true");
    await detail.getByRole("tab", { name: "Itinerary" }).click();
  });

  await test.step("Escape goes back from a place, from the plan or the place itself, then closes the plan; typing in the chat leaves it open", async () => {
    await stay.getByRole("button", { name: /^Details for / }).click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await stay.getByRole("button", { name: /^Details for / }).click();
    await sheet.getByRole("button", { name: "Back to chat" }).focus();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await page.getByPlaceholder("Ask your concierge").focus();
    await page.keyboard.press("Escape");
    await expect(workspace).toBeVisible();
    await detail.getByRole("tab", { name: "Itinerary" }).focus();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("plan-workspace")).toHaveCount(0);
    await expect(chat).not.toHaveAttribute("data-side", "true");
    await expect(rome).not.toHaveAttribute("data-detail", "open");
    await expect(page.getByTestId("map-header")).toContainText("Explore Rome");
  });

  await test.step("Save saves only the city; Make itinerary saves the whole plan and turns both buttons", async () => {
    await rome.getByRole("button", { name: "Itinerary for Rome" }).click();
    await detail.getByRole("button", { name: "Save Rome" }).click();
    await expect(detail.getByRole("button", { name: "Remove Rome from saved" })).toHaveAttribute("aria-pressed", "true");
    await expect(rome.getByRole("button", { name: "Remove Rome from saved" })).toHaveAttribute("aria-pressed", "true");
    const stayName = ((await stay.getByRole("button", { name: /^Details for / }).getAttribute("aria-label")) ?? "").replace(/^Details for /, "");
    await detail.getByRole("button", { name: "Make Rome itinerary" }).click();
    const open = detail.getByRole("link", { name: "Open Rome itinerary" });
    await expect(open).toBeVisible({ timeout: 30_000 });
    await expect(rome.getByRole("link", { name: "Open Rome itinerary" })).toBeVisible();
    // The trip holds every day of the plan, each stop with its place, time and why it fits.
    const tripId = (await open.getAttribute("href"))?.split("/trips/")[1] ?? "";
    const trip = (await (await page.request.get(`/api/trips/${tripId}`)).json()) as { title: string; itinerary: { stops: { title: string; kind?: string; startTime?: string; note: string; place?: { name: string } }[] }[] };
    expect(trip.title).toMatch(/\d days? in Rome/);
    const stops = trip.itinerary.flatMap((d) => d.stops);
    expect(stops[0].kind).toBe("hotel");
    expect(stops[0].place?.name).toBe(stayName);
    expect(stops.every((s) => !!s.place)).toBe(true);
    expect(stops.some((s) => s.kind === "restaurant" && /^Dinner · /.test(s.note))).toBe(true);
    expect(stops.filter((s) => s.kind === "attraction").every((s) => /^\d{2}:\d{2}$/.test(s.startTime ?? ""))).toBe(true);
    await detail.getByRole("button", { name: "Close Rome" }).click();
    await expect(page.getByTestId("trip-tray")).toContainText(/\d days? in Rome/);
    await expect(page.getByTestId("trip-tray")).toContainText("Dates flexible");
  });

  await test.step("a thumbs-down sends the other card to the end", async () => {
    await kyoto.getByRole("button", { name: "Miss: Kyoto" }).click();
    await page.getByRole("dialog", { name: "Why is Kyoto a miss?" }).getByRole("button", { name: "Too far" }).click();
    const wrappers = page.getByTestId("card-row").first().locator("[data-flip-key]");
    await expect(wrappers.last()).toContainText("Kyoto");
    await expect(wrappers.last()).toHaveAttribute("data-verdict", "down");
  });

  await test.step("on a phone the itinerary turns over on tap, Photo turns it back, a row opens the map sheet", async () => {
    const phone = await page.context().browser()!.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await page.context().storageState() });
    const p: Page = await phone.newPage();
    try {
      await p.goto("/chat");
      await sendChat(p, "Where should we go this fall?");
      const card = p.getByTestId("destination-card").filter({ hasText: "Ancient streets" });
      await expect(card).toBeVisible({ timeout: 40_000 });
      await expect(card).toContainText("Tap Itinerary");
      await card.getByRole("button", { name: "Itinerary for Rome" }).tap();
      await expect(card).toHaveAttribute("data-face", "profile");
      await expect(p.getByTestId("card-detail")).toHaveCount(0);
      await turned(card);
      await card.getByRole("button", { name: "Show the photo of Rome" }).tap();
      await expect(card).toHaveAttribute("data-face", "photo");
      await card.getByRole("button", { name: "Itinerary for Rome" }).tap();
      await turned(card);
      // Swap works on the card too: the stay's list, then its first option.
      const cardStay = card.locator('[data-testid="itinerary-stop"][data-kind="hotel"]');
      await expect(cardStay).toHaveCount(1, { timeout: 40_000 });
      const before = (await cardStay.getAttribute("data-place-id")) ?? "";
      await cardStay.getByRole("button", { name: /^Swap / }).tap();
      const option = cardStay.getByTestId("swap-options").getByRole("button", { name: /^Swap in / }).first();
      const pickName = ((await option.getAttribute("aria-label")) ?? "").replace(/^Swap in /, "");
      await option.tap();
      await expect(cardStay).not.toHaveAttribute("data-place-id", before);
      await expect(card.getByTestId("itinerary-summary")).toContainText(`stay at ${pickName}`);
      await expect(cardStay.getByRole("button", { name: /^Swap / })).toBeVisible();
      await card.getByRole("tab", { name: "Stays" }).tap();
      const row = card.getByTestId("destination-reco-row").first();
      await expect(row).toBeVisible({ timeout: 40_000 });
      await row.getByRole("button", { name: /^Show / }).tap();
      await expect(p.getByTestId("mobile-place-sheet")).toBeVisible();
      await p.getByTestId("mobile-place-sheet").getByRole("button", { name: "Close" }).click();
      await expect(p.getByTestId("mobile-map-sheet")).toBeVisible();
      await expect(p.getByTestId("mobile-map-sheet")).toContainText("Explore Rome");
    } finally {
      await phone.close();
    }
  });
});

/** A city asked for by name gets its own curated card, like a country's cities, not a package or a written itinerary. */
test("a city trip request answers with that city's curated card, opened as the plan workspace", async ({ page }) => {
  await signup(page, { email: uniqueEmail("city"), cuisines: ["Italian"] });
  await goToChat(page);
  await sendChat(page, "Plan me a trip to Rome");

  const cards = page.getByTestId("destination-card");
  await expect(cards).toHaveCount(1, { timeout: 40_000 });
  const rome = cards.first();
  await expect(rome).toContainText("Curated for you");
  await expect(rome.getByTestId("itinerary-summary")).toContainText(/\d-day itinerary · stay at /, { timeout: 40_000 });
  await expect(page.getByText(/Open the card for the days and the map/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("package-card")).toHaveCount(0);
  await expect(page.getByTestId("trip-proposal")).toHaveCount(0);

  // Clicking the photo opens it, like the Itinerary control.
  await rome.getByRole("button", { name: "Open Rome, Italy" }).click();
  const detail = page.getByTestId("card-detail");
  await expect(detail.getByRole("heading", { name: "Rome", level: 2 })).toBeVisible();
  await expect(detail.getByTestId("itinerary-plan")).toContainText("Day 1", { timeout: 40_000 });

  // The chat beside the plan keeps working, and the plan stays open while it answers.
  await sendChat(page, "Find hotels in Rome for me");
  await expect(chatColumn(page).getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
  await expect(chatColumn(page).getByRole("button", { name: "Rate Hotel Artemide" })).toBeVisible();
  await expect(page.getByTestId("plan-workspace")).toBeVisible();
  await expect(detail.getByTestId("itinerary-plan")).toBeVisible();
});
