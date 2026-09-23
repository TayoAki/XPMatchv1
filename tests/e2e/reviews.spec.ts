import { expect, test, type Page } from "@playwright/test";
import { goToChat, sendChat, signup, uniqueEmail } from "./helpers";

/** Where the stand-in's Rome hotels are, for check-ins on the spot. */
const HOTELS: Record<string, { latitude: number; longitude: number }> = {
  "Hotel Artemide": { latitude: 41.9007, longitude: 12.4921 },
  "Hotel de Russie": { latitude: 41.9103, longitude: 12.4776 },
  "Hotel Hassler Roma": { latitude: 41.9061, longitude: 12.4833 },
};

/** Two travelers who like the same things: the second sees the first as "travels like you". */
const PROFILE = { interests: ["Museums & art", "History & architecture"], cuisines: ["Italian"] };

/** Asks for Rome, opens its plan in the workspace and returns the stay's name and row. */
async function openRomePlan(page: Page) {
  await goToChat(page);
  await sendChat(page, "Plan me a trip to Rome");
  const card = page.getByTestId("destination-card").first();
  await expect(card.getByTestId("itinerary-summary")).toContainText(/\d-day itinerary · stay at /, { timeout: 40_000 });
  await card.getByRole("button", { name: "Itinerary for Rome" }).click();
  const stay = page.getByTestId("card-detail").getByTestId("itinerary-stay").getByTestId("itinerary-stop");
  await expect(stay).toHaveCount(1, { timeout: 40_000 });
  const name = ((await stay.getByRole("button", { name: /^Details for / }).getAttribute("aria-label")) ?? "").replace(/^Details for /, "");
  return { card, stay, name, id: (await stay.getAttribute("data-place-id")) ?? "" };
}

test("traveler reviews: check in on the spot, review, and the next traveler sees it verified; Not a fit swaps the stay", async ({ page, browser, baseURL }) => {
  test.setTimeout(240_000);
  await signup(page, { email: uniqueEmail("rev-a"), ...PROFILE });
  const a = await openRomePlan(page);
  const spot = HOTELS[a.name];
  expect(spot, `the stay is one of the stand-in hotels (got ${a.name})`).toBeTruthy();
  // A place picked in the plan opens in the chat's column, beside the plan.
  const sheet = page.getByTestId("side-place").getByTestId("place-sheet");
  const text = `Quiet room over the courtyard, a rooftop breakfast and ten minutes on foot to the Forum. ${Date.now()}`;
  let privateId = "";

  await test.step("the stay's details: no traveler reviews yet, Leave the first review opens the form", async () => {
    await a.stay.getByRole("button", { name: `Details for ${a.name}` }).click();
    await expect(sheet.getByRole("heading", { name: a.name })).toBeVisible({ timeout: 20_000 });
    await expect(sheet.getByTestId("reviews-teaser")).toContainText("No traveler reviews yet.");
    await sheet.getByRole("button", { name: "Leave the first review" }).click();
    await expect(sheet.getByTestId("review-form")).toBeVisible();
    await expect(sheet.getByTestId("google-reviews")).toBeVisible();
  });

  await test.step("a check-in from across town is refused with the distance; on the spot it stands", async () => {
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: spot.latitude - 0.0105, longitude: spot.longitude, accuracy: 20 });
    const checkIn = sheet.getByTestId("check-in");
    await checkIn.getByRole("button", { name: "I'm here: check in" }).click();
    await expect(checkIn.getByRole("status")).toContainText(new RegExp(`You're about 1\\.\\d km from ${a.name}\\. Check in when you're there\\.`));
    await page.context().setGeolocation({ latitude: spot.latitude + 0.0003, longitude: spot.longitude, accuracy: 20 });
    await checkIn.getByRole("button", { name: "I'm here: check in" }).click();
    await expect(checkIn).toContainText("You checked in at ");
    await expect(checkIn.getByTestId("proof-badge")).toContainText("Checked in");
    await expect(checkIn.getByRole("status")).toHaveCount(0);
  });

  await test.step("the review posts with the proof and counts as the traveler's reaction", async () => {
    const form = sheet.getByTestId("review-form");
    await form.getByRole("button", { name: "Post review" }).click();
    await expect(form.getByRole("alert")).toContainText("Pick how it was first.");
    await form.getByRole("button", { name: "Loved it" }).click();
    await form.getByRole("textbox").fill(text);
    await expect(form.getByRole("checkbox", { name: /Share with other travelers/ })).toBeChecked();
    await form.getByRole("button", { name: "Post review" }).click();
    await expect(form).toHaveCount(0);
    const mine = sheet.getByTestId("traveler-review");
    await expect(mine).toHaveCount(1);
    await expect(mine).toContainText("You");
    await expect(mine).toContainText("Loved it");
    await expect(mine).toContainText(text);
    await expect(mine.getByTestId("proof-badge")).toContainText("Checked in");
    const feedback = (await (await page.request.get("/api/me/feedback")).json()) as { feedback: { placeId: string; verdict: string; source?: string }[] };
    expect(feedback.feedback.find((f) => f.placeId === a.id)?.verdict).toBe("loved");
  });

  await test.step("a review kept to oneself stays private", async () => {
    const other = Object.keys(HOTELS).find((n) => n !== a.name)!;
    privateId = { "Hotel Artemide": "hotel-artemide", "Hotel de Russie": "hotel-de-russie", "Hotel Hassler Roma": "hotel-hassler" }[other]!;
    const res = await page.request.post(`/api/places/${privateId}/reviews`, {
      headers: { Origin: baseURL! },
      data: { name: other, kind: "hotel", destination: "Rome", verdict: "fine", text: "Only for me: the lift was slow.", shared: false },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { mine: { shared: boolean } | null };
    expect(body.mine?.shared).toBe(false);
    // Reviews are for real places, and check-ins for places on the map.
    expect((await page.request.post("/api/places/name:somewhere/reviews", { headers: { Origin: baseURL! }, data: {} })).status()).toBe(400);
    const unknown = await page.request.post("/api/places/not-a-place-we-know/checkin", { headers: { Origin: baseURL! }, data: { lat: 41.9, lng: 12.49, accuracy: 10 } });
    expect(unknown.status()).toBe(404);
    // A reading too rough to tell one street from the next proves nothing.
    const rough = await page.request.post(`/api/places/${a.id}/checkin`, { headers: { Origin: baseURL! }, data: { lat: spot.latitude, lng: spot.longitude, accuracy: 900 } });
    expect(rough.status()).toBe(422);
  });

  // A second traveler who likes the same things.
  const second = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const pageB = await second.newPage();
  try {
    await signup(pageB, { email: uniqueEmail("rev-b"), name: "Ada Lovelace", ...PROFILE });
    const b = await openRomePlan(pageB);
    expect(b.name).toBe(a.name);
    const sheetB = pageB.getByTestId("side-place").getByTestId("place-sheet");

    await test.step("the next traveler sees the review verified, from someone who travels like them", async () => {
      await b.stay.getByRole("button", { name: `Details for ${b.name}` }).click();
      const teaser = sheetB.getByTestId("reviews-teaser");
      await expect(teaser).toContainText("1 traveler review · 1 verified", { timeout: 20_000 });
      await expect(teaser).toContainText("Loved by 1 verified traveler like you");
      await teaser.getByRole("button", { name: "Read reviews" }).click();
      const review = sheetB.getByTestId("traveler-review");
      await expect(review).toHaveCount(1);
      await expect(review).toContainText("Tayo A.");
      await expect(review).toContainText(text);
      await expect(review.getByTestId("proof-badge")).toContainText("Checked in");
      await expect(review.getByTestId("similar-badge")).toContainText("Travels like you");
      await expect(review.getByRole("button", { name: "Edit" })).toHaveCount(0);
      // Their own proof is still to come.
      await expect(sheetB.getByTestId("check-in").getByRole("button", { name: "I'm here: check in" })).toBeVisible();
      // The first traveler's private review is nowhere for them.
      const hidden = (await (await pageB.request.get(`/api/places/${privateId}/reviews`)).json()) as { reviews: unknown[] };
      expect(hidden.reviews).toHaveLength(0);
    });

    await test.step("Not a fit on the stay swaps it for the next best one on the spot", async () => {
      await sheetB.getByRole("button", { name: `Not a fit: ${b.name}` }).click();
      await pageB.getByRole("dialog", { name: `Why isn't ${b.name} a fit?` }).getByRole("button", { name: "Too pricey" }).click();
      // The place left the plan, so its details close and the plan shows the new stay.
      await expect(sheetB).toHaveCount(0);
      await expect(b.stay).not.toHaveAttribute("data-place-id", b.id);
      await expect(b.stay).not.toContainText(b.name);
      const next = ((await b.stay.getByRole("button", { name: /^Details for / }).getAttribute("aria-label")) ?? "").replace(/^Details for /, "");
      await expect(pageB.getByTestId("card-detail").getByTestId("itinerary-summary")).toContainText(`stay at ${next}`);
      await expect(b.card.getByTestId("itinerary-summary")).toContainText(`stay at ${next}`);
    });
  } finally {
    await second.close();
  }
});
