import {
  prop,
  getModelForClass,
  modelOptions,
  Severity,
} from "@typegoose/typegoose";
import { CommonTypegooseEntity } from "~/api/models/base/common-typegoose.entity";
import { UserRole } from "./authentication.types";

@modelOptions({
  schemaOptions: {
    collection: "tbl_users",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  options: {
    // Required so `profile` can hold arbitrary shapes without schema errors.
    allowMixed: Severity.ALLOW,
  },
})
export class User extends CommonTypegooseEntity {
  // ── Auth-critical fields (owned by this module) ────────────────────────────

  @prop({ type: String, required: true, unique: true, trim: true })
  username!: string;

  @prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @prop({ type: String, required: true })
  password_hash!: string;

  @prop({ type: String, enum: UserRole, default: UserRole.Authenticated })
  role!: UserRole;

  @prop({ type: Boolean, default: true })
  is_active!: boolean;

  @prop({ type: Boolean, default: false })
  email_verified!: boolean;

  // Reset-password token (SHA-256 hash of plain token sent via email)
  @prop({ type: String, required: false, default: null })
  reset_password_token?: string | null;

  @prop({ type: Date, required: false, default: null })
  reset_password_expires?: Date | null;

  // Email-verification token (SHA-256 hash of 6-digit code sent via email)
  @prop({ type: String, required: false, default: null })
  email_verification_token?: string | null;

  @prop({ type: Date, required: false, default: null })
  email_verification_expires?: Date | null;

  // ── Extensible profile bag ─────────────────────────────────────────────────
  // Other modules and future features store their data here.
  // The auth module never reads or writes this field.
  // Pattern: user.profile.featureName = { ... }
  @prop({ type: Object, default: {} })
  profile!: Record<string, any>;
}

export const UserModel = getModelForClass(User);
