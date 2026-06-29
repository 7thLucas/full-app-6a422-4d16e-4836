import {
  prop,
  getModelForClass,
  modelOptions,
} from "@typegoose/typegoose";
import { CommonTypegooseEntity } from "~/api/models/base/common-typegoose.entity";

@modelOptions({
  schemaOptions: {
    collection: "tbl_judgment_issues",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
})
export class Issue extends CommonTypegooseEntity {
  @prop({ type: String, required: true, index: true })
  configId!: string;

  @prop({ type: String, required: true, index: true })
  submissionId!: string;

  @prop({ type: String, required: true })
  severity!: string;

  @prop({ type: String, default: "open", enum: ["open", "resolved"], required: true })
  status!: "open" | "resolved";

  @prop({ type: String, required: true })
  title!: string;

  @prop({ type: String, required: true })
  description!: string;
}

export const IssueModel = getModelForClass(Issue);
