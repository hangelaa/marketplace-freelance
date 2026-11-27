"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { CircleAlert, FolderOpen, LoaderCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectStatuses, proposalStatuses } from "@/lib/marketplace";
import type { ProjectStatus, ProposalStatus } from "@/types/marketplace";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="pm-heading"><div>{eyebrow && <p className="pm-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}
export function StatusBadge({ status }: { status: ProjectStatus | ProposalStatus }) {
  const tone = status === "Open" || status === "Accepted" || status === "Completed" ? "positive" : status === "In Progress" || status === "Pending" ? "active" : status === "Rejected" || status === "Cancelled" ? "negative" : "neutral";
  const label = (projectStatuses as Record<string, string>)[status] || (proposalStatuses as Record<string, string>)[status] || status;
  return <span className={`pm-status pm-status--${tone}`}><span aria-hidden="true" />{label}</span>;
}
export function LoadingState({ label = "در حال دریافت اطلاعات…" }: { label?: string }) {
  return <div className="pm-state" role="status"><LoaderCircle className="animate-spin" aria-hidden="true" /><p>{label}</p></div>;
}
export function ErrorState({ error, retry }: { error: { message: string; status?: number }; retry?: () => void }) {
  return <div className="pm-state pm-state--error" role="alert"><CircleAlert aria-hidden="true" /><h2>{error.status === 403 ? "دسترسی به این بخش مجاز نیست" : error.status === 404 ? "پروژه یافت نشد" : "اطلاعات دریافت نشد"}</h2><p>{error.message}</p>{retry && <Button type="button" variant="outline" className="pm-button pm-button--secondary" onClick={retry}><RefreshCw aria-hidden="true" />تلاش دوباره</Button>}</div>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="pm-state"><span className="pm-state-icon"><FolderOpen aria-hidden="true" /></span><h2>{title}</h2><p>{description}</p>{action}</div>;
}
export function FieldError({ id, children }: { id: string; children?: string }) {
  return children ? <p className="pm-field-error" id={id}>{children}</p> : null;
}
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onClose, pending = false, danger = false, error, children }: {
  open: boolean; title: string; description: string; confirmLabel: string;
  onConfirm: () => void; onClose: () => void; pending?: boolean; danger?: boolean; error?: string; children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId(); const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="pm-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <div className="pm-dialog-heading"><h2 id={titleId}>{title}</h2><button type="button" className="pm-icon-button" onClick={onClose} disabled={pending} aria-label="بستن پنجره"><X aria-hidden="true" /></button></div>
    <p id={descriptionId} className="pm-muted">{description}</p>
    {children}
    {error && <p role="alert" className="pm-feedback pm-feedback--error">{error}</p>}
    <div className="pm-actions"><Button type="button" variant="outline" className="pm-button pm-button--secondary" onClick={onClose} disabled={pending} autoFocus>انصراف</Button><Button type="button" className={`pm-button${danger ? " pm-button--danger" : ""}`} disabled={pending} onClick={onConfirm}>{pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}{pending ? "در حال انجام…" : confirmLabel}</Button></div>
  </dialog>;
}
