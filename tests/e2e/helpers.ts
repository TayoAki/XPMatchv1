import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { CUISINES, DIETARY_TAGS, INTERESTS, STAY_TYPES, offered } from "../../src/lib/profile/options";
import { DEALBREAKER_OPTIONS } from "../../src/lib/types";

export const PASSWORD = "travel-2026-secret";

let counter = 0;
export function uniqueEmail(tag: string): string {
  counter += 1;
  return `${tag}+${Date.now()}${counter}@example.com`;
}

/**
 * What to answer in onboarding; everything is optional. Quiz answers use the labels on screen.
 * Labels the quiz no longer offers (answers from the earlier quiz, such as "Museums & art" or
 * "Italian") and the fields only "Update my assistant" asks are saved through the API afterwards,
 * so specs can still set up any profile.
 */
export interface OnboardingAnswers {
  firstName?: string;
  lastName?: string;
  homeCity?: string;
  /** Picks this suggestion after typing the home city. */
  homeCitySuggestion?: string;
  voice?: string;
  personality?: "Casual" | "Neutral" | "Professional";
  /** "Do you have a trip in mind now?" */
  trip?: "no" | { notes?: string; where?: string; whereSuggestion?: string; travelers?: number };
  placesBeen?: string[];
  placesWant?: string[];
  /** "Who do you usually travel with?" (Solo, Couple, Family, Friends). */
  companions?: string;
  /** "What best describes your typical travel budget?" (On a budget, Sensibly priced, Upscale, Luxury). */
  budget?: string;
  splurges?: string[];
  stayTypes?: string[];
  loyalty?: string[];
  cuisines?: string[];
  dietaryTags?: string[];
  interests?: string[];
  notes?: string;
  /** Only in "Update my assistant": set through the API after onboarding. */
  homeAirport?: string;
  styles?: string[];
  mustHaves?: string[];
  accommodation?: string;
  dietary?: string;
  nextDestination?: string;
  nextWhen?: string;
  dealbreakers?: string[];
  /** Runs on the last screen, before Finish. */
  beforeFinish?: (page: Page) => Promise<void>;
}

const offeredIn = (options: Parameters<typeof offered>[0], labels: string[] | undefined) => (labels ?? []).filter((l) => offered(options).includes(l));
const notOfferedIn = (options: Parameters<typeof offered>[0], labels: string[] | undefined) => (labels ?? []).filter((l) => !offered(options).includes(l));

/**
 * Walks the full-screen onboarding the typed way: the basics, voice and personality, a trip in mind,
 * places, "Skip interview", then the four question screens and Finish.
 */
export async function completeOnboarding(page: Page, answers: OnboardingAnswers = {}) {
  const flow = page.getByRole("dialog", { name: "Set up your travel assistant" });
  await flow.waitFor({ timeout: 30_000 });
  const next = () => flow.getByRole("button", { name: "Next", exact: true }).click();
  const step = (key: string) => expect(flow).toHaveAttribute("data-step", key);

  // The basics. The name comes from sign-up; a home city is always given so picks have a start.
  await step("basics");
  const first = flow.getByLabel("First name", { exact: true });
  if (answers.firstName !== undefined) await first.fill(answers.firstName);
  else if (!(await first.inputValue())) await first.fill("Tayo");
  if (answers.lastName !== undefined) await flow.getByLabel("Last name", { exact: true }).fill(answers.lastName);
  const home = flow.getByRole("combobox", { name: "Where do you live?" });
  await home.fill(answers.homeCity ?? "Austell, GA");
  if (answers.homeCitySuggestion) await flow.getByRole("option", { name: answers.homeCitySuggestion }).click();
  else await home.blur();
  await next();

  await step("voice");
  if (answers.voice) await flow.getByRole("radio", { name: new RegExp(`^${answers.voice}`) }).click();
  if (answers.personality) await flow.getByRole("radio", { name: new RegExp(`^${answers.personality}`) }).click();
  await next();

  await step("trip");
  if (answers.trip === "no") await flow.getByRole("radio", { name: "No", exact: true }).click();
  else if (answers.trip) {
    await flow.getByRole("radio", { name: "Yes", exact: true }).click();
    if (answers.trip.notes) await flow.getByLabel("Tell me about the trip").fill(answers.trip.notes);
    if (answers.trip.where) {
      await flow.getByRole("button", { name: /^Where/ }).click();
      await flow.getByRole("combobox", { name: "Where to?" }).fill(answers.trip.where);
      if (answers.trip.whereSuggestion) await flow.getByRole("option", { name: answers.trip.whereSuggestion }).click();
      else await flow.getByRole("combobox", { name: "Where to?" }).press("Enter");
    }
    if (answers.trip.travelers) {
      await flow.getByRole("button", { name: /^Who/ }).click();
      for (let i = 0; i < answers.trip.travelers; i++) await flow.getByRole("button", { name: "More people" }).click();
    }
  }
  await next();

  await step("places");
  for (const [testId, places] of [["places-been", answers.placesBeen], ["places-want", answers.placesWant]] as const) {
    for (const place of places ?? []) {
      const list = flow.getByTestId(testId);
      await list.getByRole("button", { name: /^(Add place|Add more)$/ }).click();
      const input = list.getByRole("combobox");
      await input.fill(place);
      await input.press("Enter");
      await expect(list.getByRole("button", { name: `Remove ${place.split(",")[0]}` })).toBeVisible();
    }
  }
  await next();

  // The interview screen: the typed questions instead of the voice interview.
  await step("interview");
  const skip = flow.getByRole("button", { name: "Skip interview" });
  if (await skip.isVisible()) await skip.click();
  else await next();

  const pick = async (field: string, labels: string[]) => {
    const section = flow.getByTestId(`question-${field}`);
    for (const label of labels) await section.getByRole("button", { name: label, exact: true }).click();
  };
  const choose = async (field: string, label: string | undefined) => {
    if (label) await flow.getByTestId(`question-${field}`).getByRole("radio", { name: new RegExp(`${label.replace(/[$]/g, "\\$")}$`) }).click();
  };

  await step("style");
  await choose("companions", answers.companions);
  await choose("budgetTier", answers.budget);
  await pick("splurges", answers.splurges ?? []);
  await next();
  await step("stays");
  await pick("stayTypes", offeredIn(STAY_TYPES, answers.stayTypes));
  await pick("loyaltyPrograms", answers.loyalty ?? []);
  await next();
  await step("food");
  await pick("cuisines", offeredIn(CUISINES, answers.cuisines));
  await pick("dietaryTags", offeredIn(DIETARY_TAGS, answers.dietaryTags));
  await next();
  await step("wrap");
  await pick("interests", offeredIn(INTERESTS, answers.interests));
  if (answers.notes) await flow.getByTestId("question-notes").getByRole("textbox").fill(answers.notes);
  if (answers.beforeFinish) await answers.beforeFinish(page);
  await flow.getByRole("button", { name: "Finish", exact: true }).click();
  await flow.waitFor({ state: "detached" });

  // Everything the quiz does not ask, saved the way "Update my assistant" would.
  const extra: Record<string, unknown> = {
    ...(answers.homeAirport ? { homeAirport: answers.homeAirport } : {}),
    ...(answers.styles ? { travelStyles: answers.styles } : {}),
    ...(answers.mustHaves ? { stayMustHaves: answers.mustHaves } : {}),
    ...(answers.accommodation ? { accommodation: answers.accommodation } : {}),
    ...(answers.dietary ? { dietary: answers.dietary } : {}),
    ...(answers.nextDestination ? { nextDestination: answers.nextDestination } : {}),
    ...(answers.nextWhen ? { nextWhen: answers.nextWhen } : {}),
  };
  const earlier = {
    interests: notOfferedIn(INTERESTS, answers.interests),
    stayTypes: notOfferedIn(STAY_TYPES, answers.stayTypes),
    cuisines: notOfferedIn(CUISINES, answers.cuisines),
    dietaryTags: notOfferedIn(DIETARY_TAGS, answers.dietaryTags),
  };
  const dealbreakers = answers.dealbreakers ?? [];
  if (!Object.keys(extra).length && !Object.values(earlier).some((l) => l.length) && !dealbreakers.length) return;
  // The Finish save is a keepalive request; this write must land after it.
  const state = await eventually(
    () => page.request.get("/api/me/state").then((r) => r.json() as Promise<{ profile: Record<string, unknown> & { onboarded: boolean } }>),
    (s) => s.profile.onboarded === true,
    60,
  );
  const merged = { ...state.profile, ...extra } as Record<string, unknown>;
  for (const [field, labels] of Object.entries(earlier)) merged[field] = [...((state.profile[field] as string[]) ?? []), ...labels];
  const origin = new URL(page.url()).origin;
  const saved = await page.request.put("/api/me/profile", { data: merged, headers: { Origin: origin } });
  expect(saved.ok(), await saved.text()).toBe(true);
  for (const statement of dealbreakers) {
    const domain = DEALBREAKER_OPTIONS.find((o) => o.statement === statement)?.domain ?? "general";
    const res = await page.request.post("/api/me/preferences", { data: { statement, domain, polarity: "dealbreaker", source: "onboarding", tripId: null }, headers: { Origin: origin } });
    expect(res.ok(), await res.text()).toBe(true);
  }
  // The page loaded the profile before these writes.
  await page.reload();
}

/** Signs a new traveler up through the UI and completes onboarding with a home city. */
export async function signup(page: Page, options: OnboardingAnswers & { name?: string; email: string } = { email: "" }) {
  const name = options.name ?? "Tayo Akigbogun";
  await page.goto("/signup");
  await page.getByPlaceholder("Tayo Akigbogun").fill(name);
  await page.getByPlaceholder("you@example.com").fill(options.email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await completeOnboarding(page, options);
  // Signing up lands on Discover; the hero is the sign the shell is up and onboarding is gone.
  await page.getByRole("heading", { name: /Go somewhere that stays with you/ }).waitFor({ timeout: 15_000 });
  // Onboarding closes before its keepalive save lands. Leaving the page right away can let the next
  // page hydrate from the old profile and reopen onboarding, so wait until the save is on the server.
  await eventually(
    () => page.request.get("/api/me/state").then((r) => r.json() as Promise<{ profile: { onboarded: boolean } }>),
    (state) => state.profile.onboarded === true,
    60,
  );
}

/** Opens the concierge page unless it is already the page on screen (a chat, a thread or a trip-scoped chat). */
export async function goToChat(page: Page) {
  let pathname = "";
  try {
    pathname = new URL(page.url()).pathname;
  } catch {
    // about:blank
  }
  if (pathname !== "/chat") await page.goto("/chat");
}

/** Creates an account through the API (a second traveler for sharing scenarios). */
export async function signupApi(request: APIRequestContext, input: { name: string; email: string }, origin: string) {
  const res = await request.post("/api/auth/signup", { data: { ...input, password: PASSWORD }, headers: { Origin: origin } });
  expect(res.status(), await res.text()).toBe(201);
}

/** Creates an account through the API unless it already exists (a fixed email such as the admin's). */
export async function ensureAccount(request: APIRequestContext, input: { name: string; email: string }, origin: string) {
  const res = await request.post("/api/auth/signup", { data: { ...input, password: PASSWORD }, headers: { Origin: origin } });
  expect([201, 409]).toContain(res.status());
}

export async function login(page: Page, email: string, options: { finishOnboarding?: boolean } = {}) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (options.finishOnboarding) await completeOnboarding(page);
}

/** Makes sure the conversation list under Chats in the side rail is showing (it is by default; a browser may have collapsed it). */
export async function openChatHistory(page: Page) {
  const list = page.getByTestId("chat-nav-list");
  if (await list.count()) return;
  await page.getByRole("button", { name: "Expand chats" }).click();
  await list.waitFor();
}

/** Types into the chat (opening the concierge page first when needed) and sends once agent discovery has enabled the composer. */
export async function sendChat(page: Page, text: string) {
  await goToChat(page);
  const input = page.getByPlaceholder("Ask your concierge");
  await input.fill(text);
  await page.locator('[data-testid="copilot-send-button"]:not([disabled])').waitFor({ timeout: 30_000 });
  await input.press("Enter");
}

/** Polls an API until the predicate holds (writes from the UI are optimistic and asynchronous). */
export async function eventually<T>(fn: () => Promise<T>, predicate: (value: T) => boolean, attempts = 30, delayMs = 500): Promise<T> {
  let last: T | undefined;
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`condition not met after ${attempts} attempts: ${JSON.stringify(last).slice(0, 300)}`);
}
