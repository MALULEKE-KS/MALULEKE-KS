// scripts/create-admin.ts
// Bootstraps the single AdminUser row (Constitution §1 — single-owner, no
// self-serve signup, BR-3.13). Run once, locally, against a real database:
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npx tsx scripts/create-admin.ts
//
// Prints the TOTP secret (for manual entry into an authenticator app) and
// 10 recovery codes (BR-3.11) — both shown exactly once, here, since
// neither is ever stored or displayed again after this.

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { Secret } from "otpauth";
import { PrismaClient } from "@prisma/client";
import { encryptSecret } from "../lib/auth/crypto";

const prisma = new PrismaClient();

const BCRYPT_COST = 12; // matches the existing pattern referenced in BR-3.2

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD should be at least 12 characters");
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`An AdminUser with email ${email} already exists — this script only bootstraps the first one`);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const totpSecret = new Secret({ size: 20 });

  // BR-3.11 — exactly 10 recovery codes, hashed for storage, shown once here.
  const recoveryCodesPlain = Array.from({ length: 10 }, () => randomBytes(6).toString("hex"));
  const recoveryCodesHashed = await Promise.all(
    recoveryCodesPlain.map((code) => bcrypt.hash(code, BCRYPT_COST))
  );

  await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      twoFactorSecret: encryptSecret(totpSecret.base32),
      twoFactorEnabled: true,
      recoveryCodes: recoveryCodesHashed,
    },
  });

  console.log("AdminUser created.\n");
  console.log("TOTP secret (add to your authenticator app manually):");
  console.log(`  ${totpSecret.base32}\n`);
  console.log("Recovery codes (store these somewhere safe — shown once, never again):");
  recoveryCodesPlain.forEach((code) => console.log(`  ${code}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
