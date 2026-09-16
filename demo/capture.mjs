// Records a scripted walkthrough of XPMatch against the deterministic end-to-end stack
// (stand-in model, Places stub) and writes public/walkthrough.webm plus timeline.json for
// the Remotion composition. Run from the repository root: `node demo/capture.mjs`.
import { spawn } from "node:child_process";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const APP_PORT = Number(process.env.DEMO_APP_PORT || 3300);
const BASE = `http://localhost:${APP_PORT}`;
const SIZE = { width: 1440, height: 900 };
const captureDir = path.join(here, "capture");
const publicDir = path.join(here, "public");

const CONFIRMATION = `Booking confirmation - Hotel Artemide
Confirmation number: ART-88213
Guest: Tayo Akigbogun (2 guests)
Check-in: 10 October 2026 from 15:00
Check-out: 13 October 2026 until 11:00
Room: Superior double, breakfast included
Address: Via Nazionale 22, 00184 Rome, Italy
Total: EUR 780.00, free cancellation until 3 October 2026`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForApp(timeoutMs = 240_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(1000);
  }
  throw new Error("app did not start");
}

function startStack() {
  const dataDir = path.join(root, ".data", `demo-${APP_PORT}`);
  rmSync(dataDir, { recursive: true, force: true });
  const child = spawn("node", [path.join(root, "tests", "e2e", "start-app.mjs")], {
    cwd: root,
    env: {
      ...process.env,
      APP_PORT: String(APP_PORT),
      MODEL_PORT: String(APP_PORT + 1345),
      PLACES_PORT: String(APP_PORT + 1346),
      SITE_PORT: String(APP_PORT + 1347),
      PGLITE_DIR: dataDir,
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  return child;
}

async function main() {
  rmSync(captureDir, { recursive: true, force: true });
  mkdirSync(captureDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });
  const stack = startStack();
  const stop = () => {
    try {
      stack.kill("SIGTERM");
    } catch {
      // already gone
    }
  };
  process.on("exit", stop);
  try {
    await waitForApp();
    // Warm the routes the walkthrough visits so dev-mode compiles do not show up as stalls.
    for (const p of ["/", "/signup", "/create", "/trips", "/explore"]) await fetch(`${BASE}${p}`).catch(() => undefined);

    const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium" });
    const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, recordVideo: { dir: captureDir, size: SIZE } });
    const page = await context.newPage();
    const t0 = Date.now();
    const marks = [];
    const mark = (key) => marks.push({ key, at: Math.round(((Date.now() - t0) / 1000) * 10) / 10 });
    const cursor = async (locator) => {
      const box = await locator.boundingBox();
      if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    };
    const click = async (locator, pauseMs = 700) => {
      await cursor(locator);
      await locator.click();
      await sleep(pauseMs);
    };
    const type = async (locator, text, pauseMs = 500) => {
      await cursor(locator);
      await locator.click();
      await locator.pressSequentially(text, { delay: 35 });
      await sleep(pauseMs);
    };
    const chips = async (testId, labels) => {
      for (const label of labels) await click(page.getByTestId(testId).getByRole("button", { name: label, exact: true }), 450);
    };
    const email = `demo+${Date.now()}@example.com`;

    // 1. Sign up
    await page.goto(`${BASE}/signup`);
    mark("signup");
    await sleep(900);
    await type(page.getByPlaceholder("Tayo Akigbogun"), "Tayo Akigbogun");
    await type(page.getByPlaceholder("you@example.com"), email);
    await type(page.locator('input[type="password"]'), "travel-2026-secret", 300);
    await click(page.getByRole("button", { name: "Create account" }), 500);

    // 2. Onboarding wizard
    const dialog = page.getByRole("dialog", { name: /personalize/i });
    await dialog.waitFor({ timeout: 60_000 });
    mark("onboarding");
    await sleep(1200);
    await type(dialog.getByPlaceholder("Austell, GA"), "Austell, GA", 300);
    await type(dialog.getByPlaceholder("ATL"), "ATL", 300);
    const next = async () => click(dialog.getByRole("button", { name: "Next", exact: true }), 900);
    await next();
    mark("interests");
    await chips("style-chips", ["Food & drink", "Culture & history"]);
    await chips("interest-chips", ["Museums & art", "Food tours & markets", "Local neighborhoods"]);
    await next();
    mark("stays");
    await chips("stay-type-chips", ["Boutique hotel"]);
    await chips("must-have-chips", ["Pool", "Central location"]);
    await next();
    mark("food");
    await chips("cuisine-chips", ["Italian", "Cafés & bakeries"]);
    await chips("dietary-chips", ["Vegetarian"]);
    await click(dialog.getByRole("button", { name: /Try anything/ }), 500);
    await next();
    mark("logistics");
    await click(dialog.getByRole("button", { name: /Night owl/ }), 400);
    await click(dialog.getByRole("button", { name: /Love long walks/ }), 400);
    await type(dialog.getByPlaceholder("Rome, Italy"), "Rome, Italy", 300);
    await type(dialog.getByPlaceholder("October"), "October", 300);
    await next();
    mark("dealbreakers");
    await chips("dealbreaker-chips", ["Street noise at night", "Early starts"]);
    await click(dialog.getByRole("button", { name: "Save preferences" }), 800);

    // 3. Home picks
    await page.getByRole("heading", { name: /Where to today/ }).waitFor({ timeout: 30_000 });
    mark("home");
    const stays = page.getByTestId("home-row-stays");
    await stays.getByTestId("home-pick").nth(2).waitFor({ timeout: 60_000 });
    await sleep(1500);
    for (const key of ["things", "stays", "eat"]) {
      const row = page.getByTestId(`home-row-${key}`);
      await row.scrollIntoViewIfNeeded();
      await cursor(row.getByTestId("home-pick").first());
      await sleep(900);
    }
    mark("score");
    const firstStay = stays.getByTestId("home-pick").first();
    await firstStay.scrollIntoViewIfNeeded();
    await click(firstStay.getByTestId("match-badge"), 2600);
    await click(page.getByRole("dialog", { name: "Why this score" }).getByRole("button", { name: "Close" }), 400);
    const thingName = ((await page.getByTestId("home-row-things").getByTestId("home-pick").first().getByRole("heading").textContent()) ?? "").trim();
    await click(page.getByTestId("home-row-things").getByTestId("home-pick").first().getByRole("button", { name: `Good pick: ${thingName}` }), 1200);

    // 4. Chat: a trip proposal
    mark("chat");
    const input = page.getByPlaceholder("Ask XPMatch");
    await type(input, "Plan a trip to Rome for two of us in October", 300);
    await page.locator('[data-testid="copilot-send-button"]:not([disabled])').waitFor({ timeout: 30_000 });
    await input.press("Enter");
    const proposal = page.getByTestId("trip-proposal");
    await proposal.waitFor({ timeout: 60_000 });
    mark("proposal");
    await proposal.getByTestId("proposal-stop").first().locator("img").waitFor({ timeout: 60_000 });
    await sleep(600);
    await proposal.scrollIntoViewIfNeeded();
    for (let i = 0; i < 3; i++) {
      await cursor(proposal.getByTestId("proposal-stop").nth(i));
      await sleep(700);
    }
    await click(proposal.getByRole("button", { name: "Save to my trips" }), 1200);
    await proposal.getByRole("link", { name: /Saved to Trips/ }).waitFor({ timeout: 30_000 });
    await click(proposal.getByRole("link", { name: /Saved to Trips/ }), 400);

    // 5. The board
    await page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 30_000 });
    mark("board");
    const day1 = page.getByRole("region", { name: "Day 1", exact: true });
    await day1.getByTestId("stop-card").nth(2).waitFor({ timeout: 60_000 });
    await day1.getByTestId("travel-leg").first().waitFor({ timeout: 30_000 });
    await sleep(1500);
    await click(page.getByTestId("travel-mode").getByRole("button", { name: "Drive" }), 1600);
    await click(page.getByTestId("travel-mode").getByRole("button", { name: "Walk" }), 900);
    mark("details");
    await click(day1.getByRole("button", { name: "Details for Colosseum" }), 600);
    await day1.getByTestId("stop-details").waitFor({ timeout: 30_000 });
    await day1.getByTestId("stop-details").scrollIntoViewIfNeeded();
    await sleep(3200);
    await click(day1.getByRole("button", { name: "Details for Colosseum" }), 500);

    // 6. A confirmation becomes a booking
    await page.goto(`${BASE}/create`);
    mark("reservation");
    await click(page.getByRole("button", { name: "Import", exact: true }), 600);
    await click(page.getByRole("button", { name: "A reservation" }), 500);
    const textArea = page.getByLabel("Confirmation text");
    await cursor(textArea);
    await textArea.fill(CONFIRMATION);
    await sleep(900);
    await click(page.getByRole("button", { name: "Find the reservations" }), 300);
    const cards = page.getByTestId("reservation-cards");
    await cards.waitFor({ timeout: 60_000 });
    await sleep(1800);
    await click(cards.getByTestId("reservation-card").filter({ hasText: "Hotel Artemide" }).getByRole("button", { name: "Add to trip" }), 900);
    const picker = page.getByRole("dialog", { name: "Add to trip" });
    await click(picker.getByRole("radio", { name: /Long weekend in Rome/ }), 500);
    await click(picker.getByRole("button", { name: "Add", exact: true }), 300);
    const done = page.getByRole("dialog", { name: "Added to your trip" });
    await done.waitFor({ timeout: 30_000 });
    await sleep(1200);
    await click(done.getByRole("link", { name: "Open trip" }), 400);
    await page.waitForURL(/\/trips\//, { timeout: 15_000 });
    mark("bookings");
    await page.getByRole("button", { name: "Tiles", exact: true }).click();
    await click(page.getByRole("button", { name: /^Bookings 1 booking/ }), 300);
    await page.getByTestId("booking-meta").waitFor({ timeout: 30_000 });
    await sleep(2600);
    await click(page.getByRole("button", { name: "Back to overview" }), 300);
    await click(page.getByRole("button", { name: "Board", exact: true }), 300);
    await page.getByTestId("day-reservations").first().waitFor({ timeout: 30_000 });
    await page.getByTestId("day-reservations").first().scrollIntoViewIfNeeded();
    await sleep(2200);

    // 7. Report a bug
    mark("bug");
    await click(page.getByRole("button", { name: "Report a bug" }).first(), 700);
    const bug = page.getByRole("dialog", { name: "Report a bug" });
    await click(bug.getByRole("button", { name: /Looks wrong/ }), 300);
    await type(bug.getByLabel("What happened"), "The stays row overlaps the map on my laptop.", 400);
    await click(bug.getByRole("button", { name: "Send report" }), 300);
    await page.getByTestId("bug-report-done").waitFor({ timeout: 30_000 });
    await sleep(2200);

    const duration = Math.round(((Date.now() - t0) / 1000) * 10) / 10;
    const video = page.video();
    await context.close();
    await browser.close();
    const recorded = await video.path();
    const target = path.join(publicDir, "walkthrough.webm");
    rmSync(target, { force: true });
    renameSync(recorded, target);
    writeFileSync(path.join(here, "timeline.json"), JSON.stringify({ duration, width: SIZE.width, height: SIZE.height, marks }, null, 2) + "\n");
    console.log(`recorded ${duration}s → ${target}`);
    console.log(marks.map((m) => `${m.at.toFixed(1).padStart(6)}s  ${m.key}`).join("\n"));
  } finally {
    stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
