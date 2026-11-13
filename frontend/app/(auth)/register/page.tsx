import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthShell } from "@/components/layout/auth-shell";
export const metadata: Metadata = { title: "ساخت حساب کاربری" };
export const dynamic = "force-dynamic";
export default async function RegisterPage() {
  const session = await getSession();
  if (session.status === "authenticated") redirect("/welcome/");
  return <AuthShell><RegisterForm unavailable={session.status === "unavailable"} /></AuthShell>;
}
