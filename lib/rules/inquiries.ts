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

export type ApiInquiryStatus = "new" | "reviewed" | "responded" | "closed" | "needs_info" | "accepted" | "declined" | "on_hold" | "withdrawn";

export const STATUS_TO_API: Record<InquiryStatus, ApiInquiryStatus> = {
  NEW: "new",
  REVIEWED: "reviewed",
  RESPONDED: "responded",
  CLOSED: "closed",
  NEEDS_INFO: "needs_info",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  ON_HOLD: "on_hold",
  WITHDRAWN: "withdrawn",
};

export const STATUS_FROM_API: Record<Exclude<ApiInquiryStatus, "new">, InquiryStatus> = {
  reviewed: "REVIEWED",
  responded: "RESPONDED",
  closed: "CLOSED",
  needs_info: "NEEDS_INFO",
  accepted: "ACCEPTED",
  declined: "DECLINED",
  on_hold: "ON_HOLD",
  withdrawn: "WITHDRAWN",
};

/** How each status reads to a person (LT-6) — the enum keeps its original names. */
export const STATUS_LABEL: Record<InquiryStatus, string> = {
  NEW: "New",
  REVIEWED: "Reviewing",
  RESPONDED: "In discussion",
  CLOSED: "Closed",
  NEEDS_INFO: "Needs information",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  ON_HOLD: "On hold",
  WITHDRAWN: "Withdrawn",
};

// LT-6 — mirrors the database trigger (enforce_br_2_1_inquiry_workflow), which
// is the authority; this copy gives the admin a clear message and the right
// buttons. NEW → REVIEWED is still the only way out of NEW (BR-2.1: triage
// first); decisions can be reopened to REVIEWED, history kept.
const VALID_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ["REVIEWED"],
  REVIEWED: ["NEEDS_INFO", "RESPONDED", "ACCEPTED", "DECLINED", "ON_HOLD", "CLOSED", "WITHDRAWN"],
  NEEDS_INFO: ["REVIEWED", "RESPONDED", "DECLINED", "ON_HOLD", "CLOSED", "WITHDRAWN"],
  RESPONDED: ["NEEDS_INFO", "ACCEPTED", "DECLINED", "ON_HOLD", "CLOSED", "WITHDRAWN"],
  ON_HOLD: ["REVIEWED", "DECLINED", "CLOSED", "WITHDRAWN"],
  ACCEPTED: ["CLOSED", "REVIEWED"],
  DECLINED: ["CLOSED", "REVIEWED"],
  WITHDRAWN: ["CLOSED", "REVIEWED"],
  CLOSED: ["REVIEWED"],
};

export function nextStatuses(current: InquiryStatus): InquiryStatus[] {
  return VALID_TRANSITIONS[current];
}

export function isValidStatusTransition(current: InquiryStatus, next: InquiryStatus): boolean {
  return VALID_TRANSITIONS[current].includes(next);
}

export type InquiryWithType = Inquiry & { inquiryType: InquiryType };

/**
 * BR-2.2 — when a NEW inquiry is due for review, from the admin-editable
 * deadline (inquiry.reviewSlaHours). Reviewed ones are no longer due.
 */
export function reviewDeadline(inquiry: Pick<Inquiry, "createdAt" | "status">, slaHours: number, now = new Date()) {
  const dueAt = new Date(inquiry.createdAt.getTime() + slaHours * 60 * 60 * 1000);
  return { reviewDueAt: dueAt, overdue: inquiry.status === "NEW" && now > dueAt };
}

// Admin sees everything, unmasked — Inquiry carries no BR-1.x-style
// visibility control, so there's no masking layer to apply here.
export function toAdminInquiry(inquiry: InquiryWithType, slaHours: number) {
  const { reviewDueAt, overdue } = reviewDeadline(inquiry, slaHours);
  return {
    id: inquiry.id,
    status: STATUS_TO_API[inquiry.status],
    submittedAt: inquiry.createdAt.toISOString(),
    name: inquiry.name,
    email: inquiry.email,
    message: inquiry.message,
    inquiryType: inquiry.inquiryType.key,
    source: inquiry.source,
    reviewDueAt: reviewDueAt.toISOString(),
    overdue,
  };
}
