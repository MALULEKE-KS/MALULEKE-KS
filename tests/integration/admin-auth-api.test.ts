// tests/integration/admin-auth-api.test.ts
// Hits the real database with a throwaway AdminUser fixture (isolated
// from any real bootstrapped admin — created and torn down here).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import { POST as login } from "@/app/api/v1/admin/auth/login/route";
import { POST as verify2fa } from "@/app/api/v1/admin/auth/verify-2fa/route";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/auth/crypto";

const TEST_EMAIL = "test-admin-auth@example.com";
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

function currentTotpCode(): string {
  return new TOTP({ secret: totpSecret, digits: 6, period: 30 }).generate();
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
  // If beforeAll threw before assigning adminId, there's nothing to clean
  // up — without this guard, the cleanup itself throws a second,
  // confusingly different error that obscures the real failure above it.
  if (!adminId) return;
  await db.loginChallenge.deleteMany({ where: { adminUserId: adminId } });
  await db.activityLog.deleteMany({ where: { adminUserId: adminId } });
  await db.adminUser.delete({ where: { id: adminId } });
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
