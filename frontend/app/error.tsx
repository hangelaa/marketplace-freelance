"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main-content" className="welcome-shell"><section className="welcome-card"><h1 className="welcome-title">چیزی درست پیش نرفت</h1><p className="welcome-description">دوباره تلاش کنید. اطلاعات ورود شما ذخیره نشده است.</p><Button onClick={reset}>تلاش دوباره</Button></section></main>; }
