// GET /api/v1/timeline — public timeline entries, filterable by milestoneType.
// See openapi-contract.yaml.

import { NextResponse, type NextRequest } from "next/server";
import { dbPublic as db } from "@/lib/db";
import { toPublicTimelineEntry } from "@/lib/rules/timeline";

export async function GET(request: NextRequest) {
  const milestoneType = request.nextUrl.searchParams.get("milestoneType");

  // The PublicTimeline view applies BR-1.12 (F1.7).
  const entries = await db.publicTimeline.findMany({
    where: milestoneType ? { milestoneType } : {},
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries.map(toPublicTimelineEntry));
}
