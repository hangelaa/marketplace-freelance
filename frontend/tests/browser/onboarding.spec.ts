import { test, expect } from "@playwright/test";

test("landing navigation and role-specific hero CTAs reach the real routes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("navigation", { name: "ناوبری اصلی" }).getByRole("link", { name: "دسته‌بندی‌ها", exact: true }).click();
  await expect(page).toHaveURL(/#categories$/);
  await expect(page.getByText("دسته‌بندی‌ها را در حساب‌تان ببینید", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "می‌خواهم پروژه بسپارم", exact: true }).click();
  await expect(page.getByRole("radio", { name: "کارفرما", exact: true })).toBeChecked();
  await page.goto("/");
  await page.getByRole("link", { name: "می‌خواهم همکاری کنم", exact: true }).click();
  await expect(page.getByRole("radio", { name: "فریلنسر", exact: true })).toBeChecked();
  expect(errors).toEqual([]);
});

for (const [role, title] of [["employer", "کارفرما"], ["freelancer", "فریلنسر"]]) {
  test(`${role} preference survives fixture authentication without becoming a permission`, async ({ page }) => {
    await page.goto(`/role-selection/?role=${role}`);
    await page.getByRole("button", { name: "ادامه و ساخت حساب" }).click();
    await expect(page).toHaveURL(/\/register\/$/);
    await page.goto("/login/");
    await page.getByLabel("آدرس ایمیل").fill("test@example.test");
    await page.locator("#password").fill("FixtureOnly9!");
    await page.getByRole("button", { name: "ورود به حساب کاربری" }).click();
    await expect(page).toHaveURL(/\/welcome\/$/);
    await expect(page.getByText(`مسیر شروع تو: ${title}.`, { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByText(`مسیر شروع تو: ${title}.`, { exact: false })).toBeVisible();
    await page.goto("/role-selection/");
    await expect(page).toHaveURL(/\/welcome\/$/);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "حساب من", exact: true }).first()).toBeVisible();
    // The isolated identity fixture has no catalog DB: a real server error must
    // render a retry state, never invented categories.
    await expect(page.getByText("فهرست دسته‌بندی‌ها در دسترس نیست", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "تلاش دوباره", exact: true })).toBeVisible();
  });
}

test("role choice is required, keyboard accessible, and persists into registration", async ({ page, context }) => {
  await page.goto("/role-selection/");
  const continueButton = page.getByRole("button", { name: "ادامه و ساخت حساب" });
  await expect(continueButton).toBeDisabled();
  const employer = page.getByRole("radio", { name: "کارفرما", exact: true });
  await employer.focus();
  await page.keyboard.press("Space");
  await expect(employer).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "فریلنسر", exact: true })).toBeChecked();
  await continueButton.click();
  await expect(page).toHaveURL(/\/register\/$/);
  await expect(page.getByText("مسیر شروع: فریلنسر", { exact: false })).toBeVisible();
  const preference = (await context.cookies()).find(cookie => cookie.name === "peyvand_onboarding");
  expect(preference?.value).toBe("freelancer");
  expect(preference?.httpOnly).toBe(true);
  await page.reload();
  await expect(page.getByText("مسیر شروع: فریلنسر", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "تغییر مسیر" }).click();
  await expect(continueButton).toBeDisabled();
});

test("only supported intent links preselect a role", async ({ page }) => {
  await page.goto("/role-selection/?role=employer");
  await expect(page.getByRole("radio", { name: "کارفرما", exact: true })).toBeChecked();
  await page.goto("/role-selection/?role=Admin");
  await expect(page.getByRole("button", { name: "ادامه و ساخت حساب" })).toBeDisabled();
});

test("registration submits the existing contract, handles failure, then requires login", async ({ page }) => {
  await page.goto("/role-selection/?role=employer");
  await page.getByRole("button", { name: "ادامه و ساخت حساب" }).click();
  await page.route("**/api/auth/csrf/", async route => {
    await route.fulfill({ json: { ok: true }, headers: { "Set-Cookie": "csrftoken=browser-fixture; Path=/; SameSite=Lax" } });
  });
  let calls = 0;
  await page.route("**/api/auth/register/", async route => {
    expect(route.request().postDataJSON()).toEqual({ fullName: "همکار جدید", email: "new@example.test", password: "FixtureOnly9!" });
    expect(route.request().headers()["x-csrftoken"]).toBe("browser-fixture");
    calls++;
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.fulfill({ status: calls === 1 ? 409 : 201, json: calls === 1 ? { error: "این ایمیل قبلاً ثبت شده است." } : { ok: true, next: "/login/" } });
  });
  await page.getByLabel("نام و نام خانوادگی").fill("همکار جدید");
  await page.getByLabel("آدرس ایمیل").fill("new@example.test");
  await page.locator("#password").fill("FixtureOnly9!");
  await page.locator("#confirmPassword").fill("FixtureOnly9!");
  await page.getByRole("button", { name: "ساخت حساب کاربری", exact: true }).click();
  await expect(page.getByRole("button", { name: "در حال ساخت حساب…" })).toBeDisabled();
  await expect(page.locator(".form-feedback[role='alert']")).toContainText("این ایمیل قبلاً ثبت شده است.");
  await page.getByRole("button", { name: "ساخت حساب کاربری", exact: true }).click();
  await expect(page).toHaveURL(/\/login\/\?registered=1$/);
  await expect(page.getByRole("status")).toContainText("حسابت ساخته شد");
});

for (const width of [1440, 768, 390, 320]) {
  test(`public pages are responsive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/role-selection/"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    }
  });
}
