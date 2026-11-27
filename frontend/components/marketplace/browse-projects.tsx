"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateText, moneyText, numberText, pricingLabels } from "@/lib/marketplace";
import type { CatalogItem, ProjectPage, Results } from "@/types/marketplace";
import { useResource } from "./hooks";
import { EmptyState, ErrorState, LoadingState, PageHeading, StatusBadge } from "./primitives";

export function BrowseProjects() {
  const [search, setSearch] = useState(""); const [category, setCategory] = useState("");
  const [query, setQuery] = useState({ search: "", category: "", page: 1 });
  const params = new URLSearchParams({ page: String(query.page), page_size: "10" });
  if (query.search) params.set("q", query.search);
  if (query.category) params.set("category", query.category);
  const resource = useResource<ProjectPage>(`projects/?${params}`);
  const categories = useResource<Results<CatalogItem>>("categories/");
  function apply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setQuery({ search: search.trim(), category, page: 1 }); }
  function clear() { setSearch(""); setCategory(""); setQuery({ search: "", category: "", page: 1 }); }
  const data = resource.data;
  const maxPage = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  return <div className="pm-page">
    <PageHeading eyebrow="مسیر فریلنسر" title="کشف پروژه‌ها" description="پروژه‌های باز را بررسی کن و برای کاری که با مهارتت هم‌مسیر است، پیشنهاد بده." action={<Link className="pm-link" href="/my/proposals/">پیشنهادهای من<ArrowLeft size={17} aria-hidden="true" /></Link>} />
    <section className="pm-panel" aria-labelledby="discover-filters"><div className="pm-panel-header"><div><h2 id="discover-filters">فرصت مناسب را پیدا کن</h2><p className="pm-muted">فقط پروژه‌های باز، به ترتیب جدیدترین پروژه در فهرست قرار دارند.</p></div><Button type="button" variant="outline" className="pm-button pm-button--secondary" disabled={resource.loading} onClick={() => void resource.reload()}><RefreshCw className={resource.loading ? "animate-spin" : ""} aria-hidden="true" />تازه‌سازی</Button></div>
      <div className="pm-panel-body"><form onSubmit={apply} className="pm-filters">
        <div className="pm-field"><label htmlFor="discover-search">عنوان یا توضیحات پروژه</label><input type="search" id="discover-search" className="pm-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="دنبال چه پروژه‌ای هستی؟" maxLength={200} /></div>
        <div className="pm-field"><label htmlFor="discover-category">دسته‌بندی</label><select id="discover-category" className="pm-input" value={category} onChange={event => setCategory(event.target.value)} disabled={categories.loading || !!categories.error}><option value="">همه دسته‌بندی‌ها</option>{categories.data?.results.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <Button type="submit" className="pm-button" disabled={resource.loading}><Search aria-hidden="true" />جستجوی پروژه</Button>
        {(query.search || query.category) && <Button type="button" variant="outline" className="pm-button pm-button--secondary" onClick={clear}>پاک کردن فیلترها</Button>}
      </form>{categories.error && <p className="pm-muted" role="status">دسته‌بندی‌ها دریافت نشدند؛ جستجوی متنی همچنان فعال است. <button type="button" className="text-link" onClick={() => void categories.reload()}>دریافت دوباره دسته‌بندی‌ها</button></p>}</div>
    </section>
    <section aria-label="نتایج پروژه‌های باز" className="pm-page" aria-busy={resource.loading}>
      {resource.loading ? <LoadingState label="در حال جستجوی پروژه‌ها…" /> : resource.error ? <ErrorState error={resource.error} retry={() => void resource.reload()} /> : data && <>
        <p className="pm-muted" role="status">{numberText(data.total)} پروژه باز{query.search ? ` برای «${query.search}»` : ""} · صفحه {numberText(data.page)} از {numberText(maxPage)}</p>
        {data.results.length === 0 ? <div className="pm-panel"><EmptyState title={query.search || query.category ? "پروژه‌ای با این جستجو پیدا نشد" : "هنوز پروژه بازی در دسترس نیست"} description={query.search || query.category ? "عبارت یا دسته‌بندی را تغییر بده تا فرصت‌های بیشتری ببینی." : "بعداً دوباره سر بزن؛ پروژه‌های منتشرشده اینجا نمایش داده می‌شوند."} action={query.search || query.category ? <Button className="pm-button pm-button--secondary" variant="outline" onClick={clear}>نمایش همه پروژه‌ها</Button> : undefined} /></div> : <div className="pm-project-grid">{data.results.map(project => <article className="pm-panel pm-project-card" key={project.id}>
          <div className="pm-card-top"><StatusBadge status={project.status} /><span className="pm-muted">{project.is_owner ? "پروژه شما" : dateText(project.created_at)}</span></div>
          <h2><Link href={`/projects/${project.id}/`}>{project.title}</Link></h2>
          <p className="pm-project-excerpt">{project.description}</p>
          {project.categories.length > 0 && <div className="pm-tags" aria-label="دسته‌بندی‌های پروژه">{project.categories.map(item => <span key={item.id} className="pm-tag" dir="auto">{item.name}</span>)}</div>}
          <div className="pm-tags" aria-label="مهارت‌های مورد نیاز">{project.skills.slice(0, 4).map(skill => <span key={skill.id} className="pm-tag" dir="auto">{skill.name}</span>)}{project.skills.length > 4 && <span className="pm-tag">{numberText(project.skills.length - 4)} مهارت دیگر</span>}</div>
          <dl className="pm-card-meta"><div><dt>{pricingLabels[project.pricing_type]}</dt><dd><bdi>{moneyText(project.budget)}</bdi>{project.pricing_type === "Hourly" && " / ساعت"}</dd></div><div><dt>مهلت تحویل</dt><dd>{dateText(project.deadline)}</dd></div></dl>
          <div className="pm-card-top"><span className="pm-muted"><bdi>{project.owner.name}</bdi></span><Link className="pm-link" href={`/projects/${project.id}/`}>بررسی پروژه<ArrowLeft size={16} aria-hidden="true" /></Link></div>
        </article>)}</div>}
        {data.total > 0 && <nav className="pm-pagination pm-panel" aria-label="صفحه‌بندی پروژه‌ها"><p>هر صفحه حداکثر {numberText(data.page_size)} پروژه</p><div className="pm-actions"><Button variant="outline" className="pm-button pm-button--secondary" disabled={data.page <= 1} onClick={() => { setQuery({ ...query, page: data.page - 1 }); document.getElementById("main-content")?.focus(); }}>قبلی</Button><Button variant="outline" className="pm-button pm-button--secondary" disabled={data.page >= maxPage} onClick={() => { setQuery({ ...query, page: data.page + 1 }); document.getElementById("main-content")?.focus(); }}>بعدی</Button></div></nav>}
      </>}
    </section>
    <p className="pm-muted">مبلغ‌ها مطابق API نمایش داده می‌شوند؛ واحد پول در قرارداد فعلی مشخص نشده است.</p>
  </div>;
}
