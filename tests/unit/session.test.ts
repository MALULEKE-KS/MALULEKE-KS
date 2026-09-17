// tests/unit/session.test.ts
// Pure unit tests for the signed-cookie session logic — no database.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env.NEXTAUTH_SECRET;

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-do-not-use-in-production";
  vi.resetModules();
});

afterEach(() => {
  process.env.NEXTAUTH_SECRET = ORIGINAL_ENV;
  vi.useRealTimers();
});

describe("checkSession", () => {
  it("accepts a freshly created session", async () => {
    const { createSessionCookieValue, checkSession } = await import("@/lib/auth/session");
    const cookie = createSessionCookieValue("admin-1");
    const result = checkSession(cookie);
    expect(result.valid).toBe(true);
    expect(result.adminUserId).toBe("admin-1");
  });

  it("rejects a tampered cookie value", async () => {
    const { createSessionCookieValue, checkSession } = await import("@/lib/auth/session");
    const cookie = createSessionCookieValue("admin-1");
    const [payload] = cookie.split(".");
    const tampered = `${payload}.tampered-signature`;
    expect(checkSession(tampered).valid).toBe(false);
  });

  it("rejects a missing cookie", async () => {
    const { checkSession } = await import("@/lib/auth/session");
    expect(checkSession(undefined).valid).toBe(false);
  });

  it("expires after 30 minutes of inactivity (BR-3.3)", async () => {
    vi.useFakeTimers();
    const { createSessionCookieValue, checkSession } = await import("@/lib/auth/session");
    const cookie = createSessionCookieValue("admin-1");

    vi.advanceTimersByTime(31 * 60 * 1000);
    const result = checkSession(cookie);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired-idle");
  });

  it("expires after 12 hours regardless of activity (BR-3.7)", async () => {
    vi.useFakeTimers();
    const { createSessionCookieValue, checkSession } = await import("@/lib/auth/session");
    let cookie = createSessionCookieValue("admin-1");

    // Simulate continuous activity every 10 minutes for 13 hours — the
    // idle window never lapses, but the absolute cap still must.
    for (let i = 0; i < 13 * 6; i++) {
      vi.advanceTimersByTime(10 * 60 * 1000);
      const result = checkSession(cookie);
      if (!result.valid) {
        expect(result.reason).toBe("expired-absolute");
        return;
      }
      cookie = result.refreshedCookieValue!;
    }
    throw new Error("Expected the absolute cap to eventually reject the session");
  });

  it("refreshes lastActivity on each valid check, extending the idle window", async () => {
    vi.useFakeTimers();
    const { createSessionCookieValue, checkSession } = await import("@/lib/auth/session");
    let cookie = createSessionCookieValue("admin-1");

    vi.advanceTimersByTime(20 * 60 * 1000);
    const first = checkSession(cookie);
    expect(first.valid).toBe(true);
    cookie = first.refreshedCookieValue!;

    // Another 20 minutes (40 total) — would have expired under the
    // original lastActivity, but the refresh above reset the clock.
    vi.advanceTimersByTime(20 * 60 * 1000);
    expect(checkSession(cookie).valid).toBe(true);
  });
});
