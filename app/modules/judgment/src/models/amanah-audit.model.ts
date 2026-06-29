import { prop, getModelForClass, modelOptions, Severity } from "@typegoose/typegoose";
import { CommonTypegooseEntity } from "~/api/models/base/common-typegoose.entity";

export class AuditItemScore {
  @prop({ type: String, required: true })
  criterionId!: string;

  @prop({ type: String, required: true })
  name!: string;

  @prop({ type: String, required: true })
  category!: string;

  @prop({ type: String, required: true })
  severity!: string;

  @prop({ type: Number, required: true })
  weight!: number;

  // Manual score given by the auditor: "pass" | "partial" | "fail"
  @prop({ type: String, required: true, enum: ["pass", "partial", "fail"] })
  outcome!: "pass" | "partial" | "fail";

  @prop({ type: String, default: "" })
  note!: string;

  // true when this scored item is a flagged gap (partial or fail)
  @prop({ type: Boolean, default: false })
  isGap!: boolean;
}

/**
 * A completed per-employee compliance audit — the core domain record.
 * Scoring is deterministic: each criterion is scored manually, the score and
 * status are computed from the weighted outcomes.
 */
@modelOptions({
  schemaOptions: {
    collection: "tbl_amanah_audits",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
  options: { allowMixed: Severity.ALLOW },
})
export class AmanahAudit extends CommonTypegooseEntity {
  @prop({ type: String, required: true, index: true })
  staffId!: string;

  @prop({ type: String, required: true })
  staffName!: string;

  @prop({ type: String, required: true })
  branch!: string;

  @prop({ type: String, required: true, index: true })
  roleKey!: string;

  @prop({ type: String, required: true })
  roleLabel!: string;

  // pluginId of the JudgmentConfig checklist used
  @prop({ type: String, required: true })
  configId!: string;

  @prop({ type: () => [AuditItemScore], default: [] })
  items!: AuditItemScore[];

  @prop({ type: Number, required: true })
  score!: number; // 0-100

  @prop({ type: String, required: true, enum: ["compliant", "at_risk", "gap"] })
  status!: "compliant" | "at_risk" | "gap";

  @prop({ type: Number, default: 0 })
  gapCount!: number;

  @prop({ type: String, default: "" })
  notes!: string;

  // id + name of the officer/auditor who completed the audit
  @prop({ type: String, required: true })
  auditorId!: string;

  @prop({ type: String, default: "" })
  auditorName!: string;
}

export const AmanahAuditModel = getModelForClass(AmanahAudit);
