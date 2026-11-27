"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FilePlus2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marketplace, errorMessage } from "@/lib/api/marketplace";
import { dateText, moneyText, numberText, pricingLabels, projectStatuses } from "@/lib/marketplace";
import type { OwnedProject, Project, Results } from "@/types/marketplace";
import { useResource } from "./hooks";
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeading, StatusBadge } from "./primitives";

export function MyProjects() {
  const resource = useResource<Results<OwnedProject>>("my/projects/");
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [publishing, setPublishing] = useState<OwnedProject | null>(null);
  const [pending, setPending] = useState(false); const busy = useRef(false);
  const [actionError, setActionError] = useState(""); const [success, setSuccess] = useState("");
  const all = resource.data?.results;
  const filtered = useMemo(() => {
    const rows = (all || []).filter(project => (!status || project.status === status) && project.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    rows.sort((a, b) => sort === "pending" ? b.pending_proposal_count - a.pending_proposal_count || b.id - a.id : sort === "deadline" ? (a.deadline || "9999").localeCompare(b.deadline || "9999") || b.id - a.id : Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id);
    return rows;
  }, [all, search, status, sort]);
  const maxPage = Math.max(1, Math.ceil(filtered.length / 10)); const currentPage = Math.min(page, maxPage);
  async function publish() {
    if (!publishing || busy.current) return;
    busy.current = true; setPending(true); setActionError(""); setSuccess("");
    try {
      const saved = await marketplace<Project>(`projects/${publishing.id}/publish/`, { method: "POST", body: "{}" });
      const refreshed = await resource.reload();
      if (refreshed) setSuccess(`پروژه «${saved.title}» منتشر شد.`);
      setPublishing(null);
    } catch (reason) {
      setActionError(errorMessage(reason));
      const refreshed = await resource.reload();
      if (!refreshed?.results.find(item => item.id === publishing.id)?.can_publish) setPublishing(null);
    }
    finally { busy.current = false; setPending(false); }
  }
  function clearFilters() { setSearch(""); setStatus(""); setSort("newest"); setPage(1); }
  if (!resource.data && resource.loading) return <LoadingState label="در حال دریافت پروژه‌های شما…" />;
  if (resource.error) return <ErrorState error={resource.error} retry={() => void resource.reload()} />;
  if (!all) return null;
  const create = <Button asChild className="pm-button"><Link href="/my/projects/new/"><FilePlus2 aria-hidden="true" />ایجاد پروژه</Link></Button>;
  return <div className="pm-page">
    <PageHeading eyebrow="مسیر کارفرما" title="پروژه‌های من" description="از تعریف ایده تا انتخاب همکار؛ همه پروژه‌هایت را یک‌جا مدیریت کن." action={create} />
    <dl className="pm-summary" aria-label="خلاصه همه پروژه‌های من">
      <div><dt>همه پروژه‌ها</dt><dd>{numberText(all.length)}</dd></div>
      <div><dt>باز برای پیشنهاد</dt><dd>{numberText(all.filter(item => item.status === "Open").length)}</dd></div>
      <div><dt>پیش‌نویس‌ها</dt><dd>{numberText(all.filter(item => item.status === "Draft").length)}</dd></div>
      <div><dt>پیشنهادهای در انتظار</dt><dd className="pm-highlight">{numberText(all.reduce((count, item) => count + item.pending_proposal_count, 0))}</dd></div>
    </dl>
    {success && <p className="pm-feedback pm-feedback--success" role="status">{success}</p>}
    {actionError && !publishing && <p className="pm-feedback pm-feedback--error" role="alert">{actionError}</p>}
    <section className="pm-panel" aria-labelledby="my-projects-list">
      <div className="pm-panel-header"><div><h2 id="my-projects-list">فهرست پروژه‌ها</h2><p className="pm-muted">خلاصه بالا همیشه بر اساس همه پروژه‌های شماست.</p></div><Button type="button" variant="outline" className="pm-button pm-button--secondary" disabled={resource.loading || pending} onClick={() => void resource.reload()}><RefreshCw className={resource.loading ? "animate-spin" : ""} aria-hidden="true" />تازه‌سازی</Button></div>
      {all.length > 0 && <div className="pm-panel-body"><div className="pm-filters">
        <div className="pm-field"><label htmlFor="owner-search">جستجوی عنوان</label><input id="owner-search" type="search" className="pm-input" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="نام پروژه را بنویس…" /></div>
        <div className="pm-field"><label htmlFor="owner-status">وضعیت پروژه</label><select id="owner-status" className="pm-input" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">همه وضعیت‌ها</option>{Object.entries(projectStatuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <div className="pm-field"><label htmlFor="owner-sort">مرتب‌سازی</label><select id="owner-sort" className="pm-input" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="newest">جدیدترین پروژه</option><option value="pending">بیشترین پیشنهاد در انتظار</option><option value="deadline">نزدیک‌ترین مهلت</option></select></div>
      </div><p className="pm-filter-note">جستجو و مرتب‌سازی روی تمام پروژه‌های خودت انجام می‌شود.</p></div>}
      {all.length === 0 ? <EmptyState title="اولین پروژه‌ات را تعریف کن" description="شرح کار، بودجه و مهارت‌های لازم را مشخص کن؛ می‌توانی ابتدا پیش‌نویس ذخیره کنی." /> : filtered.length === 0 ? <EmptyState title="پروژه‌ای با این فیلتر پیدا نشد" description="عبارت جستجو یا وضعیت انتخابی را تغییر بده." action={<Button className="pm-button pm-button--secondary" variant="outline" onClick={clearFilters}>پاک کردن فیلترها</Button>} /> : <>
        <div className="pm-table-wrap" tabIndex={0} role="region" aria-label="جدول پروژه‌ها؛ در صفحه کوچک به صورت افقی پیمایش کنید"><table className="pm-table"><thead><tr><th scope="col">پروژه</th><th scope="col">وضعیت</th><th scope="col">بودجه / نرخ</th><th scope="col">پیشنهادها</th><th scope="col">عملیات</th></tr></thead><tbody>{filtered.slice((currentPage - 1) * 10, currentPage * 10).map(project => <tr key={project.id}>
          <td><Link href={`/projects/${project.id}/`} className="pm-table-title">{project.title}</Link><p className="pm-muted">مهلت: {dateText(project.deadline)}</p></td>
          <td><StatusBadge status={project.status} /></td>
          <td><bdi>{moneyText(project.budget)}</bdi><p className="pm-muted">{pricingLabels[project.pricing_type]}</p></td>
          <td><Link href={`/projects/${project.id}/#proposals`} className="pm-link">{numberText(project.proposal_count)} پیشنهاد</Link><p className="pm-muted">{numberText(project.pending_proposal_count)} در انتظار</p></td>
          <td><div className="pm-actions"><Link href={`/projects/${project.id}/`} className="pm-link">جزئیات<ArrowLeft size={16} aria-hidden="true" /></Link>{project.can_edit && <Link href={`/my/projects/${project.id}/edit/`} className="pm-link">ویرایش</Link>}{project.can_publish && <Button type="button" variant="outline" className="pm-button pm-button--secondary" disabled={pending || resource.loading} onClick={() => { setPublishing(project); setActionError(""); }}><Send aria-hidden="true" />انتشار</Button>}</div></td>
        </tr>)}</tbody></table></div>
        <div className="pm-pagination"><p>{numberText(filtered.length)} پروژه · صفحه {numberText(currentPage)} از {numberText(maxPage)}</p><div className="pm-actions"><Button className="pm-button pm-button--secondary" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>قبلی</Button><Button className="pm-button pm-button--secondary" variant="outline" disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)}>بعدی</Button></div></div>
      </>}
    </section>
    <p className="pm-muted">واحد پول در قرارداد فعلی API مشخص نشده است. پس از دریافت پیشنهاد، بودجه و نوع قیمت‌گذاری پروژه قابل تغییر نیست.</p>
    <ConfirmDialog open={!!publishing} title="پروژه منتشر شود؟" description={`«${publishing?.title || ""}» برای دریافت پیشنهاد در فهرست پروژه‌های باز نمایش داده می‌شود. حداقل یک دسته‌بندی و یک مهارت لازم است.`} confirmLabel="انتشار پروژه" pending={pending} error={actionError} onConfirm={() => void publish()} onClose={() => { if (!pending) setPublishing(null); }}>{publishing && !pending && <Link className="pm-link" href={`/my/projects/${publishing.id}/edit/`}>بازبینی و تکمیل پروژه<ArrowLeft size={16} aria-hidden="true" /></Link>}</ConfirmDialog>
  </div>;
}
