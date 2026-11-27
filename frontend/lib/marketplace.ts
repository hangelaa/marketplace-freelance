import type { PricingType, ProjectStatus, ProposalStatus } from "@/types/marketplace";
export const projectStatuses: Record<ProjectStatus, string> = { Draft: "پیش‌نویس", Open: "باز برای پیشنهاد", "In Progress": "در حال انجام", Completed: "تکمیل‌شده", Cancelled: "لغوشده" };
export const proposalStatuses: Record<ProposalStatus, string> = { Pending: "در انتظار بررسی", Accepted: "پذیرفته‌شده", Rejected: "ردشده", Withdrawn: "پس‌گرفته‌شده" };
export const pricingLabels: Record<PricingType, string> = { Fixed: "مبلغ ثابت", Hourly: "نرخ ساعتی" };
export function numberText(value: number): string { return new Intl.NumberFormat("fa-IR").format(value); }
export function moneyText(value: string | null | undefined): string {
  if (!value || !/^\d+(\.\d+)?$/.test(value)) return "—";
  const [integer, fraction] = value.split(".");
  const decimal = fraction?.replace(/0+$/, "");
  return new Intl.NumberFormat("fa-IR").format(BigInt(integer)) + (decimal ? "٫" + decimal.replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]) : "");
}
export function dateText(value: string | null | undefined): string {
  if (!value) return "تعیین نشده";
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(date);
}
export function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" }).formatToParts(new Date());
  const part = (name: string) => parts.find(item => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function validAmount(value: string): boolean {
  return /^\d{1,10}(\.\d{1,2})?$/.test(value.trim()) && /[1-9]/.test(value);
}
