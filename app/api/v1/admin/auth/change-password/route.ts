// POST /api/v1/admin/auth/change-password — rotate the sole admin password
// (BR-3.15). Requires the current password and a live, single-use TOTP code
// (BR-3.14). On success the per-admin session generation is incremented in the
// same transaction, ending every older session; the caller gets a fresh one.
// Failures count against this session, and the fifth ends it (lib/auth/reauth).
// Every attempt, success or failure, is logged (BR-3.4).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PasswordChangeInputSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/auth/activity-log";
import { reauthFailed, verifyReauth } from "@/lib/auth/reauth";
import { createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, details: null } }, { status });
}

export const POST = withAdmin(async (request, { adminUserId, write }) => {
  const parsed = PasswordChangeInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("VALIDATION_ERROR", "Invalid password change request.", 400);
  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return errorResponse("VALIDATION_ERROR", "The new password must differ from the current one.", 400);
  }

  const result = await write(async (tx) => {
    if (!(await verifyReauth(tx, adminUserId, parsed.data.currentPassword, parsed.data.code))) return null;
    return tx.adminUser.update({
      where: { id: adminUserId },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
  });
  if (!result) return reauthFailed(adminUserId, "auth.password_change_failed", request);

  await logActivity({ adminUserId, action: "auth.password_changed", request });
  const response = NextResponse.json({ sessionExpiresAt: new Date(Date.now() + SESSION_COOKIE_OPTIONS.maxAge * 1000).toISOString() });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(adminUserId, result.sessionVersion), SESSION_COOKIE_OPTIONS);
  return response;
});
