// POST /api/v1/admin/auth/change-password — rotate the sole admin password
// (BR-3.15). Requires the current password and a live, single-use TOTP code
// (BR-3.14). On success the per-admin session generation is incremented in the
// same transaction, ending every older session; the caller gets a fresh one.
//
// A stolen session can't be used to guess credentials: failed attempts are
// counted per session (atomically, rate_limit_hit), and the fifth ends that
// session outright — the same "invalidate rather than allow continued
// guessing" floor as BR-3.6. It never locks the owner out of logging in again.
// Every attempt, success or failure, is logged (BR-3.4).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PasswordChangeInputSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/auth/activity-log";
import { hitRateLimitKey } from "@/lib/auth/rate-limit";
import { ABSOLUTE_TIMEOUT_MS, createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { verifyTotpOnce } from "@/lib/auth/totp";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";

const MAX_FAILED_ATTEMPTS_PER_SESSION = 5; // BR-3.15, mirrors BR-3.6

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
    const admin = await tx.adminUser.findUniqueOrThrow({ where: { id: adminUserId } });
    const passwordValid = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
    if (!passwordValid || !admin.twoFactorSecret || !admin.twoFactorEnabled) return null;
    if (!(await verifyTotpOnce(tx, adminUserId, admin.twoFactorSecret, parsed.data.code))) return null;

    return tx.adminUser.update({
      where: { id: adminUserId },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
  });

  if (!result) {
    await logActivity({ adminUserId, action: "auth.password_change_failed", request });
    // The session that made the attempt is still current here (withAdmin
    // checked it), so its generation keys the failure count.
    const { sessionVersion } = await db.adminUser.findUniqueOrThrow({ where: { id: adminUserId }, select: { sessionVersion: true } });
    const { hits } = await hitRateLimitKey(
      `auth.password-change:admin:${adminUserId}:v${sessionVersion}`,
      MAX_FAILED_ATTEMPTS_PER_SESSION,
      ABSOLUTE_TIMEOUT_MS, // no session outlives this, so the count covers its whole life
    );
    if (hits < MAX_FAILED_ATTEMPTS_PER_SESSION) {
      return errorResponse("UNAUTHORIZED", "Current credentials could not be verified.", 401);
    }

    await db.adminUser.updateMany({ where: { id: adminUserId, sessionVersion }, data: { sessionVersion: { increment: 1 } } });
    await logActivity({ adminUserId, action: "auth.session_revoked", request });
    const response = errorResponse("SESSION_REVOKED", "Too many failed attempts. Sign in again.", 401);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  await logActivity({ adminUserId, action: "auth.password_changed", request });
  const response = NextResponse.json({ sessionExpiresAt: new Date(Date.now() + SESSION_COOKIE_OPTIONS.maxAge * 1000).toISOString() });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(adminUserId, result.sessionVersion), SESSION_COOKIE_OPTIONS);
  return response;
});
