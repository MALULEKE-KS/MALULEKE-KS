// GET/POST /api/v1/admin/timeline. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TimelineCreateInputSchema } from "@/lib/schemas";
import { CONTENT_STATUS_FROM_WIRE, timelineWithMilestoneType, toTimelineEntry } from "@/lib/rules/timeline";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async (request, _admin) => {
  const entries = await db.timeline.findMany({ ...timelineWithMilestoneType, orderBy: { date: "desc" } });
  return NextResponse.json({ data: entries.map(toTimelineEntry) });
});

export const POST = withAdmin(async (request, { write }) => {
  const body = await request.json().catch(() => null);
  const parsed = TimelineCreateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid timeline entry", 400, { issues: parsed.error.issues });
  }

  const milestoneType = await db.milestoneType.findUnique({ where: { id: parsed.data.milestoneTypeId } });
  if (!milestoneType) {
    return errorResponse("VALIDATION_ERROR", "Unknown milestoneTypeId", 400);
  }

  const entry = await write((tx) => tx.timeline.create({
    data: {
      milestoneTypeId: parsed.data.milestoneTypeId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      date: new Date(parsed.data.date),
      media: parsed.data.media ?? null,
      tags: parsed.data.tags,
      contentStatus: CONTENT_STATUS_FROM_WIRE[parsed.data.contentStatus ?? "published"],
    },
    ...timelineWithMilestoneType,
  }));

  return NextResponse.json(toTimelineEntry(entry), { status: 201 });
});
