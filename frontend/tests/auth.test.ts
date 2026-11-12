import test from "node:test";
import assert from "node:assert/strict";
import { loginSchema } from "../lib/auth/schema";
import { proxyAuth } from "../lib/auth/proxy";

test("credentials validation rejects empty and malformed fields without changing passwords", () => {
  assert.equal(loginSchema.safeParse({ email: "", password: "" }).success, false);
  assert.equal(loginSchema.safeParse({ email: "invalid", password: "valid" }).success, false);
  assert.deepEqual(loginSchema.parse({ email: "  user@example.test ", password: " spaced " }), { email: "user@example.test", password: " spaced " });
});

test("proxy rejects cross-origin writes before touching Django", async () => {
  let called = false;
  const response = await proxyAuth(new Request("http://localhost:3000/api/auth/login/", { method: "POST", headers: { origin: "https://attacker.test" }, body: "{}" }), "login", async () => { called = true; return new Response(); });
  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test("development origin uses the actual Host rather than Next's normalized internal hostname", async () => {
  const response = await proxyAuth(new Request("http://localhost:3000/api/auth/login/", {
    method: "POST", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "Content-Type": "application/json" }, body: "{}",
  }), "login", async () => new Response('{"error":"empty"}', { status: 400, headers: { "Content-Type": "application/json" } }));
  assert.equal(response.status, 400);
});

test("proxy requires origin and restricts action and methods", async () => {
  assert.equal((await proxyAuth(new Request("http://localhost:3000/api/auth/login/", { method: "POST" }), "login")).status, 403);
  assert.equal((await proxyAuth(new Request("http://localhost:3000/api/auth/unknown/"), "unknown")).status, 404);
  assert.equal((await proxyAuth(new Request("http://localhost:3000/api/auth/login/"), "login")).status, 405);
});

test("proxy forwards CSRF and session cookies without weakening flags, and maps checked origin", async () => {
  let captured: RequestInit | undefined;
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", "sessionid=opaque; HttpOnly; Path=/; SameSite=Lax; Secure");
  headers.append("Set-Cookie", "csrftoken=rotated; Path=/; SameSite=Lax; Secure");
  const response = await proxyAuth(new Request("https://market.test/api/auth/login/", { method: "POST", headers: { origin: "https://market.test", cookie: "csrftoken=token", "X-CSRFToken": "token", "Content-Type": "application/json" }, body: '{"email":"x@example.test","password":"x"}' }), "login", async (_url, init) => { captured = init; return new Response('{"ok":true,"next":"/welcome/"}', { headers }); });
  const sent = new Headers(captured?.headers);
  assert.equal(sent.get("X-CSRFToken"), "token");
  assert.equal(sent.get("cookie"), "csrftoken=token");
  assert.equal(sent.get("origin"), "http://127.0.0.1:8000");
  assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
  assert.match(response.headers.get("set-cookie")!, /Secure/);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("CSRF bootstrap uses existing Django login page and preserves Set-Cookie", async () => {
  const response = await proxyAuth(new Request("http://localhost:3000/api/auth/csrf/"), "csrf", async (url) => {
    assert.equal(String(url), "http://127.0.0.1:8000/login/");
    return new Response("<html></html>", { headers: { "Set-Cookie": "csrftoken=token; Path=/; SameSite=Lax" } });
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie")!, /csrftoken=token/);
});

test("backend outages return safe Persian feedback rather than HTML or internals", async () => {
  const response = await proxyAuth(new Request("http://localhost:3000/api/auth/me/"), "me", async () => { throw new Error("private internal error"); });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private internal error/);
});
