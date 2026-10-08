import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { eventually, PASSWORD, signup, uniqueEmail } from "./helpers";

/**
 * Planning together, with two (then three) travelers in separate browsers: the owner shares a
 * feedback link, an invite link and an emailed invite; a friend without an account signs up from
 * the feedback link and lands on the trip; votes, comments and the discussion reach the owner's
 * open page within seconds (and back); Updates group the activity; the email invite is accepted
 * at sign-up; the trip's assistant is told what the group voted and said.
 */
const LOG = path.join(process.cwd(), ".data", `e2e-${process.env.APP_PORT || 3200}`, "model-requests.log");
const RESEND = `http://localhost:${process.env.RESEND_PORT || 4548}`;

const readLog = () => {
  try {
    return readFileSync(LOG, "utf8");
  } catch {
    return "";
  }
};

async function signupFromJoin(page: Page, name: string, email: string) {
  await page.getByRole("link", { name: "Create a free account" }).click();
  await page.getByPlaceholder("Tayo Akigbogun").fill(name);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

test("plan together: links and invites, votes, comments, the discussion, live updates, grouped updates", async ({ page, browser, baseURL }) => {
  test.setTimeout(300_000);
  const origin = baseURL!;
  await signup(page, { email: uniqueEmail("planner") });

  // A trip with an idea and a day with one stop (the trips spec covers making them through the forms).
  const res = await page.request.post("/api/trips", {
    data: { title: "Trip to Lisbon", destination: "Lisbon", startDate: "2026-11-02", endDate: "2026-11-05", itinerary: [{ day: 1, title: "Old town", stops: [{ title: "Alfama walk", note: "" }] }] },
    headers: { Origin: origin },
  });
  expect(res.status(), await res.text()).toBe(201);
  const tripId = ((await res.json()) as { id: string }).id;
  const idea = await page.request.post(`/api/trips/${tripId}/items`, { data: { kind: "idea", title: "Belém Tower", note: "" }, headers: { Origin: origin } });
  expect(idea.ok(), await idea.text()).toBe(true);
  await page.goto(`/trips/${tripId}`);
  await expect(page.getByRole("heading", { name: "Trip to Lisbon" })).toBeVisible();
  const side = page.getByTestId("trip-side");

  let feedbackUrl = "";
  const newcomer = uniqueEmail("newcomer");
  await test.step("Share: a feedback link, an invite link and an email invite for someone without an account", async () => {
    // Alone on the trip there is nothing to vote with yet.
    await expect(page.getByRole("button", { name: "Vote for Belém Tower" })).toHaveCount(0);
    await page.getByRole("button", { name: "Share this trip" }).click();
    await side.getByRole("button", { name: "Copy feedback link" }).click();
    feedbackUrl = await side.getByRole("textbox", { name: "Feedback link" }).inputValue();
    expect(feedbackUrl).toMatch(/\/join\/[A-Za-z0-9_-]{24}$/);
    await side.getByRole("button", { name: "Copy invite link" }).click();
    const inviteUrl = await side.getByRole("textbox", { name: "Invite link" }).inputValue();
    expect(inviteUrl).toMatch(/\/join\/[A-Za-z0-9_-]{24}$/);
    expect(inviteUrl).not.toBe(feedbackUrl);
    // Copying again hands out the same link.
    await side.getByRole("button", { name: /Copy invite link|Copied/ }).click();
    expect(await side.getByRole("textbox", { name: "Invite link" }).inputValue()).toBe(inviteUrl);

    await side.getByPlaceholder("friend@example.com").fill(newcomer);
    await side.getByRole("button", { name: "Invite", exact: true }).click();
    await expect(side.getByText(`Invite sent to ${newcomer}.`, { exact: false })).toBeVisible();
    await expect(side.getByTestId("pending-invites")).toContainText(newcomer);
  });

  const friendContext = await browser.newContext();
  const friend = await friendContext.newPage();
  await test.step("a friend without an account opens the feedback link, signs up and lands on the trip", async () => {
    await friend.goto(feedbackUrl);
    await expect(friend.getByRole("heading", { name: "Tayo Akigbogun would love your feedback on Trip to Lisbon" })).toBeVisible();
    await signupFromJoin(friend, "Lena Costa", uniqueEmail("lena"));
    await friend.getByRole("button", { name: "Open the trip" }).click();
    await friend.waitForURL(new RegExp(`/trips/${tripId}$`), { timeout: 30_000 });
    await expect(friend.getByRole("heading", { name: "Trip to Lisbon" })).toBeVisible();
    await expect(friend.getByTestId("feedback-banner")).toContainText("Tayo asked for your feedback.");
    // The first-run setup waits until they leave the trip; bookings stay with the travelers; nothing to edit.
    await expect(friend.getByRole("dialog", { name: "Set up your travel assistant" })).toHaveCount(0);
    await expect(friend.getByRole("button", { name: /^Bookings\s*Kept with the travelers/ })).toBeVisible();
    await expect(friend.getByRole("button", { name: "Edit details" })).toHaveCount(0);
    await expect(friend.getByRole("button", { name: "Share this trip" })).toHaveCount(0);
  });

  await test.step("the friend votes on an idea and a stop, comments, and writes in the discussion", async () => {
    const tray = friend.getByTestId("ideas-tray");
    await tray.getByRole("button", { name: "Vote for Belém Tower" }).click();
    await expect(tray.getByRole("button", { name: "Vote for Belém Tower" })).toHaveAttribute("aria-pressed", "true");
    await expect(tray.getByTestId("votes-for")).toHaveText("1");
    await friend.getByTestId("trip-board").getByRole("button", { name: "Vote against Alfama walk" }).click();
    await tray.getByRole("button", { name: "Comments on Belém Tower" }).click();
    const comment = tray.getByRole("textbox", { name: "Comment on Belém Tower" });
    await comment.fill("Go at opening, the queue is huge by ten.");
    await comment.press("Enter");
    await expect(tray.getByTestId("comment-thread")).toContainText("Go at opening");
    await expect(tray.getByRole("button", { name: "Comments on Belém Tower" })).toContainText("1");

    await friend.getByTestId("discussion-chip").click();
    const talk = friend.getByTestId("trip-discussion");
    const box = talk.getByRole("textbox", { name: "Message everyone on the trip" });
    await box.fill("Love this plan! Can we add a fado night?");
    await box.press("Enter");
    await expect(talk.getByTestId("trip-message").filter({ hasText: "fado night" })).toBeVisible();
    await expect(talk.getByTestId("trip-message").filter({ hasText: "Go at opening" })).toContainText("on Belém Tower");
  });

  await test.step("the owner's open page catches up within seconds, and the answer reaches the friend", async () => {
    const tray = page.getByTestId("ideas-tray");
    await expect(tray.getByTestId("votes-for")).toHaveText("1", { timeout: 30_000 });
    await expect(page.getByTestId("trip-board").getByRole("group", { name: "Group vote on Alfama walk" }).getByTestId("votes-against")).toHaveText("1");
    await expect(page.getByRole("group", { name: "Group vote on Belém Tower" }).first()).toHaveAttribute("title", "For: Lena Costa");
    await expect(page.getByTestId("discussion-chip")).toContainText("2 new");
    await page.getByTestId("discussion-chip").click();
    const talk = page.getByTestId("trip-discussion");
    await expect(talk).toContainText("Can we add a fado night?");
    // Seen once it is on screen.
    await expect(page.getByTestId("discussion-chip")).not.toContainText("new");

    const box = talk.getByRole("textbox", { name: "Message everyone on the trip" });
    await box.fill("Yes! I'll book one for Tuesday.");
    await box.press("Enter");
    await expect(friend.getByTestId("trip-discussion")).toContainText("book one for Tuesday", { timeout: 30_000 });

    // A change to the trip itself shows up on the friend's page too.
    const added = await page.request.post(`/api/trips/${tripId}/items`, { data: { kind: "idea", title: "Time Out Market", note: "" }, headers: { Origin: origin } });
    expect(added.ok()).toBe(true);
    await expect(friend.getByTestId("ideas-tray")).toContainText("Time Out Market", { timeout: 30_000 });
  });

  await test.step("Updates group the friend's activity, and a discussion update opens the discussion", async () => {
    await page.goto("/updates");
    const main = page.getByRole("main");
    await expect(main.getByText('Lena Costa opened your feedback link for "Trip to Lisbon" and can now vote and comment.')).toBeVisible();
    await expect(main.getByText('Lena Costa voted on 2 places in "Trip to Lisbon": Belém Tower and Alfama walk.')).toBeVisible();
    await expect(main.getByText('1 new message and 1 comment in "Trip to Lisbon" from Lena Costa. Latest from Lena: "Love this plan! Can we add a fado night?"')).toBeVisible();
    await main.getByRole("link", { name: "Open discussion" }).click();
    await page.waitForURL(/section=discussion/);
    await expect(page.getByTestId("trip-discussion")).toContainText("fado night");
  });

  await test.step("the friend sees the owner's answer in Updates as one discussion update", async () => {
    await friend.goto("/updates");
    // Leaving the trip brings the first-run setup (and the rest of the app sits behind it).
    await expect(friend.getByRole("dialog", { name: "Set up your travel assistant" })).toBeVisible();
    const state = (await (await friend.request.get("/api/notifications")).json()) as { updates: { text: string }[] };
    expect(state.updates.map((u) => u.text)).toContain('Tayo Akigbogun wrote in "Trip to Lisbon": "Yes! I\'ll book one for Tuesday."');
    await friendContext.close();
  });

  await test.step("the emailed invite: the newcomer signs up from the email and is on the trip as an editor", async () => {
    const mail = await eventually(
      async () => ((await (await page.request.get(`${RESEND}/emails?to=${encodeURIComponent(newcomer)}`)).json()) as { emails: { subject: string; text: string }[] }).emails,
      (list) => list.length > 0,
    );
    expect(mail[0].subject).toBe("Tayo Akigbogun invited you to Trip to Lisbon on XPMatch");
    const url = mail[0].text.match(/https?:\/\/\S+\/join\/[A-Za-z0-9_-]+/)?.[0];
    expect(url, mail[0].text).toBeTruthy();
    const ctx = await browser.newContext();
    const guest = await ctx.newPage();
    await guest.goto(url!);
    await expect(guest.getByRole("heading", { name: "Tayo Akigbogun invited you to plan Trip to Lisbon" })).toBeVisible();
    await expect(guest.getByTestId("join-trip")).toContainText(`This invite is for n•••@example.com`);
    await signupFromJoin(guest, "Nia Okafor", newcomer);
    // Back on the invite with the invited address: one click joins (signing up alone does not).
    await expect(guest.getByRole("heading", { name: "Tayo Akigbogun invited you to plan Trip to Lisbon" })).toBeVisible({ timeout: 30_000 });
    await guest.getByRole("button", { name: "Join the trip" }).click();
    await guest.waitForURL(new RegExp(`/trips/${tripId}$`), { timeout: 30_000 });
    await expect(guest.getByRole("button", { name: "Edit details" })).toBeVisible();
    await expect(guest.getByTestId("feedback-banner")).toHaveCount(0);
    await ctx.close();

    // The owner sees three people, the invite gone from the waiting list, and can make the newcomer a commenter.
    await page.goto(`/trips/${tripId}`);
    await page.getByRole("button", { name: "Share this trip" }).click();
    await expect(side.getByTestId("member-row")).toHaveCount(3);
    await expect(side.getByTestId("pending-invites")).not.toContainText(newcomer);
    await side.getByRole("combobox", { name: "What Nia Okafor can do" }).selectOption("viewer");
    await expect(side.getByRole("combobox", { name: "What Nia Okafor can do" })).toHaveValue("viewer");
    await expect(side.getByRole("region", { name: "Giving feedback" }).getByTestId("member-row")).toContainText("Lena Costa");
  });

  await test.step("the trip's assistant is told what the group voted and said", async () => {
    await page.getByLabel("Ask about this trip").fill("Which places does the group like?");
    await page.getByLabel("Ask about this trip").press("Enter");
    await page.waitForURL(/\/chat\?/, { timeout: 15_000 });
    const entry = await eventually(
      async () =>
        readLog()
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line) as { lastText?: string; groupVotes?: string; discussion?: string })
          .reverse()
          .find((e) => e.lastText?.startsWith("Which places does the group like")),
      (e) => !!e,
      60,
    );
    expect(entry!.groupVotes).toContain('"place":"Belém Tower"');
    expect(entry!.groupVotes).toContain('"forBy":["Lena Costa"]');
    expect(entry!.groupVotes).toContain('"againstBy":["Lena Costa"]');
    expect(entry!.discussion).toContain("Can we add a fado night?");
    expect(entry!.discussion).toContain('"about":"Belém Tower"');
  });
});
