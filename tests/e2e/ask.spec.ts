import { expect, test } from "@playwright/test";
import { sendChat, signup, uniqueEmail } from "./helpers";

test("questions answered from reviews in the sheet and in chat", async ({ page }) => {
  await signup(page, {
    email: uniqueEmail("tayo"),
    dealbreakers: ["Street noise at night"],
  });

  await test.step("hotel cards, then the sheet of one hotel", async () => {
    await sendChat(page, "Find hotels in Rome");
    await expect(page.getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
    // The photo opens the place panel (the cards keep to one action). Scoped to the chat: the map's
    // pin strip offers the same "Open …" mini card.
    await page.locator(".xp-chat").getByRole("button", { name: "Open Hotel de Russie" }).click();
    await expect(page.getByTestId("place-sheet")).toBeVisible();
    await expect(page.getByTestId("place-sheet").getByRole("heading", { name: "Hotel de Russie" })).toBeVisible();
    await expect(page.getByTestId("place-sheet").getByRole("link", { name: /Check rates/ })).toBeVisible();
  });

  await test.step("a suggested question is answered with a verbatim quote that also appears in Reviews", async () => {
    const ask = page.getByTestId("ask-about-place");
    await expect(ask).toBeVisible();
    // The dealbreaker leads the suggestions.
    await ask.getByRole("button", { name: "Is it quiet at night?" }).click();
    const answer = page.getByTestId("place-answer").first();
    await expect(answer).toBeVisible({ timeout: 30_000 });
    await expect(answer.getByText("Clear from the evidence")).toBeVisible();
    await expect(answer.getByText(/Google's review summary/).first()).toBeVisible();
    const quote = answer.getByTestId("evidence-quote").first();
    await expect(quote).toBeVisible();
    const quoted = ((await quote.locator("p").textContent()) ?? "").replace(/[“”]/g, "").trim();
    expect(quoted.length).toBeGreaterThan(20);
    await page.getByTestId("place-sheet").getByRole("button", { name: "Reviews", exact: true }).click();
    await expect(page.getByTestId("place-sheet").getByText(quoted.slice(0, 40)).first()).toBeVisible();
  });

  await test.step("topic chips count mentions and filter the reviews", async () => {
    const chips = page.getByTestId("topic-chips");
    await expect(chips).toBeVisible();
    await chips.getByRole("button", { name: /^Noise/ }).click();
    await expect(page.getByTestId("place-sheet").getByText("Marta L.")).toBeVisible();
    await expect(page.getByTestId("place-sheet").getByText("Sofia R.")).toHaveCount(0);
    await chips.getByRole("button", { name: /^Noise/ }).click();
    await expect(page.getByTestId("place-sheet").getByText("Sofia R.")).toBeVisible();
  });

  await test.step("attribute questions and unanswerable ones are honest", async () => {
    await page.getByTestId("place-sheet").getByRole("button", { name: "Overview", exact: true }).click();
    const ask = page.getByTestId("ask-about-place");
    await ask.getByLabel("Ask about this place").fill("Do they allow dogs?");
    await ask.getByRole("button", { name: "Ask" }).click();
    const dogs = page.getByTestId("place-answer").first();
    await expect(dogs.getByTestId("evidence-attribute").filter({ hasText: "Allows dogs" })).toBeVisible({ timeout: 30_000 });
    await ask.getByLabel("Ask about this place").fill("Is there a pool?");
    await ask.getByRole("button", { name: "Ask" }).click();
    const pool = page.getByTestId("place-answer").first();
    await expect(pool.getByText("Not mentioned")).toBeVisible({ timeout: 30_000 });
    await ask.getByLabel("Ask about this place").fill("What is the owner's phone number of the hotel?");
    await ask.getByRole("button", { name: "Ask" }).click();
    await expect(ask.getByText(/people who work there/)).toBeVisible();
  });

  await test.step("the same answer in chat, linked to the pin", async () => {
    await page.getByTestId("place-sheet").getByRole("button", { name: "Close", exact: true }).click();
    await sendChat(page, "Is Hotel Artemide noisy?");
    const card = page.getByTestId("place-answer-card");
    await expect(card).toBeVisible({ timeout: 40_000 });
    await expect(card.getByTestId("evidence-quote").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Front rooms hear the buses/).first()).toBeVisible({ timeout: 30_000 });
    await card.getByRole("button", { name: "Map" }).click();
    await expect(page.getByTestId("place-sheet").getByRole("heading", { name: "Hotel Artemide" })).toBeVisible();
  });
});
