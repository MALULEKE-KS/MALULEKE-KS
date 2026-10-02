// GET /api/v1/admin/notifications — the email outbox (LETS-TALK-SPEC LT-10):
// what's waiting, what failed and why, newest first. Whether email is
// connected at all is part of the answer, so "waiting" is never a mystery.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { emailConfigured } from "@/lib/notifications";

export const GET = withAdmin(async (request) => {
  const state = new URL(request.url).searchParams.get("state");
  const where = state === "failed" ? { state: "FAILED" as const } : state === "pending" ? { state: "PENDING" as const } : {};
  const rows = await db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { inquiry: { select: { id: true, reference: true } } } });
  return NextResponse.json({
    emailConfigured: emailConfigured(),
    notifications: rows.map((n) => ({
      id: n.id,
      kind: n.kind,
      recipient: n.recipient,
      subject: n.subject,
      state: n.state.toLowerCase(),
      attempts: n.attempts,
      lastError: n.lastError,
      inquiry: n.inquiry,
      createdAt: n.createdAt.toISOString(),
      sentAt: n.sentAt?.toISOString() ?? null,
    })),
  });
});
