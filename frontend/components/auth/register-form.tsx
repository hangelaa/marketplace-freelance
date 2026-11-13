"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  CircleAlert,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { registerSchema, type RegisterValues } from "@/lib/auth/schema";
import { register as registerAccount } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function RegisterForm({
  unavailable = false,
}: {
  unavailable?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });
  async function submit(values: RegisterValues) {
    setError("");
    try {
      await registerAccount(values);
      window.location.replace("/welcome/");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "ثبت‌نام انجام نشد. دوباره تلاش کنید.",
      );
    }
  }
  const describedBy = (name: keyof RegisterValues) =>
    errors[name] ? `${name}-error` : undefined;
  return (
    <motion.div
      className="auth-content"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="login-heading-icon" aria-hidden="true">
        <UserRoundPlus size={24} strokeWidth={1.7} />
      </div>
      <span className="eyebrow">شروع مسیر، با پیوند</span>
      <h1 className="form-heading">ساخت حساب کاربری</h1>
      <p className="form-description">
        به پیوند خوش آمدی! برای ساخت حساب، اطلاعات زیر را وارد کن.
      </p>
      {unavailable && (
        <p className="form-feedback session-feedback" role="status">
          ارتباط با سرور موقتاً قطع است. دوباره تلاش کنید.
        </p>
      )}
      <form
        className="login-form"
        onSubmit={handleSubmit(submit)}
        noValidate
        aria-busy={isSubmitting}
      >
        <div className="field-group">
          <label className="field-label" htmlFor="fullName">
            نام و نام خانوادگی
          </label>
          <div className="input-wrap">
            <UserRound className="field-icon" aria-hidden="true" />
            <Input
              {...register("fullName")}
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="محمد شادابی"
              maxLength={200}
              aria-invalid={!!errors.fullName}
              aria-describedby={describedBy("fullName")}
              disabled={isSubmitting}
            />
          </div>
          {errors.fullName && (
            <p className="field-error" id="fullName-error">
              {errors.fullName.message}
            </p>
          )}
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="email">
            آدرس ایمیل
          </label>
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
              aria-describedby={describedBy("email")}
              disabled={isSubmitting}
            />
          </div>
          {errors.email && (
            <p className="field-error" id="email-error">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="password">
            رمز عبور
          </label>
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
              aria-describedby={describedBy("password")}
              disabled={isSubmitting}
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
          {errors.password && (
            <p className="field-error" id="password-error">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="confirmPassword">
            تکرار رمز عبور
          </label>
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
              aria-describedby={describedBy("confirmPassword")}
              disabled={isSubmitting}
            />
          </div>
          {errors.confirmPassword && (
            <p className="field-error" id="confirmPassword-error">
              {errors.confirmPassword.message}
            </p>
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
              در حال ساخت حساب…
            </>
          ) : (
            <>
              ساخت حساب کاربری
              <ArrowLeft aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
      <p className="signup-prompt">
        قبلاً حساب ساخته‌ای؟{" "}
        <Link href="/login/" className="text-link">
          ورود به حساب <ArrowLeft size={14} aria-hidden="true" />
        </Link>
      </p>
    </motion.div>
  );
}
