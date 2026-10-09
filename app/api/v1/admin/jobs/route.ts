// GET /api/v1/admin/jobs?job= — scheduled and on-demand job runs, newest
// first (#82): status, duration, summary, error, and what started each run
// (#94). Runs are immutable history (JobRun, #70). Also lists every registered
// job and whether the daily schedule runs it. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/auth/with-admin";
import { JOBS } from "@/lib/jobs/registry";
import { scheduleFor } from "@/lib/jobs/schedule";

const PAGE = 50;

export const GET = withAdmin(async (request) => {
  const job = new URL(request.url).searchParams.get("job");
  const runs = await db.jobRun.findMany({
    where: job ? { job } : {},
    orderBy: { startedAt: "desc" },
    take: PAGE,
  });
  return NextResponse.json({
    jobs: Object.entries(JOBS).map(([name, def]) => ({
      name,
      description: def.description,
      rules: def.rules,
      schedule: scheduleFor(name),
    })),
    data: runs.map((r) => ({
      id: r.id,
      job: r.job,
      status: r.status.toLowerCase(),
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      durationMs: r.finishedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null,
      summary: r.summary,
      error: r.error,
      trigger: r.trigger,
      adminUserId: r.adminUserId,
    })),
  });
});
