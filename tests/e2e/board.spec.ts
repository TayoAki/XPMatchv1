import { expect, test, type Page } from "@playwright/test";
import { eventually, signup, uniqueEmail } from "./helpers";

interface TripJson {
  itinerary: { day: number; title: string; stops: { id: string; title: string; place?: { name: string } }[] }[];
  items: { id: string; title: string; kind: string; place?: { name: string } }[];
}

async function createRomeTrip(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Create a trip" }).click();
  await page.getByPlaceholder(/Dallas, Lisbon/).fill("Rome");
  await page.getByRole("textbox", { name: "From", exact: true }).fill("2026-10-10");
  await page.getByRole("textbox", { name: "To", exact: true }).fill("2026-10-13");
  await page.getByRole("button", { name: "Create trip", exact: true }).click();
  await page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 20_000 });
  return page.url().match(/trips\/([0-9a-f-]{36})/)![1];
}

const getTrip = (page: Page, id: string) => page.request.get(`/api/trips/${id}`).then((r) => r.json() as Promise<TripJson>);

async function addIdea(page: Page, tripId: string, name: string) {
  await page.getByLabel("Place to add").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await eventually(
    () => getTrip(page, tripId),
    (t) => t.items.some((i) => i.title === name && !!i.place),
  );
}

test("board: schedule ideas, keyboard reorder, day layers, chat scheduling", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  await signup(page, { email: uniqueEmail("board") });
  const tripId = await createRomeTrip(page);
  const board = page.getByTestId("trip-board");
  const day = (n: number) => page.getByRole("region", { name: `Day ${n}`, exact: true });
  const pinList = page.getByTestId("trip-map").getByTestId("map-pin-list");

  await test.step("two ideas resolved through Places", async () => {
    await page.getByRole("button", { name: /^Ideas/ }).click();
    await addIdea(page, tripId, "Colosseum");
    await addIdea(page, tripId, "Pantheon");
    await page.getByRole("button", { name: "Back to overview" }).click();
  });

  await test.step("the board is the workspace, with both ideas unscheduled; the map comes over the tiles", async () => {
    await expect(board).toBeVisible();
    await page.getByRole("button", { name: /^Map/ }).click();
    await expect(page.getByTestId("trip-map")).toBeVisible();
    const tray = board.getByTestId("ideas-tray");
    await expect(tray).toContainText("2 not scheduled");
    await expect(tray).toContainText("Colosseum");
    await expect(tray).toContainText("Pantheon");
  });

  await test.step("Add to day puts an idea on Day 1 with a numbered pin in the day's color", async () => {
    await page.getByRole("button", { name: "Add day" }).click();
    await expect(day(1)).toBeVisible();
    await page.getByLabel("Add Colosseum to a day").selectOption("0");
    await expect(day(1).getByTestId("stop-card")).toHaveCount(1);
    await expect(day(1)).toContainText("Colosseum");
    await expect(board.getByTestId("ideas-tray")).toContainText("1 not scheduled");
    await expect(pinList).toContainText("1. Colosseum · Day 1");
    await eventually(
      () => getTrip(page, tripId),
      (t) => t.itinerary[0]?.stops[0]?.place?.name === "Colosseum",
    );
  });

  await test.step("clicking the stop card shows it on the map without opening its sheet", async () => {
    await day(1).getByTestId("stop-card").first().getByText("4.7").click();
    await expect(pinList.locator('[data-selected="true"]')).toContainText("Colosseum");
    await expect(page.getByTestId("place-sheet")).toHaveCount(0);
  });

  await test.step("a second stop shows an estimated travel leg", async () => {
    await page.getByLabel("Add Pantheon to a day").selectOption("0");
    await expect(day(1).getByTestId("stop-card")).toHaveCount(2);
    await expect(day(1).getByTestId("travel-leg")).toContainText(/min (walk|drive) · .* · est\./);
    await expect(pinList).toContainText("2. Pantheon · Day 1");
    await expect(board.getByTestId("ideas-tray")).toContainText("all scheduled");
  });

  await test.step("keyboard reorder (space, arrow, space) persists", async () => {
    // dnd-kit measures the lists after the drag starts and updates the target after each arrow, so pace the keys like a person would.
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.getByRole("button", { name: "Drag Pantheon" }).focus();
      await page.keyboard.press("Space");
      await page.waitForTimeout(250);
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(250);
      await page.keyboard.press("Space");
      const first = await day(1).getByTestId("stop-card").first().textContent();
      if (first?.includes("Pantheon")) break;
      await page.waitForTimeout(500);
    }
    await expect(day(1).getByTestId("stop-card").first()).toContainText("Pantheon");
    await eventually(
      () => getTrip(page, tripId),
      (t) => t.itinerary[0]?.stops.map((s) => s.title).join(",") === "Pantheon,Colosseum",
    );
    await page.reload();
    await expect(board).toBeVisible({ timeout: 20_000 });
    await expect(day(1).getByTestId("stop-card").first()).toContainText("Pantheon");
    // A fresh load opens on the tiles; the map comes back over them on request.
    await page.getByRole("button", { name: /^Map/ }).click();
    await expect(pinList).toContainText("1. Pantheon · Day 1");
  });

  await test.step("Move to Day 2 and the day chips filter the map", async () => {
    await page.getByRole("button", { name: "Add day" }).click();
    await expect(day(2)).toBeVisible();
    await page.getByLabel("Move Colosseum").selectOption("day:1");
    await expect(day(2)).toContainText("Colosseum");
    await expect(day(1).getByTestId("stop-card")).toHaveCount(1);
    await expect(pinList).toContainText("1. Colosseum · Day 2");
    const chips = page.getByRole("group", { name: "Days on the map" });
    await chips.getByRole("button", { name: "Day 2" }).click();
    await expect(pinList).toContainText("Colosseum");
    await expect(pinList).not.toContainText("Pantheon");
    await chips.getByRole("button", { name: "All" }).click();
    await expect(pinList).toContainText("Pantheon");
  });

  await test.step("time and note edits save", async () => {
    await page.getByRole("button", { name: "Edit Pantheon" }).click();
    await page.getByLabel("Start time").fill("09:30");
    await page.getByLabel("Duration (minutes)").fill("45");
    await page.getByLabel("Note", { exact: true }).fill("Go at opening");
    await page.getByRole("button", { name: "Done" }).click();
    await expect(day(1)).toContainText("09:30 · 45 min");
    await expect(day(1)).toContainText("Go at opening");
    await eventually(
      () => getTrip(page, tripId),
      (t) => JSON.stringify(t.itinerary[0]?.stops[0]).includes('"startTime":"09:30"'),
    );
  });

  await test.step("a typed stop is resolved on save and pinned", async () => {
    await page.getByLabel("Add a stop to day 2").fill("Villa Borghese");
    await page.getByRole("button", { name: "Add to day 2" }).click();
    await expect(day(2).getByTestId("stop-card")).toHaveCount(2);
    await expect(pinList).toContainText("2. Villa Borghese · Day 2", { timeout: 20_000 });
  });

  await test.step("pointer drag from Day 1 into Day 2", async () => {
    let moved = false;
    for (let attempt = 0; attempt < 3 && !moved; attempt++) {
      await day(1).scrollIntoViewIfNeeded();
      const handle = day(1).getByRole("button", { name: "Drag Pantheon" });
      const target = day(2).getByTestId("stop-card").first();
      const from = await handle.boundingBox();
      const to = await target.boundingBox();
      if (!from || !to) continue;
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 4 });
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 3, { steps: 20 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      moved = await day(2)
        .getByRole("button", { name: "Drag Pantheon" })
        .waitFor({ timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (!moved) await page.keyboard.press("Escape");
    }
    expect(moved).toBe(true);
    await expect(day(2)).toContainText("Pantheon");
    await expect(day(1).getByTestId("stop-card")).toHaveCount(0);
    await eventually(
      () => getTrip(page, tripId),
      (t) => t.itinerary[1]?.stops.some((s) => s.title === "Pantheon") === true && t.itinerary[0]?.stops.length === 0,
    );
  });

  await test.step("the assistant schedules a stop through schedule_stops", async () => {
    await page.getByLabel("Ask about this trip").fill("Put Roscioli on day 2");
    await page.getByLabel("Ask about this trip").press("Enter");
    await page.waitForURL(/\/\?/, { timeout: 15_000 });
    await expect(page.getByText(/Scheduled 1 stop/)).toBeVisible({ timeout: 40_000 });
    await page.getByRole("link", { name: "Open the board" }).click();
    await page.waitForURL(/\/trips\/.*view=board/, { timeout: 15_000 });
    await expect(day(2)).toContainText("Roscioli Salumeria con Cucina", { timeout: 20_000 });
    await expect(day(2)).toContainText("from chat");
    await expect(pinList).toContainText(/\d\. Roscioli Salumeria con Cucina · Day 2/);
  });

  await test.step("API: version 2 itineraries resolve places, limits hold, legacy strings load as stops", async () => {
    const headers = { Origin: baseURL! };
    const ok = await page.request.patch(`/api/trips/${tripId}`, {
      headers,
      data: { itinerary: [{ day: 1, title: "Test", stops: [{ title: "Pantheon", kind: "attraction" }, { title: "Pack the bags" }] }] },
    });
    expect(ok.status(), await ok.text()).toBe(200);
    const body = (await ok.json()) as TripJson;
    expect(body.itinerary[0].stops[0].place?.name).toBe("Pantheon");
    expect(body.itinerary[0].stops[1].place).toBeUndefined();

    const tooMany = await page.request.patch(`/api/trips/${tripId}`, {
      headers,
      data: { itinerary: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, title: "", stops: [] })) },
    });
    expect(tooMany.status()).toBe(400);

    const legacy = await page.request.patch(`/api/trips/${tripId}`, { headers, data: { itinerary: [{ day: 1, title: "Old", items: ["Colosseum at opening", "Roman Forum"] }] } });
    expect(legacy.status()).toBe(200);
    const loaded = await getTrip(page, tripId);
    expect(loaded.itinerary[0].stops.map((s) => s.title)).toEqual(["Colosseum at opening", "Roman Forum"]);
    expect(loaded.itinerary[0].stops.every((s) => s.id.startsWith("stop-"))).toBe(true);
  });
});
