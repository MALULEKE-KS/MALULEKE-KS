// POST /api/v1/admin/inquiries/{id}/notes — a private note (LETS-TALK-SPEC
// LT-7). Notes live in their own table and nothing an applicant can reach
// ever reads it. 2FA-gated and audited (the body is redacted from the log).

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";

const NoteInput = z.object({ body: z.string().trim().min(1, "Write the note").max(5000) }).strict();

export const POST = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = NoteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid note", details: { issues: parsed.error.issues } } }, { status: 400 });
  if (!(await db.inquiry.findUnique({ where: { id }, select: { id: true } }))) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Inquiry not found", details: null } }, { status: 404 });
  }
  const note = await write((tx) => tx.inquiryNote.create({ data: { inquiryId: id, body: parsed.data.body } }));
  return NextResponse.json({ id: note.id, body: note.body, at: note.createdAt.toISOString() }, { status: 201 });
});
