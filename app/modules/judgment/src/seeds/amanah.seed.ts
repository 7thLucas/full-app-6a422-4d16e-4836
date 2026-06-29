import bcrypt from "bcryptjs";
import { createLogger } from "~/lib/logger";
import { UserModel } from "~/modules/authentication/authentication.model";
import { UserRole } from "~/modules/authentication/authentication.types";
import { AmanahStaffModel } from "../models/staff.model";

const logger = createLogger("AmanahSeed");

const ROLE_LABELS: Record<string, string> = {
  rm: "Relationship Manager",
  teller: "Teller",
  cs: "Customer Service",
};

const STAFF_SEED = [
  { name: "Rina Hapsari", branch: "KC Jakarta Thamrin", roleKey: "rm" },
  { name: "Bayu Santoso", branch: "KC Jakarta Thamrin", roleKey: "teller" },
  { name: "Dewi Lestari", branch: "KC Jakarta Thamrin", roleKey: "cs" },
  { name: "Ahmad Fauzi", branch: "KC Bandung Asia Afrika", roleKey: "rm" },
  { name: "Siti Nurhaliza", branch: "KC Bandung Asia Afrika", roleKey: "teller" },
  { name: "Eko Prasetyo", branch: "KC Surabaya Darmo", roleKey: "rm" },
  { name: "Maya Anggraini", branch: "KC Surabaya Darmo", roleKey: "cs" },
  { name: "Fitri Handayani", branch: "KC Surabaya Darmo", roleKey: "teller" },
];

async function ensureUser(opts: {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  profile: Record<string, any>;
}) {
  const existing = await UserModel.findOne({ email: opts.email.toLowerCase() });
  if (existing) {
    // Keep the Amanah profile in sync without overwriting credentials.
    existing.profile = { ...(existing.profile ?? {}), ...opts.profile };
    await existing.save();
    return existing;
  }
  const password_hash = await bcrypt.hash(opts.password, 12);
  return UserModel.create({
    username: opts.username,
    email: opts.email.toLowerCase(),
    password_hash,
    role: opts.role,
    is_active: true,
    email_verified: true,
    profile: opts.profile,
  });
}

export async function seedAmanah() {
  if (process.env.SEED_ADMIN_ENABLE === "false") {
    logger.info("Demo seeding disabled (SEED_ADMIN_ENABLE=false), skipping Amanah seed.");
  }

  // 1. Seed staff (idempotent by name + branch).
  for (const s of STAFF_SEED) {
    await AmanahStaffModel.findOneAndUpdate(
      { name: s.name, branch: s.branch },
      { $set: { ...s, roleLabel: ROLE_LABELS[s.roleKey] ?? s.roleKey } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  logger.info("Seeded Amanah staff", { count: STAFF_SEED.length });

  // 2. Seed the three role-based demo accounts.
  const password = process.env.SEED_DEMO_PASSWORD ?? "Amanah123!";

  await ensureUser({
    username: "officer",
    email: "officer@bsi.co.id",
    password,
    role: UserRole.Admin,
    profile: { amanahRole: "officer", displayName: "Compliance Officer" },
  });

  await ensureUser({
    username: "manager",
    email: "manager@bsi.co.id",
    password,
    role: UserRole.Authenticated,
    profile: { amanahRole: "manager", branch: "KC Jakarta Thamrin", displayName: "Manajer Cabang Thamrin" },
  });

  // 3. Link a staff demo account to an existing staff record (read-only tier).
  const linkedStaff = await AmanahStaffModel.findOne({ name: "Rina Hapsari" });
  const staffUser = await ensureUser({
    username: "staff",
    email: "staff@bsi.co.id",
    password,
    role: UserRole.Authenticated,
    profile: {
      amanahRole: "staff",
      branch: linkedStaff?.branch ?? null,
      staffId: linkedStaff ? String(linkedStaff._id) : null,
      displayName: linkedStaff?.name ?? "Pegawai",
    },
  });

  // Back-link the staff record to the user account.
  if (linkedStaff && staffUser) {
    linkedStaff.userId = String(staffUser._id);
    await linkedStaff.save();
  }

  logger.info("Seeded Amanah demo accounts (officer / manager / staff)");
}

export default seedAmanah;
