import type { ForgotPasswordValues, LoginValues, RegisterValues } from "@/lib/auth/schema";
import type { AuthUser } from "@/types/auth";
export class AuthError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "AuthError"; }
}
async function request<T>(action: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${action}/`, { ...init, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch { throw new AuthError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.", 0); }
  if (!response.ok) {
    if (response.status === 401 && action === "login") throw new AuthError("ایمیل یا رمز عبور درست نیست. دوباره تلاش کنید.", 401);
    if ((action === "register" || action === "password-reset") && (response.status === 400 || response.status === 409)) {
      const data = await response.json().catch(() => null) as { error?: unknown } | null;
      throw new AuthError(typeof data?.error === "string" ? data.error : (action === "register" ? "ثبت‌نام انجام نشد. اطلاعات را بررسی و دوباره تلاش کنید." : "درخواست بازیابی انجام نشد. ایمیل را بررسی و دوباره تلاش کنید."), response.status);
    }
    if (response.status === 401) throw new AuthError("نشست شما پایان یافته است. دوباره وارد شوید.", 401);
    if (response.status === 403) throw new AuthError("اعتبار امنیتی صفحه تغییر کرده است. دوباره تلاش کنید.", 403);
    throw new AuthError("سرویس ورود در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.", response.status);
  }
  return response.json() as Promise<T>;
}
export async function csrfToken(): Promise<string> {
  await request("csrf");
  const value = document.cookie.split("; ").find((part) => part.startsWith("csrftoken="))?.slice("csrftoken=".length);
  if (!value) throw new AuthError("کوکی امنیتی دریافت نشد. کوکی‌های مرورگر را فعال و صفحه را تازه‌سازی کنید.", 403);
  return decodeURIComponent(value);
}
async function mutate(action: "login" | "logout" | "register" | "password-reset", body: object) {
  const token = await csrfToken();
  return request<{ ok: boolean }>(action, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRFToken": token }, body: JSON.stringify(body) });
}
export const login = (values: LoginValues) => mutate("login", values);
export const register = ({ fullName, email, password }: RegisterValues) => mutate("register", { fullName, email, password });
export const requestPasswordReset = ({ email }: ForgotPasswordValues) => mutate("password-reset", { email });
export const logout = () => mutate("logout", {});
export const me = () => request<AuthUser>("me");
