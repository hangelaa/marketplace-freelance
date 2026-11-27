import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { onboardingCookie, parseOnboardingRole } from "@/lib/auth/onboarding";
import { getSession } from "@/lib/auth/server";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthShell } from "@/components/layout/auth-shell";
export const metadata: Metadata = { title: "ساخت حساب کاربری" };
export const dynamic = "force-dynamic";
export default async function RegisterPage() {
  const session = await getSession();
  if (session.status === "authenticated") redirect("/welcome/");
  const role = parseOnboardingRole((await cookies()).get(onboardingCookie)?.value);
  return <AuthShell><RegisterForm unavailable={session.status === "unavailable"} role={role} /></AuthShell>;
}
