import { expect, test, type APIRequestContext } from "@playwright/test";
import { completeOnboarding, ensureAccount, eventually, login, PASSWORD, signupApi, uniqueEmail } from "./helpers";

const NEW_PASSWORD = "brand-new-secret-9";
/** The Resend stand-in started by start-app.mjs keeps every email the app sends. */
const MAILBOX = `http://localhost:${process.env.RESEND_PORT || 4548}/emails`;

interface StubEmail {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}

async function emailsTo(request: APIRequestContext, to: string): Promise<StubEmail[]> {
  return ((await (await request.get(`${MAILBOX}?to=${encodeURIComponent(to)}`)).json()) as { emails: StubEmail[] }).emails;
}

test("password reset: the admin issues a link, the traveler sets a new password, other sessions and the link stop working", async ({ page, browser, baseURL, request }) => {
  test.setTimeout(240_000);
  const email = uniqueEmail("reset");
  // The traveler signs up through the page's context, which then holds their session (the "old device").
  await signupApi(page.request, { name: "Rae Reset", email }, baseURL!);
  // The admin account is created through a separate request context so its cookie never lands in the traveler's jar.
  await ensureAccount(request, { name: "Ada Admin", email: "admin@example.com" }, baseURL!);

  let link = "";
  await test.step("the admin creates a single-use link from the Members roster", async () => {
    const context = await browser.newContext({ baseURL });
    const admin = await context.newPage();
    await login(admin, "admin@example.com");
    await admin.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
    const state = (await (await admin.request.get("/api/me/state")).json()) as { profile: { onboarded: boolean } };
    if (!state.profile.onboarded) await completeOnboarding(admin);
    await eventually(
      async () => (await (await admin.request.get("/api/me/state")).json()) as { profile: { onboarded: boolean } },
      (s) => s.profile.onboarded === true,
    );
    await admin.goto("/admin");
    const row = admin.getByTestId("member-row").filter({ hasText: email });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByRole("button", { name: `Reset link for ${email}` }).click();
    const code = row.getByTestId("reset-link");
    await expect(code).toBeVisible();
    link = (await code.textContent())?.trim() ?? "";
    expect(link).toMatch(/^https?:\/\/.+\/reset\?token=[A-Za-z0-9_-]{20,}$/);
    await expect(row).toContainText("Works once");
    await context.close();
  });

  await test.step("the link opens without a session, names the account and sets the password", async () => {
    const fresh = await browser.newContext({ baseURL });
    const traveler = await fresh.newPage();
    await traveler.goto(link);
    const form = traveler.getByTestId("reset-form");
    await expect(form).toBeVisible();
    await expect(form).toContainText(email);
    await form.getByLabel("New password").fill(NEW_PASSWORD);
    await form.getByLabel("Confirm password").fill("does-not-match");
    await form.getByRole("button", { name: "Set password" }).click();
    await expect(form.getByRole("alert")).toContainText("do not match");
    await form.getByLabel("Confirm password").fill(NEW_PASSWORD);
    await form.getByRole("button", { name: "Set password" }).click();
    // Signed in straight away: the app home loads instead of /login.
    await traveler.waitForURL((u) => u.pathname === "/", { timeout: 30_000 });
    const me = (await (await fresh.request.get("/api/auth/me")).json()) as { user?: { email: string } };
    expect(me.user?.email).toBe(email);

    // The link is single-use.
    const again = await fresh.newPage();
    await again.goto(link);
    await expect(again.getByTestId("reset-dead")).toContainText("expired or was already used");
    await fresh.close();
  });

  await test.step("the old session is signed out; the old password fails and the new one works", async () => {
    const stale = await page.request.get("/api/me/state");
    expect(stale.status()).toBe(401);
    const other = await browser.newContext({ baseURL });
    const oldLogin = await other.request.post("/api/auth/login", { data: { email, password: PASSWORD }, headers: { Origin: baseURL! } });
    expect(oldLogin.status()).toBe(401);
    const newLogin = await other.request.post("/api/auth/login", { data: { email, password: NEW_PASSWORD }, headers: { Origin: baseURL! } });
    expect(newLogin.ok(), await newLogin.text()).toBeTruthy();
    await other.close();
  });
});

test("forgot password: the email carries a working link, and an unknown email gets the same answer without an email", async ({ browser, baseURL, request }) => {
  test.setTimeout(180_000);
  const email = uniqueEmail("forgot");
  await signupApi(request, { name: "Fay Forgot", email }, baseURL!);
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await test.step("the sign-in page leads to the request form", async () => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await page.waitForURL(/\/forgot/);
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByRole("button", { name: "Email me a link" }).click();
    await expect(page.getByTestId("forgot-sent")).toContainText("a reset link is on its way");
  });

  let link = "";
  await test.step("the email holds the link and it sets the password", async () => {
    const mailbox = await eventually(() => emailsTo(request, email), (list) => list.length >= 1);
    const mail = mailbox[mailbox.length - 1];
    expect(mail.subject).toBe("Reset your XPMatch password");
    expect(mail.text).toContain("Fay");
    link = mail.text.match(/https?:\/\/\S+\/reset\?token=[A-Za-z0-9_-]+/)?.[0] ?? "";
    expect(link).toMatch(/\/reset\?token=/);
    await page.goto(link);
    const form = page.getByTestId("reset-form");
    await expect(form).toContainText(email);
    await form.getByLabel("New password").fill(NEW_PASSWORD);
    await form.getByLabel("Confirm password").fill(NEW_PASSWORD);
    await form.getByRole("button", { name: "Set password" }).click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 30_000 });
    const login = await request.post("/api/auth/login", { data: { email, password: NEW_PASSWORD }, headers: { Origin: baseURL! } });
    expect(login.ok(), await login.text()).toBeTruthy();
  });

  await test.step("an email nobody signed up with gets the same message and no email", async () => {
    const unknown = uniqueEmail("nobody");
    await page.goto("/forgot");
    await page.getByPlaceholder("you@example.com").fill(unknown);
    await page.getByRole("button", { name: "Email me a link" }).click();
    await expect(page.getByTestId("forgot-sent")).toContainText("a reset link is on its way");
    expect(await emailsTo(request, unknown)).toHaveLength(0);
  });

  await context.close();
});
