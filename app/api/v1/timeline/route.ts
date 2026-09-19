// GET /api/v1/timeline — public timeline entries, filterable by milestoneType.
// See openapi-contract.yaml.

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { PUBLISHED_TIMELINE_WHERE, timelineWithMilestoneType, toTimelineEntry } from "@/lib/rules/timeline";

export async function GET(request: NextRequest) {
  const milestoneType = request.nextUrl.searchParams.get("milestoneType");

  const entries = await db.timeline.findMany({
    where: { ...PUBLISHED_TIMELINE_WHERE, ...(milestoneType && { milestoneType: { key: milestoneType } }) },
    ...timelineWithMilestoneType,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries.map(toTimelineEntry));
}
