import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { sendChat, signup, uniqueEmail } from "./helpers";

const EMAIL = `Booking confirmation - Hotel Artemide
Confirmation number: ART-88213
Guest: Tayo Akigbogun (2 guests)
Check-in: 10 October 2026 from 15:00
Check-out: 13 October 2026 until 11:00
Room: Superior double, breakfast included
Address: Via Nazionale 22, 00184 Rome, Italy
Total: EUR 780.00, free cancellation until 3 October 2026

Your flight: Delta DL 1234, Atlanta (ATL) 09 Oct 17:30 → Rome Fiumicino (FCO) 10 Oct 08:45, booking reference DLX9Q2, 2 passengers, USD 1,420.00`;

async function createRomeTrip(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Create a trip" }).click();
  await page.getByPlaceholder(/Dallas, Lisbon/).fill("Rome");
  await page.getByRole("textbox", { name: "From", exact: true }).fill("2026-10-10");
  await page.getByRole("textbox", { name: "To", exact: true }).fill("2026-10-13");
  await page.getByRole("button", { name: "Create trip", exact: true }).click();
  await page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 20_000 });
  return page.url().match(/trips\/([0-9a-f-]{36})/)![1];
}

test("reservations: confirmation text and PDF become bookings on the trip, its Bookings tile and board; chat import; routed travel legs", async ({ page, baseURL }) => {
  test.setTimeout(240_000);
  await signup(page, { email: uniqueEmail("resv") });
  const tripId = await createRomeTrip(page);
  const cards = page.getByTestId("reservation-cards");

  await test.step("Create › Import › A reservation reads a pasted confirmation", async () => {
    await page.goto("/create");
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await page.getByRole("button", { name: "A reservation" }).click();
    await page.getByLabel("Confirmation text").fill(EMAIL);
    await page.getByRole("button", { name: "Find the reservations" }).click();
    await expect(cards).toBeVisible({ timeout: 60_000 });
    await expect(cards.getByTestId("reservation-card")).toHaveCount(2);
    await expect(cards).toContainText("ART-88213");
    await expect(cards).toContainText("Pinned: Hotel Artemide");
    await expect(cards).toContainText("ATL → FCO DL 1234");
    await expect(cards).toContainText("Oct 10, 15:00 – Oct 13, 11:00");
  });

  await test.step("Add to trip stores the hotel under Bookings with its details and pins it", async () => {
    await cards.getByTestId("reservation-card").filter({ hasText: "Hotel Artemide" }).getByRole("button", { name: "Add to trip" }).click();
    const dialog = page.getByRole("dialog", { name: "Add to trip" });
    await expect(dialog).toContainText("ART-88213");
    await dialog.getByRole("radio", { name: /Trip to Rome/ }).click();
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    const done = page.getByRole("dialog", { name: "Added to your trip" });
    await expect(done).toContainText("bookings for", { timeout: 30_000 });
    await done.getByRole("link", { name: "Open trip" }).click();
    await page.waitForURL(/\/trips\//, { timeout: 15_000 });
    await page.getByRole("button", { name: /^Bookings 1 booking/ }).click();
    const meta = page.getByTestId("booking-meta");
    await expect(meta).toContainText("ART-88213");
    await expect(meta).toContainText("Oct 10, 15:00 – Oct 13, 11:00");
    await expect(meta).toContainText("780 EUR");
    await expect(page.getByText("1 pinned").first()).toBeVisible();
    const trip = (await page.request.get(`/api/trips/${tripId}`).then((r) => r.json())) as { items: { kind: string; details?: { confirmationCode?: string }; place?: { name: string } }[] };
    const booking = trip.items.find((i) => i.kind === "booking");
    expect(booking?.details?.confirmationCode).toBe("ART-88213");
    expect(booking?.place?.name).toBe("Hotel Artemide");
  });

  await test.step("the board shows the booking on its day and routed travel legs per mode", async () => {
    await page.getByRole("button", { name: "Back to overview" }).click();
    await page.getByRole("button", { name: "Board", exact: true }).click();
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

  await test.step("a PDF confirmation is read too", async () => {
    await page.goto("/create");
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await page.getByRole("button", { name: "A reservation" }).click();
    await page.getByLabel("Confirmation file").setInputFiles(path.join(process.cwd(), "tests", "e2e", "fixtures", "confirmation.pdf"));
    await page.getByRole("button", { name: "Find the reservations" }).click();
    await expect(cards).toBeVisible({ timeout: 60_000 });
    await expect(cards).toContainText("ART-88213");
  });

  await test.step("a confirmation pasted in chat renders reservation cards", async () => {
    await page.goto("/");
    await sendChat(page, `Here is my booking confirmation: ${EMAIL.split("\n").slice(0, 4).join(" ")}`);
    await expect(page.getByTestId("reservation-cards")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("reservation-cards")).toContainText("ART-88213");
    await expect(page.getByText(/bookings are on the cards above/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("reservation-cards").getByRole("button", { name: "Add to trip" }).first()).toBeVisible();
  });

  await test.step("API guards", async () => {
    const headers = { Origin: baseURL! };
    const short = await page.request.post("/api/reservations", { headers, data: { text: "hi" } });
    expect(short.status()).toBe(422);
    const wrongType = await page.request.post("/api/reservations", { headers, multipart: { file: { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello there, this is not a confirmation") } } });
    expect(wrongType.status()).toBe(415);
    const legs = await page.request.post("/api/routes/legs", { headers, data: { mode: "walk", points: [{ lat: 41.8902, lng: 12.4922 }, { lat: 41.8986, lng: 12.4769 }] } });
    expect(legs.status()).toBe(200);
    const body = (await legs.json()) as { source: string; legs: { minutes: number; km: number; source: string }[] };
    expect(body.source).toBe("routes");
    expect(body.legs).toHaveLength(1);
    expect(body.legs[0].km).toBeGreaterThan(1);
    expect(body.legs[0].minutes).toBeGreaterThan(5);
  });
});
