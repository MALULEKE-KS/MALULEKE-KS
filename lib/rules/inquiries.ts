// lib/rules/inquiries.ts
// BR-2.x as enforceable code. This PR covers BR-2.6 (idempotency) and
// BR-2.7 (honeypot) — the honeypot check itself lives here since it's
// pure logic; idempotency is handled directly in the route via the
// idempotencyKey unique constraint (prisma/schema.prisma), which is simpler
// than a separate abstraction for a single try/catch. Sequential
// status-transition validation (BR-2.1) is deferred to the admin triage
// PR, which needs the 2FA session this repo doesn't have yet.

// BR-2.7 — if the honeypot field has any value, it was filled by an
// automated bot (real visitors never see or fill it — see the form's own
// CSS). Callers must return the same 201 confirmation shape as a genuine
// success without creating an Inquiry row, so the bot gets no signal that
// it was caught.
export function isHoneypotFilled(honeypotValue: unknown): boolean {
  return typeof honeypotValue === "string" && honeypotValue.trim().length > 0;
}

// BR-2.5 — source is captured server-side from Referer, never client-supplied.
// "direct" when absent (no Referer header — direct navigation, privacy-
// conscious browsers) rather than failing the submission.
export function sourceFromReferer(referer: string | null): string {
  if (!referer) return "direct";
  try {
    return new URL(referer).pathname;
  } catch {
    return "direct";
  }
}
