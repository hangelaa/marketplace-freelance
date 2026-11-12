import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/layout/auth-shell";
export const metadata: Metadata = { title: "ورود به حساب" };
export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const session = await getSession();
  if (session.status === "authenticated") redirect("/welcome/");
  const params = await searchParams;
  return <AuthShell><LoginForm sessionExpired={params.expired === "1"} unavailable={session.status === "unavailable"} /></AuthShell>;
}
