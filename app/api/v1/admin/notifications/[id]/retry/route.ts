// POST /api/v1/admin/notifications/{id}/retry — put a waiting or failed email
// back at the front of the queue and try it now (LETS-TALK-SPEC LT-10).
// Already-sent mail is never resent.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { emailConfigured, sendDue } from "@/lib/notifications";

export const POST = withAdmin<{ id: string }>(async (_request, { write }, { params }) => {
  const { id } = await params;
  const n = await db.notification.findUnique({ where: { id } });
  if (!n) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Email not found", details: null } }, { status: 404 });
  if (n.state === "SENT") return NextResponse.json({ error: { code: "CONFLICT", message: "This email was already sent.", details: null } }, { status: 409 });
  if (!emailConfigured()) return NextResponse.json({ error: { code: "EMAIL_NOT_CONFIGURED", message: "Email isn't connected yet — add the Resend integration in Vercel.", details: null } }, { status: 409 });
  await write((tx) => tx.notification.update({ where: { id }, data: { state: "PENDING", nextAttemptAt: new Date(), attempts: 0 } }));
  await sendDue(5);
  const after = await db.notification.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ id, state: after.state.toLowerCase(), lastError: after.lastError });
});
