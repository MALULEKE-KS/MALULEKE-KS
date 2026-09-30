// GET /api/v1/admin/jobs?job= — scheduled and on-demand job runs, newest
// first (#82): status, duration, summary, error. Runs are immutable history
// (JobRun, #70). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/auth/with-admin";

const PAGE = 50;

export const GET = withAdmin(async (request) => {
  const job = new URL(request.url).searchParams.get("job");
  const runs = await db.jobRun.findMany({
    where: job ? { job } : {},
    orderBy: { startedAt: "desc" },
    take: PAGE,
  });
  return NextResponse.json({
    data: runs.map((r) => ({
      id: r.id,
      job: r.job,
      status: r.status.toLowerCase(),
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      durationMs: r.finishedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null,
      summary: r.summary,
      error: r.error,
    })),
  });
});
