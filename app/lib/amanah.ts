// Shared client-side types + helpers for the Amanah audit UI.
import { apiGet, apiRequest } from "~/lib/api.client";

export type AmanahRole = "officer" | "manager" | "staff";
export type AuditStatus = "compliant" | "at_risk" | "gap";
export type Outcome = "pass" | "partial" | "fail";

export interface AmanahMe {
  id: string;
  username: string;
  email: string;
  amanahRole: AmanahRole;
  branch: string | null;
  staffId: string | null;
  linkedStaff: Staff | null;
}

export interface Staff {
  _id: string;
  name: string;
  branch: string;
  roleKey: string;
  roleLabel: string;
}

export interface Criterion {
  id: string;
  category: string;
  name: string;
  passCriteria: string;
  severity: string;
  weight: number;
  autoFailIfMissing?: boolean;
}

export interface Checklist {
  configId: string;
  name: string;
  rules: string;
  criteria: Criterion[];
}

export interface AuditItem {
  criterionId: string;
  name: string;
  category: string;
  severity: string;
  weight: number;
  outcome: Outcome;
  note: string;
  isGap: boolean;
}

export interface Audit {
  _id: string;
  staffId: string;
  staffName: string;
  branch: string;
  roleKey: string;
  roleLabel: string;
  configId: string;
  items: AuditItem[];
  score: number;
  status: AuditStatus;
  gapCount: number;
  notes: string;
  auditorName: string;
  createdAt: string;
}

export interface DashboardRow {
  staff: Staff;
  audit: Audit | null;
}

export interface DashboardData {
  summary: {
    total: number;
    compliant: number;
    atRisk: number;
    gap: number;
    unaudited: number;
    totalGaps: number;
    averageScore: number;
  };
  rows: DashboardRow[];
}

export const STATUS_LABEL: Record<AuditStatus, string> = {
  compliant: "Sesuai",
  at_risk: "Berisiko",
  gap: "Temuan",
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  pass: "Sesuai",
  partial: "Sebagian",
  fail: "Tidak Sesuai",
};

export const SEVERITY_LABEL: Record<string, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  critical: "Kritis",
};

export async function fetchMe() {
  return apiGet<AmanahMe>("/api/amanah/me");
}

export async function fetchStaff() {
  return apiGet<Staff[]>("/api/amanah/staff");
}

export async function fetchChecklist(staffId: string) {
  return apiGet<{ staff: Staff; checklist: Checklist }>(`/api/amanah/staff/${staffId}/checklist`);
}

export async function fetchDashboard() {
  return apiGet<DashboardData>("/api/amanah/dashboard");
}

export async function fetchSelf(staffId?: string) {
  return apiGet<{ staff: Staff | null; audit: Audit | null }>(
    "/api/amanah/self",
    staffId ? { staffId } : undefined,
  );
}

export async function submitAudit(payload: {
  staffId: string;
  items: { criterionId: string; outcome: Outcome; note?: string }[];
  notes?: string;
  compliantThreshold?: number;
  atRiskThreshold?: number;
}) {
  return apiRequest<Audit>("/api/amanah/audits", { method: "POST", data: payload });
}
