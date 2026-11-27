import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { Brand } from "@/components/branding/brand";
import { WorkspaceShell } from "@/components/marketplace/workspace-shell";
import "./workspace.css";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session.status === "anonymous") redirect("/login/?expired=1");
  if (session.status === "unavailable") return <div className="marketplace"><header className="pm-topbar"><Brand /></header><main id="main-content" className="pm-unavailable"><h1>ارتباط موقتاً برقرار نیست</h1><p>برای نمایش فضای کار، ابتدا باید نشست حساب تأیید شود.</p><form method="get"><button type="submit" className="pm-button">تلاش دوباره</button></form></main></div>;
  return <WorkspaceShell name={session.user.name}>{children}</WorkspaceShell>;
}
