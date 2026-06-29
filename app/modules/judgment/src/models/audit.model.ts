import {
  prop,
  getModelForClass,
  modelOptions,
  Severity,
} from "@typegoose/typegoose";
import { CommonTypegooseEntity } from "~/api/models/base/common-typegoose.entity";

@modelOptions({
  schemaOptions: {
    collection: "tbl_judgment_audit_logs",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class AuditLog extends CommonTypegooseEntity {
  @prop({ type: String, required: true, index: true })
  configId!: string;

  @prop({ type: String, required: true })
  eventType!: string; // e.g. "config_created", "submitted", "judgment_generated", "task_created"

  @prop({ type: Object, default: {} })
  payload!: any;

  @prop({ type: Date, default: Date.now, required: true })
  timestamp!: Date;
}

export const AuditLogModel = getModelForClass(AuditLog);
