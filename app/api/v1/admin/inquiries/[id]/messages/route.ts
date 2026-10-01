// POST /api/v1/admin/inquiries/{id}/messages — something to tell the
// applicant (LETS-TALK-SPEC LT-7): a message, or an information request with
// the items wanted and an optional due date. Stored as applicant-facing; sent
// by email only when applicant emails are on (else marked "manual" — Kurhula
// sends it himself the way the applicant prefers). Asking for information
// doesn't move the status — that's a separate, deliberate change.

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { sendApplicantMessage } from "@/lib/inquiries/admin";
import { sendDue } from "@/lib/notifications";
import { after } from "next/server";

const MessageInput = z
  .object({
    kind: z.enum(["message", "info-request"]),
    body: z.string().trim().min(1, "Write the message").max(5000),
    requestedItems: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
    dueAt: z.string().datetime().optional(),
  })
  .strict()
  .refine((m) => m.kind !== "info-request" || (m.requestedItems?.length ?? 0) > 0, { message: "Say what you need", path: ["requestedItems"] });

export const POST = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = MessageInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid message", details: { issues: parsed.error.issues } } }, { status: 400 });
  const inquiry = await db.inquiry.findUnique({ where: { id } });
  if (!inquiry) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Inquiry not found", details: null } }, { status: 404 });
  if (inquiry.anonymizedAt) return NextResponse.json({ error: { code: "CONFLICT", message: "This inquiry was anonymised — there's no one to write to.", details: null } }, { status: 409 });
  const message = await write((tx) =>
    sendApplicantMessage(tx, inquiry, parsed.data.kind, parsed.data.body, { requestedItems: parsed.data.requestedItems, dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null }),
  );
  after(() => sendDue().catch(() => undefined));
  return NextResponse.json({ id: message.id, kind: message.kind, channel: message.channel, at: message.createdAt.toISOString() }, { status: 201 });
});
