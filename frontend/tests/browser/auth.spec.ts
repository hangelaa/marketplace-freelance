import { test, expect } from "@playwright/test";
import path from "node:path";
const identity = { email: "test@example.test", password: "FixtureOnly9!" };
async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login/");
  await page.getByLabel("آدرس ایمیل").fill(identity.email);
  await page.locator("#password").fill(identity.password);
  await page.getByRole("button", { name: "ورود به حساب کاربری" }).click();
  await expect(page).toHaveURL(/\/welcome\/$/);
}
test("protected welcome rejects anonymous visitors", async ({ page }) => {
  await page.goto("/welcome/");
  await expect(page).toHaveURL(/\/login\/\?expired=1/);
  await expect(page.getByText("نشست شما پایان یافته است. برای ادامه دوباره وارد شوید.")).toBeVisible();
});
test("Persian validation, password visibility, and scope notices are accessible", async ({ page }) => {
  await page.goto("/login/");
  await page.getByRole("button", { name: "ورود به حساب کاربری" }).click();
  await expect(page.getByText("ایمیل خود را وارد کنید.")).toBeVisible();
  await expect(page.getByText("رمز عبور خود را وارد کنید.", { exact: true })).toBeVisible();
  await expect(page.locator("#email")).toBeFocused();
  await page.locator("#email").fill("not-an-email");
  await page.locator("#password").fill("test");
  await page.getByRole("button", { name: "ورود به حساب کاربری" }).click();
  await expect(page.getByText("یک آدرس ایمیل معتبر وارد کنید.")).toBeVisible();
  await page.getByRole("button", { name: "نمایش رمز عبور", exact: true }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "پنهان کردن رمز عبور", exact: true }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "رمزت را فراموش کردی؟" }).click();
  await expect(page.getByRole("status")).toContainText("بازیابی رمز عبور در این مرحله فعال نیست");
});
test("incorrect credentials show a generic Persian error and recover submit state", async ({ page }) => {
  await page.goto("/login/");
  await page.locator("#email").fill(identity.email);
  await page.locator("#password").fill("wrong-password");
  await page.getByRole("button", { name: "ورود به حساب کاربری" }).click();
  await expect(page.locator(".form-feedback[role='alert']")).toContainText("ایمیل یا رمز عبور درست نیست");
  await expect(page.getByRole("button", { name: "ورود به حساب کاربری" })).toBeEnabled();
});
test("Django fixture session survives refresh, login redirects, and logout invalidates it", async ({ page, context }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: /همکار آزمایشی/ })).toBeVisible();
  const cookie = (await context.cookies()).find(c => c.name === "sessionid");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: /همکار آزمایشی/ })).toBeVisible();
  await page.goto("/login/");
  await expect(page).toHaveURL(/\/welcome\/$/);
  if (process.env.EVIDENCE_DIR) await page.screenshot({ path: path.join(process.env.EVIDENCE_DIR, "welcome-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "خروج از حساب" }).click();
  await expect(page).toHaveURL(/\/login\/$/);
  expect((await page.request.get("/api/auth/me/")).status()).toBe(401);
  const replay = await page.request.get("/api/auth/me/", { headers: { Cookie: `sessionid=${cookie!.value}` } });
  expect(replay.status()).toBe(401);
  await page.goto("/welcome/");
  await expect(page).toHaveURL(/\/login\/\?expired=1/);
});
test("Django enforces CSRF and proxy rejects cross-site origin", async ({ request }) => {
  await request.get("/api/auth/csrf/");
  const missingToken = await request.post("/api/auth/login/", { headers: { Origin: "http://127.0.0.1:3001" }, data: identity });
  expect(missingToken.status()).toBe(403);
  const crossSite = await request.post("/api/auth/login/", { headers: { Origin: "https://attacker.test" }, data: identity });
  expect(crossSite.status()).toBe(403);
});
test("expired session redirects on visibility/focus revalidation", async ({ page, context }) => {
  await signIn(page);
  await context.clearCookies();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveURL(/\/login\/\?expired=1/);
});
for (const viewport of [{width:1440,height:1000}, {width:768,height:1024}, {width:390,height:844}, {width:320,height:720}]) {
  test(`RTL layout has no overflow at ${viewport.width}px and loads local Persian font`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".auth-content")).toHaveCSS("opacity", "1");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: /به پیوند خوش برگشتی/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => document.fonts.check('400 16px "Vazirmatn Variable"'))).toBe(true);
    if (process.env.EVIDENCE_DIR) await page.screenshot({ path: path.join(process.env.EVIDENCE_DIR, `login-${viewport.width}.png`), fullPage: true });
  });
}
test("network failure provides feedback; submitting shows a loading state", async ({ page }) => {
  await page.goto("/login/");
  await page.route("**/api/auth/login/", async route => { await new Promise(resolve => setTimeout(resolve, 300)); await route.abort("failed"); });
  await page.locator("#email").fill(identity.email);
  await page.locator("#password").fill(identity.password);
  await page.getByRole("button", { name: "ورود به حساب کاربری" }).click();
  await expect(page.getByRole("button", { name: "در حال ورود…" })).toBeDisabled();
  await expect(page.locator(".form-feedback[role='alert']")).toContainText("ارتباط با سرور برقرار نشد");
});
test("reduced-motion disables decorative CSS animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login/");
  expect(await page.locator(".auth-content").evaluate(el => parseFloat(getComputedStyle(el).animationDuration))).toBeLessThan(.01);
});
test("backend unavailable displays a retryable Persian error", async ({ page }) => {
  await page.goto("/login/");
  await page.route("**/api/auth/csrf/", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"unavailable"}' }));
  await page.locator("#email").fill(identity.email);
  await page.locator("#password").fill(identity.password);
  await page.getByRole("button", { name: "ورود به حساب کاربری" }).click();
  await expect(page.locator(".form-feedback[role='alert']")).toContainText("سرویس ورود در دسترس نیست");
  await expect(page.getByRole("button", { name: "ورود به حساب کاربری" })).toBeEnabled();
});
test("keyboard skip link and field navigation remain usable", async ({ page }) => {
  await page.goto("/login/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "رفتن به محتوای اصلی" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.locator("#email")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "رمزت را فراموش کردی؟" })).toBeFocused();
});
test("mobile welcome is readable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await expect(page.getByRole("heading", { name: /همکار آزمایشی/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.EVIDENCE_DIR) await page.screenshot({ path: path.join(process.env.EVIDENCE_DIR, "welcome-mobile.png"), fullPage: true });
});
