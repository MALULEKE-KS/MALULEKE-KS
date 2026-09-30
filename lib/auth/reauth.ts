// lib/auth/reauth.ts
// Re-authentication for sensitive account changes inside a session — changing
// the password (BR-3.15) and regenerating recovery codes (BR-3.12): the
// current password AND a live, single-use TOTP code (BR-3.14). One failure
// counter per session covers every such action, and the fifth failure ends the
// session — a stolen session can't be used to keep guessing, and the owner is
// never locked out of signing in again.

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import type { Tx } from "@/lib/audit";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/auth/activity-log";
import { hitRateLimitKey } from "@/lib/auth/rate-limit";
import { ABSOLUTE_TIMEOUT_MS, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { verifyTotpOnce } from "@/lib/auth/totp";

export const MAX_REAUTH_FAILURES_PER_SESSION = 5; // BR-3.15, mirrors BR-3.6

/** True if the password and a fresh TOTP code both check out (the code is then used up). */
export async function verifyReauth(tx: Tx, adminUserId: string, password: string, code: string): Promise<boolean> {
  const admin = await tx.adminUser.findUniqueOrThrow({ where: { id: adminUserId } });
  const passwordValid = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordValid || !admin.twoFactorSecret || !admin.twoFactorEnabled) return false;
  return verifyTotpOnce(tx, adminUserId, admin.twoFactorSecret, code);
}

/**
 * Log a failed re-authentication and count it against this session; the
 * fifth ends the session. Returns the response to send.
 */
export async function reauthFailed(adminUserId: string, action: string, request: Request): Promise<Response> {
  await logActivity({ adminUserId, action, request });
  // The session that made the attempt is still current here (withAdmin
  // checked it), so its generation keys the count.
  const { sessionVersion } = await db.adminUser.findUniqueOrThrow({ where: { id: adminUserId }, select: { sessionVersion: true } });
  const { hits } = await hitRateLimitKey(
    `auth.reauth:admin:${adminUserId}:v${sessionVersion}`,
    MAX_REAUTH_FAILURES_PER_SESSION,
    ABSOLUTE_TIMEOUT_MS, // no session outlives this, so the count covers its whole life
  );
  if (hits < MAX_REAUTH_FAILURES_PER_SESSION) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Current credentials could not be verified.", details: null } },
      { status: 401 },
    );
  }

  await db.adminUser.updateMany({ where: { id: adminUserId, sessionVersion }, data: { sessionVersion: { increment: 1 } } });
  await logActivity({ adminUserId, action: "auth.session_revoked", request });
  const response = NextResponse.json(
    { error: { code: "SESSION_REVOKED", message: "Too many failed attempts. Sign in again.", details: null } },
    { status: 401 },
  );
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
