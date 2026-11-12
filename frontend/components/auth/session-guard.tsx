"use client";
import { useEffect } from "react";
import { AuthError, me } from "@/lib/api/auth";
// Revalidate on focus/visibility and periodically: expired sessions must not leave a stale welcome screen.
export function SessionGuard() {
  useEffect(() => {
    let active = true;
    let pending = false;
    async function check() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try { await me(); }
      catch (error) { if (active && error instanceof AuthError && error.status === 401) window.location.replace("/login/?expired=1"); }
      finally { pending = false; }
    }
    const timer = window.setInterval(check, 60_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); window.removeEventListener("pageshow", check); };
  }, []);
  return null;
}
