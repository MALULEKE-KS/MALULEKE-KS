// PATCH /api/v1/admin/inquiries/{id}/meetings/{meetingId} — a meeting's
// lifecycle (LETS-TALK-SPEC LT-5): reschedule (new time, own time zone) or
// mark it completed, cancelled or a no-show. The meeting must belong to the
// inquiry in the path — an id from another inquiry is not found (no IDOR).

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { isTimeZone, zonedToUtc } from "@/lib/inquiries/forms";

const Update = z.union([
  z.object({ state: z.enum(["completed", "cancelled", "no_show"]) }).strict(),
  z
    .object({
      state: z.literal("rescheduled"),
      startsAtLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
      timeZone: z.string().refine(isTimeZone, "Choose a time zone"),
      durationMinutes: z.number().int().min(5).max(480).optional(),
    })
    .strict(),
]);

export const PATCH = withAdmin<{ id: string; meetingId: string }>(async (request, { write }, { params }) => {
  const { id, meetingId } = await params;
  const parsed = Update.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid meeting update", details: { issues: parsed.error.issues } } }, { status: 400 });
  const meeting = await db.inquiryMeeting.findFirst({ where: { id: meetingId, inquiryId: id } });
  if (!meeting) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Meeting not found", details: null } }, { status: 404 });

  const u = parsed.data;
  let data: { state: "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED"; startsAt?: Date; endsAt?: Date | null; timeZone?: string };
  if (u.state === "rescheduled") {
    const startsAt = zonedToUtc(u.startsAtLocal, u.timeZone);
    if (!startsAt) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "That date and time doesn't exist", details: null } }, { status: 400 });
    data = { state: "RESCHEDULED", startsAt, timeZone: u.timeZone, endsAt: u.durationMinutes ? new Date(startsAt.getTime() + u.durationMinutes * 60_000) : null };
  } else {
    data = { state: u.state.toUpperCase() as "COMPLETED" | "CANCELLED" | "NO_SHOW" };
  }
  const updated = await write((tx) => tx.inquiryMeeting.update({ where: { id: meeting.id }, data }));
  return NextResponse.json({ id: updated.id, state: updated.state.toLowerCase(), startsAt: updated.startsAt.toISOString(), timeZone: updated.timeZone });
});
