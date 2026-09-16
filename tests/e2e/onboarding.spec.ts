import { expect, test } from "@playwright/test";
import { completeOnboarding, ensureAccount, eventually, login, sendChat, signup, uniqueEmail } from "./helpers";

// A 1x1 PNG, enough for the screenshot upload to go through the browser-side downscale.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

interface RecRow {
  name: string;
  verdict: string;
  reason?: string;
  context: string;
  factors: string[];
}

test("in-depth onboarding drives home picks with match scores and thumbs; itinerary detail; bug reports reach the admin page", async ({ page, browser, baseURL }) => {
  test.setTimeout(360_000);
  const email = uniqueEmail("deep");
  const stateJson = async () => (await (await page.request.get("/api/me/state")).json()) as { profile: Record<string, unknown>; chats: { destination?: string }[] };
  const recsJson = async () => (await (await page.request.get("/api/me/recs")).json()) as { recFeedback: RecRow[]; quality: { hitRate: number | null } };

  await test.step("the six-step wizard stores the deep profile", async () => {
    await signup(page, {
      email,
      homeAirport: "ATL",
      styles: ["Food & drink", "Culture & history"],
      interests: ["Museums & art", "History & architecture", "Food tours & markets"],
      stayTypes: ["Boutique hotel"],
      mustHaves: ["Pool", "Central location"],
      cuisines: ["Italian"],
      dietaryTags: ["Vegetarian"],
      nextDestination: "Rome, Italy",
      nextWhen: "October",
      dealbreakers: ["Street noise at night"],
      notes: "Rooftop bars over clubs.",
    });
    const state = await eventually(stateJson, (s) => s.profile.nextDestination === "Rome, Italy");
    expect(state.profile.interests).toEqual(["Museums & art", "History & architecture", "Food tours & markets"]);
    expect(state.profile.stayMustHaves).toEqual(["Pool", "Central location"]);
    expect(state.profile.cuisines).toEqual(["Italian"]);
    expect(state.profile.dietaryTags).toEqual(["Vegetarian"]);
    expect(state.profile.homeAirport).toBe("ATL");
  });

  await test.step("home picks: three rows of three for the dreamed-of destination, each with a match score", async () => {
    const picks = page.getByTestId("home-picks");
    await expect(picks).toContainText("Rome", { timeout: 30_000 });
    for (const key of ["things", "stays", "eat"]) {
      const row = page.getByTestId(`home-row-${key}`);
      await expect(row.getByTestId("home-pick")).toHaveCount(3, { timeout: 60_000 });
      await expect(row.getByTestId("match-badge")).toHaveCount(3);
    }
    await expect(page.getByTestId("home-row-things")).toContainText("Because you like Museums & art");
    await expect(page.getByTestId("home-row-stays")).toContainText("Hotel Artemide");
    await page.getByTestId("home-row-stays").getByTestId("match-badge").first().click();
    await expect(page.getByRole("dialog", { name: "Why this score" })).toBeVisible();
    await page.getByRole("dialog", { name: "Why this score" }).getByRole("button", { name: "Close" }).click();
  });

  await test.step("thumbs down with a reason is stored and lowers the score; thumbs up counts as a hit", async () => {
    const stays = page.getByTestId("home-row-stays");
    const first = stays.getByTestId("home-pick").first();
    const name = (await first.getByRole("heading").textContent())?.trim() ?? "";
    const before = Number(await first.getByTestId("match-badge").getAttribute("data-score"));
    await first.getByRole("button", { name: `Miss: ${name}` }).click();
    await page.getByRole("dialog", { name: `Why is ${name} a miss?` }).getByRole("button", { name: "Too pricey" }).click();
    await eventually(recsJson, (r) => r.recFeedback.some((f) => f.name === name && f.verdict === "down" && f.reason === "Too pricey" && f.context === "home"));
    await expect.poll(async () => Number(await first.getByTestId("match-badge").getAttribute("data-score"))).toBeLessThan(before);
    const thing = page.getByTestId("home-row-things").getByTestId("home-pick").first();
    const thingName = (await thing.getByRole("heading").textContent())?.trim() ?? "";
    await thing.getByRole("button", { name: `Good pick: ${thingName}` }).click();
    const recs = await eventually(recsJson, (r) => r.recFeedback.some((f) => f.name === thingName && f.verdict === "up"));
    expect(recs.quality.hitRate).toBe(50);
  });

  await test.step("a trip proposal resolves its stops with photos, ratings and match scores before saving", async () => {
    await sendChat(page, "Plan a trip to Rome for two of us in October");
    const proposal = page.getByTestId("trip-proposal");
    await expect(proposal).toBeVisible({ timeout: 40_000 });
    await expect(proposal.getByTestId("proposal-stop")).toHaveCount(5, { timeout: 40_000 });
    await expect(proposal.getByTestId("proposal-stop").first()).toContainText("4.7", { timeout: 40_000 });
    await expect(proposal.getByTestId("match-badge").first()).toBeVisible();
    await expect(proposal.getByTestId("proposal-stop").first().locator("img")).toBeVisible();
    await proposal.getByRole("button", { name: "Save to my trips" }).click();
    await expect(page.getByText(/Saved — the trip is in your Trips/)).toBeVisible({ timeout: 30_000 });
    await proposal.getByRole("link", { name: /Saved to Trips/ }).click();
    await page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 15_000 });
  });

  await test.step("board stops open the full card; the Itinerary tile shows the same facts", async () => {
    const day1 = page.getByRole("region", { name: "Day 1", exact: true });
    await expect(day1.getByTestId("stop-card")).toHaveCount(3, { timeout: 30_000 });
    await day1.getByRole("button", { name: "Details for Colosseum" }).click();
    const details = day1.getByTestId("stop-details");
    await expect(details).toBeVisible();
    await expect(details).toContainText("Historical landmark");
    await expect(details).toContainText("Today", { timeout: 20_000 });
    await expect(details.getByRole("link", { name: /Google Maps/ })).toBeVisible();
    await expect(details.getByTestId("match-badge")).toBeVisible();
    await expect(details.getByRole("button", { name: "Ask about it" })).toBeVisible();
    await page.getByRole("button", { name: "Tiles", exact: true }).click();
    await page.getByRole("button", { name: /^Itinerary/ }).click();
    await expect(page.getByTestId("itinerary-stop")).toHaveCount(5);
    await expect(page.getByTestId("itinerary-stop").first()).toContainText("4.7");
    await expect(page.getByTestId("itinerary-stop").first().locator("img")).toBeVisible();
  });

  await test.step("Jump back in shows real photos for the trip and the chat's destination", async () => {
    await page.goto("/");
    await sendChat(page, "I want to visit roam");
    await expect(page.getByTestId("map-panel")).toBeVisible({ timeout: 40_000 });
    await eventually(stateJson, (s) => s.chats.some((c) => c.destination === "Rome"));
    await page.goto("/");
    const jump = page.getByTestId("jump-back-in");
    await expect(jump.getByTestId("jump-card").first()).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => jump.locator("img").count()).toBeGreaterThanOrEqual(2);
  });

  await test.step("Update my assistant keeps every answer editable in one place", async () => {
    await page.getByRole("button", { name: "Account menu" }).click();
    // The welcome hero has its own "Update my assistant" button; the sidebar's menu item comes first in the DOM.
    await page.getByRole("button", { name: "Update my assistant" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Update my assistant" });
    await expect(dialog.getByTestId("interest-chips").getByRole("button", { name: "Museums & art", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByTestId("cuisine-chips").getByRole("button", { name: "Italian", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByTestId("taste-panel")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  await test.step("a bug report with a screenshot is sent from the sidebar", async () => {
    await page.getByRole("button", { name: "Report a bug" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Report a bug" });
    await dialog.getByRole("button", { name: /Looks wrong/ }).click();
    await dialog.getByLabel("What happened").fill("The stays row overlaps the map on my laptop.");
    await dialog.getByLabel("What you expected").fill("Three tidy cards.");
    await dialog.getByLabel("Screenshot").setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: PNG });
    await dialog.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByTestId("bug-report-done")).toContainText("Report #", { timeout: 20_000 });
    await page.getByRole("button", { name: "Close", exact: true }).last().click();
    await page.goto("/admin");
    await expect(page.getByText("Admins only")).toBeVisible();
  });

  await test.step("the admin sees the report, its screenshot and the recommendation hit rate", async () => {
    await ensureAccount(page.request, { name: "Ada Admin", email: "admin@example.com" }, baseURL!);
    const context = await browser.newContext({ baseURL });
    const admin = await context.newPage();
    await login(admin, "admin@example.com");
    // A fresh admin account still gets the wizard; a returning one goes straight in.
    if (await admin.getByRole("dialog", { name: /personalize/i }).isVisible({ timeout: 5_000 }).catch(() => false)) await completeOnboarding(admin);
    await admin.goto("/admin");
    const report = admin.getByTestId("bug-report").filter({ hasText: "The stays row overlaps the map" });
    await expect(report).toBeVisible({ timeout: 20_000 });
    await expect(report).toContainText("Looks wrong");
    await expect(report).toContainText(email);
    await report.getByRole("button", { name: "Show screenshot" }).click();
    await expect(report.locator("img")).toBeVisible();
    await report.getByRole("button", { name: "Mark resolved" }).click();
    await expect(admin.getByTestId("bug-report").filter({ hasText: "The stays row overlaps the map" })).toHaveCount(0);
    await admin.getByRole("button", { name: "resolved", exact: true }).click();
    await expect(admin.getByTestId("bug-report").filter({ hasText: "The stays row overlaps the map" })).toContainText("resolved");
    await expect(admin.getByTestId("rec-quality")).toContainText("50%");
    await expect(admin.getByTestId("rec-quality")).toContainText("Too pricey");
    await context.close();
  });
});
