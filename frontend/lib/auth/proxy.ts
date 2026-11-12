// Server-side only: imported by the Route Handler, never by client components.
const unavailable = "ارتباط با سرور برقرار نشد. لطفاً کمی بعد دوباره تلاش کنید.";
export function djangoOrigin(): string {
  const url = new URL(process.env.DJANGO_API_ORIGIN || "http://127.0.0.1:8000");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("DJANGO_API_ORIGIN must be an HTTP(S) origin without credentials or path.");
  }
  return url.origin;
}
function json(data: object, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
export async function proxyAuth(request: Request, action: string, transport: typeof fetch = fetch): Promise<Response> {
  if (!["login", "logout", "register", "password-reset", "password-reset-confirm", "me", "csrf"].includes(action)) return json({ error: "مسیر پیدا نشد." }, 404);
  const write = ["login", "logout", "register", "password-reset", "password-reset-confirm"].includes(action);
  if (request.method !== (write ? "POST" : "GET")) return json({ error: "روش درخواست مجاز نیست." }, 405);
  // Validate the browser's public origin BEFORE mapping it to the internal hop.
  // No wildcard trusted origins, CSRF exemption, or client-supplied upstream URL.
  if (write) {
    const requestUrl = new URL(request.url);
    // Next may normalize request.url to localhost even when the browser uses 127.0.0.1.
    // Host comes from the HTTP request, never from untrusted X-Forwarded-Host.
    // Production must pin FRONTEND_ORIGIN and restrict Host at the ingress.
    const publicOrigin = process.env.FRONTEND_ORIGIN || `${requestUrl.protocol}//${request.headers.get("host") || requestUrl.host}`;
    if (request.headers.get("origin") !== publicOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ error: "درخواست امن نیست. صفحه را تازه‌سازی کنید." }, 403);
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "درخواست نامعتبر است." }, 415);
  }
  try {
    const origin = djangoOrigin();
    const headers = new Headers({ Accept: "application/json" });
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("Cookie", cookie);
    let body: string | undefined;
    if (write) {
      body = await request.text();
      if (body.length > 8192) return json({ error: "درخواست بیش از حد بزرگ است." }, 413);
      headers.set("Content-Type", "application/json");
      headers.set("Origin", origin);
      headers.set("Referer", `${origin}/login/`);
      const token = request.headers.get("x-csrftoken");
      if (token) headers.set("X-CSRFToken", token);
    }
    const upstream = await transport(`${origin}${action === "csrf" ? "/login/" : `/api/auth/${action}/`}`, {
      method: request.method, headers, body, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10_000),
    });
    const response = action === "csrf" && (upstream.ok || upstream.status === 302)
      ? json({ ok: true })
      : upstream.status >= 500 ? json({ error: unavailable }, 503)
      : upstream.status === 403 ? json({ error: "نشست امن شما تازه‌سازی شده است. دوباره تلاش کنید." }, 403)
      : upstream.headers.get("content-type")?.includes("application/json")
        ? json(await upstream.json(), upstream.status)
        : json({ error: unavailable }, 502);
    // Preserve each independent Set-Cookie including HttpOnly, Secure, expiry and SameSite.
    for (const value of upstream.headers.getSetCookie()) response.headers.append("Set-Cookie", value);
    return response;
  } catch { return json({ error: unavailable }, 503); }
}
