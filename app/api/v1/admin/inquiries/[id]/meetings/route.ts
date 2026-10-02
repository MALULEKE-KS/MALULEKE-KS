// POST /api/v1/admin/inquiries/{id}/meetings — schedule an interview or
// meeting (LETS-TALK-SPEC LT-5): an event with its own lifecycle and its own
// time zone, never folded into the inquiry's status.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { Meeting, zonedToUtc } from "@/lib/inquiries/forms";

export const POST = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = Meeting.safeParse({ ...(body ?? {}), status: "scheduled" });
  if (!parsed.success || parsed.data.status !== "scheduled") {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid meeting", details: { issues: parsed.success ? [] : parsed.error.issues } } }, { status: 400 });
  }
  const m = parsed.data;
  if (!(await db.inquiry.findUnique({ where: { id }, select: { id: true } }))) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Inquiry not found", details: null } }, { status: 404 });
  }
  const startsAt = zonedToUtc(m.startsAtLocal, m.timeZone)!;
  const meeting = await write((tx) =>
    tx.inquiryMeeting.create({
      data: {
        inquiryId: id,
        kind: m.kind,
        startsAt,
        endsAt: m.durationMinutes ? new Date(startsAt.getTime() + m.durationMinutes * 60_000) : null,
        timeZone: m.timeZone,
        location: m.location,
        link: m.link,
        contactPerson: m.contactPerson,
        instructions: m.instructions,
      },
    }),
  );
  return NextResponse.json({ id: meeting.id, startsAt: meeting.startsAt.toISOString(), timeZone: meeting.timeZone, state: "scheduled" }, { status: 201 });
});
