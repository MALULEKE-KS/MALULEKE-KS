// scripts/create-admin.ts
// Bootstraps the single AdminUser row (Constitution §1 — single-owner, no
// self-serve signup, BR-3.13). Run once, locally, against a real database:
//
// Run it yourself, in your own terminal — its output is shown exactly once
// and must never land in a chat transcript or a log. Passwords come from
// masked prompts, entered twice (a masked prompt hides typos):
//
//   $env:ADMIN_EMAIL = "you@example.com"
//   $env:ADMIN_PASSWORD = Read-Host "Password" -MaskInput
//   $env:ADMIN_PASSWORD_CONFIRM = Read-Host "Confirm password" -MaskInput
//   npx dotenv -e <env file> -- npx tsx scripts/create-admin.ts
//
// Lost the password later? scripts/reset-admin-password.ts (BR-3.13).
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
  const confirm = process.env.ADMIN_PASSWORD_CONFIRM;

  if (!email || !password || !confirm) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_PASSWORD_CONFIRM environment variables");
  }
  if (password !== confirm) {
    throw new Error("The two passwords don't match — nothing was created. Run it again.");
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
