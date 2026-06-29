import {
  prop,
  getModelForClass,
  modelOptions,
} from "@typegoose/typegoose";
import { CommonTypegooseEntity } from "~/api/models/base/common-typegoose.entity";

@modelOptions({
  schemaOptions: {
    collection: "tbl_judgment_tasks",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
})
export class ActionTask extends CommonTypegooseEntity {
  @prop({ type: String, required: true, index: true })
  configId!: string;

  @prop({ type: String, required: true, index: true })
  issueId!: string;

  @prop({ type: String, required: true })
  title!: string;

  @prop({ type: String, required: true })
  assigneeRole!: string;

  @prop({ type: Date, required: true })
  dueDate!: Date;

  @prop({ type: String, default: "open", enum: ["open", "completed"], required: true })
  status!: "open" | "completed";

  @prop({ type: String, required: true })
  description!: string;
}

export const ActionTaskModel = getModelForClass(ActionTask);
