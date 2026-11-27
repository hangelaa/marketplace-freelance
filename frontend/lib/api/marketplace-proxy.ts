import { djangoOrigin } from "@/lib/auth/proxy";

const rules: { pattern: RegExp; methods: string[] }[] = [
  { pattern: /^(categories|skills)\/$/, methods: ["GET"] },
  { pattern: /^my\/(projects|proposals)\/$/, methods: ["GET"] },
  { pattern: /^projects\/$/, methods: ["GET", "POST"] },
  { pattern: /^projects\/[1-9]\d*\/$/, methods: ["GET", "PUT"] },
  { pattern: /^projects\/[1-9]\d*\/publish\/$/, methods: ["POST"] },
  { pattern: /^projects\/[1-9]\d*\/proposals\/$/, methods: ["GET", "POST"] },
  { pattern: /^proposals\/[1-9]\d*\/(accept|reject|withdraw)\/$/, methods: ["POST"] },
];
function json(data: object, status: number) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
export async function proxyMarketplace(request: Request, segments: string[]): Promise<Response> {
  const path = `${segments.join("/")}/`;
  const rule = rules.find(item => item.pattern.test(path));
  if (!rule) return json({ error: "مسیر پیدا نشد." }, 404);
  if (!rule.methods.includes(request.method)) return json({ error: "روش درخواست مجاز نیست." }, 405);
  const write = request.method !== "GET";
  if (write) {
    const url = new URL(request.url);
    const publicOrigin = process.env.FRONTEND_ORIGIN || `${url.protocol}//${request.headers.get("host") || url.host}`;
    if (request.headers.get("origin") !== publicOrigin || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "درخواست امن نیست. صفحه را تازه‌سازی کنید." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "بدنه درخواست باید JSON باشد." }, 415);
  }
  try {
    const origin = djangoOrigin();
    const headers = new Headers({ Accept: "application/json" });
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("Cookie", cookie);
    let body: string | undefined;
    if (write) {
      body = await request.text();
      if (body.length > 128_000) return json({ error: "درخواست بیش از حد بزرگ است." }, 413);
      headers.set("Content-Type", "application/json");
      headers.set("Origin", origin); headers.set("Referer", `${origin}/login/`);
      const csrf = request.headers.get("x-csrftoken");
      if (csrf) headers.set("X-CSRFToken", csrf);
    }
    const query = new URLSearchParams();
    if (path === "projects/" && !write) {
      const incoming = new URL(request.url).searchParams;
      for (const key of ["q", "category", "page", "page_size"]) {
        const value = incoming.get(key);
        if (value !== null) query.set(key, value);
      }
    }
    const suffix = query.size ? `?${query}` : "";
    const upstream = await fetch(`${origin}/api/${path}${suffix}`, { method: request.method, headers, body, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15_000) });
    const response = upstream.status >= 500
      ? json({ error: "سرویس پروژه‌ها در دسترس نیست. کمی بعد دوباره تلاش کنید." }, 503)
      : upstream.headers.get("content-type")?.includes("application/json")
        ? json(await upstream.json(), upstream.status)
        : json({ error: "پاسخ سرور قابل دریافت نیست. صفحه را تازه‌سازی کنید." }, upstream.status === 403 ? 403 : 502);
    for (const cookieValue of upstream.headers.getSetCookie()) response.headers.append("Set-Cookie", cookieValue);
    return response;
  } catch { return json({ error: "ارتباط با سرویس پروژه‌ها برقرار نشد. دوباره تلاش کنید." }, 503); }
}
