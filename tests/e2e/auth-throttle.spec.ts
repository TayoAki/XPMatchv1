import { expect, test } from "@playwright/test";
import { PASSWORD, signupApi, uniqueEmail } from "./helpers";

test("sign-in throttling: ten tries per email in 15 minutes, then 429 even with the right password; other accounts unaffected", async ({ request, baseURL }) => {
  const email = uniqueEmail("throttle");
  const other = uniqueEmail("calm");
  await signupApi(request, { name: "Thea Throttle", email }, baseURL!);
  await signupApi(request, { name: "Cal Calm", email: other }, baseURL!);
  const attempt = (who: string, password: string) => request.post("/api/auth/login", { data: { email: who, password }, headers: { Origin: baseURL! } });

  for (let i = 0; i < 10; i++) expect((await attempt(email, "wrong-password-1")).status(), `attempt ${i + 1}`).toBe(401);

  const blocked = await attempt(email, PASSWORD);
  expect(blocked.status()).toBe(429);
  expect(((await blocked.json()) as { error: string }).error).toContain("Too many sign-in attempts");

  // The limit is per email, so another account on the same network signs in normally.
  const fine = await attempt(other, PASSWORD);
  expect(fine.ok(), await fine.text()).toBeTruthy();
});
