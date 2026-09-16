import { defineConfig } from "@playwright/test";

/**
 * End-to-end suite: the app runs against the stand-in model and the Places stub
 * (see tests/e2e/start-app.mjs), so no API keys or network are needed. Set
 * PW_CHROMIUM to a Chromium binary when Playwright's own download is unavailable.
 */
const port = Number(process.env.APP_PORT || 3200);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts/,
  timeout: 150_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    viewport: { width: 2000, height: 1140 },
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: "node tests/e2e/start-app.mjs",
    url: `${baseURL}/api/health`,
    timeout: 300_000,
    reuseExistingServer: process.env.E2E_REUSE === "1",
    env: { APP_PORT: String(port) },
  },
});
