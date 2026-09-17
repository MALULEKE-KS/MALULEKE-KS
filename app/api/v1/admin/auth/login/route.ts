// POST /api/v1/admin/auth/login — step 1. Never issues a session alone;
// returns a challengeToken (5-min TTL — BR-3.5). BR-3.2 lockout on 5
// failures. See openapi-contract.yaml, docs/DESIGN-SYSTEM.md §5.

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { AdminLoginInputSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/auth/activity-log";

const MAX_FAILED_ATTEMPTS = 5; // BR-3.2
const LOCKOUT_MS = 14 * 60 * 1000; // Design System §5's own stated example
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // BR-3.5

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = AdminLoginInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid request", 400);
  }

  // BR-3.10 — email is always normalized to lowercase, on write and lookup.
  const email = parsed.data.email.toLowerCase();
  const admin = await db.adminUser.findUnique({ where: { email } });

  // Generic failure for an unknown email — same response shape as a wrong
  // password, so no distinguishable signal either way (Design System §5).
  // Not logged to ActivityLog: adminUserId is a required FK, and there's no
  // real AdminUser to attach an attempt against an unknown email to — see
  // lib/auth/activity-log.ts's own scope note. This doesn't weaken the
  // lockout, which is keyed to the one real account regardless.
  if (!admin) {
    return errorResponse("UNAUTHORIZED", "Email or password is incorrect.", 401);
  }

  if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
    return errorResponse("ACCOUNT_LOCKED", "Too many attempts. Try again later.", 401, {
      lockedUntil: admin.lockedUntil.toISOString(),
    });
  }

  const passwordValid = await bcrypt.compare(parsed.data.password, admin.passwordHash);

  if (!passwordValid) {
    const failedLoginCount = admin.failedLoginCount + 1;
    const lockingNow = failedLoginCount >= MAX_FAILED_ATTEMPTS;

    await db.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginCount: lockingNow ? 0 : failedLoginCount,
        lockedUntil: lockingNow ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    });
    await logActivity({ adminUserId: admin.id, action: "auth.login_failed" });

    if (lockingNow) {
      return errorResponse("ACCOUNT_LOCKED", "Too many attempts. Try again later.", 401, {
        lockedUntil: new Date(Date.now() + LOCKOUT_MS).toISOString(),
      });
    }
    return errorResponse("UNAUTHORIZED", "Email or password is incorrect.", 401, {
      failedAttempts: failedLoginCount,
    });
  }

  // Credentials correct — reset the failure counter, but do NOT issue a
  // session yet (BR-3.1). Issue a short-lived challenge instead.
  await db.adminUser.update({
    where: { id: admin.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  const rawToken = randomBytes(32).toString("base64url");
  await db.loginChallenge.create({
    data: {
      tokenHash: hashToken(rawToken),
      adminUserId: admin.id,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  return NextResponse.json({ challengeToken: rawToken });
}
