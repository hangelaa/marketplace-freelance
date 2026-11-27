"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { onboardingCookie, parseOnboardingRole } from "@/lib/auth/onboarding";

export async function selectRole(_previous: string, formData: FormData): Promise<string> {
  const role = parseOnboardingRole(formData.get("role"));
  if (!role) return "یکی از مسیرهای همکاری را انتخاب کن.";
  try {
    const jar = await cookies();
    jar.set(onboardingCookie, role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.FRONTEND_ORIGIN?.startsWith("https://") === true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  } catch {
    return "انتخاب مسیر ذخیره نشد. دوباره تلاش کن.";
  }
  redirect("/register/");
}
