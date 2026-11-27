import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/branding/brand";
import { RoleSelection } from "@/components/auth/role-selection";
import { getSession } from "@/lib/auth/server";
import { parseOnboardingRole } from "@/lib/auth/onboarding";
import styles from "@/components/auth/role-selection.module.css";

export const metadata: Metadata = { title: "انتخاب مسیر همکاری" };
export default async function RoleSelectionPage({ searchParams }: {
  searchParams: Promise<{ role?: string | string[]; invalid?: string }>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (session.status === "authenticated") redirect("/welcome/");
  return <div className={styles.page}>
    <header className={styles.header}><Brand /><Link href="/login/" className="text-link">ورود به حساب</Link></header>
    <main id="main-content" className={styles.main}>
      <div className={styles.intro}>
        <span className="eyebrow">یک پیوند، دو مسیر</span>
        <h1>چطور می‌خواهی شروع کنی؟</h1>
        <p>پروژه‌ای برای انجام داری یا مهارتی برای ارائه؟<br />مسیر شروع همکاری‌ات را انتخاب کن.</p>
      </div>
      <RoleSelection initialRole={parseOnboardingRole(params.role)} invalid={params.invalid === "1"} />
      <p className={styles.note}>این انتخاب مسیر شروع توست، نه محدودیت حساب؛ با حساب عادی می‌توانی هم پروژه منتشر کنی و هم پیشنهاد بدهی.</p>
    </main>
    <footer className={styles.footer}><Link href="/">بازگشت به پیوند</Link><span>پیوند؛ از ایده تا همکاری</span></footer>
  </div>;
}
