"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CircleAlert, KeyRound, LoaderCircle, Mail, MailCheck } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/auth/schema";
import { requestPasswordReset } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm({
  unavailable = false,
}: {
  unavailable?: boolean;
}) {
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const reduced = useReducedMotion();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  async function submit(values: ForgotPasswordValues) {
    setError("");
    try {
      await requestPasswordReset(values);
      setSentTo(values.email);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "درخواست بازیابی انجام نشد. دوباره تلاش کنید.",
      );
    }
  }

  return (
    <motion.div
      className="auth-content"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="login-heading-icon" aria-hidden="true">
        {sentTo ? <MailCheck size={24} strokeWidth={1.7} /> : <KeyRound size={24} strokeWidth={1.7} />}
      </div>
      <span className="eyebrow">بازیابی دسترسی، با پیوند</span>
      <h1 className="form-heading">{sentTo ? "ایمیلت را بررسی کن" : "فراموشی رمز عبور"}</h1>
      {sentTo ? (
        <p className="form-description" role="status">
          اگر حسابی با ایمیل <bdi dir="ltr">{sentTo}</bdi> وجود داشته باشد، لینک بازیابی رمز عبور برایش ارسال می‌شود. پوشهٔ اسپم را هم بررسی کن.
        </p>
      ) : (
        <p className="form-description">
          ایمیلی که با آن حساب ساخته‌ای را وارد کن تا لینک بازیابی رمز عبور را برایت بفرستیم.
        </p>
      )}
      {unavailable && !sentTo && (
        <p className="form-feedback session-feedback" role="status">
          ارتباط با سرور موقتاً قطع است. دوباره تلاش کنید.
        </p>
      )}
      {sentTo ? (
        <div className="login-form">
          <Button className="submit-button" type="button" onClick={() => setSentTo("")}>
            ارسال دوباره با ایمیل دیگر
            <ArrowLeft aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <form className="login-form" onSubmit={handleSubmit(submit)} noValidate aria-busy={isSubmitting}>
          <div className="field-group">
            <label className="field-label" htmlFor="email">آدرس ایمیل</label>
            <div className="input-wrap">
              <Mail className="field-icon" aria-hidden="true" />
              <Input
                {...register("email")}
                id="email"
                type="email"
                autoComplete="email"
                dir="ltr"
                inputMode="email"
                placeholder="you@example.com"
                maxLength={255}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            {errors.email && <p className="field-error" id="email-error">{errors.email.message}</p>}
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
                در حال ارسال…
              </>
            ) : (
              <>
                ارسال لینک بازیابی
                <ArrowLeft aria-hidden="true" />
              </>
            )}
          </Button>
        </form>
      )}
      <p className="signup-prompt">
        رمز عبورت یادت آمد؟{" "}
        <Link href="/login/" className="text-link">
          بازگشت به ورود <ArrowLeft size={14} aria-hidden="true" />
        </Link>
      </p>
    </motion.div>
  );
}
