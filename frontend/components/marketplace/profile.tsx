"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Mail, MapPin, PencilLine, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { marketplace, MarketplaceError, errorMessage } from "@/lib/api/marketplace";
import { numberText } from "@/lib/marketplace";
import type { CatalogItem, Profile, ProfilePayload, Results } from "@/types/marketplace";
import { useResource, useUnsavedChanges } from "./hooks";
import { ErrorState, FieldError, LoadingState, PageHeading } from "./primitives";
import styles from "./project-form.module.css";

type Values = { first_name: string; last_name: string; professional_title: string; bio: string; location: string; skill_ids: number[] };
type FieldName = keyof Values;

const limits: Record<Exclude<FieldName, "skill_ids">, number> = { first_name: 100, last_name: 100, professional_title: 150, bio: 2000, location: 150 };
const fieldIds: Record<FieldName, string> = { first_name: "profile-first-name", last_name: "profile-last-name", professional_title: "profile-title", bio: "profile-bio", location: "profile-location", skill_ids: "profile-skill-search" };

function toValues(profile: Profile): Values {
  return {
    first_name: profile.first_name || "", last_name: profile.last_name || "",
    professional_title: profile.professional_title || "", bio: profile.bio || "", location: profile.location || "",
    skill_ids: profile.skills.map(skill => skill.id),
  };
}

export function ProfileView() {
  const profile = useResource<Profile>("profile/");
  const skills = useResource<Results<CatalogItem>>("skills/");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<Profile | null>(null);
  const [success, setSuccess] = useState("");
  const current = saved ?? profile.data;

  if (profile.error) return <ErrorState error={profile.error.status === 403 ? { status: 403, message: "حساب ادمین پروفایل کاربری ندارد؛ پروفایل فقط برای حساب‌های عادی است." } : profile.error} retry={() => void profile.reload()} />;
  if (!current || (editing && !skills.data && !skills.error)) return <LoadingState label="در حال دریافت پروفایل…" />;

  if (editing) {
    if (skills.error || !skills.data) return <ErrorState error={skills.error ?? { message: "فهرست مهارت‌ها دریافت نشد." }} retry={() => void skills.reload()} />;
    return <ProfileEditor profile={current} skills={skills.data.results} onCancel={() => setEditing(false)} onSaved={next => { setSaved(next); setEditing(false); setSuccess("پروفایل با موفقیت ذخیره شد."); }} />;
  }

  const fullName = `${current.first_name} ${current.last_name}`.trim();
  return <div className="pm-page">
    <PageHeading eyebrow="حساب کاربری" title="پروفایل من" description="این اطلاعات هنگام ارسال پیشنهاد به کارفرما نمایش داده می‌شود." action={<Button type="button" className="pm-button" onClick={() => { setSuccess(""); setEditing(true); }}><PencilLine aria-hidden="true" />ویرایش پروفایل</Button>} />
    {success && <p role="status" className="pm-feedback pm-feedback--success">{success}</p>}
    <section className="pm-panel" aria-labelledby="profile-identity">
      <div className="pm-panel-header"><div><h2 id="profile-identity"><UserRound size={20} aria-hidden="true" /> <bdi>{fullName || "بدون نام"}</bdi></h2><p className="pm-muted" dir="auto">{current.professional_title || "عنوان حرفه‌ای ثبت نشده است."}</p></div></div>
      <div className="pm-panel-body pm-stack">
        <dl className="pm-card-meta">
          <div><dt><Mail size={14} aria-hidden="true" /> ایمیل</dt><dd><bdi dir="ltr">{current.email}</bdi></dd></div>
          <div><dt><MapPin size={14} aria-hidden="true" /> محل</dt><dd dir="auto">{current.location || "ثبت نشده"}</dd></div>
        </dl>
        <div><h3 className="pm-section-title">معرفی کوتاه</h3><p className="pm-text" dir="auto">{current.bio || "هنوز معرفی‌ای ننوشته‌ای. با یک معرفی کوتاه، کارفرما راحت‌تر تو را می‌شناسد."}</p></div>
        <div><h3 className="pm-section-title">مهارت‌ها</h3><div className="pm-tags" aria-label="مهارت‌های من">{current.skills.length ? current.skills.map(skill => <span key={skill.id} className="pm-tag" dir="auto">{skill.name}</span>) : <span className="pm-muted">مهارتی انتخاب نشده است.</span>}</div></div>
      </div>
    </section>
  </div>;
}

function ProfileEditor({ profile, skills, onCancel, onSaved }: { profile: Profile; skills: CatalogItem[]; onCancel: () => void; onSaved: (profile: Profile) => void }) {
  const router = useRouter();
  const [initial] = useState(() => toValues(profile));
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [skillSearch, setSkillSearch] = useState("");
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChanges(dirty && !pending);

  function change<K extends FieldName>(name: K, value: Values[K]) {
    setValues(previous => ({ ...previous, [name]: value }));
    if (errors[name]) setErrors(previous => ({ ...previous, [name]: undefined }));
  }

  function validate(): Partial<Record<FieldName, string>> {
    const next: Partial<Record<FieldName, string>> = {};
    if (!values.first_name.trim()) next.first_name = "نام را وارد کنید.";
    if (!values.last_name.trim()) next.last_name = "نام خانوادگی را وارد کنید.";
    for (const [name, max] of Object.entries(limits) as [Exclude<FieldName, "skill_ids">, number][]) {
      if (!next[name] && values[name].trim().length > max) next[name] = `حداکثر ${numberText(max)} کاراکتر مجاز است.`;
    }
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    setFormError("");
    const next = validate();
    setErrors(next);
    const first = (Object.keys(next) as FieldName[])[0];
    if (first) { requestAnimationFrame(() => document.getElementById(fieldIds[first])?.focus()); return; }
    const payload: ProfilePayload = {
      first_name: values.first_name.trim(), last_name: values.last_name.trim(),
      professional_title: values.professional_title.trim() || null, bio: values.bio.trim() || null,
      location: values.location.trim() || null, skill_ids: values.skill_ids,
    };
    busy.current = true; setPending(true);
    try {
      const saved = await marketplace<Profile>("profile/", { method: "PUT", body: JSON.stringify(payload) });
      onSaved(saved);
      router.refresh(); // نام نمایش‌داده‌شده در نوار بالا از نشست سرور دوباره خوانده شود
    } catch (reason) {
      if (reason instanceof MarketplaceError && Object.keys(reason.fields).length) {
        setErrors(reason.fields as Partial<Record<FieldName, string>>);
        const key = Object.keys(reason.fields)[0] as FieldName;
        if (fieldIds[key]) requestAnimationFrame(() => document.getElementById(fieldIds[key])?.focus());
      }
      setFormError(errorMessage(reason));
    } finally { busy.current = false; setPending(false); }
  }

  const matches = skills.filter(skill => skill.name.toLocaleLowerCase().includes(skillSearch.trim().toLocaleLowerCase()));
  const describedBy = (name: FieldName, hint = false) => [hint ? `${fieldIds[name]}-hint` : "", errors[name] ? `${fieldIds[name]}-error` : ""].filter(Boolean).join(" ") || undefined;

  return <div className="pm-page">
    <PageHeading eyebrow="حساب کاربری" title="ویرایش پروفایل" description="فیلدهای ستاره‌دار الزامی هستند. ایمیل شناسه ورود است و از اینجا تغییر نمی‌کند." />
    {formError && <p role="alert" className="pm-feedback pm-feedback--error">{formError}</p>}
    <form className="pm-panel" onSubmit={submit} noValidate aria-busy={pending}>
      <fieldset className={`pm-panel-body ${styles.fields}`} disabled={pending}>
        <section>
          <div className="pm-grid">
            <div className="pm-field"><label htmlFor={fieldIds.first_name}>نام *</label><Input id={fieldIds.first_name} className="pm-input" autoComplete="given-name" dir="auto" required maxLength={limits.first_name} value={values.first_name} onChange={event => change("first_name", event.target.value)} aria-invalid={!!errors.first_name} aria-describedby={describedBy("first_name")} /><FieldError id={`${fieldIds.first_name}-error`}>{errors.first_name}</FieldError></div>
            <div className="pm-field"><label htmlFor={fieldIds.last_name}>نام خانوادگی *</label><Input id={fieldIds.last_name} className="pm-input" autoComplete="family-name" dir="auto" required maxLength={limits.last_name} value={values.last_name} onChange={event => change("last_name", event.target.value)} aria-invalid={!!errors.last_name} aria-describedby={describedBy("last_name")} /><FieldError id={`${fieldIds.last_name}-error`}>{errors.last_name}</FieldError></div>
          </div>
          <div className="pm-field"><label htmlFor="profile-email">ایمیل</label><Input id="profile-email" className="pm-input pm-readonly" dir="ltr" value={profile.email} readOnly aria-describedby="profile-email-hint" /><p id="profile-email-hint" className="pm-field-hint">ایمیل قابل تغییر نیست.</p></div>
          <div className="pm-grid">
            <div className="pm-field"><label htmlFor={fieldIds.professional_title}>عنوان حرفه‌ای</label><Input id={fieldIds.professional_title} className="pm-input" dir="auto" placeholder="مثلاً توسعه‌دهنده فرانت‌اند" maxLength={limits.professional_title} value={values.professional_title} onChange={event => change("professional_title", event.target.value)} aria-invalid={!!errors.professional_title} aria-describedby={describedBy("professional_title")} /><FieldError id={`${fieldIds.professional_title}-error`}>{errors.professional_title}</FieldError></div>
            <div className="pm-field"><label htmlFor={fieldIds.location}>محل</label><Input id={fieldIds.location} className="pm-input" dir="auto" placeholder="مثلاً تهران" maxLength={limits.location} value={values.location} onChange={event => change("location", event.target.value)} aria-invalid={!!errors.location} aria-describedby={describedBy("location")} /><FieldError id={`${fieldIds.location}-error`}>{errors.location}</FieldError></div>
          </div>
          <div className="pm-field"><label htmlFor={fieldIds.bio}>معرفی کوتاه (Bio)</label><textarea id={fieldIds.bio} className={`pm-input ${styles.description}`} dir="auto" rows={6} maxLength={limits.bio} value={values.bio} onChange={event => change("bio", event.target.value)} aria-invalid={!!errors.bio} aria-describedby={describedBy("bio", true)} /><p id={`${fieldIds.bio}-hint`} className="pm-field-hint">{numberText(values.bio.length)} از {numberText(limits.bio)} کاراکتر</p><FieldError id={`${fieldIds.bio}-error`}>{errors.bio}</FieldError></div>
          <fieldset className={`pm-field ${styles.catalog}`} aria-describedby={describedBy("skill_ids", true)} aria-invalid={!!errors.skill_ids}>
            <legend>مهارت‌ها</legend>
            <p className="pm-field-hint" id={`${fieldIds.skill_ids}-hint`}>{numberText(values.skill_ids.length)} مهارت انتخاب شده</p>
            <Input id={fieldIds.skill_ids} type="search" className="pm-input" aria-label="جستجوی مهارت‌ها" value={skillSearch} onChange={event => setSkillSearch(event.target.value)} placeholder="جستجو در مهارت‌ها" />
            <div className={styles.options}>
              {matches.map(skill => <label key={skill.id} className={styles.option}>
                <input type="checkbox" name="skill_ids" value={skill.id} checked={values.skill_ids.includes(skill.id)} onChange={event => change("skill_ids", event.target.checked ? [...values.skill_ids, skill.id] : values.skill_ids.filter(id => id !== skill.id))} />
                <span dir="auto">{skill.name}</span>
              </label>)}
              {!skills.length ? <p className="pm-muted">هنوز مهارتی در سامانه ثبت نشده است.</p> : !matches.length && <p className="pm-muted">مهارتی مطابق جستجو پیدا نشد. انتخاب‌های قبلی حفظ شده‌اند.</p>}
            </div>
            <FieldError id={`${fieldIds.skill_ids}-error`}>{errors.skill_ids}</FieldError>
          </fieldset>
          <div className="pm-actions">
            <Button type="submit" className="pm-button" disabled={pending}>{pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}{pending ? "در حال ذخیره…" : "ذخیره پروفایل"}</Button>
            <Button type="button" variant="outline" className="pm-button pm-button--secondary" disabled={pending} onClick={() => { if (!dirty || window.confirm("تغییرات ذخیره نشده‌اند. انصراف می‌دهید؟")) onCancel(); }}>انصراف</Button>
          </div>
        </section>
      </fieldset>
    </form>
  </div>;
}
