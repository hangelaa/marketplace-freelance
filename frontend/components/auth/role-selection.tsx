"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Check, CircleCheck, Compass, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { selectRole } from "@/app/role-selection/actions";
import { roleContent, type OnboardingRole } from "@/lib/auth/onboarding";
import styles from "./role-selection.module.css";

export function RoleSelection({ initialRole, invalid }: { initialRole: OnboardingRole | null; invalid: boolean }) {
  const [role, setRole] = useState(initialRole);
  const [error, action, pending] = useActionState(selectRole, "");
  return <form action={action} aria-busy={pending}>
    <fieldset className={styles.fieldset} disabled={pending}>
      <legend className={styles.legend}>مسیر همکاری</legend>
      <div className={styles.cards}>
        {(["employer", "freelancer"] as const).map((value) => {
          const content = roleContent[value];
          const Icon = value === "employer" ? BriefcaseBusiness : Compass;
          return <label className={styles.card} key={value}>
            <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} aria-labelledby={`${value}-title`} aria-describedby={`${value}-description`} />
            <span className={styles.cardSurface}>
              <span className={styles.cardTop}><span className={`${styles.icon} ${value === "freelancer" ? styles.mint : ""}`}><Icon size={28} strokeWidth={1.6} aria-hidden="true" /></span><span className={styles.indicator} aria-hidden="true">{role === value && <Check size={16} />}</span></span>
              <span id={`${value}-title`} className={styles.title}>{content.title}</span>
              <span id={`${value}-description`} className={styles.description}>{content.description}</span>
              <span className={styles.benefits}>{content.benefits.map(benefit => <span key={benefit}><CircleCheck size={17} aria-hidden="true" />{benefit}</span>)}</span>
              <span className={styles.selection}>{role === value ? "مسیر انتخاب‌شده" : "انتخاب این مسیر"}<ArrowLeft size={16} aria-hidden="true" /></span>
            </span>
          </label>;
        })}
      </div>
    </fieldset>
    {(error || invalid) && <p role="alert" className="form-feedback session-feedback">{error || "یکی از مسیرهای همکاری را انتخاب کن."}</p>}
    <div className={styles.continue}>
      <Button type="submit" className="submit-button" disabled={!role || pending}>{pending ? <><LoaderCircle className="animate-spin" aria-hidden="true" />در حال ادامه…</> : <>ادامه و ساخت حساب<ArrowLeft aria-hidden="true" /></>}</Button>
      <p aria-live="polite">{role ? `ادامه به عنوان ${roleContent[role].title}` : "برای ادامه، یک مسیر را انتخاب کن."}</p>
    </div>
  </form>;
}
