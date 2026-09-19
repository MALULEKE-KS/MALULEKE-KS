// PATCH/DELETE /api/v1/admin/timeline/{id} — Timeline entries may be
// hard-deleted directly (unlike System, they carry no publishing-state
// history worth preserving). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { TimelineCreateInputSchema } from "@/lib/schemas";
import { CONTENT_STATUS_FROM_WIRE, timelineWithMilestoneType, toTimelineEntry } from "@/lib/rules/timeline";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = TimelineCreateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid timeline entry", 400, { issues: parsed.error.issues });
  }

  try {
    const entry = await write((tx) => tx.timeline.update({
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
    }));

    return NextResponse.json(toTimelineEntry(entry));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Timeline entry not found", 404);
    }
    throw err;
  }
});

export const DELETE = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;

  try {
    await write((tx) => tx.timeline.delete({ where: { id } }));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Timeline entry not found", 404);
    }
    throw err;
  }
});
