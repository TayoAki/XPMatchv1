import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const PASSWORD = "travel-2026-secret";

let counter = 0;
export function uniqueEmail(tag: string): string {
  counter += 1;
  return `${tag}+${Date.now()}${counter}@example.com`;
}

/** What to answer in the six-step onboarding wizard; everything is optional. */
export interface OnboardingAnswers {
  homeCity?: string;
  homeAirport?: string;
  styles?: string[];
  interests?: string[];
  stayTypes?: string[];
  mustHaves?: string[];
  accommodation?: string;
  cuisines?: string[];
  dietaryTags?: string[];
  dietary?: string;
  nextDestination?: string;
  nextWhen?: string;
  dealbreakers?: string[];
  notes?: string;
  /** Runs on the last step, before Save preferences. */
  beforeSave?: (page: Page) => Promise<void>;
}

/** Walks the "Let's personalize your assistant" wizard (about you → style → stays → food → logistics → dealbreakers). */
export async function completeOnboarding(page: Page, answers: OnboardingAnswers = {}) {
  const dialog = page.getByRole("dialog", { name: /personalize/i });
  await dialog.waitFor({ timeout: 30_000 });
  const next = async () => {
    // exact: the progress bar's "Step 5: Logistics & next trip" also contains "next".
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
  };
  const chips = async (testId: string, labels: string[] | undefined) => {
    for (const label of labels ?? []) await dialog.getByTestId(testId).getByRole("button", { name: label, exact: true }).click();
  };
  await dialog.getByPlaceholder("Austell, GA").fill(answers.homeCity ?? "Austell, GA");
  if (answers.homeAirport) await dialog.getByPlaceholder("ATL").fill(answers.homeAirport);
  await next();
  await chips("style-chips", answers.styles);
  await chips("interest-chips", answers.interests);
  await next();
  await chips("stay-type-chips", answers.stayTypes);
  await chips("must-have-chips", answers.mustHaves);
  if (answers.accommodation) await dialog.getByPlaceholder(/Boutique hotels/).fill(answers.accommodation);
  await next();
  await chips("cuisine-chips", answers.cuisines);
  await chips("dietary-chips", answers.dietaryTags);
  if (answers.dietary) await dialog.getByPlaceholder(/Vegetarian, no shellfish/).fill(answers.dietary);
  await next();
  if (answers.nextDestination) await dialog.getByPlaceholder("Rome, Italy").fill(answers.nextDestination);
  if (answers.nextWhen) await dialog.getByPlaceholder("October").fill(answers.nextWhen);
  await next();
  await chips("dealbreaker-chips", answers.dealbreakers);
  if (answers.notes) await dialog.getByPlaceholder(/rooftop bars/).fill(answers.notes);
  if (answers.beforeSave) await answers.beforeSave(page);
  await dialog.getByRole("button", { name: "Save preferences" }).click();
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
  // Signing up lands on Discover; the hero is the sign the shell is up and the wizard is gone.
  await page.getByRole("heading", { name: /Go somewhere that stays with you/ }).waitFor({ timeout: 15_000 });
  // The wizard closes before its keepalive save lands. Leaving the page right away can let the next
  // page hydrate from the old profile and reopen the wizard, so wait until the save is on the server.
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
