"use client";
import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { logout, AuthError } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function leave() {
    setPending(true); setError("");
    try { await logout(); window.location.replace("/login/"); }
    catch (reason) {
      if (reason instanceof AuthError && reason.status === 401) { window.location.replace("/login/?expired=1"); return; }
      setError(reason instanceof Error ? reason.message : "خروج انجام نشد. دوباره تلاش کنید."); setPending(false);
    }
  }
  return <div><Button type="button" variant="outline" onClick={leave} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <LogOut />} {pending ? "در حال خروج…" : "خروج از حساب"}</Button>{error && <p className="field-error" role="alert">{error}</p>}</div>;
}
