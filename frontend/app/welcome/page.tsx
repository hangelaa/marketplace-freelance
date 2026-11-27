import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { Brand } from "@/components/branding/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "خوش آمدید" };
export default async function WelcomePage() {
  const session = await getSession();
  if (session.status === "anonymous") redirect("/login/?expired=1");
  if (session.status === "unavailable") return <main className="welcome-shell" id="main-content"><header className="welcome-header"><Brand /></header><section className="welcome-card"><ShieldCheck className="welcome-icon" /><h1 className="welcome-title">ارتباط موقتاً برقرار نیست</h1><p className="welcome-description">برای حفاظت از حسابت، تا تأیید نشست اطلاعاتی نمایش نمی‌دهیم. کمی بعد دوباره تلاش کن.</p><a href="/welcome/" className="text-link">تلاش دوباره</a></section></main>;
  redirect("/home/");
}
