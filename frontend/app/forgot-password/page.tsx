import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/layout/auth-shell";
export const metadata: Metadata = { title: "بازیابی رمز عبور" };
export const dynamic = "force-dynamic";
export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session.status === "authenticated") redirect("/welcome/");
  return <AuthShell><ForgotPasswordForm unavailable={session.status === "unavailable"} /></AuthShell>;
}
