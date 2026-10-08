import { expect, test } from "@playwright/test";
import { eventually, PASSWORD, uniqueEmail } from "./helpers";

/**
 * The onboarding's voice interview end to end: the server mints a single-use Gemini Live token,
 * the browser streams Chromium's fake microphone to the stand-in Live server (mock-gemini.mjs),
 * and the scripted interview's tool calls fill in the question screens as it goes.
 */
test.use({
  launchOptions: {
    ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
  },
  permissions: ["microphone"],
});

const GEMINI = `http://localhost:${process.env.GEMINI_PORT || 4549}`;

interface GeminiLog {
  tokens: { name: string; used: boolean; body: unknown }[];
  sessions: { token: string; texts: string[]; audioChunks: number; toolResponses: { name: string; scheduling?: string; response: Record<string, unknown> }[] }[];
}

test("voice interview: Gemini Live asks the questions and the answers fill the screens", async ({ page }) => {
  // A first name no other spec uses, to find this interview in the stand-in's log.
  const firstName = `Vox${Date.now().toString(36).slice(-5)}`;
  await page.goto("/signup");
  await page.getByPlaceholder("Tayo Akigbogun").fill(`${firstName} Trader`);
  await page.getByPlaceholder("you@example.com").fill(uniqueEmail("voice"));
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  const flow = page.getByRole("dialog", { name: "Set up your travel assistant" });
  await flow.waitFor({ timeout: 60_000 });
  const next = () => flow.getByRole("button", { name: "Next", exact: true }).click();

  await test.step("the setup screens: a home city from the suggestions, a voice and a tone, a trip, a place", async () => {
    await flow.getByRole("combobox", { name: "Where do you live?" }).fill("Atl");
    await flow.getByRole("option", { name: "Atlanta, GA, USA" }).click();
    await next();
    await flow.getByRole("radio", { name: /^Puck/ }).click();
    await flow.getByRole("radio", { name: /^Professional/ }).click();
    await next();
    await flow.getByRole("radio", { name: "Yes", exact: true }).click();
    await flow.getByRole("button", { name: /^Where/ }).click();
    await flow.getByRole("combobox", { name: "Where to?" }).fill("Tok");
    await flow.getByRole("option", { name: "Tokyo, Japan" }).click();
    await next();
    const been = flow.getByTestId("places-been");
    await been.getByRole("button", { name: "Add place" }).click();
    await been.getByRole("combobox").fill("Lis");
    await flow.getByRole("option", { name: "Lisbon, Portugal" }).click();
    await next();
  });

  await test.step("the interview fills every section, then ends itself", async () => {
    const usage = page.waitForRequest((r) => r.url().endsWith("/api/voice/usage") && r.method() === "POST", { timeout: 90_000 });
    await flow.getByTestId("start-voice-interview").click();
    await expect(flow).toHaveAttribute("data-step", "style");
    const bar = flow.getByTestId("voice-bar");
    await expect(bar).toBeVisible();
    // The last section is on screen when the assistant says goodbye and closes the session.
    await expect(flow).toHaveAttribute("data-step", "wrap", { timeout: 60_000 });
    await expect(bar).toHaveAttribute("data-status", "ended", { timeout: 30_000 });
    await expect(bar).toContainText("Interview finished");
    const fun = flow.getByTestId("question-interests");
    await expect(fun.getByRole("button", { name: "Outdoors", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(fun.getByRole("button", { name: "Live music", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(flow.getByTestId("question-notes").getByRole("textbox")).toHaveValue("Allergic to cats.");
    const reported = JSON.parse((await usage).postData() ?? "{}") as { seconds?: number; modelSeconds?: number };
    expect(reported.seconds).toBeGreaterThanOrEqual(0);
    expect(reported.modelSeconds).toBeGreaterThanOrEqual(0);

    // Back through the sections: what was said is picked, in the quiz's words.
    await flow.getByRole("button", { name: "Back" }).click();
    await expect(flow.getByTestId("question-dietaryTags").getByRole("button", { name: "Vegetarian", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(flow.getByTestId("question-cuisines").getByRole("button", { name: "Local street food", exact: true })).toHaveAttribute("aria-pressed", "true");
    await flow.getByRole("button", { name: "Back" }).click();
    // "Airbnb" is a short-term rental.
    await expect(flow.getByTestId("question-stayTypes").getByRole("button", { name: "Short-term rentals", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(flow.getByTestId("question-loyaltyPrograms").getByRole("button", { name: "Hilton Honors", exact: true })).toHaveAttribute("aria-pressed", "true");
    await flow.getByRole("button", { name: "Back" }).click();
    // "My wife" means Couple; "spa days" is kept in the traveler's own words.
    await expect(flow.getByTestId("question-companions").getByRole("radio", { name: "Couple" })).toHaveAttribute("aria-checked", "true");
    await expect(flow.getByTestId("question-budgetTier").getByRole("radio", { name: /Upscale$/ })).toHaveAttribute("aria-checked", "true");
    await expect(flow.getByTestId("question-splurges").getByRole("button", { name: "Spa days", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  await test.step("the session was locked to this traveler and every tool call was answered", async () => {
    const log = (await (await page.request.get(`${GEMINI}/__log`)).json()) as GeminiLog;
    const token = log.tokens.find((t) => JSON.stringify(t.body).includes(firstName));
    expect(token, "a token was minted for this traveler").toBeTruthy();
    expect(token!.used).toBe(true);
    const locked = JSON.stringify(token!.body);
    expect(locked).toContain("gemini-3.8-live");
    expect(locked).toContain("Puck");
    expect(locked).toContain("Atlanta, GA, USA");
    expect(locked).toContain("Lisbon, Portugal");
    expect(locked).toContain("Tokyo, Japan");
    expect(locked).toContain("record_answers");
    const session = log.sessions.find((s) => s.token === token!.name);
    expect(session).toBeTruthy();
    expect(session!.texts).toEqual(["Hi! I'm ready."]);
    // The fake microphone was streamed.
    expect(session!.audioChunks).toBeGreaterThan(0);
    expect(session!.toolResponses.map((r) => r.name)).toEqual([
      "show_section",
      "record_answers",
      "show_section",
      "record_answers",
      "show_section",
      "record_answers",
      "show_section",
      "record_answers",
      "finish_interview",
    ]);
    // The model carries on talking once each result is in (SILENT would leave the traveler in silence).
    expect(session!.toolResponses.every((r) => r.scheduling === "WHEN_IDLE")).toBe(true);
    expect(session!.toolResponses[1].response).toMatchObject({ saved: { companions: "Couple", budget: "Upscale", splurges: ["Restaurants", "Spa days"] } });
  });

  await test.step("Finish saves the profile, the trip in mind and the voice", async () => {
    for (let i = 0; i < 3; i++) await next();
    await flow.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(flow).toHaveCount(0);
    const state = await eventually(
      () => page.request.get("/api/me/state").then((r) => r.json() as Promise<{ profile: Record<string, unknown> }>),
      (s) => s.profile.onboarded === true,
      60,
    );
    expect(state.profile).toMatchObject({
      name: `${firstName} Trader`,
      homeCity: "Atlanta, GA, USA",
      voice: "Puck",
      personality: "professional",
      companions: "partner",
      budgetTier: "premium",
      splurges: ["Restaurants", "Spa days"],
      stayTypes: ["Boutique hotels", "Short-term rentals"],
      loyaltyPrograms: ["Hilton Honors"],
      cuisines: ["Local street food", "Coffee shops"],
      dietaryTags: ["Vegetarian"],
      interests: ["Outdoors", "Live music"],
      notes: "Allergic to cats.",
      placesBeen: ["Lisbon, Portugal"],
      tripInMind: "yes",
      nextDestination: "Tokyo, Japan",
    });
  });
});
