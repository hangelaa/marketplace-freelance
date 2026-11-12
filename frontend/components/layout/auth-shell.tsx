import type { ReactNode } from "react";
import { Brand } from "../branding/brand";
import { StoryPanel } from "../branding/story-panel";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell" dir="rtl">
      <div className="auth-main">
        <header className="auth-header"><Brand /><span className="auth-header-caption">فضای کارِ مستقل‌ها</span></header>
        <main className="auth-form-region" id="main-content">{children}</main>
        <footer className="auth-footer"><span>پیوند؛ از ایده تا همکاری</span><span className="auth-footer-language"><span aria-hidden="true">◉</span> فارسی</span></footer>
      </div>
      <div className="auth-story-region"><StoryPanel /></div>
    </div>
  );
}
