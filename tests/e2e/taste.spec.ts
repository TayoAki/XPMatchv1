import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { eventually, sendChat, signup, uniqueEmail } from "./helpers";

const LOG = path.join(process.cwd(), ".data", `e2e-${process.env.APP_PORT || 3200}`, "model-requests.log");

interface FeedbackJson {
  feedback: { name: string; verdict: string; reasons: string[]; score?: number }[];
  taste: { total: number } | null;
}

const feedbackJson = (page: Page) => page.request.get("/api/me/feedback").then((r) => r.json() as Promise<FeedbackJson>);
const readLog = () => {
  try {
    return readFileSync(LOG, "utf8");
  } catch {
    return "";
  }
};

test("taste: reactions on cards and the sheet, Your taste, model context, chat feedback, post-trip rating", async ({ page }) => {
  test.setTimeout(240_000);
  await signup(page, { email: uniqueEmail("taste") });

  await test.step("rate a hotel from its card", async () => {
    await sendChat(page, "Find hotels in Rome");
    await expect(page.getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
    await page.getByRole("button", { name: "Rate Hotel Artemide" }).click();
    const dialog = page.getByRole("dialog", { name: "Rate Hotel Artemide" });
    await dialog.getByRole("button", { name: "Loved it" }).click();
    await dialog.getByRole("button", { name: "Quiet", exact: true }).click();
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("button", { name: /Your reaction to Hotel Artemide: Loved it/ })).toBeVisible();
    await eventually(
      () => feedbackJson(page),
      (d) => d.feedback.some((f) => f.name === "Hotel Artemide" && f.verdict === "loved" && f.reasons.includes("Quiet")) && d.taste?.total === 1,
    );
  });

  await test.step("Not for me hides the card, Undo brings it back", async () => {
    await page.getByRole("button", { name: "Rate Hotel de Russie" }).click();
    await page.getByRole("dialog", { name: "Rate Hotel de Russie" }).getByRole("button", { name: "Not for me" }).click();
    await expect(page.getByTestId("hidden-place")).toContainText("Hotel de Russie hidden");
    await eventually(
      () => feedbackJson(page),
      (d) => d.feedback.some((f) => f.name === "Hotel de Russie" && f.verdict === "disliked"),
    );
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("button", { name: "Rate Hotel de Russie" })).toBeVisible();
    await eventually(
      () => feedbackJson(page),
      (d) => !d.feedback.some((f) => f.name === "Hotel de Russie"),
    );
  });

  await test.step("Your taste lists the reaction", async () => {
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: /Update my assistant|Personalize/ }).click();
    const panel = page.getByTestId("taste-panel");
    await expect(panel).toContainText("Hotel Artemide");
    await expect(panel).toContainText("Quiet ×1");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  });

  await test.step("the assistant receives the taste profile on the next turn", async () => {
    await sendChat(page, "What are the top things to do in Rome?");
    await eventually(
      async () => readLog(),
      (log) =>
        log
          .split("\n")
          .filter(Boolean)
          .slice(-4)
          .some((line) => (JSON.parse(line) as { contextHas?: { taste?: boolean } }).contextHas?.taste === true),
    );
  });

  await test.step("a reaction said in chat is recorded through record_feedback", async () => {
    await sendChat(page, "The Artemide was too noisy");
    await expect(page.getByTestId("feedback-chip")).toContainText("Noted: Hotel Artemide · Not for me", { timeout: 40_000 });
    await eventually(
      () => feedbackJson(page),
      (d) => d.feedback.some((f) => f.name === "Hotel Artemide" && f.verdict === "disliked" && f.reasons.includes("Noisy")),
    );
  });

  await test.step("rating from the place sheet; two Noisy dislikes become a learned preference", async () => {
    // Scoped to the chat: the map's pin strip offers the same "Open …" mini card.
    await page.locator(".xp-chat").getByRole("button", { name: "Open Hotel de Russie" }).click();
    const sheet = page.getByTestId("place-sheet");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Rate Hotel de Russie" }).click();
    // The rating panel floats from the document root, outside the sheet's box.
    const dialog = page.getByRole("dialog", { name: "Rate Hotel de Russie" });
    await dialog.getByRole("button", { name: "Not for me" }).click();
    await dialog.getByRole("button", { name: "Noisy", exact: true }).click();
    await dialog.getByRole("button", { name: "Done" }).click();
    await eventually(
      () => feedbackJson(page),
      (d) => d.feedback.filter((f) => f.verdict === "disliked" && f.reasons.includes("Noisy")).length === 2,
    );
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: /Update my assistant|Personalize/ }).click();
    const memory = page.getByTestId("memory-panel");
    await expect(memory).toContainText("Avoids noisy stays", { timeout: 15_000 });
    await expect(memory).toContainText("from your feedback");
    await expect(page.getByTestId("taste-panel")).toContainText("Noisy ×2");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  });

  await test.step("a finished trip asks for ratings from Updates and ranks the places", async () => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Create a trip" }).click();
    await page.getByPlaceholder(/Dallas, Lisbon/).fill("Rome");
    await page.getByRole("textbox", { name: "From", exact: true }).fill("2026-09-01");
    await page.getByRole("textbox", { name: "To", exact: true }).fill("2026-09-05");
    await page.getByRole("button", { name: "Create trip", exact: true }).click();
    await page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 20_000 });
    const tripId = page.url().match(/trips\/([0-9a-f-]{36})/)![1];
    await page.getByRole("button", { name: /^Ideas/ }).click();
    for (const name of ["Colosseum", "Pantheon"]) {
      await page.getByLabel("Place to add").fill(name);
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await eventually(
        () => page.request.get(`/api/trips/${tripId}`).then((r) => r.json() as Promise<{ items: { title: string; place?: unknown }[] }>),
        (t) => t.items.some((i) => i.title === name && !!i.place),
      );
    }
    await page.goto("/updates");
    const prompt = page.getByTestId("post-trip-update");
    await expect(prompt).toContainText("How was Rome?");
    await prompt.getByRole("link", { name: "Rate places" }).click();
    const dialog = page.getByRole("dialog", { name: "How was Rome?" });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(dialog).toContainText("Place 1 of 2");
    await dialog.getByRole("button", { name: "Loved it" }).click();
    await dialog.getByRole("button", { name: "Worth it", exact: true }).click();
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog).toContainText("Place 2 of 2");
    await dialog.getByRole("button", { name: "Loved it" }).click();
    await dialog.getByRole("button", { name: "Finish" }).click();
    const pairwise = dialog.getByTestId("pairwise");
    await expect(pairwise).toBeVisible();
    await expect(pairwise).toContainText("Which did you prefer?");
    await pairwise.getByRole("button", { name: "Colosseum", exact: true }).click();
    await expect(pairwise).toBeVisible();
    await pairwise.getByRole("button", { name: "Can't say" }).click();
    const rated = dialog.getByTestId("rated-list");
    await expect(rated).toContainText("Colosseum");
    await expect(rated).toContainText("Pantheon");
    await expect(rated).toContainText(/\d\.\d/);
    await eventually(
      () => feedbackJson(page),
      (d) => d.feedback.filter((f) => ["Colosseum", "Pantheon"].includes(f.name) && typeof f.score === "number").length === 2,
    );
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("post-trip-banner")).toHaveCount(0);
    await page.goto("/updates");
    await expect(page.getByTestId("post-trip-update")).toHaveCount(0);
  });
});
