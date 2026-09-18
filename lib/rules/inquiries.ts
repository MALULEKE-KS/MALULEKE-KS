// lib/rules/inquiries.ts
// BR-2.x as enforceable code. Covers BR-2.6 (idempotency) and BR-2.7
// (honeypot) — the honeypot check itself lives here since it's pure logic;
// idempotency is handled directly in the route via the idempotencyKey
// unique constraint (prisma/schema.prisma), which is simpler than a
// separate abstraction for a single try/catch. Also covers BR-2.1
// (sequential status transitions) and the admin-side serializer, now that
// the 2FA session this needed exists.

import type { Inquiry, InquiryStatus, InquiryType } from "@prisma/client";

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

// ============================================================
// ADMIN-SIDE RULES (BR-2.1)
// ============================================================

export type ApiInquiryStatus = "new" | "reviewed" | "responded" | "closed";

export const STATUS_TO_API: Record<InquiryStatus, ApiInquiryStatus> = {
  NEW: "new",
  REVIEWED: "reviewed",
  RESPONDED: "responded",
  CLOSED: "closed",
};

export const STATUS_FROM_API: Record<Exclude<ApiInquiryStatus, "new">, InquiryStatus> = {
  reviewed: "REVIEWED",
  responded: "RESPONDED",
  closed: "CLOSED",
};

// BR-2.1 — new->reviewed is always mandatory first; from reviewed, either
// responded or closed is valid (closed covers spam/irrelevant without a
// fake reply); from responded, only closed. Never a skip-ahead option, and
// closed is terminal. Declared as an explicit map, not a numeric ordering,
// so "reviewed can go to two different next states" stays representable.
const VALID_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ["REVIEWED"],
  REVIEWED: ["RESPONDED", "CLOSED"],
  RESPONDED: ["CLOSED"],
  CLOSED: [],
};

export function isValidStatusTransition(current: InquiryStatus, next: InquiryStatus): boolean {
  return VALID_TRANSITIONS[current].includes(next);
}

export type InquiryWithType = Inquiry & { inquiryType: InquiryType };

// Admin sees everything, unmasked — Inquiry carries no BR-1.x-style
// visibility control, so there's no masking layer to apply here.
export function toAdminInquiry(inquiry: InquiryWithType) {
  return {
    id: inquiry.id,
    status: STATUS_TO_API[inquiry.status],
    submittedAt: inquiry.createdAt.toISOString(),
    name: inquiry.name,
    email: inquiry.email,
    message: inquiry.message,
    inquiryType: inquiry.inquiryType.key,
    source: inquiry.source,
  };
}
