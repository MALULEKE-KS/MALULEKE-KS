// GET/POST /api/v1/admin/auth/recovery-codes — BR-3.12. GET: how many unused
// recovery codes remain, and whether that's low (fewer than 3). POST: issue a
// fresh batch of ten (BR-3.11), shown once in this response; every earlier code
// stops working at the same moment. Regenerating needs the current password
// and a live TOTP code, with the same per-session failure limit as a password
// change (lib/auth/reauth). Codes are stored only as hashes, and never enter
// the audit log (redacted).

import { NextResponse } from "next/server";
import { RecoveryCodesRegenerateInputSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/auth/activity-log";
import { reauthFailed, verifyReauth } from "@/lib/auth/reauth";
import { generateRecoveryCodes, recoveryCodeStatus } from "@/lib/auth/recovery-codes";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";

export const GET = withAdmin(async (_request, { adminUserId }) => {
  const { recoveryCodes } = await db.adminUser.findUniqueOrThrow({ where: { id: adminUserId }, select: { recoveryCodes: true } });
  return NextResponse.json(recoveryCodeStatus(recoveryCodes));
});

export const POST = withAdmin(async (request, { adminUserId, write }) => {
  const parsed = RecoveryCodesRegenerateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request.", details: null } },
      { status: 400 },
    );
  }

  // Verify first: ten bcrypt hashes cost real CPU, and a failed attempt must
  // never get to spend it. Hashing runs outside any transaction.
  const verified = await write((tx) => verifyReauth(tx, adminUserId, parsed.data.currentPassword, parsed.data.code));
  if (!verified) return reauthFailed(adminUserId, "auth.recovery_codes_failed", request);

  const { plain, hashed } = await generateRecoveryCodes();
  await write((tx) => tx.adminUser.update({ where: { id: adminUserId }, data: { recoveryCodes: hashed } }));

  await logActivity({ adminUserId, action: "auth.recovery_codes_regenerated", request });
  return NextResponse.json({ codes: plain, ...recoveryCodeStatus(hashed) }, { headers: { "Cache-Control": "no-store" } });
});
