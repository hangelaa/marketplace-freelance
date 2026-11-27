"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { marketplace, MarketplaceError, errorMessage } from "@/lib/api/marketplace";
import { dateText, moneyText, numberText, pricingLabels, validAmount } from "@/lib/marketplace";
import type { ProjectDetail, ProposalPayload, ReceivedProposal, Results } from "@/types/marketplace";
import { useResource, useUnsavedChanges } from "./hooks";
import { ConfirmDialog, EmptyState, ErrorState, FieldError, LoadingState, PageHeading, StatusBadge } from "./primitives";
import styles from "./project-detail.module.css";

type Action = { kind: "publish" } | { kind: "submit"; payload: ProposalPayload } | { kind: "accept" | "reject"; proposal: ReceivedProposal };
type Sort = "newest" | "amount" | "days";

export function ProjectDetailView({ projectId }: { projectId: number }) {
  return <ProjectDetailContent key={projectId} projectId={projectId} />;
}

function ProjectDetailContent({ projectId }: { projectId: number }) {
  const detail = useResource<ProjectDetail>(Number.isSafeInteger(projectId) && projectId > 0 ? `projects/${projectId}/` : null);
  const project = detail.data;
  const received = useResource<Results<ReceivedProposal>>(project?.is_owner ? `projects/${projectId}/proposals/` : null);
  const [sort, setSort] = useState<Sort>("newest");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("");
  const [hours, setHours] = useState("");
  const [letter, setLetter] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [action, setAction] = useState<Action | null>(null);
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const busy = useRef(false);
  const [applied, setApplied] = useState(false);
  const refreshing = useRef(false);
  const anchored = useRef(false);
  useEffect(() => {
    if (!anchored.current && project?.is_owner && !received.loading && location.hash === "#proposals") {
      document.getElementById("proposals")?.scrollIntoView();
      anchored.current = true;
    }
  }, [project?.is_owner, received.loading]);
  const dirty = !!(amount || days || hours || letter) && !project?.my_proposal;
  useUnsavedChanges(dirty);

  const proposals = useMemo(() => [...(received.data?.results ?? [])].sort((a, b) => {
    if (sort === "amount") return Number(a.amount) - Number(b.amount) || b.id - a.id;
    if (sort === "days") return a.estimated_days - b.estimated_days || b.id - a.id;
    return b.created_at.localeCompare(a.created_at) || b.id - a.id;
  }), [received.data, sort]);
  const unavailable = blocked || forbidden || !!detail.error || detail.loading || pending;
  // This owner-only endpoint also requires Regular on the server. A successful
  // read is a permission check, not a role inferred from onboarding intent.
  const ownerAllowed = !!received.data && !received.error && !received.loading;
  const canPublish = !!project?.is_owner && project.can_edit && project.status === "Draft" && ownerAllowed && !!project.categories.length && !!project.skills.length;
  const decisionsDisabled = unavailable || !ownerAllowed;

  async function refreshAll() {
    if (refreshing.current) return false;
    refreshing.current = true;
    try {
      const [freshProject, freshProposals] = await Promise.all([detail.reload(), project?.is_owner ? received.reload() : Promise.resolve(true)]);
      if (!freshProject || !freshProposals) {
        setBlocked(true);
        setRefreshError("اطلاعات تازه تأیید نشد. برای جلوگیری از عملیات تکراری، ابتدا جزئیات و پیشنهادها را دوباره دریافت کنید.");
        return false;
      }
      setBlocked(false);
      setRefreshError("");
      return true;
    } finally { refreshing.current = false; }
  }

  function openAction(next: Action) {
    if (busy.current || unavailable) return;
    setApplied(false);
    setModalError("");
    setAction(next);
  }

  function reviewProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !project.can_submit_proposal || project.is_owner || project.my_proposal || unavailable) return;
    const errors: Record<string, string> = {};
    if (!validAmount(amount)) errors.amount = "عدد مثبت با حداکثر ۱۰ رقم صحیح و ۲ رقم اعشار وارد کنید.";
    if (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 100000) errors.estimated_days = "تعداد روز باید عدد صحیح بین ۱ تا ۱۰۰۰۰۰ باشد.";
    if (!letter.trim() || letter.trim().length > 10000) errors.cover_letter = "متن پیشنهاد الزامی است و باید حداکثر ۱۰۰۰۰ کاراکتر باشد.";
    if (project.pricing_type === "Hourly" && hours.trim() && !validAmount(hours)) errors.estimated_hours = "ساعت مثبت با حداکثر ۱۰ رقم صحیح و ۲ رقم اعشار وارد کنید.";
    setFields(errors);
    if (Object.keys(errors).length) {
      const ids: Record<string, string> = { amount: "proposal-amount", estimated_days: "proposal-days", cover_letter: "proposal-letter", estimated_hours: "proposal-hours" };
      requestAnimationFrame(() => document.getElementById(ids[Object.keys(errors)[0]])?.focus());
      return;
    }
    const payload: ProposalPayload = { amount: amount.trim(), estimated_days: Number(days), cover_letter: letter.trim() };
    if (project.pricing_type === "Hourly") payload.estimated_hours = hours.trim() || null;
    openAction({ kind: "submit", payload });
  }

  async function confirm() {
    if (!action || !project || busy.current) return;
    busy.current = true;
    setPending(true);
    setModalError("");
    try {
      // Once a write succeeds (or its result is uncertain), retries only read.
      if (applied || blocked || forbidden) {
        if (await refreshAll()) setAction(null);
        else setModalError("دریافت وضعیت تازه ناموفق بود. عملیات مجدد ارسال نشد؛ دوباره تازه‌سازی کنید.");
        return;
      }
      if (detail.loading || detail.error) throw new Error("پیش از ادامه، وضعیت پروژه را تازه‌سازی کنید.");
      if (action.kind === "publish" && !canPublish) throw new Error("انتشار نیازمند دسترسی مالک، وضعیت پیش‌نویس، دسته‌بندی و مهارت است.");
      if (action.kind === "submit" && (!project.can_submit_proposal || project.is_owner || project.my_proposal)) throw new Error("در وضعیت فعلی امکان ارسال پیشنهاد وجود ندارد.");
      if ((action.kind === "accept" || action.kind === "reject") && (!ownerAllowed || !action.proposal.can_decide || (action.kind === "accept" && project.status !== "Open"))) throw new Error("این پیشنهاد در وضعیت فعلی قابل بررسی نیست.");
      const path = action.kind === "publish" ? `projects/${projectId}/publish/` : action.kind === "submit" ? `projects/${projectId}/proposals/` : `proposals/${action.proposal.id}/${action.kind}/`;
      await marketplace(path, { method: "POST", body: JSON.stringify(action.kind === "submit" ? action.payload : {}) });
      setApplied(true);
      setBlocked(true);
      if (action.kind === "submit") { setAmount(""); setDays(""); setHours(""); setLetter(""); setFields({}); }
      setNotice("عملیات ثبت شد.");
      if (await refreshAll()) setAction(null);
      else setModalError("عملیات ثبت شد، اما وضعیت تازه دریافت نشد. تأیید دوباره فقط اطلاعات را تازه‌سازی می‌کند و عملیات را تکرار نمی‌کند.");
    } catch (reason) {
      const error = reason instanceof MarketplaceError ? reason : null;
      if (action.kind === "submit" && error) setFields(error.fields);
      if (error?.status === 403) setForbidden(true);
      if (error && error.status !== 400) setBlocked(true);
      const fieldMessages = error ? Object.values(error.fields).join(" ") : "";
      setModalError(`${error?.status === 403 ? "دسترسی این حساب به عملیات مجاز نیست. " : ""}${errorMessage(reason)}${fieldMessages ? ` ${fieldMessages}` : ""}${error && error.status !== 400 ? " ابتدا وضعیت را تازه‌سازی کنید؛ درخواست تکرار نشده است." : ""}`);
    } finally { busy.current = false; setPending(false); }
  }

  if (!Number.isSafeInteger(projectId) || projectId <= 0) return <ErrorState error={{ status: 404, message: "شناسه پروژه معتبر نیست." }} />;
  if (!project) return detail.error ? <ErrorState error={detail.error} retry={() => void detail.reload()} /> : <LoadingState />;

  return <div className={`pm-page ${styles.root}`}>
    <PageHeading eyebrow={`پروژه ${numberText(project.id)}`} title={project.title} action={<div className="pm-actions"><StatusBadge status={project.status} />{project.is_owner && project.can_edit && !unavailable && <Button asChild variant="outline" className="pm-button pm-button--secondary"><Link href={`/my/projects/${project.id}/edit/`}>ویرایش پروژه</Link></Button>}</div>} />
    <div className={styles.navigation}><Link href={project.is_owner ? "/my/projects/" : "/projects/"}>بازگشت به {project.is_owner ? "پروژه‌های من" : "فهرست پروژه‌ها"}</Link><Button type="button" variant="outline" className="pm-button pm-button--secondary" disabled={pending || detail.loading || (project.is_owner && received.loading)} onClick={() => void refreshAll()}>تازه‌سازی اطلاعات</Button></div>
    {notice && <p role="status" className="pm-feedback pm-feedback--success">{notice}</p>}
    {forbidden && <p role="alert" className="pm-feedback pm-feedback--error">این حساب اجازه تغییر پروژه یا پیشنهادها را ندارد. انتخاب نقش در رابط کاربری این دسترسی را تغییر نمی‌دهد.</p>}
    {(blocked || refreshError) && <p role="alert" className="pm-feedback pm-feedback--error">{refreshError || "ممکن است وضعیت نمایش‌داده‌شده قدیمی باشد. پیش از هر عملیات، اطلاعات را تازه‌سازی کنید."}</p>}
    {detail.error && <ErrorState error={detail.error} retry={() => void refreshAll()} />}
    {detail.loading && <p role="status" className="pm-muted">در حال تازه‌سازی جزئیات…</p>}
    <section className="pm-panel" aria-labelledby="project-overview-title"><div className="pm-panel-header"><h2 id="project-overview-title">درباره پروژه</h2><span className="pm-tag">{pricingLabels[project.pricing_type]}</span></div><div className="pm-panel-body">
      <dl className={styles.facts}><div><dt>{project.pricing_type === "Hourly" ? "نرخ ساعتی" : "بودجه ثابت"}</dt><dd className={styles.budget}>{moneyText(project.budget)}</dd></div><div><dt>مهلت تحویل</dt><dd>{dateText(project.deadline)}</dd></div><div><dt>کارفرما</dt><dd>{project.owner.name}</dd></div><div><dt>تاریخ ایجاد</dt><dd>{dateText(project.created_at)}</dd></div><div><dt>آخرین به‌روزرسانی</dt><dd>{dateText(project.updated_at)}</dd></div>{project.is_owner && typeof project.proposal_count === "number" && <div><dt>پیشنهادهای دریافتی</dt><dd>{numberText(project.proposal_count)}</dd></div>}</dl>
      <p className={`pm-text ${styles.description}`} dir="auto">{project.description}</p>
      <div className={styles.taxonomy}><div><h3>دسته‌بندی‌ها</h3><div className="pm-tags">{project.categories.length ? project.categories.map(tag => <span className="pm-tag" key={tag.id}>{tag.name}</span>) : <span className="pm-muted">دسته‌بندی انتخاب نشده است.</span>}</div></div><div><h3>مهارت‌های موردنیاز</h3><div className="pm-tags">{project.skills.length ? project.skills.map(tag => <span className="pm-tag" key={tag.id}>{tag.name}</span>) : <span className="pm-muted">مهارتی انتخاب نشده است.</span>}</div></div></div>
    </div></section>

    {project.is_owner && project.status === "Draft" && <section className="pm-panel"><div className="pm-panel-body"><h2 className="pm-section-title">انتشار پروژه</h2><p className="pm-muted">پیش‌نویس فقط برای شما دیده می‌شود. با انتشار، پروژه برای دریافت پیشنهاد باز می‌شود.</p>{(!project.categories.length || !project.skills.length) && <p className="pm-feedback pm-feedback--error">پیش از انتشار، حداقل یک دسته‌بندی و یک مهارت را در ویرایش پروژه انتخاب کنید.</p>}<div className="pm-actions"><Button type="button" className="pm-button" disabled={!canPublish || unavailable} onClick={() => openAction({ kind: "publish" })}>انتشار پروژه</Button></div></div></section>}

    {project.is_owner && <section id="proposals" className="pm-panel" aria-labelledby="received-proposals-title"><div className="pm-panel-header"><div><h2 id="received-proposals-title">پیشنهادهای دریافتی</h2><p className="pm-muted">مقایسه مبلغ، زمان و مهارت‌ها؛ متن کامل هر پیشنهاد در جزئیات آن است.</p></div><label className={styles.sort}>مرتب‌سازی<select className="pm-input" value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="newest">جدیدترین</option><option value="amount">کمترین مبلغ / نرخ</option><option value="days">کمترین زمان تحویل</option></select></label></div>
      {received.loading && <LoadingState label="در حال دریافت پیشنهادها…" />}
      {received.error && <ErrorState error={received.error} retry={() => void refreshAll()} />}
      {!received.loading && !received.error && received.data && (!proposals.length ? <EmptyState title="هنوز پیشنهادی دریافت نشده" description={project.status === "Draft" ? "پس از انتشار پروژه، کاربران می‌توانند پیشنهاد بفرستند." : "پیشنهادهای ثبت‌شده در این بخش نمایش داده می‌شوند."} /> : <div className="pm-table-wrap" tabIndex={0} role="region" aria-label="مقایسه پیشنهادهای دریافتی؛ قابل پیمایش افقی"><table className={`pm-table ${styles.table}`}><caption className={styles.caption}>تمام پیشنهادهای دریافتی این پروژه</caption><thead><tr><th scope="col">فریلنسر و مهارت‌ها</th><th scope="col">{pricingLabels[project.pricing_type]}</th><th scope="col">زمان تخمینی</th><th scope="col">وضعیت</th><th scope="col">بررسی</th></tr></thead><tbody>{proposals.map(proposal => <Fragment key={proposal.id}><tr><td><strong>{proposal.freelancer.name}</strong><div className={`pm-tags ${styles.skills}`}>{proposal.freelancer.skills.length ? proposal.freelancer.skills.map(skill => <span key={skill.id} className="pm-tag">{skill.name}</span>) : <span className="pm-muted">مهارتی ثبت نشده</span>}</div></td><td>{moneyText(proposal.amount)}</td><td>{numberText(proposal.estimated_days)} روز{project.pricing_type === "Hourly" && <small className={styles.secondary}>{proposal.estimated_hours ? `${moneyText(proposal.estimated_hours)} ساعت` : "ساعت تعیین نشده"}</small>}</td><td><StatusBadge status={proposal.status} /><small className={styles.secondary}>{dateText(proposal.created_at)}</small></td><td><div className={styles.rowActions}><Button type="button" variant="outline" className="pm-button pm-button--secondary" aria-expanded={expanded === proposal.id} aria-controls={`proposal-details-${proposal.id}`} onClick={() => setExpanded(expanded === proposal.id ? null : proposal.id)}>{expanded === proposal.id ? "بستن جزئیات" : "مشاهده جزئیات"}</Button>{proposal.can_decide && <><Button type="button" className="pm-button" disabled={decisionsDisabled || project.status !== "Open"} onClick={() => openAction({ kind: "accept", proposal })}>پذیرش</Button><Button type="button" variant="outline" className="pm-button pm-button--danger" disabled={decisionsDisabled} onClick={() => openAction({ kind: "reject", proposal })}>رد پیشنهاد</Button></>}</div></td></tr>{expanded === proposal.id && <tr><td colSpan={5}><div id={`proposal-details-${proposal.id}`} className={styles.expanded}><dl className={styles.profile}><div><dt>عنوان حرفه‌ای</dt><dd dir="auto">{proposal.freelancer.professional_title || "ثبت نشده"}</dd></div><div><dt>موقعیت</dt><dd dir="auto">{proposal.freelancer.location || "ثبت نشده"}</dd></div></dl><h3>درباره فریلنسر</h3><p className="pm-text" dir="auto">{proposal.freelancer.bio || "معرفی ثبت نشده است."}</p><h3>متن پیشنهاد</h3><p className="pm-text" dir="auto">{proposal.cover_letter}</p></div></td></tr>}</Fragment>)}</tbody></table></div>)}
    </section>}

    {!project.is_owner && project.my_proposal && <section className="pm-panel"><div className="pm-panel-body"><div className="pm-actions"><h2 className="pm-section-title">پیشنهاد شما</h2><StatusBadge status={project.my_proposal.status} /></div><p className="pm-muted">برای این پروژه قبلاً پیشنهاد ثبت کرده‌اید. حتی پس از انصراف، ارسال دوباره امکان‌پذیر نیست.</p><Link className={styles.textLink} href="/my/proposals/">مشاهده در پیشنهادهای من</Link></div></section>}
    {!project.is_owner && !project.my_proposal && project.can_submit_proposal && <section className="pm-panel" aria-labelledby="submit-proposal-title"><div className="pm-panel-header"><div><h2 id="submit-proposal-title">ارسال پیشنهاد</h2><p className="pm-muted">راهکار، مبلغ و زمان پیشنهادی خود را مشخص کنید. پیش از ارسال، اطلاعات را مرور می‌کنید.</p></div></div><form className="pm-panel-body" onSubmit={reviewProposal} noValidate><fieldset disabled={unavailable || !!action} className={styles.fieldset}><div className="pm-grid"><div className="pm-field"><label htmlFor="proposal-amount">{project.pricing_type === "Hourly" ? "نرخ پیشنهادی در ساعت" : "مبلغ کل پیشنهادی"} *</label><Input id="proposal-amount" name="amount" className="pm-input" dir="ltr" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} required aria-invalid={!!fields.amount} aria-describedby="proposal-amount-error" /><FieldError id="proposal-amount-error">{fields.amount}</FieldError></div><div className="pm-field"><label htmlFor="proposal-days">زمان تخمینی تحویل (روز) *</label><Input id="proposal-days" name="estimated_days" className="pm-input" dir="ltr" inputMode="numeric" type="number" min={1} max={100000} step={1} value={days} onChange={event => setDays(event.target.value)} required aria-invalid={!!fields.estimated_days} aria-describedby="proposal-days-error" /><FieldError id="proposal-days-error">{fields.estimated_days}</FieldError></div>{project.pricing_type === "Hourly" && <div className="pm-field"><label htmlFor="proposal-hours">ساعات تخمینی (اختیاری)</label><Input id="proposal-hours" name="estimated_hours" className="pm-input" dir="ltr" inputMode="decimal" value={hours} onChange={event => setHours(event.target.value)} aria-invalid={!!fields.estimated_hours} aria-describedby="proposal-hours-error" /><FieldError id="proposal-hours-error">{fields.estimated_hours}</FieldError></div>}</div><div className={`pm-field ${styles.letter}`}><label htmlFor="proposal-letter">متن پیشنهاد *</label><textarea id="proposal-letter" name="cover_letter" className="pm-input" rows={7} dir="auto" required maxLength={10000} value={letter} onChange={event => setLetter(event.target.value)} aria-invalid={!!fields.cover_letter} aria-describedby="proposal-letter-hint proposal-letter-error" /><p id="proposal-letter-hint" className="pm-field-hint">{numberText(letter.length)} از ۱۰٬۰۰۰ کاراکتر؛ این پروژه تنها یک پیشنهاد از شما می‌پذیرد.</p><FieldError id="proposal-letter-error">{fields.cover_letter}</FieldError></div><div className="pm-actions"><Button type="submit" className="pm-button">مرور و تأیید پیشنهاد</Button></div></fieldset></form></section>}
    {project.is_owner && <p className="pm-muted">نمی‌توانید برای پروژه خودتان پیشنهاد ثبت کنید.</p>}
    {!project.is_owner && !project.my_proposal && !project.can_submit_proposal && <EmptyState title="ارسال پیشنهاد در دسترس نیست" description={project.status !== "Open" ? "این پروژه در وضعیت باز برای دریافت پیشنهاد نیست." : "این حساب اجازه ارسال پیشنهاد ندارد. فقط حساب‌های عادی واجد شرایط می‌توانند پیشنهاد ثبت کنند."} />}

    <ConfirmDialog open={!!action} title={action?.kind === "publish" ? "انتشار پروژه" : action?.kind === "submit" ? "مرور پیشنهاد شما" : action?.kind === "accept" ? "پذیرش پیشنهاد" : "رد پیشنهاد"} description={action?.kind === "publish" ? "پروژه از پیش‌نویس به وضعیت باز می‌رود و کاربران می‌توانند برای آن پیشنهاد بفرستند." : action?.kind === "submit" ? "پس از ارسال، پیشنهاد در انتظار بررسی خواهد بود. برای هر پروژه فقط یک پیشنهاد می‌توانید ثبت کنید؛ حتی در صورت انصراف امکان ارسال مجدد ندارید." : action?.kind === "accept" ? "این عملیات در یک تراکنش انجام می‌شود: پیشنهاد انتخابی پذیرفته می‌شود، پروژه به «در حال انجام» می‌رود و تمام پیشنهادهای دیگر که در انتظار بررسی هستند رد می‌شوند." : "این پیشنهاد رد می‌شود و دیگر قابل پذیرش نیست. وضعیت پروژه و سایر پیشنهادها تغییر نمی‌کند."} confirmLabel={applied || blocked || forbidden ? "تازه‌سازی وضعیت" : action?.kind === "publish" ? "تأیید انتشار" : action?.kind === "submit" ? "ارسال پیشنهاد" : action?.kind === "accept" ? "تأیید پذیرش" : "تأیید رد پیشنهاد"} onConfirm={() => void confirm()} onClose={() => { if (!busy.current) setAction(null); }} pending={pending} danger={action?.kind === "reject"} error={modalError}>
      {action?.kind === "submit" && <div className={styles.review}><dl className={styles.profile}><div><dt>{pricingLabels[project.pricing_type]}</dt><dd>{moneyText(action.payload.amount)}</dd></div><div><dt>زمان تحویل</dt><dd>{numberText(action.payload.estimated_days)} روز</dd></div>{project.pricing_type === "Hourly" && <div><dt>ساعات تخمینی</dt><dd>{action.payload.estimated_hours ? moneyText(action.payload.estimated_hours) : "تعیین نشده"}</dd></div>}</dl><h3>متن پیشنهاد</h3><p className="pm-text" dir="auto">{action.payload.cover_letter}</p></div>}
      {(action?.kind === "accept" || action?.kind === "reject") && <p className={styles.review}>{action.proposal.freelancer.name} · {moneyText(action.proposal.amount)} · {numberText(action.proposal.estimated_days)} روز</p>}
    </ConfirmDialog>
  </div>;
}
