// A UI preference only. The backend's account types remain Regular / Admin.
export type OnboardingRole = "employer" | "freelancer";
export const onboardingCookie = "peyvand_onboarding";
export function parseOnboardingRole(value: unknown): OnboardingRole | null {
  return value === "employer" || value === "freelancer" ? value : null;
}
export function registrationDestination(): string {
  // Registration returns 201, not an authenticated session.
  return "/login/?registered=1";
}
export const roleContent = {
  employer: {
    title: "کارفرما",
    description: "ایده‌ات را به یک پروژه و یک همکاری تازه تبدیل کن.",
    benefits: ["ایجاد و انتشار پروژه", "دریافت و بررسی پیشنهادها", "انتخاب فریلنسر مناسب"],
  },
  freelancer: {
    title: "فریلنسر",
    description: "مهارتت را به فرصت‌های متناسب با خودت پیوند بده.",
    benefits: ["کشف پروژه‌های موجود", "ارسال پیشنهاد همکاری", "پیگیری وضعیت پیشنهادها"],
  },
} as const;
