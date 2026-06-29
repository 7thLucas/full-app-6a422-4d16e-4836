import bcrypt from "bcryptjs";
import { createLogger } from "~/lib/logger";
import { UserModel } from "./authentication.model";
import { UserRole } from "./authentication.types";

const logger = createLogger("AuthenticationSeed");

export async function seedAdminUser(): Promise<void> {
  try {
    if (process.env.SEED_ADMIN_ENABLE !== "true") return;

    const existing = await UserModel.findOne({ role: UserRole.Admin });
    if (existing) {
      logger.info("Admin user already exists, skipping seed.");
      return;
    }

    const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
    const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
    const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

    const password_hash = await bcrypt.hash(password, 12);

    await UserModel.create({ username, email, password_hash, role: UserRole.Admin, is_active: true });

    logger.info(`✅ Admin user '${username}' seeded successfully.`);
  } catch (error) {
    logger.error("❌ Failed to seed admin user:", error);
  }
}
