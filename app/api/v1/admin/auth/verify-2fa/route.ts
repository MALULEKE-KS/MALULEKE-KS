// POST /api/v1/admin/auth/verify-2fa — step 2. 5 failed attempts invalidates
// the challengeToken (BR-3.6). Session ID re-minted on success (BR-3.8).
// See openapi-contract.yaml, docs/DESIGN-SYSTEM.md §5.

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import { db } from "@/lib/db";
import { Verify2FAInputSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/auth/activity-log";
import { decryptSecret } from "@/lib/auth/crypto";
import { createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";

const MAX_2FA_ATTEMPTS = 5; // BR-3.6

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, details: null } }, { status });
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function isTotpShaped(code: string): boolean {
  return /^\d{6}$/.test(code);
}

async function verifyTotp(encryptedSecret: string, code: string): Promise<boolean> {
  const secret = decryptSecret(encryptedSecret);
  const totp = new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 });
  return totp.validate({ token: code, window: 1 }) !== null;
}

async function verifyAndConsumeRecoveryCode(adminId: string, hashedCodes: string[], code: string): Promise<boolean> {
  for (const hashed of hashedCodes) {
    if (await bcrypt.compare(code, hashed)) {
      await db.adminUser.update({
        where: { id: adminId },
        data: { recoveryCodes: hashedCodes.filter((c) => c !== hashed) },
      });
      return true;
    }
  }
  return false;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = Verify2FAInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid request", 400);
  }

  const tokenHash = hashToken(parsed.data.challengeToken);
  const challenge = await db.loginChallenge.findUnique({
    where: { tokenHash },
    include: { adminUser: true },
  });

  // BR-3.5 — expired, already-consumed, or unknown all return the same
  // generic response as a wrong code; none of them restart the flow.
  if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
    return errorResponse("CHALLENGE_EXPIRED", "Code is incorrect.", 401);
  }

  const isValid = isTotpShaped(parsed.data.code)
    ? challenge.adminUser.twoFactorSecret
      ? await verifyTotp(challenge.adminUser.twoFactorSecret, parsed.data.code)
      : false
    : await verifyAndConsumeRecoveryCode(challenge.adminUserId, challenge.adminUser.recoveryCodes, parsed.data.code);

  if (!isValid) {
    const attempts = challenge.attempts + 1;
    const exhausted = attempts >= MAX_2FA_ATTEMPTS;

    await db.loginChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts,
        // BR-3.6 — invalidate the token itself once attempts are
        // exhausted, not just refuse further tries against it.
        consumedAt: exhausted ? new Date() : undefined,
      },
    });
    await logActivity({ adminUserId: challenge.adminUserId, action: "auth.2fa_failed" });

    return errorResponse(
      "CHALLENGE_INVALID",
      isTotpShaped(parsed.data.code) ? "Code is incorrect." : "Recovery code is invalid.",
      401
    );
  }

  // Success — consume the challenge (BR-3.5, single-use regardless of
  // outcome) and mint a brand-new session, never reusing any pre-2FA
  // identifier (BR-3.8).
  await db.loginChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
  await db.adminUser.update({ where: { id: challenge.adminUserId }, data: { lastLoginAt: new Date() } });
  await logActivity({ adminUserId: challenge.adminUserId, action: "auth.login" });

  const sessionCookieValue = createSessionCookieValue(challenge.adminUserId);
  const response = NextResponse.json({
    sessionExpiresAt: new Date(Date.now() + SESSION_COOKIE_OPTIONS.maxAge * 1000).toISOString(),
  });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookieValue, SESSION_COOKIE_OPTIONS);
  return response;
}
