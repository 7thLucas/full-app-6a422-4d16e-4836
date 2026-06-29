import { prop, getModelForClass, modelOptions, Severity } from "@typegoose/typegoose";
import { CommonTypegooseEntity } from "~/api/models/base/common-typegoose.entity";

/**
 * Client-facing staff member audited in Amanah (RM, teller, customer service).
 * `roleKey` maps to a JudgmentConfig.pluginId so the right checklist is loaded.
 */
@modelOptions({
  schemaOptions: {
    collection: "tbl_amanah_staff",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
  options: { allowMixed: Severity.ALLOW },
})
export class AmanahStaff extends CommonTypegooseEntity {
  @prop({ type: String, required: true, trim: true })
  name!: string;

  @prop({ type: String, required: true, trim: true })
  branch!: string;

  // pluginId of the JudgmentConfig role checklist (rm | teller | cs)
  @prop({ type: String, required: true, index: true })
  roleKey!: string;

  @prop({ type: String, required: true })
  roleLabel!: string;

  // Optional link to a tbl_users id for the read-only self-view tier.
  @prop({ type: String, required: false, default: null })
  userId?: string | null;
}

export const AmanahStaffModel = getModelForClass(AmanahStaff);
