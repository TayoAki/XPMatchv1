import { expect, test, type Locator, type Page } from "@playwright/test";
import { goToChat, openChatHistory, sendChat, signup, uniqueEmail } from "./helpers";

const chatColumn = (page: Page) => page.getByTestId("chat-column");
const nameOf = async (stop: Locator) => ((await stop.getByRole("button", { name: /^Details for / }).first().getAttribute("aria-label")) ?? "").replace(/^Details for /, "");
const timeOf = async (stop: Locator) => (await stop.getByRole("button", { name: /^Details for / }).first().textContent())?.match(/\d{2}:\d{2}/)?.[0] ?? "";

/** Where an element is once the chat has stopped scrolling (it keeps to the bottom as the card grows). */
async function settledBox(page: Page, loc: Locator) {
  let last = await loc.boundingBox();
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(100);
    const next = await loc.boundingBox();
    if (last && next && Math.abs(last.x - next.x) < 0.5 && Math.abs(last.y - next.y) < 0.5) return next;
    last = next;
  }
  return last;
}

/** Drags a stop by its handle onto another element (a stop, or a day's tab), with both in view. */
async function dragTo(page: Page, handle: Locator, target: Locator) {
  await target.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const from = await settledBox(page, handle);
  const to = await settledBox(page, target);
  if (!from || !to) throw new Error("no boxes to drag between");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 3, { steps: 20 });
  await page.mouse.up();
}

/** The itinerary lives on the card in the chat: a tab per day, the map beside it, edits in place, saved with the chat. */
test("destination cards: the whole itinerary on the card, day by day with the map, details, edits, and saved with the chat", async ({ page }) => {
  test.setTimeout(240_000);
  await signup(page, { email: uniqueEmail("dest"), cuisines: ["Italian"] });
  await goToChat(page);
  await sendChat(page, "Where should we go this fall?");

  const cities = page.getByTestId("city-card");
  const rome = page.getByTestId("destination-card").filter({ hasText: "Your Rome itinerary" });
  const kyoto = page.getByTestId("destination-card").filter({ hasText: "Your Kyoto itinerary" });
  const stay = rome.getByTestId("itinerary-stay").getByTestId("itinerary-stop");
  const day = rome.getByTestId("itinerary-day");
  const stops = day.getByTestId("itinerary-stop");
  // A place opens beside the chat, where the map is.
  const place = page.getByTestId("side-panel").getByTestId("place-sheet");
  const pins = page.getByTestId("side-panel").getByTestId("map-pin-list").locator("li");
  const names = async () => Promise.all((await stops.all()).map(nameOf));
  const times = async () => Promise.all((await stops.all()).map(timeOf));
  let savedStayId = "";

  await test.step("two cities: a row to pick from, and the picked city's whole itinerary on its card", async () => {
    await expect(cities).toHaveCount(2, { timeout: 40_000 });
    const tops = await cities.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    await expect(page.getByRole("button", { name: "Show the Rome itinerary" })).toHaveAttribute("aria-pressed", "true");
    await expect(rome).toBeVisible();
    await expect(kyoto).toBeHidden();
    await expect(rome.getByTestId("photo-credit")).toBeVisible({ timeout: 20_000 });
    await expect(rome.getByRole("heading", { name: "Your Rome itinerary", level: 3 })).toBeVisible();
    await expect(rome.getByTestId("destination-match").getByTestId("match-badge")).toBeVisible({ timeout: 40_000 });
    await expect(rome.getByRole("button", { name: "Miss: Rome" })).toBeVisible();
    await expect(rome.getByTestId("itinerary-meta")).toContainText(/^\d+ days?/);
    await expect(rome.getByTestId("itinerary-stay")).toContainText("Where you'll stay");
    await expect(stay).toHaveCount(1);
    await expect(rome.getByRole("tab", { name: "Day 1" })).toHaveAttribute("aria-selected", "true");
    await expect(day).toContainText("Day 1");
    await expect(stops.first()).toContainText(/\d{2}:\d{2}/);
    await expect(stops.first().getByRole("button", { name: /^Details for / })).toContainText("Details & reviews");
    await expect(rome.getByRole("button", { name: "Click to edit" })).toBeEnabled();
    await expect(rome.getByRole("button", { name: "Save the Rome itinerary" })).toBeEnabled();
    // Nothing opens over the chat: the plan is in it, the conversation around it.
    await expect(page.getByTestId("copilot-user-message").first()).toBeVisible();
    await expect(page.getByTestId("plan-overlay")).toHaveCount(0);
  });

  await test.step("picking the other city shows its plan instead (the stand-in has no places there) and the map follows", async () => {
    await page.getByRole("button", { name: "Show the Kyoto itinerary" }).click();
    await expect(kyoto).toBeVisible();
    await expect(rome).toBeHidden();
    await expect(kyoto.getByTestId("itinerary-empty")).toContainText("Not enough places here yet", { timeout: 40_000 });
    await expect(kyoto.getByRole("button", { name: "Click to edit" })).toHaveCount(0);
    await expect(page.getByTestId("map-header")).toContainText("Explore Kyoto");
    await page.getByRole("button", { name: "Show the Rome itinerary" }).click();
    await expect(rome).toBeVisible();
  });

  await test.step("a day's tab shows its stops, and the map shows that day numbered, with the stay", async () => {
    await rome.getByRole("tab", { name: "Day 2" }).click();
    await expect(rome.getByRole("tab", { name: "Day 2" })).toHaveAttribute("aria-selected", "true");
    await expect(day).toContainText("Day 2");
    await expect(page.getByTestId("map-header")).toContainText("Day 2 of your itinerary");
    const count = await stops.count();
    await expect(pins.filter({ hasText: "· Day 2" })).toHaveCount(count);
    await expect(pins.filter({ hasText: /^1\. / })).toHaveCount(1);
    await expect(pins.filter({ hasText: "· Where you'll stay" })).toHaveCount(1);
    // Arrow keys move between the days.
    await rome.getByRole("tab", { name: "Day 2" }).press("ArrowLeft");
    await expect(rome.getByRole("tab", { name: "Day 1" })).toHaveAttribute("aria-selected", "true");
    await expect(rome.getByRole("tab", { name: "Day 1" })).toBeFocused();
    await expect(page.getByTestId("map-header")).toContainText("Day 1 of your itinerary");
  });

  await test.step("Details & reviews opens a stop's place beside the chat and marks its pin; another switches it; Escape closes", async () => {
    const [first, second] = [stops.first(), stops.nth(1)];
    const [firstName, secondName] = [await nameOf(first), await nameOf(second)];
    await first.getByRole("button", { name: `Details for ${firstName}` }).click();
    await expect(place.getByRole("heading", { name: firstName })).toBeVisible({ timeout: 20_000 });
    await expect(first).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("side-panel").getByTestId("map-pin-list").locator('li[data-selected="true"]')).toContainText(firstName);
    await second.getByRole("button", { name: `Details for ${secondName}` }).click();
    await expect(place.getByRole("heading", { name: secondName })).toBeVisible({ timeout: 20_000 });
    await expect(second).toHaveAttribute("data-selected", "true");
    await expect(first).not.toHaveAttribute("data-selected", "true");
    await expect(page.getByPlaceholder("Ask your concierge")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(place).toHaveCount(0);
  });

  await test.step("Click to edit: stops move a step and back, to another day and back by dragging onto its tab; times and pins follow", async () => {
    await rome.getByRole("button", { name: "Click to edit" }).click();
    await expect(rome.getByRole("button", { name: "Done editing" })).toHaveAttribute("aria-pressed", "true");
    const before = await names();
    const beforeTimes = await times();
    const [first, second] = before;
    // A step later: the two trade places, the times run forward in the new order (a meal is never
    // moved earlier than planned), and the day's pins renumber.
    await stops.first().getByRole("button", { name: `Move ${first} later` }).click();
    await expect.poll(names).toEqual([second, first, ...before.slice(2)]);
    const moved = await times();
    expect([...moved].sort()).toEqual(moved);
    expect(moved[1] > moved[0]).toBe(true);
    await expect(pins.filter({ hasText: `1. ${second}` })).toHaveCount(1);
    await expect(pins.filter({ hasText: `2. ${first}` })).toHaveCount(1);
    // A step back is the plan as built, times and all.
    await stops.nth(1).getByRole("button", { name: `Move ${first} earlier` }).click();
    await expect.poll(names).toEqual(before);
    expect(await times()).toEqual(beforeTimes);
    await expect(stops.first().getByRole("button", { name: `Move ${first} earlier` })).toBeDisabled();
    // To another day with its picker: the tabs follow it there, at the end of that day.
    await stops.first().getByRole("combobox", { name: `Day for ${first}` }).selectOption("2");
    await expect(rome.getByRole("tab", { name: "Day 2" })).toHaveAttribute("aria-selected", "true");
    await expect(stops.last().getByRole("button", { name: `Details for ${first}` })).toBeVisible();
    // Up to the top of that day with its arrows.
    for (let i = 0; i < 10 && (await nameOf(stops.first())) !== first; i++) await stops.getByRole("button", { name: `Move ${first} earlier` }).click();
    await expect.poll(async () => nameOf(stops.first())).toBe(first);
    // Dragged onto Day 1's tab, it goes back to the end of day 1, and the tabs follow it again.
    await dragTo(page, stops.first().getByRole("button", { name: `Drag ${first}` }), rome.getByRole("tab", { name: "Day 1" }));
    await expect(rome.getByRole("tab", { name: "Day 1" })).toHaveAttribute("aria-selected", "true");
    await expect.poll(names).toEqual([...before.slice(1), first]);
    // Dragged onto the day's first stop, it takes that slot: the plan as built again.
    await dragTo(page, stops.last().getByRole("button", { name: `Drag ${first}` }), stops.first());
    await expect.poll(names).toEqual(before);
    expect(await times()).toEqual(beforeTimes);
  });

  await test.step("the stay swaps for a ready alternate and back", async () => {
    const original = (await stay.getAttribute("data-place-id")) ?? "";
    await stay.getByRole("button", { name: /^Swap / }).click();
    const option = stay.getByTestId("swap-options").getByRole("button", { name: /^Swap in / }).first();
    const pickName = ((await option.getAttribute("aria-label")) ?? "").replace(/^Swap in /, "");
    await option.click();
    await expect(stay).not.toHaveAttribute("data-place-id", original);
    await expect(stay).toContainText(pickName);
    await expect(stay).toContainText("Swapped in");
    // The place it replaced is now one of its alternates.
    await stay.getByRole("button", { name: /^Swap / }).click();
    await stay.getByTestId("swap-options").getByRole("button", { name: /^Swap in Hotel Artemide/ }).click();
    await expect(stay).toHaveAttribute("data-place-id", original);
  });

  await test.step("See all stays lists every hotel on the card to choose from; the one chosen becomes the stay", async () => {
    const original = (await stay.getAttribute("data-place-id")) ?? "";
    await stay.getByRole("button", { name: /^Swap / }).click();
    await stay.getByTestId("swap-options").getByRole("button", { name: "See all stays" }).click();
    const chooser = rome.getByTestId("itinerary-chooser");
    await expect(chooser.getByTestId("choose-banner")).toContainText("Choose a stay to replace Hotel Artemide");
    await expect(day).toHaveCount(0);
    await expect(chooser.locator(`[data-testid="destination-reco-row"][data-place-id="${original}"]`)).toContainText("Your stay", { timeout: 40_000 });
    const use = chooser.getByRole("button", { name: /^Use .+ as my stay$/ }).first();
    const chosen = ((await use.getAttribute("aria-label")) ?? "").replace(/^Use /, "").replace(/ as my stay$/, "");
    await use.click();
    await expect(chooser).toHaveCount(0);
    await expect(day).toBeVisible();
    await expect(stay).not.toHaveAttribute("data-place-id", original);
    await expect(stay).toHaveAttribute("data-recent", "true");
    await expect(stay.getByRole("button", { name: `Details for ${chosen}` })).toBeVisible();
    // The stay as built is the first option to go back to.
    await stay.getByRole("button", { name: /^Swap / }).click();
    await stay.getByTestId("swap-options").getByRole("button", { name: /^Swap in / }).first().click();
    await expect(stay).toHaveAttribute("data-place-id", original);
  });

  await test.step("a hotel's own panel makes it the stay, and the stay's panel says it is", async () => {
    const original = (await stay.getAttribute("data-place-id")) ?? "";
    await stay.getByRole("button", { name: /^Details for / }).first().click();
    await expect(place.getByTestId("plan-stay")).toContainText("Your stay in the Rome plan");
    await expect(place.getByRole("button", { name: "Use as my stay" })).toHaveCount(0);
    await place.getByRole("button", { name: "Close" }).click();
    await stay.getByRole("button", { name: /^Swap / }).click();
    await stay.getByTestId("swap-options").getByRole("button", { name: "See all stays" }).click();
    const chooser = rome.getByTestId("itinerary-chooser");
    const other = chooser.locator(`[data-testid="destination-reco-row"]:not([data-place-id="${original}"])`).first();
    await expect(other).toBeVisible({ timeout: 40_000 });
    const otherId = (await other.getAttribute("data-place-id")) ?? "";
    await other.getByRole("button", { name: /^Show / }).click();
    await place.getByRole("button", { name: "Use as my stay" }).click();
    await expect(place).toHaveCount(0);
    await expect(chooser).toHaveCount(0);
    await expect(stay).toHaveAttribute("data-place-id", otherId);
    await stay.getByRole("button", { name: /^Swap / }).click();
    await stay.getByTestId("swap-options").getByRole("button", { name: /^Swap in / }).first().click();
    await expect(stay).toHaveAttribute("data-place-id", original);
  });

  await test.step("a stop's See all lists every place of its kind; the plan's own are marked; Cancel returns", async () => {
    const stop = day.locator('[data-testid="itinerary-stop"][data-kind="attraction"]').first();
    await stop.getByRole("button", { name: /^Swap / }).click();
    await stop.getByTestId("swap-options").getByRole("button", { name: "See all things to do" }).click();
    const chooser = rome.getByTestId("itinerary-chooser");
    await expect(chooser.getByTestId("choose-banner")).toContainText("Choose something to do to replace");
    const rows = chooser.getByTestId("destination-reco-row");
    await expect(rows.first()).toBeVisible({ timeout: 40_000 });
    for (const row of await rows.all()) {
      await expect(row.getByRole("button", { name: /^Use .+ instead of / }).or(row.getByText("In your plan"))).toBeVisible();
    }
    await chooser.getByRole("button", { name: "Cancel" }).click();
    await expect(chooser).toHaveCount(0);
    await expect(day).toBeVisible();
  });

  await test.step("Save keeps the plan with this chat and as a trip; an edit after it saves as changes to the same trip", async () => {
    await rome.getByRole("button", { name: "Done editing" }).click();
    const stayName = await nameOf(stay);
    savedStayId = (await stay.getAttribute("data-place-id")) ?? "";
    await rome.getByRole("button", { name: "Save the Rome itinerary" }).click();
    await expect(rome.getByRole("button", { name: "Rome itinerary saved" })).toBeVisible({ timeout: 30_000 });
    const tripLink = rome.getByTestId("itinerary-meta").getByRole("link", { name: "In your trips" });
    await expect(tripLink).toBeVisible();
    // The chat is filed under its trip in the side rail, and the trip is on the map's tray.
    await openChatHistory(page);
    await expect(page.getByTestId("chat-nav-list").locator('a[aria-current="page"]')).toContainText(/\d days? in Rome/);
    await expect(page.getByTestId("trip-tray")).toContainText(/\d days? in Rome/);
    await expect(page.getByTestId("trip-tray")).toContainText("Dates flexible");
    // The trip holds every day of the plan, each stop with its place, time and why it fits.
    const tripId = ((await tripLink.getAttribute("href")) ?? "").split("/trips/")[1];
    type TripJson = { title: string; itinerary: { stops: { title: string; kind?: string; startTime?: string; note: string; place?: { name: string } }[] }[] };
    const trip = (await (await page.request.get(`/api/trips/${tripId}`)).json()) as TripJson;
    expect(trip.title).toMatch(/\d days? in Rome/);
    const tripStops = trip.itinerary.flatMap((d) => d.stops);
    expect(tripStops[0].kind).toBe("hotel");
    expect(tripStops[0].place?.name).toBe(stayName);
    expect(tripStops.every((s) => !!s.place)).toBe(true);
    expect(tripStops.some((s) => s.kind === "restaurant" && /^Dinner · /.test(s.note))).toBe(true);
    expect(tripStops.filter((s) => s.kind === "attraction").every((s) => /^\d{2}:\d{2}$/.test(s.startTime ?? ""))).toBe(true);

    // A change after saving: the button offers to save it, and saving updates the same trip.
    await rome.getByRole("button", { name: "Click to edit" }).click();
    await stay.getByRole("button", { name: /^Swap / }).click();
    const option = stay.getByTestId("swap-options").getByRole("button", { name: /^Swap in / }).first();
    const newStay = ((await option.getAttribute("aria-label")) ?? "").replace(/^Swap in /, "");
    await option.click();
    await rome.getByRole("button", { name: "Save changes to the Rome itinerary" }).click();
    await expect(rome.getByRole("button", { name: "Rome itinerary saved" })).toBeVisible({ timeout: 30_000 });
    savedStayId = (await stay.getAttribute("data-place-id")) ?? "";
    const updated = (await (await page.request.get(`/api/trips/${tripId}`)).json()) as TripJson;
    expect(updated.itinerary[0].stops[0].place?.name).toBe(newStay);
    const trips = (await (await page.request.get("/api/trips")).json()) as { trips: { title: string }[] };
    expect(trips.trips.filter((t) => / in Rome$/.test(t.title))).toHaveLength(1);
    await rome.getByRole("button", { name: "Done editing" }).click();
  });

  await test.step("reopening the chat shows the saved plan, as it was saved", async () => {
    const href = (await page.getByTestId("chat-nav-list").locator('a[aria-current="page"]').getAttribute("href")) ?? "";
    await page.goto("/");
    await page.goto(href);
    const again = page.getByTestId("destination-card").filter({ hasText: "Your Rome itinerary" });
    await expect(again.getByRole("button", { name: "Rome itinerary saved" })).toBeVisible({ timeout: 40_000 });
    await expect(again.getByTestId("itinerary-stay").getByTestId("itinerary-stop")).toHaveAttribute("data-place-id", savedStayId);
  });

  await test.step("a thumbs-down sends the other city to the end of the row", async () => {
    const kyotoCard = page.getByTestId("city-card").filter({ hasText: "Kyoto" });
    await kyotoCard.getByRole("button", { name: "Miss: Kyoto" }).click();
    await page.getByRole("dialog", { name: "Why is Kyoto a miss?" }).getByRole("button", { name: "Too far" }).click();
    const wrappers = page.getByTestId("card-row").first().locator("[data-flip-key]");
    await expect(wrappers.last()).toContainText("Kyoto");
    await expect(wrappers.last()).toHaveAttribute("data-verdict", "down");
  });

  await test.step("on a phone the itinerary fits the chat; a stop's details open over it and close back to it; edits work", async () => {
    const phone = await page.context().browser()!.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await page.context().storageState() });
    const p: Page = await phone.newPage();
    try {
      await p.goto("/chat");
      await sendChat(p, "Plan me a trip to Rome");
      const card = p.getByTestId("destination-card").filter({ hasText: "Your Rome itinerary" });
      await expect(card.getByTestId("day-tabs")).toBeVisible({ timeout: 40_000 });
      const box = await card.boundingBox();
      expect(box && box.width <= 390).toBe(true);
      expect(await card.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      const phoneStops = card.getByTestId("itinerary-day").getByTestId("itinerary-stop");
      await phoneStops.first().getByRole("button", { name: /^Details for / }).tap();
      await expect(p.getByTestId("mobile-place-sheet")).toBeVisible();
      await expect(p.getByTestId("mobile-map-sheet")).toHaveCount(0);
      await p.getByTestId("mobile-place-sheet").getByRole("button", { name: "Close" }).click();
      await expect(p.getByTestId("mobile-place-sheet")).toHaveCount(0);
      await expect(p.getByTestId("mobile-map-sheet")).toHaveCount(0);
      await card.getByRole("button", { name: "Click to edit" }).tap();
      const first = await nameOf(phoneStops.first());
      await phoneStops.first().getByRole("button", { name: `Move ${first} later` }).tap();
      await expect(phoneStops.nth(1).getByRole("button", { name: `Details for ${first}` })).toBeVisible();
    } finally {
      await phone.close();
    }
  });
});

/** A city asked for by name gets its own itinerary card, not a package or a written itinerary. */
test("a city trip request answers with that city's itinerary on its card, and the chat keeps working under it", async ({ page }) => {
  await signup(page, { email: uniqueEmail("city"), cuisines: ["Italian"] });
  await goToChat(page);
  await sendChat(page, "Plan me a trip to Rome");

  const cards = page.getByTestId("destination-card");
  await expect(cards).toHaveCount(1, { timeout: 40_000 });
  await expect(page.getByTestId("city-card")).toHaveCount(0);
  const rome = cards.first();
  await expect(rome.getByRole("heading", { name: "Your Rome itinerary", level: 3 })).toBeVisible();
  await expect(rome.getByTestId("itinerary-day")).toContainText("Day 1", { timeout: 40_000 });
  await expect(page.getByText(/The days are on the card/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("package-card")).toHaveCount(0);
  await expect(page.getByTestId("trip-proposal")).toHaveCount(0);

  // The photo puts the city's plan on the map.
  await rome.getByRole("button", { name: "Open Rome, Italy" }).click();
  await expect(page.getByTestId("map-header")).toContainText("Day 1 of your itinerary");

  // The chat keeps working under the card, and the card stays as it was.
  await sendChat(page, "Find hotels in Rome for me");
  await expect(chatColumn(page).getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
  await expect(chatColumn(page).getByRole("button", { name: "Rate Hotel Artemide" })).toBeVisible();
  await expect(rome.getByTestId("itinerary-day")).toBeVisible();
});
