// lib/inquiries/admin.ts
// Let's Talk, the admin side (LETS-TALK-SPEC LT-6, LT-7, LT-10, LT-11): one
// inquiry in full, and the changes an admin makes to it. Every write runs in
// the caller's withAdmin transaction (2FA-gated, audited). Humans decide —
// nothing here accepts, declines or ranks on its own (LT-11).

import type { InquiryStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isFlagOn, FLAGS } from "@/lib/flags";
import { enqueue } from "@/lib/notifications";
import { nextStatuses, STATUS_LABEL, STATUS_TO_API } from "@/lib/rules/inquiries";

export class InquiryChangeError extends Error {
  constructor(
    public code: "NOT_FOUND" | "INVALID_STATUS_TRANSITION" | "STALE",
    message: string,
  ) {
    super(message);
  }
}

/** What an applicant is told when a status change carries a message (LT-7). */
const MESSAGE_KIND: Partial<Record<InquiryStatus, string>> = { NEEDS_INFO: "info-request", ACCEPTED: "acceptance", DECLINED: "decline", ON_HOLD: "hold" };

/**
 * LT-6: one status change. Refused if the screen it came from is stale (the
 * version moved) or the move isn't allowed; the database writes the history
 * row itself, reading the reason and message set here for this transaction
 * only. A message for the applicant is stored as an InquiryMessage and — with
 * applicant emails on — queued for sending.
 */
export async function changeStatus(
  tx: Prisma.TransactionClient,
  id: string,
  next: InquiryStatus,
  opts: { expectedVersion?: number; internalReason?: string; applicantMessage?: string },
) {
  const current = await tx.inquiry.findUnique({ where: { id }, include: { inquiryType: true } });
  if (!current) throw new InquiryChangeError("NOT_FOUND", "Inquiry not found");
  if (opts.expectedVersion !== undefined && opts.expectedVersion !== current.version) {
    throw new InquiryChangeError("STALE", "Someone changed this inquiry since you opened it — reload to see the latest.");
  }
  if (!nextStatuses(current.status).includes(next)) {
    throw new InquiryChangeError("INVALID_STATUS_TRANSITION", `Can't move from ${STATUS_LABEL[current.status]} to ${STATUS_LABEL[next]}.`);
  }
  await tx.$executeRaw`SELECT set_config('app.inquiry_reason', ${opts.internalReason ?? ""}, true), set_config('app.inquiry_message', ${opts.applicantMessage ?? ""}, true)`;
  // The version in the WHERE makes this the one winner of two concurrent changes.
  const moved = await tx.inquiry.updateMany({ where: { id, version: current.version }, data: { status: next, version: { increment: 1 } } });
  if (moved.count === 0) throw new InquiryChangeError("STALE", "Someone changed this inquiry at the same moment — reload to see the latest.");
  if (opts.applicantMessage) await sendApplicantMessage(tx, current, MESSAGE_KIND[next] ?? "message", opts.applicantMessage);
  return tx.inquiry.findUniqueOrThrow({ where: { id }, include: { inquiryType: true } });
}

/** LT-7: applicant-facing — stored as such, emailed only when applicant emails are on. */
export async function sendApplicantMessage(
  tx: Prisma.TransactionClient,
  inquiry: { id: string; email: string; reference: string; preferredChannel: string; anonymizedAt: Date | null },
  kind: string,
  body: string,
  extra: { requestedItems?: string[]; dueAt?: Date | null } = {},
) {
  const emailOn = (await isFlagOn(FLAGS.applicantEmails)) && !inquiry.anonymizedAt;
  const message = await tx.inquiryMessage.create({
    data: { inquiryId: inquiry.id, kind, body, requestedItems: extra.requestedItems ?? [], dueAt: extra.dueAt ?? null, channel: emailOn ? "email" : "manual" },
  });
  if (emailOn) {
    const items = extra.requestedItems?.length ? `\n\nPlease send:\n${extra.requestedItems.map((i) => `- ${i}`).join("\n")}` : "";
    const due = extra.dueAt ? `\n\nBy: ${extra.dueAt.toUTCString()}` : "";
    await enqueue(tx, { kind: "inquiry-received", recipient: inquiry.email, subject: `About your message ${inquiry.reference}`, body: `${body}${items}${due}\n\nReference: ${inquiry.reference}`, inquiryId: inquiry.id });
  }
  return message;
}

/** One inquiry in full, for the admin (everything unmasked — the admin is the owner). */
export async function inquiryDetail(id: string) {
  const i = await db.inquiry.findUnique({
    where: { id },
    include: {
      inquiryType: true,
      subtype: true,
      statusChanges: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" } },
      meetings: { orderBy: { startsAt: "asc" } },
      documents: { select: { id: true, fileName: true, byteSize: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      notifications: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!i) return null;
  const duplicateOf = i.possibleDuplicateOfId ? await db.inquiry.findUnique({ where: { id: i.possibleDuplicateOfId }, select: { id: true, reference: true } }) : null;
  return {
    id: i.id,
    reference: i.reference,
    status: STATUS_TO_API[i.status],
    statusLabel: STATUS_LABEL[i.status],
    nextStatuses: nextStatuses(i.status).map((s) => ({ status: STATUS_TO_API[s], label: STATUS_LABEL[s] })),
    version: i.version,
    priority: i.priority.toLowerCase(),
    category: { key: i.inquiryType.key, label: i.inquiryType.label },
    subtype: i.subtype ? { key: i.subtype.key, label: i.subtype.label } : null,
    subtypeOther: i.subtypeOther,
    name: i.name,
    email: i.email,
    phone: i.phone,
    organization: i.organization,
    role: i.role,
    website: i.website,
    profileUrl: i.profileUrl,
    preferredChannel: i.preferredChannel,
    preferredChannelOther: i.preferredChannelOther,
    message: i.message,
    details: (i.details ?? {}) as Record<string, unknown>,
    source: i.source,
    submittedAt: i.createdAt.toISOString(),
    anonymized: i.anonymizedAt !== null,
    possibleDuplicateOf: duplicateOf,
    history: i.statusChanges.map((c) => ({
      from: c.fromStatus ? STATUS_LABEL[c.fromStatus] : null,
      to: STATUS_LABEL[c.toStatus],
      internalReason: c.internalReason,
      applicantMessage: c.applicantMessage,
      at: c.createdAt.toISOString(),
    })),
    notes: i.notes.map((n) => ({ id: n.id, body: n.body, at: n.createdAt.toISOString() })),
    messages: i.messages.map((m) => ({ id: m.id, kind: m.kind, body: m.body, requestedItems: m.requestedItems, dueAt: m.dueAt?.toISOString() ?? null, channel: m.channel, at: m.createdAt.toISOString() })),
    meetings: i.meetings.map((m) => ({
      id: m.id,
      kind: m.kind,
      startsAt: m.startsAt.toISOString(),
      endsAt: m.endsAt?.toISOString() ?? null,
      timeZone: m.timeZone,
      location: m.location,
      link: m.link,
      contactPerson: m.contactPerson,
      instructions: m.instructions,
      state: m.state.toLowerCase(),
    })),
    documents: i.documents.map((d) => ({ id: d.id, fileName: d.fileName, byteSize: d.byteSize, at: d.createdAt.toISOString() })),
    notifications: i.notifications.map((n) => ({ id: n.id, kind: n.kind, recipient: n.recipient, subject: n.subject, state: n.state.toLowerCase(), attempts: n.attempts, lastError: n.lastError, sentAt: n.sentAt?.toISOString() ?? null })),
  };
}

export type InquiryDetail = NonNullable<Awaited<ReturnType<typeof inquiryDetail>>>;
