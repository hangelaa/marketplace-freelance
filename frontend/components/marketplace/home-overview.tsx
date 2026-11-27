"use client";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, FileCheck2 } from "lucide-react";
import type { MyProposal, OwnedProject, Results } from "@/types/marketplace";
import { dateText, moneyText, numberText, projectStatuses } from "@/lib/marketplace";
import { useResource } from "./hooks";
import { EmptyState, ErrorState, LoadingState, PageHeading, StatusBadge } from "./primitives";

export function HomeOverview() {
  const projects = useResource<Results<OwnedProject>>("my/projects/");
  const proposals = useResource<Results<MyProposal>>("my/proposals/");
  if ((!projects.data && projects.loading) || (!proposals.data && proposals.loading)) return <LoadingState label="در حال آماده‌سازی خانه…" />;
  if (projects.error) return <ErrorState error={projects.error} retry={() => void projects.reload()} />;
  if (proposals.error) return <ErrorState error={proposals.error} retry={() => void proposals.reload()} />;
  if (!projects.data || !proposals.data) return null;
  const projectRows = projects.data.results.slice(0, 3);
  const proposalRows = proposals.data.results.slice(0, 3);
  return <div className="pm-page">
    <PageHeading eyebrow="فضای همکاری پیوند" title="خانه" description="پروژه‌ها و پیشنهادهای اخیرت را از اینجا دنبال کن." />
    <div className="pm-home-grid">
      <section className="pm-panel" aria-labelledby="home-projects-title">
        <div className="pm-panel-header"><div><h2 id="home-projects-title"><BriefcaseBusiness size={20} aria-hidden="true" />پروژه‌ها</h2><p className="pm-muted">{numberText(projects.data.results.length)} پروژه</p></div><Link className="pm-link" href="/my/projects/">همه پروژه‌ها<ArrowLeft size={16} aria-hidden="true" /></Link></div>
        {projectRows.length ? <ul className="pm-home-list">{projectRows.map(project => <li key={project.id}><div><Link className="pm-table-title" href={`/projects/${project.id}/`}>{project.title}</Link><p className="pm-muted">{projectStatuses[project.status]} · مهلت: {dateText(project.deadline)}</p></div><span>{numberText(project.pending_proposal_count)} پیشنهاد در انتظار</span></li>)}</ul> : <EmptyState title="هنوز پروژه‌ای نداری" description="پروژه‌ای بساز یا فرصت‌های موجود را بررسی کن." action={<Link className="pm-link" href="/my/projects/new/">ایجاد پروژه<ArrowLeft size={16} aria-hidden="true" /></Link>} />}
      </section>
      <section className="pm-panel" aria-labelledby="home-proposals-title">
        <div className="pm-panel-header"><div><h2 id="home-proposals-title"><FileCheck2 size={20} aria-hidden="true" />پیشنهادها</h2><p className="pm-muted">{numberText(proposals.data.results.length)} پیشنهاد ارسال‌شده</p></div><Link className="pm-link" href="/my/proposals/">همه پیشنهادها<ArrowLeft size={16} aria-hidden="true" /></Link></div>
        {proposalRows.length ? <ul className="pm-home-list">{proposalRows.map(proposal => <li key={proposal.id}><div><Link className="pm-table-title" href={`/projects/${proposal.project.id}/`}>{proposal.project.title}</Link><p className="pm-muted">{dateText(proposal.created_at)} · وضعیت پروژه: {projectStatuses[proposal.project.status]}</p></div><div className="pm-home-proposal-status"><StatusBadge status={proposal.status} /><bdi>{moneyText(proposal.amount)}</bdi></div></li>)}</ul> : <EmptyState title="هنوز پیشنهادی نفرستاده‌ای" description="پروژه‌های باز را پیدا کن و برای فرصت مناسب پیشنهاد بفرست." action={<Link className="pm-link" href="/projects/">کشف پروژه‌ها<ArrowLeft size={16} aria-hidden="true" /></Link>} />}
      </section>
    </div>
  </div>;
}
