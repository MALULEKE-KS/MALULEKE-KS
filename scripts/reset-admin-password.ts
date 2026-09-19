// scripts/reset-admin-password.ts
// Operator password reset — the manual recovery procedure BR-3.13 prescribes
// (no self-serve reset exists in V1; recovery is done by whoever holds
// infrastructure access, directly against the database).
//
// Run it yourself in your own terminal — never through an assistant, and never
// with the password on the command line. Both values come from masked prompts
// into environment variables:
//
//   $env:ADMIN_EMAIL = "you@example.com"
//   $env:ADMIN_PASSWORD = Read-Host "New password" -MaskInput
//   $env:ADMIN_PASSWORD_CONFIRM = Read-Host "Confirm new password" -MaskInput
//   npx dotenv -e .env.local -- npx tsx scripts/reset-admin-password.ts
//   Remove-Item Env:ADMIN_PASSWORD, Env:ADMIN_PASSWORD_CONFIRM
//
// The two entries must match — a masked prompt hides typos, which is exactly
// how a first password can end up different from the one intended. Also
// clears the failed-login counter and any lockout (BR-3.2), and records the
// reset in ActivityLog (BR-3.4). 2FA and recovery codes are left untouched.

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BCRYPT_COST = 12; // same cost as create-admin.ts and the login check

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const confirm = process.env.ADMIN_PASSWORD_CONFIRM;

  if (!email || !password || !confirm) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_PASSWORD_CONFIRM (see the header of this file)");
  }
  if (password !== confirm) {
    throw new Error("The two passwords don't match — nothing was changed. Run it again.");
  }
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters — nothing was changed.");
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    throw new Error(`No AdminUser with email ${email} — nothing was changed.`);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.activityLog.create({
      data: {
        // An operator script acting on the account, not the admin acting —
        // so a SYSTEM actor; the account is the entity (F1.3).
        actorType: "SYSTEM",
        action: "auth.password_reset_by_operator",
        entityType: "AdminUser",
        entityId: admin.id,
        // Never the password or its hash — only the fact it changed.
        after: { passwordChanged: true, failedLoginCountReset: true, lockCleared: true },
      },
    }),
  ]);

  // Self-check: the stored hash really verifies against what was typed.
  const saved = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id }, select: { passwordHash: true } });
  const verified = await bcrypt.compare(password, saved.passwordHash);

  console.log(`Password reset for ${email} (${password.length} characters). Verified against the stored hash: ${verified ? "yes" : "NO"}.`);
  console.log("Failed-login counter cleared, lock cleared. 2FA and recovery codes unchanged.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
