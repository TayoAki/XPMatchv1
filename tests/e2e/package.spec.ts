import { expect, test } from "@playwright/test";
import { sendChat, signup, uniqueEmail } from "./helpers";

test("package: one personalized card with variants, swaps, locks, narrowing and a trip", async ({ page }) => {
  await test.step("a destination opens with a package built from the catalog", async () => {
    await signup(page, {
      email: uniqueEmail("pack"),
      interests: ["Museums & art", "History & architecture"],
      stayTypes: ["Boutique hotel"],
      cuisines: ["Italian"],
      nextDestination: "Rome, Italy",
    });
    await sendChat(page, "Build me a package for Rome");
    const card = page.getByTestId("package-card");
    await expect(card).toBeVisible({ timeout: 40_000 });
    await expect(card.getByTestId("package-variant")).toHaveCount(3, { timeout: 40_000 });
    await expect(card.locator('[data-testid="package-item"][data-kind="hotel"]')).toHaveCount(1);
    await expect(card.locator('[data-testid="package-item"][data-kind="attraction"]')).toHaveCount(3);
    await expect(card.locator('[data-testid="package-item"][data-kind="restaurant"]')).toHaveCount(3);
    await expect(card.getByTestId("match-badge").first()).toBeVisible();
    await expect(page.getByText(/Your package is above/)).toBeVisible({ timeout: 30_000 });
  });

  await test.step("swap one place for a ready alternate", async () => {
    const card = page.getByTestId("package-card");
    const things = card.locator('[data-testid="package-item"][data-kind="attraction"]');
    const before = await things.first().getAttribute("data-name");
    await things.first().getByRole("button", { name: /^Swap / }).click();
    const alternates = card.getByTestId("package-alternates");
    await expect(alternates).toBeVisible();
    await alternates.getByRole("button", { name: /^Pick / }).first().click();
    await expect(card.locator(`[data-testid="package-item"][data-name="${before}"]`)).toHaveCount(0, { timeout: 20_000 });
    await expect(card.getByTestId("package-alternates")).toHaveCount(0);
    // The fixture city has exactly three restaurants, so a restaurant slot has nothing to swap to and says so.
    const eats = card.locator('[data-testid="package-item"][data-kind="restaurant"]');
    await eats.first().getByRole("button", { name: /^Swap / }).click();
    await expect(card.getByTestId("package-alternates")).toContainText(/No other eat/);
    await card.getByRole("button", { name: "Close alternatives" }).click();
  });

  await test.step("a locked stay survives switching variants", async () => {
    const card = page.getByTestId("package-card");
    const stay = card.locator('[data-testid="package-item"][data-kind="hotel"]').first();
    const stayName = await stay.getAttribute("data-name");
    await stay.getByRole("button", { name: /^Lock / }).click();
    await expect(stay.getByRole("button", { name: /^Unlock / })).toBeVisible();
    await card.getByTestId("package-variant").nth(1).click();
    await expect(card.getByTestId("package-variant").nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(card.locator('[data-testid="package-item"][data-kind="hotel"]').first()).toHaveAttribute("data-name", stayName ?? "", { timeout: 20_000 });
  });

  await test.step("narrowing to a relaxed pace rebuilds with fewer things to do", async () => {
    const card = page.getByTestId("package-card");
    await card.getByTestId("package-narrow").getByRole("button", { name: "Relaxed", exact: true }).click();
    await expect(card.locator('[data-testid="package-item"][data-kind="attraction"]')).toHaveCount(2, { timeout: 20_000 });
  });

  await test.step("the package pins its places on the map", async () => {
    await expect(page.getByTestId("map-panel")).toBeVisible();
    const card = page.getByTestId("package-card");
    await card.locator('[data-testid="package-item"][data-kind="hotel"]').first().getByRole("button", { name: /^Show .* on the map$/ }).click();
    await expect(page.getByTestId("place-sheet")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("place-sheet").getByRole("button", { name: "Close", exact: true }).click();
  });

  await test.step("Make itinerary saves the package as a trip with its days, in one click", async () => {
    const card = page.getByTestId("package-card");
    const names = await card.getByTestId("package-item").locator("h4").evaluateAll((els) => els.map((el) => el.getAttribute("title") ?? ""));
    await card.getByRole("button", { name: /^Make .+ itinerary$/ }).click();
    const open = card.getByRole("link", { name: /^Open .+ itinerary$/ });
    await expect(open).toBeVisible({ timeout: 30_000 });
    const tripId = (await open.getAttribute("href"))?.split("/trips/")[1] ?? "";
    const trip = (await (await page.request.get(`/api/trips/${tripId}`)).json()) as { itinerary: { stops: { place?: { name: string } }[] }[] };
    const planned = trip.itinerary.flatMap((d) => d.stops.map((s) => s.place?.name ?? ""));
    // Exactly the package's places: the stay, the things to do and the places to eat it holds.
    expect(new Set(planned)).toEqual(new Set(names));
    await expect(page.getByTestId("trip-proposal")).toHaveCount(0);
  });
});
