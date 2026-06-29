import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { DocumentType } from "@typegoose/typegoose";
import { UserModel, User } from "./authentication.model";
import type { PublicUser, RegisterDto, LoginDto, ResetPasswordDto, VerifyEmailDto } from "./authentication.types";
import { UserRole } from "./authentication.types";
import { EmailService } from "~/modules/email/email.service";

function toPublicUser(user: DocumentType<User>): PublicUser {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    email_verified: user.email_verified ?? false,
    profile: user.profile ?? {},
    createdAt: (user.createdAt as Date).toISOString(),
  };
}

function makeError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export class AuthService {
  static async register(dto: RegisterDto): Promise<PublicUser> {
    const [existingEmail, existingUsername] = await Promise.all([
      UserModel.findOne({ email: dto.email.toLowerCase() }),
      UserModel.findOne({ username: dto.username }),
    ]);

    if (existingEmail) throw makeError("Email is already registered", 409);
    if (existingUsername) throw makeError("Username is already taken", 409);

    const password_hash = await bcrypt.hash(dto.password, 12);
    const user = await UserModel.create({
      username: dto.username,
      email: dto.email,
      password_hash,
      role: UserRole.Authenticated,
      is_active: true,
      email_verified: false,
    });

    return toPublicUser(user);
  }

  static async login(dto: LoginDto): Promise<PublicUser> {
    const user = await UserModel.findOne({ email: dto.email.toLowerCase() });
    if (!user) throw makeError("Invalid credentials", 401);
    if (!user.is_active) throw makeError("Account is inactive", 403);

    const isValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isValid) throw makeError("Invalid credentials", 401);

    return toPublicUser(user);
  }

  static async getUserById(id: string): Promise<PublicUser | null> {
    try {
      const user = await UserModel.findById(id);
      return user ? toPublicUser(user) : null;
    } catch {
      return null;
    }
  }

  static async sendVerificationEmail(userId: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) throw makeError("User not found", 404);
    if (user.email_verified) throw makeError("Email is already verified", 400);

    // 6-digit cryptographically random code
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    user.email_verification_token = codeHash;
    user.email_verification_expires = new Date(Date.now() + 10 * 60_000); // 10 minutes
    await user.save();

    await EmailService.sendEmail({
      to: user.email,
      subject: "Verify your email address",
      content: `Your verification code is:\n\n${code}\n\nThis code expires in 10 minutes.\n\nIf you did not create an account, you can safely ignore this email.`,
    });
  }

  static async verifyEmail(userId: string, dto: VerifyEmailDto): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) throw makeError("User not found", 404);
    if (user.email_verified) throw makeError("Email is already verified", 400);

    if (!user.email_verification_token || !user.email_verification_expires) {
      throw makeError("No verification code found. Request a new one.", 400);
    }

    if (new Date() > user.email_verification_expires) {
      throw makeError("Verification code has expired. Request a new one.", 400);
    }

    const codeHash = crypto.createHash("sha256").update(dto.code.trim()).digest("hex");
    if (codeHash !== user.email_verification_token) {
      throw makeError("Invalid verification code.", 400);
    }

    user.email_verified = true;
    user.email_verification_token = null;
    user.email_verification_expires = null;
    await user.save();
  }

  static async forgotPassword(email: string): Promise<void> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) return;

    const plainToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");

    user.reset_password_token = tokenHash;
    user.reset_password_expires = new Date(Date.now() + 3_600_000);
    await user.save();

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const resetLink = `${appUrl}/auth/reset-password?token=${plainToken}`;

    await EmailService.sendEmail({
      to: user.email,
      subject: "Reset your password",
      content: `You requested a password reset.\n\nClick the link below to reset your password (valid for 1 hour):\n\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.`,
    });
  }

  static async resetPassword(dto: ResetPasswordDto): Promise<void> {
    if (dto.password !== dto.confirmPassword) {
      throw makeError("Passwords do not match", 400);
    }

    const tokenHash = crypto.createHash("sha256").update(dto.token).digest("hex");

    const user = await UserModel.findOne({
      reset_password_token: tokenHash,
      reset_password_expires: { $gt: new Date() },
    });

    if (!user) throw makeError("Invalid or expired reset token", 400);

    user.password_hash = await bcrypt.hash(dto.password, 12);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();
  }
}
