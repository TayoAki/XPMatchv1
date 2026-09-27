import { expect, test, type Page } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

async function createRomeTrip(page: Page): Promise<string> {
  await page.getByRole("banner").getByRole("button", { name: "Create a trip" }).click();
  await page.getByPlaceholder(/Dallas, Lisbon/).fill("Rome");
  await page.getByRole("textbox", { name: "From", exact: true }).fill("2026-10-10");
  await page.getByRole("textbox", { name: "To", exact: true }).fill("2026-10-13");
  await page.getByRole("button", { name: "Create trip", exact: true }).click();
  await page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 20_000 });
  return page.url().match(/trips\/([0-9a-f-]{36})/)![1];
}

test("bookings: details on the Bookings tile and the board, routed travel legs; reservation import is off", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  const headers = { Origin: baseURL! };
  await signup(page, { email: uniqueEmail("book") });
  const tripId = await createRomeTrip(page);

  await test.step("a booking with details (as earlier confirmation imports stored them) shows on the Bookings tile and the map", async () => {
    const resolved = await page.request.post("/api/places/resolve", {
      headers,
      data: { destination: "Rome, Italy", items: [{ key: "h", query: "Hotel Artemide, Rome", kind: "hotel" }] },
    });
    expect(resolved.ok()).toBe(true);
    const place = ((await resolved.json()) as { items: { place: { name: string } | null }[] }).items[0].place;
    expect(place?.name).toBe("Hotel Artemide");
    const added = await page.request.post(`/api/trips/${tripId}/items`, {
      headers,
      data: {
        kind: "booking",
        title: "Hotel Artemide, 3 nights",
        place,
        details: { kind: "hotel", title: "Hotel Artemide, 3 nights", provider: "Hotel Artemide", confirmationCode: "ART-88213", startsAt: "2026-10-10T15:00", endsAt: "2026-10-13T11:00", price: 780, currency: "EUR", travelers: 2 },
      },
    });
    expect(added.status()).toBe(201);
    await page.reload();
    await page.getByRole("button", { name: /^Bookings 1 booking/ }).click();
    const meta = page.getByTestId("booking-meta");
    await expect(meta).toContainText("ART-88213");
    await expect(meta).toContainText("Oct 10, 15:00 – Oct 13, 11:00");
    await expect(meta).toContainText("780 EUR");
    await expect(page.getByText("1 pinned").first()).toBeVisible();
  });

  await test.step("the board shows the booking on its day and routed travel legs per mode", async () => {
    await page.getByRole("button", { name: "Back to overview" }).click();
    await page.getByRole("button", { name: "Add day" }).click();
    const day1 = page.getByRole("region", { name: "Day 1", exact: true });
    await expect(day1.getByTestId("day-reservations")).toContainText("Hotel Artemide");
    await expect(day1.getByTestId("day-reservations")).toContainText("15:00");
    await page.getByLabel("Add a stop to day 1").fill("Colosseum");
    await page.getByRole("button", { name: "Add to day 1" }).click();
    await expect(day1.getByTestId("stop-card")).toHaveCount(1);
    await page.getByLabel("Add a stop to day 1").fill("Pantheon");
    await page.getByRole("button", { name: "Add to day 1" }).click();
    await expect(day1.getByTestId("stop-card")).toHaveCount(2);
    const leg = day1.getByTestId("travel-leg");
    await expect(leg).toContainText("via Google", { timeout: 30_000 });
    await expect(leg).toContainText("walk");
    await page.getByTestId("travel-mode").getByRole("button", { name: "Drive" }).click();
    await expect(leg).toContainText("drive", { timeout: 30_000 });
    await expect(leg).toContainText("via Google");
    await expect(day1.getByRole("link", { name: /Directions/ })).toHaveAttribute("href", /travelmode=driving/);
    await page.getByTestId("travel-mode").getByRole("button", { name: "Walk" }).click();
    await expect(leg).toContainText("walk", { timeout: 30_000 });
  });

  await test.step("reservation import is off: Import reads places only and the endpoint is gone", async () => {
    await page.goto("/create");
    await page.getByRole("button", { name: "Import", exact: true }).click();
    const form = page.getByTestId("import-form");
    await expect(form.getByRole("button", { name: "Find the places" })).toBeVisible();
    await expect(form.getByRole("button", { name: "A reservation" })).toHaveCount(0);
    await expect(form.getByLabel("Confirmation text")).toHaveCount(0);
    const gone = await page.request.post("/api/reservations", { headers, data: { text: "Booking confirmation - Hotel Artemide, ART-88213" } });
    expect(gone.status()).toBe(404);
  });

  await test.step("API: travel legs come from the Routes API", async () => {
    const legs = await page.request.post("/api/routes/legs", { headers, data: { mode: "walk", points: [{ lat: 41.8902, lng: 12.4922 }, { lat: 41.8986, lng: 12.4769 }] } });
    expect(legs.status()).toBe(200);
    const body = (await legs.json()) as { source: string; legs: { minutes: number; km: number; source: string }[] };
    expect(body.source).toBe("routes");
    expect(body.legs).toHaveLength(1);
    expect(body.legs[0].km).toBeGreaterThan(1);
    expect(body.legs[0].minutes).toBeGreaterThan(5);
  });
});
