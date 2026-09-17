// lib/auth/session.ts
// 2FA-gated session helpers (BR-3.1). A signed, HTTP-only, SameSite=Strict
// cookie rather than a server-side session table — sufficient for a
// single-AdminUser system (Constitution §1) and avoids a session table
// whose only job would be storing what a signed cookie already proves.
//
// SameSite=Strict is the CSRF defense here (BR-3.9): the cookie is never
// sent on a cross-site request at all, which is a stronger and simpler
// guarantee than a separate CSRF token for an admin surface with no
// cross-origin embeds or third-party form posts to defend against.
//
// Idle timeout (BR-3.3) and absolute cap (BR-3.7) are both enforced from
// two timestamps in the signed payload: `iat` (fixed at session creation,
// checked against the 12h cap) and `lastActivity` (refreshed on every
// authenticated request, checked against the 30-min idle cap). The cookie
// is reissued with a new lastActivity on each valid request — a sliding
// window bounded by the fixed absolute cap.

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "admin_session";
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // BR-3.3
export const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // BR-3.7

interface SessionPayload {
  sub: string; // AdminUser.id
  iat: number; // session creation time, fixed for its lifetime (BR-3.8: re-minted on each new login)
  lastActivity: number;
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encode(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${json}.${sign(json)}`;
}

function decode(cookieValue: string): SessionPayload | null {
  const [json, signature] = cookieValue.split(".");
  if (!json || !signature) return null;

  const expected = sign(json);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// Called only right after verify-2fa succeeds — never on credentials alone
// (BR-3.1) — and always produces a fresh session, never reusing any
// pre-2FA identifier (BR-3.8, anti session-fixation).
export function createSessionCookieValue(adminUserId: string): string {
  const now = Date.now();
  return encode({ sub: adminUserId, iat: now, lastActivity: now });
}

export interface SessionCheckResult {
  valid: boolean;
  adminUserId?: string;
  refreshedCookieValue?: string;
  reason?: "expired-idle" | "expired-absolute" | "invalid";
}

export function checkSession(cookieValue: string | undefined): SessionCheckResult {
  if (!cookieValue) return { valid: false, reason: "invalid" };

  const payload = decode(cookieValue);
  if (!payload) return { valid: false, reason: "invalid" };

  const now = Date.now();
  if (now - payload.iat > ABSOLUTE_TIMEOUT_MS) {
    return { valid: false, reason: "expired-absolute" };
  }
  if (now - payload.lastActivity > IDLE_TIMEOUT_MS) {
    return { valid: false, reason: "expired-idle" };
  }

  return {
    valid: true,
    adminUserId: payload.sub,
    refreshedCookieValue: encode({ ...payload, lastActivity: now }),
  };
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: ABSOLUTE_TIMEOUT_MS / 1000,
};
