import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, Link2, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { Brand } from "@/components/branding/brand";
import { LogoutButton } from "@/components/auth/logout-button";
import { SessionGuard } from "@/components/auth/session-guard";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "خوش آمدید" };
export default async function WelcomePage() {
  const session = await getSession();
  if (session.status === "anonymous") redirect("/login/?expired=1");
  if (session.status === "unavailable") return <main className="welcome-shell" id="main-content"><header className="welcome-header"><Brand /></header><section className="welcome-card"><ShieldCheck className="welcome-icon" /><h1 className="welcome-title">ارتباط موقتاً برقرار نیست</h1><p className="welcome-description">برای حفاظت از حسابت، تا تأیید نشست اطلاعاتی نمایش نمی‌دهیم. کمی بعد دوباره تلاش کن.</p><a href="/welcome/" className="text-link">تلاش دوباره</a></section></main>;
  const { user } = session;
  return <main className="welcome-shell" id="main-content"><SessionGuard /><header className="welcome-header"><Brand /><LogoutButton /></header><section className="welcome-card"><div className="welcome-icon"><Link2 size={32} aria-hidden="true" /></div><span className="welcome-eyebrow"><Check size={15} />با موفقیت وارد شدی</span><h1 className="welcome-title"><bdi>{user.name}</bdi>،<br />به پیوند خوش آمدی.</h1><p className="welcome-description">هر همکاری خوب، با یک پیوند شروع می‌شود.<br />خوشحالیم که شروع این مسیر در کنار مایی.</p><div className="identity-row"><span className="identity-avatar" aria-hidden="true">{Array.from(user.name.trim())[0] || "پ"}</span><div className="identity-info"><span className="identity-label">با این حساب وارد شده‌ای</span><bdi>{user.email}</bdi></div><ShieldCheck size={21} aria-label="نشست تأیید شده" /></div><p className="welcome-note">این صفحه مقصد موقت ورود است؛ امکانات بازار کار در مراحل بعد اضافه می‌شوند.</p></section><footer className="welcome-footer">پیوند؛ استعداد تو، فرصت‌های تازه.</footer></main>;
}
