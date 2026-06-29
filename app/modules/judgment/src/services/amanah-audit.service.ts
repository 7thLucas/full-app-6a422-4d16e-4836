import { createLogger } from "~/lib/logger";
import { JudgmentConfigModel } from "../models/config.model";
import { AmanahStaffModel } from "../models/staff.model";
import { AmanahAuditModel } from "../models/amanah-audit.model";

const logger = createLogger("AmanahAuditService");

export interface ScoreThresholds {
  compliant: number; // min score for "compliant"
  atRisk: number; // min score for "at_risk"; below this is "gap"
}

const DEFAULT_THRESHOLDS: ScoreThresholds = { compliant: 85, atRisk: 70 };

// Fraction of a criterion's weight earned per manual outcome.
const OUTCOME_FRACTION: Record<string, number> = {
  pass: 1,
  partial: 0.5,
  fail: 0,
};

export interface SubmittedItem {
  criterionId: string;
  outcome: "pass" | "partial" | "fail";
  note?: string;
}

export interface ComputedItem {
  criterionId: string;
  name: string;
  category: string;
  severity: string;
  weight: number;
  outcome: "pass" | "partial" | "fail";
  note: string;
  isGap: boolean;
}

export interface ComputedAudit {
  items: ComputedItem[];
  score: number;
  status: "compliant" | "at_risk" | "gap";
  gapCount: number;
}

/**
 * Deterministically computes a compliance score (0-100) from manually-scored
 * checklist items, weighted by each criterion's weight. Flags gaps (partial/fail)
 * and rolls the result into a status using configurable thresholds.
 */
export function computeAudit(
  criteria: Array<{ id: string; name: string; category: string; severity: string; weight: number; autoFailIfMissing?: boolean }>,
  submitted: SubmittedItem[],
  thresholds: ScoreThresholds = DEFAULT_THRESHOLDS,
): ComputedAudit {
  const submittedMap = new Map(submitted.map((s) => [s.criterionId, s]));
  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0) || 1;

  let earned = 0;
  let gapCount = 0;
  let hasCriticalFail = false;

  const items: ComputedItem[] = criteria.map((c) => {
    const found = submittedMap.get(c.id);
    const outcome = (found?.outcome ?? "fail") as "pass" | "partial" | "fail";
    const weight = Number(c.weight) || 0;
    earned += weight * (OUTCOME_FRACTION[outcome] ?? 0);

    const isGap = outcome !== "pass";
    if (isGap) gapCount += 1;
    if (outcome === "fail" && (c.severity === "critical" || c.autoFailIfMissing)) {
      hasCriticalFail = true;
    }

    return {
      criterionId: c.id,
      name: c.name,
      category: c.category,
      severity: c.severity,
      weight,
      outcome,
      note: found?.note ?? "",
      isGap,
    };
  });

  let score = Math.round((earned / totalWeight) * 100);
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let status: "compliant" | "at_risk" | "gap";
  if (hasCriticalFail) {
    // A failed critical / auto-fail criterion can never be "compliant".
    status = score >= thresholds.atRisk ? "at_risk" : "gap";
  } else if (score >= thresholds.compliant) {
    status = "compliant";
  } else if (score >= thresholds.atRisk) {
    status = "at_risk";
  } else {
    status = "gap";
  }

  return { items, score, status, gapCount };
}

export async function listStaff(filter: Record<string, unknown> = {}) {
  return AmanahStaffModel.find(filter).sort({ name: 1 }).lean();
}

export async function getStaff(id: string) {
  return AmanahStaffModel.findById(id).lean();
}

export async function getChecklist(roleKey: string) {
  return JudgmentConfigModel.findOne({ pluginId: roleKey }).lean();
}

export interface CreateAuditInput {
  staffId: string;
  items: SubmittedItem[];
  notes?: string;
  auditorId: string;
  auditorName?: string;
  thresholds?: ScoreThresholds;
}

export async function createAudit(input: CreateAuditInput) {
  const staff = await AmanahStaffModel.findById(input.staffId).lean();
  if (!staff) throw Object.assign(new Error("Staff not found"), { statusCode: 404 });

  const config = await JudgmentConfigModel.findOne({ pluginId: staff.roleKey }).lean();
  if (!config) throw Object.assign(new Error("Checklist not found for role"), { statusCode: 404 });

  const computed = computeAudit(
    (config.criteria ?? []) as any[],
    input.items,
    input.thresholds ?? DEFAULT_THRESHOLDS,
  );

  const audit = await AmanahAuditModel.create({
    staffId: String(staff._id),
    staffName: staff.name,
    branch: staff.branch,
    roleKey: staff.roleKey,
    roleLabel: staff.roleLabel,
    configId: config.pluginId,
    items: computed.items,
    score: computed.score,
    status: computed.status,
    gapCount: computed.gapCount,
    notes: input.notes ?? "",
    auditorId: input.auditorId,
    auditorName: input.auditorName ?? "",
  });

  logger.info("Audit created", { staffId: staff._id, score: computed.score, status: computed.status });
  return audit.toObject();
}

/** Latest audit per staff member (the current compliance state). */
export async function latestAuditsByStaff(staffFilter: Record<string, unknown> = {}) {
  const staff = await AmanahStaffModel.find(staffFilter).lean();
  const staffIds = staff.map((s) => String(s._id));

  const audits = await AmanahAuditModel.find({ staffId: { $in: staffIds } })
    .sort({ createdAt: -1 })
    .lean();

  const latestByStaff = new Map<string, any>();
  for (const a of audits) {
    if (!latestByStaff.has(a.staffId)) latestByStaff.set(a.staffId, a);
  }

  return staff.map((s) => ({
    staff: s,
    audit: latestByStaff.get(String(s._id)) ?? null,
  }));
}

export async function getLatestAuditForStaff(staffId: string) {
  return AmanahAuditModel.findOne({ staffId }).sort({ createdAt: -1 }).lean();
}
