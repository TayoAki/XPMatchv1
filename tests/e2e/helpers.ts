import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const PASSWORD = "travel-2026-secret";

let counter = 0;
export function uniqueEmail(tag: string): string {
  counter += 1;
  return `${tag}+${Date.now()}${counter}@example.com`;
}

/** Signs a new traveler up through the UI and completes onboarding with a home city. */
export async function signup(
  page: Page,
  options: { name?: string; email: string; homeCity?: string; homeAirport?: string; beforeSave?: (page: Page) => Promise<void> } = { email: "" },
) {
  const name = options.name ?? "Tayo Akigbogun";
  await page.goto("/signup");
  await page.getByPlaceholder("Tayo Akigbogun").fill(name);
  await page.getByPlaceholder("you@example.com").fill(options.email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("dialog", { name: /personalize/i }).waitFor({ timeout: 30_000 });
  await page.getByPlaceholder("Austell, GA").fill(options.homeCity ?? "Austell, GA");
  if (options.homeAirport) await page.getByPlaceholder("ATL").fill(options.homeAirport);
  if (options.beforeSave) await options.beforeSave(page);
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.getByRole("heading", { name: new RegExp(`Where to today, ${name.split(" ")[0]}\\?`) }).waitFor({ timeout: 15_000 });
}

/** Creates an account through the API (a second traveler for sharing scenarios). */
export async function signupApi(request: APIRequestContext, input: { name: string; email: string }, origin: string) {
  const res = await request.post("/api/auth/signup", { data: { ...input, password: PASSWORD }, headers: { Origin: origin } });
  expect(res.status(), await res.text()).toBe(201);
}

export async function login(page: Page, email: string, options: { finishOnboarding?: boolean } = {}) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (options.finishOnboarding) {
    await page.getByRole("dialog", { name: /personalize/i }).waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: "Save preferences" }).click();
  }
}

/** Types into the chat and sends once agent discovery has enabled the composer. */
export async function sendChat(page: Page, text: string) {
  const input = page.getByPlaceholder("Ask XPMatch");
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
