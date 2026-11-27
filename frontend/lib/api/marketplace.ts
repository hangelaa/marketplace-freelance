import { csrfToken } from "@/lib/api/auth";

export class MarketplaceError extends Error {
  constructor(message: string, public status: number, public fields: Record<string, string> = {}) {
    super(message); this.name = "MarketplaceError";
  }
}
export async function marketplace<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method || "GET";
  const headers = new Headers(init.headers);
  if (method !== "GET") {
    headers.set("Content-Type", "application/json");
    headers.set("X-CSRFToken", await csrfToken());
  }
  let response: Response;
  try {
    response = await fetch(`/api/marketplace/${path}`, {
      ...init, method, headers, credentials: "same-origin", cache: "no-store",
      signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    });
  } catch (reason) {
    if (init.signal?.aborted) throw reason;
    throw new MarketplaceError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.", 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") window.location.replace("/login/?expired=1");
    const fields: Record<string, string> = {};
    if (data?.fields && typeof data.fields === "object") {
      for (const [key, value] of Object.entries(data.fields)) if (typeof value === "string") fields[key] = value;
    }
    throw new MarketplaceError(typeof data?.error === "string" ? data.error : "درخواست انجام نشد. دوباره تلاش کنید.", response.status, fields);
  }
  if (!data || typeof data !== "object") throw new MarketplaceError("پاسخ سرور قابل دریافت نیست. دوباره تلاش کنید.", 502);
  return data as T;
}
export function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "عملیات انجام نشد. دوباره تلاش کنید.";
}
