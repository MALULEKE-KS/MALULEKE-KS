// tests/integration/admin-auth-api.test.ts
// Hits the real database with a throwaway AdminUser fixture (isolated
// from any real bootstrapped admin — created and torn down here).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import { POST as login } from "@/app/api/v1/admin/auth/login/route";
import { POST as verify2fa } from "@/app/api/v1/admin/auth/verify-2fa/route";
import { POST as changePassword } from "@/app/api/v1/admin/auth/change-password/route";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/auth/crypto";
import { createSessionCookieValue, getSessionAdminId } from "@/lib/auth/session";

const TEST_EMAIL = `test-admin-auth-${Date.now().toString(36)}@example.com`;
const TEST_PASSWORD = "CorrectHorseBatteryStaple123!";
let totpSecret: Secret;
let adminId: string;

function makeRequest(url: string, body: object) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authenticatedRequest(url: string, body: object, cookie: string) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: `admin_session=${cookie}` },
    body: JSON.stringify(body),
  });
}

function currentTotpCode(): string {
  return new TOTP({ secret: totpSecret, digits: 6, period: 30 }).generate();
}

/** Codes are single-use (BR-3.14); stand in for waiting for the next 30-second step. */
async function freshTotpStep(): Promise<void> {
  await db.adminUser.update({ where: { id: adminId }, data: { lastTotpStep: null } });
}

async function challengeToken(): Promise<string> {
  const res = await login(makeRequest("http://localhost/api/v1/admin/auth/login", { email: TEST_EMAIL, password: TEST_PASSWORD }));
  return (await res.json()).challengeToken;
}

beforeAll(async () => {
  totpSecret = new Secret({ size: 20 });
  const admin = await db.adminUser.create({
    data: {
      email: TEST_EMAIL,
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
      twoFactorSecret: encryptSecret(totpSecret.base32),
      twoFactorEnabled: true,
      recoveryCodes: [await bcrypt.hash("recovery-code-plaintext", 10)],
    },
  });
  adminId = admin.id;
});

afterAll(async () => {
  // No audit/admin cleanup: ActivityLog is append-only (F1.3) and an admin it
  // references can't be deleted. The test database is disposable, and each
  // run uses its own admin email, so leftovers never collide.
  // If beforeAll threw before assigning adminId, there's nothing to clean
  // up — without this guard, the cleanup itself throws a second,
  // confusingly different error that obscures the real failure above it.
  if (!adminId) return;
  await db.loginChallenge.deleteMany({ where: { adminUserId: adminId } });
});

describe("POST /api/v1/admin/auth/login", () => {
  it("returns a challengeToken on correct credentials, never a session", async () => {
    const res = await login(
      makeRequest("http://localhost/api/v1/admin/auth/login", {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challengeToken).toBeDefined();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns a generic error for a wrong password, never revealing which field", async () => {
    const res = await login(
      makeRequest("http://localhost/api/v1/admin/auth/login", {
        email: TEST_EMAIL,
        password: "wrong-password",
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe("Email or password is incorrect.");
  });

  it("returns the identical generic error for an unknown email", async () => {
    const res = await login(
      makeRequest("http://localhost/api/v1/admin/auth/login", {
        email: "does-not-exist@example.com",
        password: "anything",
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe("Email or password is incorrect.");
  });

  it("locks the account after 5 consecutive failed attempts (BR-3.2)", async () => {
    for (let i = 0; i < 4; i++) {
      await login(
        makeRequest("http://localhost/api/v1/admin/auth/login", {
          email: TEST_EMAIL,
          password: "wrong-password",
        })
      );
    }
    const fifthFailure = await login(
      makeRequest("http://localhost/api/v1/admin/auth/login", {
        email: TEST_EMAIL,
        password: "wrong-password",
      })
    );
    expect(fifthFailure.status).toBe(401);
    expect((await fifthFailure.json()).error.code).toBe("ACCOUNT_LOCKED");

    // Even correct credentials are rejected while locked.
    const correctButLocked = await login(
      makeRequest("http://localhost/api/v1/admin/auth/login", {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })
    );
    expect(correctButLocked.status).toBe(401);
    expect((await correctButLocked.json()).error.code).toBe("ACCOUNT_LOCKED");

    // Clear the lock for subsequent tests in this file.
    await db.adminUser.update({ where: { id: adminId }, data: { lockedUntil: null, failedLoginCount: 0 } });
  });
});

describe("POST /api/v1/admin/auth/verify-2fa", () => {
  async function getChallengeToken(): Promise<string> {
    const res = await login(
      makeRequest("http://localhost/api/v1/admin/auth/login", {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })
    );
    return (await res.json()).challengeToken;
  }

  it("issues a session cookie on a correct TOTP code", async () => {
    const challengeToken = await getChallengeToken();
    const res = await verify2fa(
      makeRequest("http://localhost/api/v1/admin/auth/verify-2fa", {
        challengeToken,
        code: currentTotpCode(),
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("admin_session=");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
    expect(res.headers.get("set-cookie")).toContain("SameSite=strict");
  });

  it("accepts a valid recovery code and consumes it (single use)", async () => {
    const challengeToken = await getChallengeToken();
    const res = await verify2fa(
      makeRequest("http://localhost/api/v1/admin/auth/verify-2fa", {
        challengeToken,
        code: "recovery-code-plaintext",
      })
    );
    expect(res.status).toBe(200);

    const admin = await db.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.recoveryCodes).toHaveLength(0);

    // Reusing the same (now-consumed) recovery code must fail.
    const secondChallenge = await getChallengeToken();
    const reuseAttempt = await verify2fa(
      makeRequest("http://localhost/api/v1/admin/auth/verify-2fa", {
        challengeToken: secondChallenge,
        code: "recovery-code-plaintext",
      })
    );
    expect(reuseAttempt.status).toBe(401);
  });

  it("invalidates the challenge after 5 failed attempts (BR-3.6)", async () => {
    const challengeToken = await getChallengeToken();

    for (let i = 0; i < 5; i++) {
      await verify2fa(
        makeRequest("http://localhost/api/v1/admin/auth/verify-2fa", {
          challengeToken,
          code: "000000",
        })
      );
    }

    // Even the correct code no longer works — the challenge itself was invalidated.
    const correctAfterExhausted = await verify2fa(
      makeRequest("http://localhost/api/v1/admin/auth/verify-2fa", {
        challengeToken,
        code: currentTotpCode(),
      })
    );
    expect(correctAfterExhausted.status).toBe(401);
  });

  it("rejects an expired challengeToken", async () => {
    const challengeToken = await getChallengeToken();
    const { createHash } = await import("node:crypto");
    await db.loginChallenge.update({
      where: { tokenHash: createHash("sha256").update(challengeToken).digest("hex") },
      // A real expired challenge was issued 5 minutes before it expired —
      // the database enforces that TTL (BR-3.5), so move both timestamps.
      data: { createdAt: new Date(Date.now() - 6 * 60_000), expiresAt: new Date(Date.now() - 60_000) },
    });

    const res = await verify2fa(
      makeRequest("http://localhost/api/v1/admin/auth/verify-2fa", {
        challengeToken,
        code: currentTotpCode(),
      })
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("CHALLENGE_EXPIRED");
  });
});

describe("TOTP codes are single-use (BR-3.14)", () => {
  it("refuses a code that was already accepted, even inside its 30-second window", async () => {
    await freshTotpStep();
    const code = currentTotpCode();
    const first = await verify2fa(makeRequest("http://localhost/api/v1/admin/auth/verify-2fa", { challengeToken: await challengeToken(), code }));
    expect(first.status).toBe(200);

    const replay = await verify2fa(makeRequest("http://localhost/api/v1/admin/auth/verify-2fa", { challengeToken: await challengeToken(), code }));
    expect(replay.status).toBe(401);
  });
});

describe("POST /api/v1/admin/auth/change-password (BR-3.15)", () => {
  const url = "http://localhost/api/v1/admin/auth/change-password";
  const NEW_PASSWORD = "ChangedCorrectHorseBatteryStaple123!";

  async function currentCookie(): Promise<string> {
    const { sessionVersion } = await db.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    return createSessionCookieValue(adminId, sessionVersion);
  }

  async function actions(): Promise<string[]> {
    const rows = await db.activityLog.findMany({ where: { adminUserId: adminId, action: { startsWith: "auth." } }, select: { action: true } });
    return rows.map((r) => r.action);
  }

  it("refuses a new password equal to the current one", async () => {
    await freshTotpStep();
    const res = await changePassword(authenticatedRequest(url, { currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD, code: currentTotpCode() }, await currentCookie()));
    expect(res.status).toBe(400);
  });

  it("refuses a wrong current password, logs the attempt, and leaves the password alone", async () => {
    await freshTotpStep();
    const res = await changePassword(authenticatedRequest(url, { currentPassword: "wrong-password-entirely", newPassword: NEW_PASSWORD, code: currentTotpCode() }, await currentCookie()));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
    expect(await actions()).toContain("auth.password_change_failed");

    const admin = await db.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    expect(await bcrypt.compare(TEST_PASSWORD, admin.passwordHash)).toBe(true);
  });

  it("ends the session on the fifth failed attempt, so a stolen session can't keep guessing", async () => {
    // A fresh session (as after a new login): failures are counted per session.
    await db.adminUser.update({ where: { id: adminId }, data: { sessionVersion: { increment: 1 } } });
    const cookie = await currentCookie();
    const before = (await db.adminUser.findUniqueOrThrow({ where: { id: adminId } })).sessionVersion;
    const attempt = () => changePassword(authenticatedRequest(url, { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD, code: "000000" }, cookie));

    for (let i = 1; i < 5; i++) expect((await attempt()).status).toBe(401);
    const fifth = await attempt();
    expect((await fifth.json()).error.code).toBe("SESSION_REVOKED");
    expect(fifth.headers.get("set-cookie")).toMatch(/admin_session=;/);

    expect((await db.adminUser.findUniqueOrThrow({ where: { id: adminId } })).sessionVersion).toBe(before + 1);
    expect(await getSessionAdminId(new Request("http://localhost", { headers: { cookie: `admin_session=${cookie}` } }))).toBeNull();
    expect(await actions()).toContain("auth.session_revoked");
  });

  it("requires the current password and TOTP, then invalidates every older session", async () => {
    await freshTotpStep();
    const oldCookie = await currentCookie();
    const before = (await db.adminUser.findUniqueOrThrow({ where: { id: adminId } })).sessionVersion;
    const res = await changePassword(authenticatedRequest(url, { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD, code: currentTotpCode() }, oldCookie));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("admin_session=");
    expect(await getSessionAdminId(new Request("http://localhost", { headers: { cookie: `admin_session=${oldCookie}` } }))).toBeNull();

    const admin = await db.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.sessionVersion).toBe(before + 1);
    expect(await bcrypt.compare(NEW_PASSWORD, admin.passwordHash)).toBe(true);
    expect(await actions()).toContain("auth.password_changed");

    const oldPasswordLogin = await login(makeRequest("http://localhost/api/v1/admin/auth/login", { email: TEST_EMAIL, password: TEST_PASSWORD }));
    expect(oldPasswordLogin.status).toBe(401);
  });
});
