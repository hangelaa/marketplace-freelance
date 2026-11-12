// Read-only/data-validation smoke check against the unmodified existing Django API.
// No valid credentials, registration, or database writes. Requires frontend + Django.
import assert from "node:assert/strict";
const origin = process.env.SMOKE_ORIGIN || "http://127.0.0.1:3000";
const page = await fetch(`${origin}/login/`);
assert.equal(page.status, 200);
const bootstrap = await fetch(`${origin}/api/auth/csrf/`);
assert.equal(bootstrap.status, 200);
const csrfCookie = bootstrap.headers.getSetCookie().find(value => value.startsWith("csrftoken="))?.split(";")[0];
assert.ok(csrfCookie, "Django must issue its existing CSRF cookie");
const token = csrfCookie.slice("csrftoken=".length);
for (const [label, url, init, expected] of [
  ["anonymous identity", "/api/auth/me/", {}, 401],
  ["empty credentials rejected by existing Django view", "/api/auth/login/", { method: "POST", headers: { Origin: origin, Cookie: csrfCookie, "X-CSRFToken": token, "Content-Type": "application/json" }, body: "{}" }, 400],
  ["Django rejects missing CSRF", "/api/auth/login/", { method: "POST", headers: { Origin: origin, Cookie: csrfCookie, "Content-Type": "application/json" }, body: "{}" }, 403],
]) {
  const response = await fetch(`${origin}${url}`, init);
  assert.equal(response.status, expected, `${label}: ${await response.text()}`);
  console.log(`${label}: ${response.status}`);
}
console.log("Existing Django API smoke checks passed; these do NOT verify SQL Server authentication.");
