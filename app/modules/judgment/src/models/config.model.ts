import {
  prop,
  getModelForClass,
  modelOptions,
  Severity,
} from "@typegoose/typegoose";
import { CommonTypegooseEntity } from "~/api/models/base/common-typegoose.entity";

export class Criterion {
  @prop({ type: String, required: true })
  id!: string;

  @prop({ type: String, required: true })
  category!: string;

  @prop({ type: String, required: true })
  name!: string;

  @prop({ type: String, required: true })
  passCriteria!: string;

  @prop({ type: String, required: true })
  severity!: string;

  @prop({ type: Number, default: 0 })
  weight!: number;

  @prop({ type: Boolean, default: false })
  autoFailIfMissing!: boolean;
}

@modelOptions({
  schemaOptions: {
    collection: "tbl_judgment_configs",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class JudgmentConfig extends CommonTypegooseEntity {
  @prop({ type: String, required: true, unique: true, index: true })
  pluginId!: string;

  @prop({ type: String, required: true })
  name!: string;

  @prop({ type: String, required: true })
  rules!: string;

  @prop({ type: Object, required: true })
  inputSchema!: any;

  @prop({ type: Object, required: true })
  outputSchema!: any;

  @prop({ type: () => [Criterion], default: [] })
  criteria!: Criterion[];

  @prop({ type: Object, default: {} })
  variables!: any;
}

export const JudgmentConfigModel = getModelForClass(JudgmentConfig);
