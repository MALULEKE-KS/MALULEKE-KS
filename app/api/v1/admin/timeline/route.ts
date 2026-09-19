// GET/POST /api/v1/admin/timeline. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TimelineCreateInputSchema } from "@/lib/schemas";
import { CONTENT_STATUS_FROM_WIRE, timelineWithMilestoneType, toTimelineEntry } from "@/lib/rules/timeline";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const entries = await db.timeline.findMany({ ...timelineWithMilestoneType, orderBy: { date: "desc" } });
  return NextResponse.json({ data: entries.map(toTimelineEntry) });
}

export async function POST(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const body = await request.json().catch(() => null);
  const parsed = TimelineCreateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid timeline entry", 400, { issues: parsed.error.issues });
  }

  const milestoneType = await db.milestoneType.findUnique({ where: { id: parsed.data.milestoneTypeId } });
  if (!milestoneType) {
    return errorResponse("VALIDATION_ERROR", "Unknown milestoneTypeId", 400);
  }

  const entry = await db.timeline.create({
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
  });

  await logActivity({
    adminUserId,
    action: "timeline.create",
    entityType: "Timeline",
    entityId: entry.id,
    after: { title: entry.title },
  });

  return NextResponse.json(toTimelineEntry(entry), { status: 201 });
}
