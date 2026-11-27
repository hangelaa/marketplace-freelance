export interface CatalogItem { id: number; name: string }
export type ProjectStatus = "Draft" | "Open" | "In Progress" | "Completed" | "Cancelled";
export type ProposalStatus = "Pending" | "Accepted" | "Rejected" | "Withdrawn";
export type PricingType = "Fixed" | "Hourly";
export interface Project {
  id: number; title: string; description: string; pricing_type: PricingType;
  budget: string; status: ProjectStatus; deadline: string | null;
  created_at: string; updated_at: string; owner: { id: number; name: string };
  is_owner: boolean; categories: CatalogItem[]; skills: CatalogItem[];
}
export interface ProjectDetail extends Project {
  my_proposal: { id: number; status: ProposalStatus } | null;
  can_submit_proposal: boolean; can_edit: boolean; proposal_count?: number;
}
export interface OwnedProject {
  id: number; title: string; pricing_type: PricingType; budget: string;
  status: ProjectStatus; deadline: string | null; created_at: string;
  proposal_count: number; pending_proposal_count: number; can_edit: boolean; can_publish: boolean;
}
export interface ProjectPayload {
  title: string; description: string; pricing_type: PricingType; budget: string;
  deadline: string | null; category_ids: number[]; skill_ids: number[]; publish?: boolean;
}
export interface Proposal {
  id: number; project_id: number; amount: string; cover_letter: string;
  estimated_hours: string | null; estimated_days: number; status: ProposalStatus; created_at: string;
}
export interface ReceivedProposal extends Proposal {
  freelancer: { id: number; name: string; professional_title: string | null; bio: string | null; location: string | null; skills: CatalogItem[] };
  can_decide: boolean;
}
export interface MyProposal extends Proposal {
  project: { id: number; title: string; pricing_type: PricingType; status: ProjectStatus };
  can_withdraw: boolean;
}
export interface ProposalPayload { amount: string; cover_letter: string; estimated_days: number; estimated_hours?: string | null }
export interface Results<T> { results: T[] }
export interface ProjectPage extends Results<Project> { page: number; page_size: number; total: number }
