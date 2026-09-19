// PATCH/DELETE /api/v1/admin/timeline/{id} — Timeline entries may be
// hard-deleted directly (unlike System, they carry no publishing-state
// history worth preserving). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TimelineCreateInputSchema } from "@/lib/schemas";
import { CONTENT_STATUS_FROM_WIRE, timelineWithMilestoneType, toTimelineEntry } from "@/lib/rules/timeline";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = TimelineCreateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid timeline entry", 400, { issues: parsed.error.issues });
  }

  try {
    const entry = await db.timeline.update({
      where: { id },
      data: {
        milestoneTypeId: parsed.data.milestoneTypeId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        date: new Date(parsed.data.date),
        media: parsed.data.media ?? null,
        tags: parsed.data.tags,
        // Approving an auto-drafted entry is publishing it (#70).
        ...(parsed.data.contentStatus && { contentStatus: CONTENT_STATUS_FROM_WIRE[parsed.data.contentStatus] }),
      },
      ...timelineWithMilestoneType,
    });

    await logActivity({
      adminUserId,
      action: "timeline.update",
      entityType: "Timeline",
      entityId: id,
      after: { title: entry.title, contentStatus: entry.contentStatus },
    });

    return NextResponse.json(toTimelineEntry(entry));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Timeline entry not found", 404);
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;

  try {
    await db.timeline.delete({ where: { id } });
    await logActivity({ adminUserId, action: "timeline.delete", entityType: "Timeline", entityId: id });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Timeline entry not found", 404);
    }
    throw err;
  }
}
