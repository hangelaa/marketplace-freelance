"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { marketplace, MarketplaceError, errorMessage } from "@/lib/api/marketplace";
import { dateText, moneyText, numberText, pricingLabels, todayISO, validAmount } from "@/lib/marketplace";
import type { CatalogItem, OwnedProject, Project, ProjectDetail, ProjectPayload, Results } from "@/types/marketplace";
import { useResource, useUnsavedChanges } from "./hooks";
import { ErrorState, FieldError, LoadingState, PageHeading, StatusBadge } from "./primitives";
import styles from "./project-form.module.css";

type Values = Omit<ProjectPayload, "publish">;
type Errors = Record<string, string>;

function valuesOf(project?: ProjectDetail): Values {
  return {
    title: project?.title ?? "", description: project?.description ?? "",
    pricing_type: project?.pricing_type ?? "Fixed", budget: project?.budget ?? "",
    deadline: project?.deadline ?? null,
    category_ids: project?.categories.map(item => item.id) ?? [],
    skill_ids: project?.skills.map(item => item.id) ?? [],
  };
}

export function ProjectForm({ projectId }: { projectId?: number }) {
  // This endpoint enforces Regular-account permission; auth/me and onboarding do not.
  const permission = useResource<Results<OwnedProject>>("my/projects/");
  const project = useResource<ProjectDetail>(projectId === undefined ? null : `projects/${projectId}/`);
  const categories = useResource<Results<CatalogItem>>("categories/");
  const skills = useResource<Results<CatalogItem>>("skills/");
  const retry = () => { void permission.reload(); void project.reload(); void categories.reload(); void skills.reload(); };
  const error = permission.error || project.error || categories.error || skills.error;

  return <div className="pm-page">
    <PageHeading eyebrow="پروژه‌های من" title={projectId === undefined ? "تعریف پروژه جدید" : "ویرایش پروژه"} description="جزئیات همکاری را بنویسید، اطلاعات را بازبینی کنید و سپس ذخیره یا منتشر کنید." />
    {error ? <ErrorState error={error} retry={retry} />
      : permission.loading || project.loading || categories.loading || skills.loading ? <LoadingState />
      : !permission.data || !categories.data || !skills.data || (projectId !== undefined && !project.data) ? <ErrorState error={{ message: "اطلاعات فرم قابل دریافت نیست." }} retry={retry} />
      : project.data && (!project.data.is_owner || !project.data.can_edit) ? <ErrorState error={{ status: 403, message: "فقط مالک می‌تواند پروژه‌های پیش‌نویس یا باز را ویرایش کند." }} />
      : <ProjectEditor key={projectId ?? "new"} initial={project.data ?? undefined} categories={categories.data.results} skills={skills.data.results} />}
  </div>;
}

function CatalogSelect({ name, label, items, selected, onChange, error, required }: {
  name: "category_ids" | "skill_ids"; label: string; items: CatalogItem[];
  selected: number[]; onChange: (ids: number[]) => void; error?: string; required: boolean;
}) {
  const [search, setSearch] = useState("");
  const matches = items.filter(item => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <fieldset className={`pm-field ${styles.catalog}`} aria-describedby={`${name}-hint${error ? ` ${name}-error` : ""}`} aria-invalid={!!error}>
    <legend>{label}{required ? " (حداقل یک مورد)" : " (اختیاری برای پیش‌نویس)"}</legend>
    <p className="pm-field-hint" id={`${name}-hint`}>{numberText(selected.length)} مورد انتخاب شده؛ برای انتشار حداقل یک مورد لازم است.</p>
    <Input type="search" className="pm-input" aria-label={`جستجوی ${label}`} value={search} onChange={event => setSearch(event.target.value)} placeholder={`جستجو در ${label}`} />
    <div className={styles.options}>
      {matches.map(item => <label key={item.id} className={styles.option}>
        <input type="checkbox" name={name} value={item.id} checked={selected.includes(item.id)} onChange={event => onChange(event.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} />
        <span>{item.name}</span>
      </label>)}
      {!items.length ? <p className="pm-muted">هنوز موردی در این فهرست ثبت نشده است.</p> : !matches.length && <p className="pm-muted">موردی مطابق جستجو پیدا نشد. انتخاب‌های قبلی حفظ شده‌اند.</p>}
    </div>
    <FieldError id={`${name}-error`}>{error}</FieldError>
  </fieldset>;
}

function ProjectEditor({ initial, categories, skills }: { initial?: ProjectDetail; categories: CatalogItem[]; skills: CatalogItem[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => valuesOf(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(valuesOf(initial)));
  const [current, setCurrent] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [feedback, setFeedback] = useState("");
  const [blocked, setBlocked] = useState<MarketplaceError | null>(null);
  const [review, setReview] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [uncertainCreation, setUncertainCreation] = useState(false);
  const saving = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const priceLocked = (current?.proposal_count ?? 0) > 0;
  const isOpen = current?.status === "Open";
  useUnsavedChanges(JSON.stringify(values) !== baseline);

  function change<K extends keyof Values>(name: K, value: Values[K]) {
    setValues(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: "" }));
    setFeedback("");
  }

  function validate(publish: boolean): boolean {
    const next: Errors = {};
    if (!values.title.trim() || values.title.trim().length > 200) next.title = "عنوانی با حداکثر ۲۰۰ کاراکتر وارد کنید.";
    if (!values.description.trim() || values.description.trim().length > 20000) next.description = "توضیحات پروژه را با حداکثر ۲۰٬۰۰۰ کاراکتر وارد کنید.";
    if (!validAmount(values.budget)) next.budget = "مبلغی بیشتر از صفر، حداکثر 9999999999.99 و با حداکثر دو رقم اعشار وارد کنید.";
    if (values.deadline) {
      const parsed = new Date(`${values.deadline}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(values.deadline) || values.deadline < todayISO() || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== values.deadline) next.deadline = "تاریخ میلادی معتبر امروز تهران یا پس از آن را انتخاب کنید.";
    }
    if (publish || isOpen) {
      if (!values.category_ids.length) next.category_ids = "حداقل یک دسته‌بندی انتخاب کنید.";
      if (!values.skill_ids.length) next.skill_ids = "حداقل یک مهارت انتخاب کنید.";
    }
    setErrors(next);
    if (Object.keys(next).length) {
      setFeedback("خطاهای مشخص‌شده را اصلاح کنید. اطلاعات شما حفظ شده است.");
      setReview(null);
      requestAnimationFrame(() => feedbackRef.current?.focus());
      return false;
    }
    return true;
  }

  function prepare(publish: boolean) {
    setFeedback("");
    if (validate(publish)) { setReview(publish); requestAnimationFrame(() => feedbackRef.current?.focus()); }
  }

  async function save() {
    if (saving.current || uncertainCreation || review === null || !validate(review)) return;
    saving.current = true;
    setPending(true); setFeedback(""); setErrors({});
    let saved = false;
    try {
      const payload: Values = { ...values, title: values.title.trim(), description: values.description.trim(), budget: values.budget.trim(), deadline: values.deadline || null };
      let result: Project;
      if (current) {
        result = await marketplace<Project>(`projects/${current.id}/`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        result = await marketplace<Project>("projects/", { method: "POST", body: JSON.stringify({ ...payload, publish: review }) });
      }
      saved = true;
      // Preserve the created ID before readback so a retry cannot create a duplicate.
      setCurrent({ ...result, can_edit: true, can_submit_proposal: false, my_proposal: null, proposal_count: current?.proposal_count ?? 0 });
      setBaseline(JSON.stringify(values));
      let confirmed = await marketplace<ProjectDetail>(`projects/${result.id}/`);
      setCurrent(confirmed);
      if (review && confirmed.status === "Draft") {
        await marketplace<Project>(`projects/${result.id}/publish/`, { method: "POST", body: JSON.stringify({}) });
        confirmed = await marketplace<ProjectDetail>(`projects/${result.id}/`);
        setCurrent(confirmed);
        if (confirmed.status !== "Open") throw new MarketplaceError("وضعیت انتشار تغییر کرده است؛ اطلاعات پروژه را دوباره بررسی کنید.", 409);
      }
      setBaseline(JSON.stringify(values));
      router.push("/my/projects/");
      router.refresh();
    } catch (reason) {
      const error = reason instanceof MarketplaceError ? reason : new MarketplaceError(errorMessage(reason), 0);
      if (!saved && !current && (error.status === 0 || error.status >= 500)) setUncertainCreation(true);
      setErrors(error.fields);
      setFeedback(`${saved ? "اطلاعات ذخیره شد، اما تأیید نهایی یا انتشار کامل نشد. از همین فرم دوباره تلاش کنید. " : ""}${error.message}`);
      if (error.status === 403) setBlocked(error);
      if (current && !saved && error.status === 409) {
        try {
          const fresh = await marketplace<ProjectDetail>(`projects/${current.id}/`);
          setCurrent(fresh);
          if ((fresh.proposal_count ?? 0) > 0) setValues(previous => ({ ...previous, budget: fresh.budget, pricing_type: fresh.pricing_type }));
        } catch { /* Keep the draft and original error; the next save remains server-validated. */ }
      }
      if (Object.keys(error.fields).length) setReview(null);
      requestAnimationFrame(() => feedbackRef.current?.focus());
    } finally { saving.current = false; setPending(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); prepare(false); }
  if (blocked) return <ErrorState error={blocked} />;
  if (current && (!current.is_owner || !current.can_edit)) return <ErrorState error={{ status: 403, message: "این پروژه دیگر قابل ویرایش نیست. اطلاعات ذخیره‌شده را در پروژه‌های من بررسی کنید." }} />;

  return <div className="pm-page">
    <div ref={feedbackRef} tabIndex={-1} className={styles.feedback}>
      {feedback && <p role="alert" className="pm-feedback pm-feedback--error">{feedback}</p>}
      {uncertainCreation && <p role="alert" className="pm-feedback pm-feedback--error">نتیجه ساخت پروژه مشخص نیست؛ برای جلوگیری از ایجاد پروژه تکراری، درخواست دوباره ارسال نمی‌شود. ابتدا <Link href="/my/projects/" className="pm-link">پروژه‌های من</Link> را بررسی کنید.</p>}
      {review !== null && <h2 className="pm-section-title">بازبینی پیش از {review ? "انتشار" : "ذخیره"}</h2>}
    </div>
    {current && <div className="pm-actions"><StatusBadge status={current.status} /><span className="pm-muted">وضعیت فعلی پروژه</span></div>}
    {review === null ? <form className="pm-panel" onSubmit={submit} noValidate>
      <fieldset disabled={pending || uncertainCreation} className={styles.fields}>
        <section className="pm-panel-body pm-form-section">
          <h2 className="pm-section-title">درباره پروژه</h2>
          <div className="pm-field"><label htmlFor="project-title">عنوان پروژه</label>
            <Input id="project-title" name="title" className="pm-input" value={values.title} maxLength={200} required aria-invalid={!!errors.title} aria-describedby="title-error" onChange={event => change("title", event.target.value)} />
            <FieldError id="title-error">{errors.title}</FieldError>
          </div>
          <div className="pm-field"><label htmlFor="project-description">شرح پروژه و نیازمندی‌ها</label>
            <textarea id="project-description" name="description" className={`pm-input ${styles.description}`} rows={9} maxLength={20000} required value={values.description} aria-invalid={!!errors.description} aria-describedby="description-hint description-error" onChange={event => change("description", event.target.value)} />
            <p id="description-hint" className="pm-field-hint">هدف، خروجی مورد انتظار، نیازمندی‌ها و معیار تحویل را روشن بنویسید. {numberText(values.description.length)} از ۲۰٬۰۰۰ کاراکتر</p>
            <FieldError id="description-error">{errors.description}</FieldError>
          </div>
        </section>
        <section className="pm-panel-body pm-form-section">
          <h2 className="pm-section-title">قیمت و زمان‌بندی</h2>
          {priceLocked && <p className="pm-feedback">پس از دریافت پیشنهاد، نوع قیمت‌گذاری و مبلغ پروژه قفل می‌شود.</p>}
          <div className="pm-grid">
            <div className="pm-field"><label htmlFor="project-pricing">نوع قیمت‌گذاری</label>
              <select id="project-pricing" name="pricing_type" className="pm-input" value={values.pricing_type} disabled={priceLocked} aria-invalid={!!errors.pricing_type} aria-describedby="pricing_type-error" onChange={event => change("pricing_type", event.target.value === "Hourly" ? "Hourly" : "Fixed")}>
                <option value="Fixed">مبلغ ثابت</option><option value="Hourly">نرخ ساعتی</option>
              </select><FieldError id="pricing_type-error">{errors.pricing_type}</FieldError>
            </div>
            <div className="pm-field"><label htmlFor="project-budget">{pricingLabels[values.pricing_type]}</label>
              <Input id="project-budget" name="budget" className="pm-input" dir="ltr" inputMode="decimal" value={values.budget} disabled={priceLocked} required aria-invalid={!!errors.budget} aria-describedby="budget-hint budget-error" onChange={event => change("budget", event.target.value)} />
              <p id="budget-hint" className="pm-field-hint">واحد پول در سامانه مشخص نشده است. عدد را با ارقام لاتین وارد کنید.</p>
              <FieldError id="budget-error">{errors.budget}</FieldError>
            </div>
            <div className="pm-field"><label htmlFor="project-deadline">مهلت تحویل (اختیاری)</label>
              <Input id="project-deadline" name="deadline" className="pm-input" type="date" dir="ltr" min={todayISO()} value={values.deadline ?? ""} aria-invalid={!!errors.deadline} aria-describedby="deadline-hint deadline-error" onChange={event => change("deadline", event.target.value || null)} />
              <p id="deadline-hint" className="pm-field-hint">تاریخ میلادی؛ امروز تهران یا آینده. برای حذف تاریخ، فیلد را خالی کنید.</p>
              <FieldError id="deadline-error">{errors.deadline}</FieldError>
            </div>
          </div>
        </section>
        <section className="pm-panel-body pm-form-section">
          <h2 className="pm-section-title">دسته‌بندی و مهارت‌ها</h2>
          <div className="pm-grid">
            <CatalogSelect name="category_ids" label="دسته‌بندی‌ها" items={categories} selected={values.category_ids} onChange={ids => change("category_ids", ids)} error={errors.category_ids} required={isOpen} />
            <CatalogSelect name="skill_ids" label="مهارت‌ها" items={skills} selected={values.skill_ids} onChange={ids => change("skill_ids", ids)} error={errors.skill_ids} required={isOpen} />
          </div>
        </section>
        <div className="pm-panel-body pm-actions">
          {isOpen ? <Button type="submit" className="pm-button">بازبینی تغییرات</Button> : <>
            <Button type="button" className="pm-button" onClick={() => prepare(true)}>بازبینی و انتشار</Button>
            <Button type="submit" variant="outline" className="pm-button pm-button--secondary">بازبینی و ذخیره پیش‌نویس</Button>
          </>}
          <Link href="/my/projects/" className="pm-button pm-button--secondary">انصراف</Link>
        </div>
      </fieldset>
    </form> : <section className="pm-panel" aria-label="بازبینی پروژه">
      <div className={`pm-panel-body pm-form-section ${styles.review}`}>
        <h3 className="pm-section-title">{values.title}</h3>
        <p className={`pm-text ${styles.preview}`}>{values.description}</p>
        <dl className={styles.summary}>
          <div><dt>نوع قیمت‌گذاری</dt><dd>{pricingLabels[values.pricing_type]}</dd></div>
          <div><dt>مبلغ / نرخ</dt><dd>{moneyText(values.budget.trim())} — واحد پول مشخص نشده</dd></div>
          <div><dt>مهلت تحویل</dt><dd>{dateText(values.deadline)}</dd></div>
          <div><dt>دسته‌بندی‌ها</dt><dd>{categories.filter(item => values.category_ids.includes(item.id)).map(item => item.name).join("، ") || "انتخاب نشده"}</dd></div>
          <div><dt>مهارت‌ها</dt><dd>{skills.filter(item => values.skill_ids.includes(item.id)).map(item => item.name).join("، ") || "انتخاب نشده"}</dd></div>
        </dl>
        <p className="pm-feedback">{review ? "پس از تأیید، پروژه برای دریافت پیشنهاد منتشر می‌شود." : isOpen ? "تغییرات روی پروژه منتشرشده ذخیره می‌شود؛ پروژه همچنان برای پیشنهاد باز می‌ماند." : "پروژه به‌صورت پیش‌نویس ذخیره می‌شود و فقط برای شما قابل مشاهده است."}</p>
        <div className="pm-actions">
          <Button type="button" className="pm-button" disabled={pending || uncertainCreation} onClick={() => void save()}>{pending ? "در حال ذخیره…" : review ? "تأیید و انتشار پروژه" : "تأیید و ذخیره"}</Button>
          <Button type="button" variant="outline" className="pm-button pm-button--secondary" disabled={pending} onClick={() => setReview(null)}>بازگشت به ویرایش</Button>
        </div>
      </div>
    </section>}
  </div>;
}
