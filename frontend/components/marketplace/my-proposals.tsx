"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marketplace, errorMessage } from "@/lib/api/marketplace";
import { dateText, moneyText, numberText, pricingLabels, proposalStatuses, projectStatuses } from "@/lib/marketplace";
import type { MyProposal, Results } from "@/types/marketplace";
import { useResource } from "./hooks";
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeading, StatusBadge } from "./primitives";

export function MyProposals() {
  const resource = useResource<Results<MyProposal>>("my/proposals/");
  const [status, setStatus] = useState(""); const [search, setSearch] = useState("");
  const [withdrawing, setWithdrawing] = useState<MyProposal | null>(null);
  const [pending, setPending] = useState(false); const busy = useRef(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const all = resource.data?.results;
  const rows = useMemo(() => (all || []).filter(item => (!status || item.status === status) && item.project.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [all, status, search]);
  async function withdraw() {
    if (!withdrawing || busy.current) return;
    busy.current = true; setPending(true); setError(""); setSuccess("");
    try {
      await marketplace(`proposals/${withdrawing.id}/withdraw/`, { method: "POST", body: "{}" });
      const refreshed = await resource.reload();
      setWithdrawing(null);
      if (refreshed) setSuccess("پیشنهاد پس گرفته شد. برای همین پروژه امکان ارسال پیشنهاد دوباره وجود ندارد.");
    } catch (reason) {
      setError(errorMessage(reason));
      const refreshed = await resource.reload();
      if (!refreshed?.results.find(item => item.id === withdrawing.id)?.can_withdraw) setWithdrawing(null);
    }
    finally { busy.current = false; setPending(false); }
  }
  if (!resource.data && resource.loading) return <LoadingState label="در حال دریافت پیشنهادهای شما…" />;
  if (resource.error) return <ErrorState error={resource.error} retry={() => void resource.reload()} />;
  if (!all) return null;
  return <div className="pm-page">
    <PageHeading eyebrow="مسیر فریلنسر" title="پیشنهادهای من" description="پیشنهادها و پاسخ‌های کارفرما را پیگیری کن؛ هر همکاری از یک پیشنهاد شروع می‌شود." action={<Button asChild className="pm-button"><Link href="/projects/">کشف پروژه‌ها<ArrowLeft aria-hidden="true" /></Link></Button>} />
    {success && <p role="status" className="pm-feedback pm-feedback--success">{success}</p>}
    {error && !withdrawing && <p role="alert" className="pm-feedback pm-feedback--error">{error}</p>}
    <section className="pm-panel" aria-labelledby="proposals-list-title">
      <div className="pm-panel-header"><div><h2 id="proposals-list-title">پیشنهادهای ارسال‌شده</h2><p className="pm-muted">{numberText(all.length)} پیشنهاد · {numberText(all.filter(item => item.status === "Pending").length)} در انتظار بررسی</p></div><Button className="pm-button pm-button--secondary" variant="outline" disabled={resource.loading || pending} onClick={() => void resource.reload()}><RefreshCw className={resource.loading ? "animate-spin" : ""} aria-hidden="true" />تازه‌سازی</Button></div>
      {all.length > 0 && <div className="pm-panel-body pm-filters"><div className="pm-field"><label htmlFor="proposal-project-search">جستجو در عنوان پروژه</label><input id="proposal-project-search" type="search" className="pm-input" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="pm-field"><label htmlFor="proposal-status">وضعیت پیشنهاد</label><select className="pm-input" id="proposal-status" value={status} onChange={event => setStatus(event.target.value)}><option value="">همه وضعیت‌ها</option>{Object.entries(proposalStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>}
      {all.length === 0 ? <EmptyState title="هنوز پیشنهادی نفرستاده‌ای" description="پروژه‌های باز را بررسی کن و برای فرصت مناسب، پیشنهادت را ارسال کن." /> : rows.length === 0 ? <EmptyState title="پیشنهادی با این فیلتر پیدا نشد" description="فیلترها را پاک کن تا همه پیشنهادها نمایش داده شوند." action={<Button className="pm-button pm-button--secondary" variant="outline" onClick={() => { setStatus(""); setSearch(""); }}>پاک کردن فیلترها</Button>} /> : <div>{rows.map(item => <article key={item.id} className="pm-proposal-row">
        <div className="pm-proposal-summary"><div><StatusBadge status={item.status} /><h3><Link className="pm-table-title" href={`/projects/${item.project.id}/`}>{item.project.title}</Link></h3><p className="pm-muted">ارسال در {dateText(item.created_at)} · وضعیت پروژه: <span>{projectStatuses[item.project.status]}</span></p></div><div className="pm-proposal-amount"><span className="pm-muted">{pricingLabels[item.project.pricing_type]}</span><strong><bdi>{moneyText(item.amount)}</bdi>{item.project.pricing_type === "Hourly" && " / ساعت"}</strong><span className="pm-muted">{numberText(item.estimated_days)} روز{item.estimated_hours && ` · ${moneyText(item.estimated_hours)} ساعت`}</span></div></div>
        <div className="pm-actions"><Link className="pm-link" href={`/projects/${item.project.id}/`}>مشاهده پروژه<ArrowLeft size={16} aria-hidden="true" /></Link>{item.can_withdraw && <Button type="button" variant="outline" className="pm-button pm-button--secondary" disabled={pending || resource.loading} onClick={() => { setWithdrawing(item); setError(""); }}><Undo2 aria-hidden="true" />پس گرفتن پیشنهاد</Button>}</div>
        <details className="pm-proposal-disclosure"><summary>متن پیشنهاد من</summary><p className="pm-text">{item.cover_letter}</p></details>
      </article>)}</div>}
    </section>
    <p className="pm-muted">برای هر پروژه فقط یک پیشنهاد قابل ثبت است؛ پیشنهاد پس‌گرفته‌شده نیز سابقه محسوب می‌شود.</p>
    <ConfirmDialog open={!!withdrawing} title="پیشنهاد پس گرفته شود؟" description="این پیشنهاد دیگر قابل پذیرش نخواهد بود. طبق قوانین فعلی، ارسال پیشنهاد دوباره برای همین پروژه ممکن نیست." confirmLabel="پس گرفتن پیشنهاد" danger pending={pending} error={error} onConfirm={() => void withdraw()} onClose={() => { if (!pending) setWithdrawing(null); }} />
  </div>;
}
