import { expect, test, type Page } from "@playwright/test";
import { goToChat, sendChat, signup, uniqueEmail } from "./helpers";

/** The two-face destination cards: each a complete itinerary built for the traveler, the city profile, rows on the map, the two actions. */
test("destination cards: an itinerary per city, hover and click flip, quick facts, rows on the map, save, make itinerary", async ({ page }) => {
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

  await test.step("the photo face carries the itinerary, its score and the thumbs, the footer the two actions", async () => {
    await expect(rome).toHaveAttribute("data-face", "photo");
    await expect(credit).toBeVisible({ timeout: 20_000 });
    await expect(rome.getByTestId("itinerary-summary")).toContainText(/\d-day itinerary · stay at /, { timeout: 40_000 });
    await expect(rome.getByTestId("destination-match").getByTestId("match-badge")).toBeVisible({ timeout: 20_000 });
    await expect(rome.getByRole("button", { name: "Miss: Rome" })).toBeVisible();
    await expect(rome.getByRole("button", { name: "Make Rome itinerary" })).toBeEnabled({ timeout: 20_000 });
    await expect(rome.getByRole("button", { name: "Save Rome" })).toBeVisible();
    // The two cards sit side by side in a row.
    const tops = await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  await test.step("a fine pointer reveals the profile on hover and hides it again on leaving", async () => {
    await rome.hover();
    await expect(rome).toHaveAttribute("data-face", "profile", { timeout: 5_000 });
    await expect(rome).toHaveAttribute("data-reveal", "hover");
    await expect(credit).toBeHidden();
    await page.mouse.move(2, 2);
    await expect(rome).toHaveAttribute("data-face", "photo", { timeout: 5_000 });
    await expect(credit).toBeVisible();
  });

  await test.step("Itinerary pins the back open: quick facts, the days with their stops, the city on the map", async () => {
    await rome.getByRole("button", { name: "Itinerary for Rome" }).click();
    await expect(rome).toHaveAttribute("data-face", "profile");
    await expect(rome).toHaveAttribute("data-reveal", "pinned");
    await expect(credit).toBeHidden();
    // Focus moved to the profile's own control, on the face now showing.
    await expect(rome.getByRole("button", { name: "Show the photo of Rome" })).toBeFocused();
    await expect(rome.getByTestId("quick-facts")).toContainText("3–4 nights");
    await expect(rome.getByTestId("quick-facts")).toContainText("Food & antiquity");
    await expect(rome.getByTestId("your-match")).toContainText("%");
    const plan = rome.getByTestId("itinerary-plan");
    await expect(plan).toContainText("Where you'll stay");
    await expect(plan.getByTestId("itinerary-day").first()).toContainText("Day 1");
    await expect(plan.getByTestId("itinerary-day").first().getByTestId("itinerary-stop").first()).toContainText(/\d{2}:\d{2}/);
    await expect(plan.getByTestId("itinerary-stop").filter({ hasText: "Dinner" }).first()).toBeVisible();
    await expect(page.getByTestId("map-header")).toContainText("Explore Rome");
    await page.mouse.move(2, 2);
    // Pinned: leaving does not flip it back.
    await page.waitForTimeout(500);
    await expect(rome).toHaveAttribute("data-face", "profile");
  });

  await test.step("the Stays tab lists this traveler's picks and sets the map filter", async () => {
    await rome.getByRole("tab", { name: "Stays" }).click();
    const rows = rome.getByTestId("destination-reco-row");
    await expect(rows.first()).toBeVisible({ timeout: 40_000 });
    await expect(rows.first()).toHaveAttribute("data-kind", "hotel");
    await expect(page.getByTestId("map-filter-hotel")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("map-header")).toContainText(/recommended place/);
  });

  await test.step("a row shows that exact place on the map, in the place panel with its own actions", async () => {
    const row = rome.getByTestId("destination-reco-row").first();
    const name = (await row.getByRole("button").getAttribute("aria-label"))?.replace(/^Show /, "").replace(/ on map$/, "") ?? "";
    expect(name.length).toBeGreaterThan(2);
    await row.getByRole("button").click();
    const sheet = page.getByTestId("place-sheet");
    await expect(sheet.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });
    await expect(sheet.getByRole("button", { name: "Add to trip" })).toBeVisible();
    await sheet.getByRole("button", { name: "Close", exact: true }).click();
    await expect(sheet).toHaveCount(0);
  });

  await test.step("the map's Dining filter switches the active card's tab", async () => {
    await page.getByTestId("map-filter-restaurant").click();
    await expect(rome.getByRole("tab", { name: "Dining" })).toHaveAttribute("aria-selected", "true");
    await page.getByTestId("map-filter-all").click();
    await expect(rome.getByRole("tab", { name: "Itinerary" })).toHaveAttribute("aria-selected", "true");
  });

  await test.step("Save saves only the city; Make itinerary saves the whole plan as a trip in one click", async () => {
    await rome.getByRole("button", { name: "Save Rome" }).click();
    await expect(rome.getByRole("button", { name: "Remove Rome from saved" })).toHaveAttribute("aria-pressed", "true");
    await rome.getByRole("button", { name: "Make Rome itinerary" }).click();
    const open = rome.getByRole("link", { name: "Open Rome itinerary" });
    await expect(open).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("trip-tray")).toContainText(/\d days? in Rome/);
    await expect(page.getByTestId("trip-tray")).toContainText("Dates flexible");
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

  await test.step("Photo returns to the picture; a thumbs-down sends the other card to the end", async () => {
    await rome.getByRole("button", { name: "Show the photo of Rome" }).click();
    await expect(rome).toHaveAttribute("data-face", "photo");
    await expect(credit).toBeVisible();
    await kyoto.getByRole("button", { name: "Miss: Kyoto" }).click();
    await page.getByRole("dialog", { name: "Why is Kyoto a miss?" }).getByRole("button", { name: "Too far" }).click();
    const wrappers = page.getByTestId("card-row").first().locator("[data-flip-key]");
    await expect(wrappers.last()).toContainText("Kyoto");
    await expect(wrappers.last()).toHaveAttribute("data-verdict", "down");
  });

  await test.step("on a phone the profile opens on tap and a row opens the map sheet with the place", async () => {
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
