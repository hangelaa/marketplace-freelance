"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Compass, FileCheck2, ArrowUpLeft } from "lucide-react";
import { Brand } from "@/components/branding/brand";
import { LogoutButton } from "@/components/auth/logout-button";
import { SessionGuard } from "@/components/auth/session-guard";
import type { ReactNode } from "react";

const links = [
  { href: "/my/projects/", label: "پروژه‌های من", detail: "مدیریت و دریافت پیشنهاد", icon: BriefcaseBusiness },
  { href: "/projects/", label: "کشف پروژه‌ها", detail: "فرصت‌های تازه برای همکاری", icon: Compass },
  { href: "/my/proposals/", label: "پیشنهادهای من", detail: "پیگیری مسیر همکاری", icon: FileCheck2 },
];
export function WorkspaceShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  return <div className="marketplace">
    <SessionGuard />
    <header className="pm-topbar"><Brand /><div className="pm-account"><span className="pm-account-name"><span className="pm-avatar" aria-hidden="true">{Array.from(name.trim())[0] || "پ"}</span><bdi>{name}</bdi></span><LogoutButton /></div></header>
    <div className="pm-layout">
      <aside className="pm-sidebar"><p className="pm-sidebar-label">فضای همکاری</p><nav aria-label="فضای کار پیوند">{links.map(({ href, label, detail, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return <Link key={href} href={href} className={`pm-nav-link${active ? " pm-nav-link--active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={21} aria-hidden="true" /><span>{label}<small>{detail}</small></span></Link>;
      })}</nav><div className="pm-sidebar-note"><span className="pm-eyebrow">از ایده تا همکاری</span><p>یک حساب، دو مسیر.<br />پروژه بسپار یا پیشنهاد بده.</p><Link href="/">صفحه اصلی<ArrowUpLeft size={16} aria-hidden="true" /></Link></div></aside>
      <main id="main-content" tabIndex={-1} className="pm-main">{children}</main>
    </div>
    <footer className="pm-footer">پیوند؛ کار خوب، با یک پیوند شروع می‌شود.</footer>
  </div>;
}
