import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthShell } from "@/components/layout/auth-shell";
export const metadata: Metadata = { title: "تعیین رمز عبور جدید" };
export const dynamic = "force-dynamic";
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ uid?: string; token?: string }> }) {
  const session = await getSession();
  if (session.status === "authenticated") redirect("/welcome/");
  const { uid, token } = await searchParams;
  const link = typeof uid === "string" && typeof token === "string" && uid && token ? { uid, token } : null;
  return <AuthShell><ResetPasswordForm link={link} unavailable={session.status === "unavailable"} /></AuthShell>;
}
