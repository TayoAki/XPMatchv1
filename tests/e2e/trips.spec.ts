import { expect, test } from "@playwright/test";
import { login, signup, signupApi, uniqueEmail } from "./helpers";

test("trips: create, members, ideas, itinerary, trip chat, sharing", async ({ page, browser, request, baseURL }) => {
  const email = uniqueEmail("tayo");
  const friend = uniqueEmail("sam");
  await signupApi(request, { name: "Sam Rivera", email: friend }, baseURL!);
  await signup(page, { email });
  let tripUrl = "";

  await test.step("planner -> Create trip lands on the trip page", async () => {
    await page.getByRole("banner").getByRole("button", { name: "Create a trip" }).click();
    await page.getByPlaceholder(/Dallas, Lisbon/).fill("Rome");
    await page.getByRole("textbox", { name: "From", exact: true }).fill("2026-10-10");
    await page.getByRole("textbox", { name: "To", exact: true }).fill("2026-10-13");
    await page.getByRole("button", { name: "Create trip", exact: true }).click();
    await page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 20_000 });
    tripUrl = page.url();
    await expect(page.getByRole("heading", { name: "Trip to Rome" })).toBeVisible();
    await expect(page.getByText("Oct 10 – Oct 13").first()).toBeVisible();
  });

  await test.step("members: add a friend by email", async () => {
    await page.getByRole("button", { name: "Invite friends" }).click();
    await page.getByPlaceholder("friend@example.com").fill(friend);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(/Added sam\+/)).toBeVisible();
    await expect(page.getByText("Sam Rivera")).toBeVisible();
    await expect(page.getByRole("button", { name: "2 members" })).toBeVisible();
  });

  await test.step("ideas: add the Colosseum, resolved through Places", async () => {
    await page.getByRole("button", { name: "Back to overview" }).click();
    await page.getByRole("button", { name: /^Ideas/ }).click();
    await page.getByLabel("Place to add").fill("Colosseum");
    await page.getByLabel("Note", { exact: true }).fill("Book the underground tour");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Book the underground tour")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText("1 pinned").first()).toBeVisible();
  });

  await test.step("trip preferences save", async () => {
    await page.getByRole("button", { name: "Back to overview" }).click();
    await page.getByRole("button", { name: /^Trip preferences/ }).click();
    await page.getByLabel("Trip preferences").fill("Slow mornings, vegetarian dinners, one big sight per day.");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByRole("main").getByText("Saved", { exact: true })).toBeVisible();
  });

  await test.step("itinerary: write and save a day", async () => {
    await page.getByRole("button", { name: "Back to overview" }).click();
    await page.getByRole("button", { name: /^Itinerary/ }).click();
    await page.getByRole("button", { name: "Write it myself" }).click();
    await page.getByLabel("Day 1 title").fill("Ancient Rome");
    await page.getByLabel("Day 1 stops").fill("Colosseum at opening\nRoman Forum\nTrattoria lunch in Monti");
    await page.getByRole("button", { name: "Save itinerary" }).click();
    // The board on the left and the Itinerary section on the right both show the day now.
    await expect(page.getByText("Ancient Rome").first()).toBeVisible();
    await expect(page.getByText("Roman Forum").first()).toBeVisible();
    await page.getByRole("button", { name: "Back to overview" }).click();
    await expect(page.getByRole("button", { name: /^Itinerary 1 day planned/ })).toBeVisible();
  });

  await test.step("asking from the trip page opens a trip-scoped chat with cards and the map", async () => {
    await page.getByLabel("Ask about this trip").fill("Find hotels in Rome");
    await page.getByLabel("Ask about this trip").press("Enter");
    await page.waitForURL(/\/chat\?/, { timeout: 15_000 });
    await expect(page.getByText(/Planning Trip to Rome/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
    await expect(page.getByTestId("map-panel")).toBeVisible();
  });

  await test.step("Add to trip from a hotel card preselects the trip", async () => {
    await page.getByRole("button", { name: "Add to trip" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add to trip" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("radio", { checked: true })).toContainText("Trip to Rome");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    const done = page.getByRole("dialog", { name: "Added to your trip" });
    await expect(done).toBeVisible();
    await done.getByRole("link", { name: "Open trip" }).click();
    await page.waitForURL(/\/trips\//, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Trip to Rome" })).toBeVisible();
    // The side rail lists the chat too; the trip page has its own recent-chats row.
    await expect(page.getByTestId("trip-recent-chats").getByRole("link", { name: /Find hotels in Rome/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Ideas 2 places/ })).toBeVisible();
    await expect(page.getByText("2 pinned").first()).toBeVisible();
  });

  await test.step("the trips list shows the card and the calendar", async () => {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My trips", exact: true }).click();
    await expect(page.getByRole("link", { name: /Trip to Rome/ })).toBeVisible();
    await page.getByRole("button", { name: "calendar" }).click();
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(page.getByRole("link", { name: "Trip to Rome" }).first()).toBeVisible();
  });

  const friendContext = await browser.newContext();
  const friendPage = await friendContext.newPage();

  await test.step("the friend sees the invite under Updates and opens the shared trip", async () => {
    await login(friendPage, friend, { finishOnboarding: true });
    await friendPage.getByRole("banner").getByRole("link", { name: /^Updates/ }).click();
    await expect(friendPage.getByText(/Tayo Akigbogun added you to the trip "Trip to Rome"/)).toBeVisible();
    await expect(friendPage.getByText(/added an idea to "Trip to Rome": Colosseum/)).toBeVisible();
    await friendPage.getByRole("link", { name: "Open trip" }).first().click();
    await expect(friendPage.getByRole("heading", { name: "Trip to Rome" })).toBeVisible();
    await friendPage.getByRole("button", { name: /^Ideas 2 places/ }).click();
    await expect(friendPage.getByText("Book the underground tour")).toBeVisible();
    await expect(friendPage.getByText(/Added by Tayo Akigbogun/).first()).toBeVisible();
  });

  await test.step("the friend leaves the trip", async () => {
    await friendPage.getByRole("button", { name: "Back to overview" }).click();
    await friendPage.getByRole("button", { name: /^Members/ }).click();
    friendPage.once("dialog", (d) => d.accept());
    await friendPage.getByRole("button", { name: "Leave trip" }).click();
    await friendPage.waitForURL(/\/trips$/, { timeout: 15_000 });
    await friendContext.close();
  });

  await test.step("the owner sees one member again after a reload", async () => {
    await page.goto(tripUrl);
    await expect(page.getByRole("button", { name: "Invite friends" })).toBeVisible({ timeout: 20_000 });
  });
});
