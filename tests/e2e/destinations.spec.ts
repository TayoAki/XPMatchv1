import { expect, test, type Locator, type Page } from "@playwright/test";
import { goToChat, sendChat, signup, uniqueEmail } from "./helpers";

const opacity = (el: Locator) => el.evaluate((node) => Number(getComputedStyle(node).opacity));
/** Waits for a card's turn to finish: mid-turn, neither face takes a click. */
const turned = (card: Locator) => card.locator(".xp-flip").evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)).then(() => undefined));

/** The destination cards: each a complete itinerary built for the traveler, a hover preview, the card in full next to the chat over its map, the two actions. */
test("destination cards: an itinerary per city, hover preview, the card in full next to the chat, rows on the map, save, make itinerary", async ({ page }) => {
  await signup(page, { email: uniqueEmail("dest"), cuisines: ["Italian"] });
  await goToChat(page);
  await sendChat(page, "Where should we go this fall?");

  const cards = page.getByTestId("destination-card");
  await expect(cards).toHaveCount(2, { timeout: 40_000 });
  const rome = cards.filter({ hasText: "Ancient streets" });
  const kyoto = cards.filter({ hasText: "Temples, gardens" });
  // The photo's credit sits on the photo face; the turned face is hidden outright, so the credit
  // can never show through the city profile, mirrored (some browsers draw parts of a back face).
  const credit = rome.locator(".xp-flip__front").getByTestId("photo-credit");
  const panel = page.getByTestId("card-detail-panel");
  const detail = page.getByTestId("card-detail");
  const question = page.getByTestId("copilot-user-message").first();

  await test.step("the photo face carries the itinerary, its score and the thumbs, the footer the two actions", async () => {
    await expect(rome).toHaveAttribute("data-face", "photo");
    await expect(credit).toBeVisible({ timeout: 20_000 });
    await expect(rome.getByTestId("itinerary-summary")).toContainText(/\d-day itinerary · stay at /, { timeout: 40_000 });
    await expect(rome.getByTestId("destination-match").getByTestId("match-badge")).toBeVisible({ timeout: 20_000 });
    await expect(rome.getByRole("button", { name: "Miss: Rome" })).toBeVisible();
    await expect(rome.getByRole("button", { name: "Make Rome itinerary" })).toBeEnabled({ timeout: 20_000 });
    await expect(rome.getByRole("button", { name: "Save Rome" })).toBeVisible();
    await expect(rome).toContainText("Click to open it with the map");
    // The two cards sit side by side in a row.
    const tops = await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  await test.step("a fine pointer previews the itinerary on hover and hides it again on leaving", async () => {
    await rome.hover();
    await expect(rome).toHaveAttribute("data-face", "profile", { timeout: 5_000 });
    await expect(rome).toHaveAttribute("data-reveal", "hover");
    await expect(credit).toBeHidden();
    await page.mouse.move(2, 2);
    await expect(rome).toHaveAttribute("data-face", "photo", { timeout: 5_000 });
    await expect(credit).toBeVisible();
  });

  await test.step("Itinerary opens the card in full next to the chat, above a map of its places, and the chat steps back", async () => {
    await rome.getByRole("button", { name: "Itinerary for Rome" }).click();
    await expect(detail).toBeVisible();
    await expect(rome).toHaveAttribute("data-detail", "open");
    await expect(rome).toHaveAttribute("data-face", "photo");
    await expect(rome).toContainText("Open next to the chat");
    await expect(detail.getByRole("heading", { name: "Rome", level: 2 })).toBeVisible();
    await expect(detail.getByRole("button", { name: "Close Rome" })).toBeFocused();
    await expect(detail).toContainText("Curated for you");
    await expect(detail.getByTestId("itinerary-summary")).toContainText(/\d-day itinerary · stay at /);
    await expect(detail.getByTestId("quick-facts")).toContainText("3–4 nights");
    await expect(detail.getByTestId("quick-facts")).toContainText("Food & antiquity");
    await expect(detail.getByTestId("your-match")).toContainText("%");
    const plan = detail.getByTestId("itinerary-plan");
    await expect(plan).toContainText("Where you'll stay");
    await expect(plan.getByTestId("itinerary-day").first()).toContainText("Day 1");
    await expect(plan.getByTestId("itinerary-day").first().getByTestId("itinerary-stop").first()).toContainText(/\d{2}:\d{2}/);
    await expect(plan.getByTestId("itinerary-stop").filter({ hasText: "Dinner" }).first()).toBeVisible();
    // The map sits under the card with the plan's places; its own header gives way to the card's tabs.
    const map = panel.getByTestId("map-panel");
    await expect(map).toHaveAttribute("data-compact", "true");
    await expect(page.getByTestId("map-header")).toHaveCount(0);
    const cardBox = await detail.boundingBox();
    const mapBox = await map.boundingBox();
    expect(cardBox && mapBox ? cardBox.y + cardBox.height <= mapBox.y + 1 : false).toBe(true);
    await expect(map.getByTestId("map-pin-list").locator("li")).not.toHaveCount(0);
    // The conversation steps back while the card is open; the message holding the card stays sharp.
    await expect.poll(() => opacity(question)).toBeLessThan(0.6);
    await expect.poll(() => opacity(page.getByTestId("copilot-assistant-message").filter({ has: rome }))).toBe(1);
  });

  await test.step("the Stays tab in full lists every pick and puts only stays on the map", async () => {
    await detail.getByRole("tab", { name: "Stays" }).click();
    const rows = detail.getByTestId("destination-reco-row");
    await expect(rows.first()).toBeVisible({ timeout: 40_000 });
    await expect(rows.first()).toHaveAttribute("data-kind", "hotel");
    await expect(detail.getByRole("button", { name: /^Show all/ })).toHaveCount(0);
    const kinds = () => panel.getByTestId("map-pin-list").locator("li").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-kind")))].join(","));
    await expect.poll(kinds).toBe("hotel");
  });

  await test.step("a row shows that exact place on the map; Details opens it over the panel with its own actions", async () => {
    const row = detail.getByTestId("destination-reco-row").first();
    const name = (await row.getByRole("button").getAttribute("aria-label"))?.replace(/^Show /, "").replace(/ on map$/, "") ?? "";
    expect(name.length).toBeGreaterThan(2);
    await row.getByRole("button").click();
    await expect(panel.getByTestId("map-pin-list").locator('[data-selected="true"]')).toContainText(name);
    const bar = panel.getByTestId("selected-place");
    await expect(bar).toBeVisible();
    await bar.getByRole("button", { name: `Details for ${name}` }).click();
    const sheet = page.getByTestId("place-sheet");
    await expect(sheet.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });
    await expect(sheet.getByRole("button", { name: "Add to trip" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Hide map" })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Close", exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(detail).toBeVisible();
    await expect(bar).toBeVisible();
  });

  await test.step("Escape closes the card and the chat comes back; the map's filter picks the tab it opens on", async () => {
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);
    await expect(rome).not.toHaveAttribute("data-detail", "open");
    await expect.poll(() => opacity(question)).toBe(1);
    await expect(page.getByTestId("map-header")).toContainText("Explore Rome");
    await page.getByTestId("map-filter-restaurant").click();
    await rome.getByRole("button", { name: "Itinerary for Rome" }).click();
    await expect(detail.getByRole("tab", { name: "Dining" })).toHaveAttribute("aria-selected", "true");
    await detail.getByRole("tab", { name: "Itinerary" }).click();
    await expect(detail.getByRole("tab", { name: "Itinerary" })).toHaveAttribute("aria-selected", "true");
  });

  await test.step("Save saves only the city; Make itinerary in full saves the whole plan and turns both buttons", async () => {
    await detail.getByRole("button", { name: "Save Rome" }).click();
    await expect(detail.getByRole("button", { name: "Remove Rome from saved" })).toHaveAttribute("aria-pressed", "true");
    await expect(rome.getByRole("button", { name: "Remove Rome from saved" })).toHaveAttribute("aria-pressed", "true");
    await detail.getByRole("button", { name: "Make Rome itinerary" }).click();
    const open = detail.getByRole("link", { name: "Open Rome itinerary" });
    await expect(open).toBeVisible({ timeout: 30_000 });
    await expect(rome.getByRole("link", { name: "Open Rome itinerary" })).toBeVisible();
    // The trip holds every day of the plan, each stop with its place, time and why it fits.
    const tripId = (await open.getAttribute("href"))?.split("/trips/")[1] ?? "";
    const trip = (await (await page.request.get(`/api/trips/${tripId}`)).json()) as { title: string; itinerary: { stops: { title: string; kind?: string; startTime?: string; note: string; place?: { name: string } }[] }[] };
    expect(trip.title).toMatch(/\d days? in Rome/);
    expect(trip.itinerary.length).toBeGreaterThanOrEqual(1);
    const stops = trip.itinerary.flatMap((d) => d.stops);
    expect(stops[0].kind).toBe("hotel");
    expect(stops.every((s) => !!s.place)).toBe(true);
    expect(stops.some((s) => s.kind === "restaurant" && /^Dinner · /.test(s.note))).toBe(true);
    expect(stops.filter((s) => s.kind === "attraction").every((s) => /^\d{2}:\d{2}$/.test(s.startTime ?? ""))).toBe(true);
  });

  await test.step("a press in the chat closes the card; the map's trip tray shows the new trip", async () => {
    await question.click();
    await expect(detail).toHaveCount(0);
    await expect.poll(() => opacity(question)).toBe(1);
    await expect(page.getByTestId("trip-tray")).toContainText(/\d days? in Rome/);
    await expect(page.getByTestId("trip-tray")).toContainText("Dates flexible");
  });

  await test.step("the back's Photo returns to the picture; a thumbs-down sends the other card to the end", async () => {
    await rome.hover();
    await expect(rome).toHaveAttribute("data-face", "profile", { timeout: 5_000 });
    await turned(rome);
    await rome.getByRole("button", { name: "Show the photo of Rome" }).click();
    await expect(rome).toHaveAttribute("data-face", "photo");
    await expect(credit).toBeVisible();
    await kyoto.getByRole("button", { name: "Miss: Kyoto" }).click();
    await page.getByRole("dialog", { name: "Why is Kyoto a miss?" }).getByRole("button", { name: "Too far" }).click();
    const wrappers = page.getByTestId("card-row").first().locator("[data-flip-key]");
    await expect(wrappers.last()).toContainText("Kyoto");
    await expect(wrappers.last()).toHaveAttribute("data-verdict", "down");
  });

  await test.step("on a phone the itinerary turns over on tap and a row opens the map sheet with the place", async () => {
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
      await card.getByRole("tab", { name: "Stays" }).tap();
      const row = card.getByTestId("destination-reco-row").first();
      await expect(row).toBeVisible({ timeout: 40_000 });
      await row.getByRole("button").tap();
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
test("a city trip request answers with that city's curated card, opened in full next to the chat", async ({ page }) => {
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

  // Clicking the photo opens it in full, like the Itinerary control.
  await rome.getByRole("button", { name: "Open Rome, Italy" }).click();
  const detail = page.getByTestId("card-detail");
  await expect(detail.getByRole("heading", { name: "Rome", level: 2 })).toBeVisible();
  await expect(detail.getByTestId("itinerary-plan")).toContainText("Day 1", { timeout: 40_000 });

  // The next question comes back to the chat; its answer's cards give the map back.
  await sendChat(page, "Find hotels in Rome for me");
  await expect(page.getByRole("button", { name: "Good pick: Hotel Artemide" })).toBeVisible({ timeout: 40_000 });
  await expect(detail).toHaveCount(0);
  await expect(page.getByTestId("map-header")).toBeVisible();
});
