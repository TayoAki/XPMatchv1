import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { openChatHistory, PASSWORD, sendChat, signup, uniqueEmail } from "./helpers";

/**
 * A traveler's chats stay theirs. CopilotKit's thread endpoints (list every thread the server holds,
 * read any thread's messages, clear them all) and its debug stream know nothing about users, so they
 * are closed; a live thread is never replayed to anyone but the traveler who started it.
 */
test("privacy: another traveler cannot list, read, clear or replay someone's chat", async ({ page, playwright, baseURL }) => {
  await signup(page, { email: uniqueEmail("owner") });
  await sendChat(page, "Find hotels in Rome");
  const chat = page.locator(".xp-chat");
  await expect(chat.getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
  await expect(chat.getByText(/Done — those are on the cards above/)).toBeVisible({ timeout: 30_000 });
  await openChatHistory(page);
  const href = await page.getByTestId("chat-nav-list").locator('a[aria-current="page"]').getAttribute("href");
  const threadId = new URL(href!, baseURL).searchParams.get("thread")!;
  expect(threadId).toBeTruthy();

  const other = await playwright.request.newContext({ baseURL });
  try {
    const headers = { Origin: baseURL! };
    const signedUp = await other.post("/api/auth/signup", { data: { name: "Someone Else", email: uniqueEmail("other"), password: PASSWORD }, headers });
    expect(signedUp.status()).toBe(201);

    await test.step("the thread and debug endpoints are closed", async () => {
      for (const [method, path] of [
        ["get", "/api/copilotkit/threads"],
        ["get", `/api/copilotkit/threads/${encodeURIComponent(threadId)}/messages`],
        ["post", "/api/copilotkit/threads/clear"],
        ["get", "/api/copilotkit/cpk-debug-events"],
      ] as const) {
        const res = await other[method](path, { headers });
        expect(res.status(), `${method.toUpperCase()} ${path}`).toBe(404);
      }
    });

    await test.step("reconnecting to the owner's live thread replays nothing", async () => {
      const replay = await other.post("/api/copilotkit/agent/default/connect", {
        data: { threadId, runId: randomUUID(), messages: [], tools: [], context: [], state: {}, forwardedProps: {} },
        headers: { ...headers, Accept: "text/event-stream" },
      });
      expect(await replay.text()).not.toContain("Find hotels in Rome");
      const stored = await other.get(`/api/chats/${encodeURIComponent(threadId)}/messages`);
      expect(((await stored.json()) as { count: number }).count).toBe(0);
    });
  } finally {
    await other.dispose();
  }

  await test.step("the owner's chat is untouched", async () => {
    await page.goto(href!);
    await expect(chat.getByText("Where to stay in Rome")).toBeVisible({ timeout: 40_000 });
  });
});
