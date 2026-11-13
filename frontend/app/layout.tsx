import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
export const metadata: Metadata = { title: { default: "پیوند | شروع یک همکاری خوب", template: "%s | پیوند" }, description: "پیوند؛ جایی برای اتصال استعدادهای مستقل و ایده‌های ارزشمند.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body style={{ "--font-vazirmatn": '"Vazirmatn Variable"' } as React.CSSProperties}><a href="#main-content" className="skip-link">رفتن به محتوای اصلی</a>{children}</body></html>;
}
