// lib/inquiries/form-token.ts
// The fill-time check (LETS-TALK-SPEC §2, loophole 4): the form asks for a
// signed token when it's shown; a submission must carry one that is at least
// inquiry.minFillSeconds old (a person reads before they send) and at most
// MAX_AGE old. Signed with the platform secret under its own label, so it can
// never be mistaken for a session.

import { createHmac, timingSafeEqual } from "node:crypto";

const LABEL = "inquiry-form:v1:";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // a tab left open half a day asks for a fresh form

function sign(issuedAt: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return createHmac("sha256", secret).update(LABEL + issuedAt).digest("base64url");
}

export function issueFormToken(now = Date.now()): string {
  const issuedAt = String(now);
  return `${issuedAt}.${sign(issuedAt)}`;
}

export type FormTokenCheck = { ok: true } | { ok: false; reason: "missing" | "forged" | "too-fast" | "expired" };

export function checkFormToken(token: unknown, minFillSeconds: number, now = Date.now()): FormTokenCheck {
  if (typeof token !== "string" || !token.includes(".")) return { ok: false, reason: "missing" };
  const [issuedAt, mac] = token.split(".");
  if (!issuedAt || !mac || !/^\d{13}$/.test(issuedAt)) return { ok: false, reason: "forged" };
  const expected = Buffer.from(sign(issuedAt));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "forged" };
  const age = now - Number(issuedAt);
  if (age < minFillSeconds * 1000) return { ok: false, reason: "too-fast" };
  if (age > MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}
