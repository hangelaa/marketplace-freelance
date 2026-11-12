"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/auth/schema";
import { confirmPasswordReset } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({
  link,
  unavailable = false,
}: {
  link: { uid: string; token: string } | null;
  unavailable?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const reduced = useReducedMotion();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onTouched",
  });

  async function submit(values: ResetPasswordValues) {
    if (!link) return;
    setError("");
    try {
      await confirmPasswordReset(link, values);
      setDone(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "تغییر رمز عبور انجام نشد. دوباره تلاش کنید.",
      );
    }
  }

  const state = !link ? "invalid" : done ? "done" : "form";
  const Icon = state === "invalid" ? TriangleAlert : state === "done" ? CircleCheck : ShieldCheck;

  return (
    <motion.div
      className="auth-content"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="login-heading-icon" aria-hidden="true">
        <Icon size={24} strokeWidth={1.7} />
      </div>
      <span className="eyebrow">بازیابی دسترسی، با پیوند</span>

      {state === "invalid" && (
        <>
          <h1 className="form-heading">لینک بازیابی نامعتبر است</h1>
          <p className="form-description">
            این لینک کامل نیست یا منقضی شده است. لطفاً دوباره درخواست بازیابی رمز عبور بده.
          </p>
          <div className="login-form">
            <Link href="/forgot-password/" className="submit-button">
              درخواست لینک جدید
              <ArrowLeft aria-hidden="true" />
            </Link>
          </div>
        </>
      )}

      {state === "done" && (
        <>
          <h1 className="form-heading">رمز عبورت تغییر کرد</h1>
          <p className="form-description" role="status">
            رمز عبور جدیدت ذخیره شد. حالا می‌توانی با آن وارد حسابت شوی.
          </p>
          <div className="login-form">
            <Link href="/login/" className="submit-button">
              ورود به حساب کاربری
              <ArrowLeft aria-hidden="true" />
            </Link>
          </div>
        </>
      )}

      {state === "form" && (
        <>
          <h1 className="form-heading">تعیین رمز عبور جدید</h1>
          <p className="form-description">رمز عبور جدیدت را وارد کن و یک بار دیگر تکرارش کن.</p>
          {unavailable && (
            <p className="form-feedback session-feedback" role="status">
              ارتباط با سرور موقتاً قطع است. دوباره تلاش کنید.
            </p>
          )}
          <form className="login-form" onSubmit={handleSubmit(submit)} noValidate aria-busy={isSubmitting}>
            <div className="field-group">
              <label className="field-label" htmlFor="password">رمز عبور جدید</label>
              <div className="input-wrap">
                <LockKeyhole className="field-icon" aria-hidden="true" />
                <Input
                  {...register("password")}
                  id="password"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  dir="ltr"
                  placeholder="حداقل ۸ کاراکتر"
                  maxLength={1024}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  disabled={isSubmitting}
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="field-error" id="password-error">{errors.password.message}</p>}
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="confirmPassword">تکرار رمز عبور جدید</label>
              <div className="input-wrap">
                <LockKeyhole className="field-icon" aria-hidden="true" />
                <Input
                  {...register("confirmPassword")}
                  id="confirmPassword"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  dir="ltr"
                  placeholder="رمز عبور را دوباره وارد کنید"
                  maxLength={1024}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  disabled={isSubmitting}
                />
              </div>
              {errors.confirmPassword && (
                <p className="field-error" id="confirmPassword-error">{errors.confirmPassword.message}</p>
              )}
            </div>
            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  key={error}
                  className="form-feedback"
                  role="alert"
                  initial={reduced ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <CircleAlert size={18} aria-hidden="true" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            <Button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                  در حال ذخیره…
                </>
              ) : (
                <>
                  ذخیرهٔ رمز عبور جدید
                  <ArrowLeft aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
        </>
      )}

      {state !== "done" && (
        <p className="signup-prompt">
          رمز عبورت یادت آمد؟{" "}
          <Link href="/login/" className="text-link">
            بازگشت به ورود <ArrowLeft size={14} aria-hidden="true" />
          </Link>
        </p>
      )}
    </motion.div>
  );
}
