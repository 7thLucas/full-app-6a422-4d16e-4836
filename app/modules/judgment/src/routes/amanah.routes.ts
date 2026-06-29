import { Router, type Request, type Response } from "express";
import { requireAuth } from "~/modules/authentication/authentication.middleware";
import {
  listStaff,
  getStaff,
  getChecklist,
  createAudit,
  latestAuditsByStaff,
  getLatestAuditForStaff,
  type ScoreThresholds,
} from "../services/amanah-audit.service";

const router = Router();

type AmanahRole = "officer" | "manager" | "staff";

function amanahRole(req: Request): AmanahRole {
  const role = (req.user?.profile as any)?.amanahRole;
  if (role === "officer" || role === "manager" || role === "staff") return role;
  // Fall back: admins act as officers.
  return req.user?.role === "admin" ? "officer" : "staff";
}

function thresholdsFromBody(body: any): ScoreThresholds | undefined {
  const compliant = Number(body?.compliantThreshold);
  const atRisk = Number(body?.atRiskThreshold);
  if (Number.isFinite(compliant) && Number.isFinite(atRisk)) {
    return { compliant, atRisk };
  }
  return undefined;
}

// Who am I (Amanah role + linked staff) — drives the client UI.
router.get("/amanah/me", requireAuth, async (req: Request, res: Response) => {
  const role = amanahRole(req);
  const profile = (req.user?.profile as any) ?? {};
  let linkedStaff = null;
  if (role === "staff" && profile.staffId) {
    linkedStaff = await getStaff(String(profile.staffId));
  }
  res.json({
    success: true,
    data: {
      id: req.user?.id,
      username: req.user?.username,
      email: req.user?.email,
      amanahRole: role,
      branch: profile.branch ?? null,
      staffId: profile.staffId ?? null,
      linkedStaff,
    },
  });
});

// List staff (officers see all; managers see their branch).
router.get("/amanah/staff", requireAuth, async (req: Request, res: Response) => {
  const role = amanahRole(req);
  if (role === "staff") {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  const filter: Record<string, unknown> = {};
  if (role === "manager") {
    const branch = (req.user?.profile as any)?.branch;
    if (branch) filter.branch = branch;
  }
  const staff = await listStaff(filter);
  res.json({ success: true, data: staff });
});

// Role checklist for a staff member (from the JudgmentConfig criteria).
router.get("/amanah/staff/:id/checklist", requireAuth, async (req: Request, res: Response) => {
  const role = amanahRole(req);
  if (role === "staff") {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  const staff = await getStaff(String(req.params.id));
  if (!staff) {
    res.status(404).json({ success: false, message: "Staff not found" });
    return;
  }
  const config = await getChecklist(staff.roleKey);
  if (!config) {
    res.status(404).json({ success: false, message: "Checklist not found" });
    return;
  }
  res.json({
    success: true,
    data: {
      staff,
      checklist: {
        configId: config.pluginId,
        name: config.name,
        rules: config.rules,
        criteria: config.criteria ?? [],
      },
    },
  });
});

// Submit a completed audit (officers + managers only).
router.post("/amanah/audits", requireAuth, async (req: Request, res: Response) => {
  const role = amanahRole(req);
  if (role === "staff") {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  try {
    const audit = await createAudit({
      staffId: String(req.body?.staffId ?? ""),
      items: Array.isArray(req.body?.items) ? req.body.items : [],
      notes: req.body?.notes,
      auditorId: req.user!.id,
      auditorName: req.user!.username,
      thresholds: thresholdsFromBody(req.body),
    });
    res.status(201).json({ success: true, data: audit });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, message: error.message ?? "Failed to create audit" });
  }
});

// Risk dashboard roll-up (officers + managers).
router.get("/amanah/dashboard", requireAuth, async (req: Request, res: Response) => {
  const role = amanahRole(req);
  if (role === "staff") {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  const filter: Record<string, unknown> = {};
  if (role === "manager") {
    const branch = (req.user?.profile as any)?.branch;
    if (branch) filter.branch = branch;
  }
  const rows = await latestAuditsByStaff(filter);

  const summary = { total: rows.length, compliant: 0, atRisk: 0, gap: 0, unaudited: 0, totalGaps: 0 };
  let scoreSum = 0;
  let scored = 0;
  for (const r of rows) {
    if (!r.audit) {
      summary.unaudited += 1;
      continue;
    }
    if (r.audit.status === "compliant") summary.compliant += 1;
    else if (r.audit.status === "at_risk") summary.atRisk += 1;
    else summary.gap += 1;
    summary.totalGaps += r.audit.gapCount ?? 0;
    scoreSum += r.audit.score ?? 0;
    scored += 1;
  }
  const averageScore = scored > 0 ? Math.round(scoreSum / scored) : 0;

  res.json({ success: true, data: { summary: { ...summary, averageScore }, rows } });
});

// Read-only self-view for audited staff: own latest score + gaps.
router.get("/amanah/self", requireAuth, async (req: Request, res: Response) => {
  const role = amanahRole(req);
  const profile = (req.user?.profile as any) ?? {};
  let staffId = profile.staffId ? String(profile.staffId) : null;

  // Officers/managers can pass ?staffId to inspect a specific person's self-view.
  if ((role === "officer" || role === "manager") && req.query.staffId) {
    staffId = String(req.query.staffId);
  }
  if (!staffId) {
    res.json({ success: true, data: { staff: null, audit: null } });
    return;
  }
  const [staff, audit] = await Promise.all([getStaff(staffId), getLatestAuditForStaff(staffId)]);
  res.json({ success: true, data: { staff, audit } });
});

export default router;
