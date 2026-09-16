import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { PASSWORD } from "./helpers";

/**
 * Transcript persistence: this spec runs its own app instance so it can restart
 * the server (which empties the in-memory runner) and reopen the chat.
 */
const PORT = Number(process.env.RESTORE_PORT || 3210);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT, ".data", "e2e-restore");

let app: ChildProcess | null = null;

async function startApp(keepData: boolean) {
  app = spawn("node", [path.join(ROOT, "tests", "e2e", "start-app.mjs")], {
    cwd: ROOT,
    env: {
      ...process.env,
      APP_PORT: String(PORT),
      START_MOCKS: "0",
      PGLITE_DIR: DATA_DIR,
      KEEP_DATA: keepData ? "1" : "0",
      // In dev mode a second Next instance needs its own build directory; `next start` shares the built one.
      ...(process.env.E2E_PRODUCTION === "1" ? {} : { NEXT_DIST_DIR: ".next-restore" }),
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 150; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("app did not become healthy");
}

async function stopApp() {
  if (!app) return;
  const child = app;
  app = null;
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(resolve, 5000);
  });
  for (let i = 0; i < 20; i++) {
    try {
      await fetch(`${BASE}/api/health`);
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      return;
    }
  }
}

test.describe("chat transcripts survive a server restart", () => {
  test.setTimeout(600_000);
  test.beforeAll(async () => startApp(false));
  test.afterAll(async () => stopApp());

  test("cards and pins come back after the runtime memory is emptied", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    const email = `tayo+restore${Date.now()}@example.com`;

    await page.goto(`${BASE}/signup`);
    await page.getByPlaceholder("Tayo Akigbogun").fill("Tayo Akigbogun");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByRole("dialog", { name: /personalize/i }).waitFor({ timeout: 60_000 });
    await page.getByPlaceholder("Austell, GA").fill("Austell, GA");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByRole("heading", { name: /Where to today, Tayo\?/ })).toBeVisible({ timeout: 30_000 });

    const input = page.getByPlaceholder("Ask XPMatch");
    await input.fill("Find hotels in Rome");
    await page.locator('[data-testid="copilot-send-button"]:not([disabled])').waitFor({ timeout: 60_000 });
    await input.press("Enter");
    await expect(page.getByText("Where to stay in Rome")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Done — those are on the cards above/)).toBeVisible({ timeout: 30_000 });

    await page.getByRole("navigation").getByRole("button", { name: "Expand chats" }).click();
    const link = page.getByTestId("chat-nav-list").getByRole("link", { name: /Find hotels in Rome|Exploring Rome/ });
    await expect(link).toBeVisible();
    const threadId = new URL((await link.getAttribute("href")) ?? "", BASE).searchParams.get("thread");
    expect(threadId).toBeTruthy();

    await expect
      .poll(async () => ((await (await page.request.get(`${BASE}/api/chats/${encodeURIComponent(threadId!)}/messages`)).json()) as { count: number }).count, { timeout: 20_000 })
      .toBeGreaterThanOrEqual(3);

    await stopApp();
    await startApp(true);

    await page.goto(`${BASE}/?thread=${encodeURIComponent(threadId!)}`);
    await expect(page.getByText("Where to stay in Rome")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText("Hotel de Russie").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("map-panel").getByText("2 pinned")).toBeVisible({ timeout: 60_000 });

    await input.fill("I want to visit Rome");
    await page.locator('[data-testid="copilot-send-button"]:not([disabled])').waitFor({ timeout: 60_000 });
    await input.press("Enter");
    await expect(page.getByText(/Rome it is!/)).toBeVisible({ timeout: 60_000 });
    await expect
      .poll(async () => ((await (await page.request.get(`${BASE}/api/chats/${encodeURIComponent(threadId!)}/messages`)).json()) as { count: number }).count, { timeout: 20_000 })
      .toBeGreaterThanOrEqual(6);
    await context.close();
  });
});
