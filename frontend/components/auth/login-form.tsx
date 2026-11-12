"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, CircleAlert } from "lucide-react";
import { loginSchema, type LoginValues } from "@/lib/auth/schema";
import { login } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function LoginForm({ sessionExpired = false, unavailable = false }: { sessionExpired?: boolean; unavailable?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const reduced = useReducedMotion();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" }, mode: "onTouched" });
  async function submit(values: LoginValues) {
    setError("");
    try { await login(values); window.location.replace("/welcome/"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "ورود انجام نشد. دوباره تلاش کنید."); }
  }
  return <motion.div className="auth-content" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32 }}>
    <div className="login-heading-icon" aria-hidden="true"><LockKeyhole size={24} strokeWidth={1.7} /></div>
    <span className="eyebrow">ادامهٔ مسیر، با پیوند</span>
    <h1 className="form-heading">ورود به حساب کاربری</h1>
    <p className="form-description">خوش برگشتی! برای ادامه، ایمیل و رمز عبورت را وارد کن.</p>
    {(sessionExpired || unavailable) && <p className="form-feedback session-feedback" role="status">{unavailable ? "ارتباط با سرور موقتاً قطع است. دوباره تلاش کنید." : "نشست شما پایان یافته است. برای ادامه دوباره وارد شوید."}</p>}
    <form className="login-form" onSubmit={handleSubmit(submit)} noValidate aria-busy={isSubmitting}>
      <div className="field-group">
        <label className="field-label" htmlFor="email">آدرس ایمیل</label>
        <div className="input-wrap"><Mail className="field-icon" aria-hidden="true" /><Input {...register("email")} id="email" type="email" autoComplete="username" dir="ltr" inputMode="email" placeholder="you@example.com" maxLength={255} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} disabled={isSubmitting} /></div>
        {errors.email && <p className="field-error" id="email-error">{errors.email.message}</p>}
      </div>
      <div className="field-group">
        <label className="field-label" htmlFor="password">رمز عبور</label>
        <div className="input-wrap"><LockKeyhole className="field-icon" aria-hidden="true" /><Input {...register("password")} id="password" type={visible ? "text" : "password"} autoComplete="current-password" dir="ltr" placeholder="رمز عبور خود را وارد کنید" maxLength={1024} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} disabled={isSubmitting} /><button type="button" className="password-toggle" aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        {errors.password && <p className="field-error" id="password-error">{errors.password.message}</p>}
        <button type="button" className="text-link forgot-password" onClick={() => setNotice("بازیابی رمز عبور در این مرحله فعال نیست؛ به‌زودی در پیوند.")}>رمز عبور خود را فراموش کرده ای ؟</button>
      </div>
      <AnimatePresence initial={false}>{error && <motion.div key={error} className="form-feedback" role="alert" initial={reduced ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><CircleAlert size={18} aria-hidden="true" />{error}</motion.div>}</AnimatePresence>
      <Button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="animate-spin" aria-hidden="true" />در حال ورود…</> : <>ورود به حساب کاربری<ArrowLeft aria-hidden="true" /></>}</Button>
    </form>
    <p className="signup-prompt">هنوز به پیوند نپیوستی؟ <Link href="/register/" className="text-link">ساخت حساب کاربری <ArrowLeft size={14} aria-hidden="true" /></Link></p>
    <p className="coming-soon" role="status" aria-live="polite">{notice}</p>
    <p className="login-help">برای ورود، از ایمیلی که با آن حساب ساخته‌ای استفاده کن.</p>
  </motion.div>;
}
