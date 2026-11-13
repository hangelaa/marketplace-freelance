import "server-only";
import { cookies } from "next/headers";
import { djangoOrigin } from "./proxy";
import type { SessionResult } from "@/types/auth";
export async function getSession(): Promise<SessionResult> {
  const jar = await cookies();
  if (!jar.has("sessionid")) return { status: "anonymous" };
  try {
    const response = await fetch(`${djangoOrigin()}/api/auth/me/`, {
      headers: { Cookie: jar.toString(), Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10_000), redirect: "manual",
    });
    if (response.status === 401) return { status: "anonymous" };
    if (!response.ok) return { status: "unavailable" };
    const user: unknown = await response.json();
    if (!user || typeof user !== "object" || !("email" in user) || !("name" in user) || typeof user.email !== "string" || typeof user.name !== "string") return { status: "unavailable" };
    return { status: "authenticated", user: { email: user.email, name: user.name } };
  } catch { return { status: "unavailable" }; }
}
