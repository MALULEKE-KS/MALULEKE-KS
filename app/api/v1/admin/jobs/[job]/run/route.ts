// POST /api/v1/admin/jobs/{job}/run — run a registered job now (#94, F4.1):
// the same runner and lock as the schedule, recorded as started by this admin.
// 409 while a run of that job is already going. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { isJobName, runNamedJob } from "@/lib/jobs/registry";

export const maxDuration = 300;

export const POST = withAdmin<{ job: string }>(async (_request, { adminUserId }, { params }) => {
  const { job } = await params;
  if (!isJobName(job)) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: `No job named "${job}".`, details: null } }, { status: 404 });
  }
  const run = await runNamedJob(job, { kind: "admin", adminUserId });
  if (run.status === "already_running") {
    return NextResponse.json({ error: { code: "ALREADY_RUNNING", message: `"${job}" is already running.`, details: null } }, { status: 409 });
  }
  return NextResponse.json(run, { status: run.status === "failed" ? 500 : 200 });
});
