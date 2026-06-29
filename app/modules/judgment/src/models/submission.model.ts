import {
  prop,
  getModelForClass,
  modelOptions,
  Severity,
} from "@typegoose/typegoose";
import { CommonTypegooseEntity } from "~/api/models/base/common-typegoose.entity";

export class FileInfo {
  @prop({ type: String, required: true })
  filename!: string;

  @prop({ type: String, required: true })
  fileUrl!: string;
}

@modelOptions({
  schemaOptions: {
    collection: "tbl_judgment_submissions",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class JudgmentSubmission extends CommonTypegooseEntity {
  @prop({ type: String, required: true, index: true })
  configId!: string;

  @prop({ type: Object, required: true })
  inputData!: any;

  @prop({ type: () => [FileInfo], default: [] })
  files!: FileInfo[];

  @prop({ type: Object, default: null })
  result!: any;

  @prop({ type: Object, default: null })
  rawResult!: any;

  @prop({ type: String, enum: ["PENDING", "DONE", "ERROR"], default: "PENDING", required: true })
  status!: "PENDING" | "DONE" | "ERROR";

  @prop({ type: String, default: null })
  error!: string | null;
}

export const JudgmentSubmissionModel = getModelForClass(JudgmentSubmission);
