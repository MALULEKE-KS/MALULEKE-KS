// GET /api/cron/{job} — scheduled job entry point (#94, F4.1). Vercel Cron
// calls /api/cron/daily once a day (vercel.ts); it runs the daily jobs in
// order (lib/jobs/schedule.ts), each with its own run record and lock. Any
// single job can be called by name too. Authorized by CRON_SECRET only
// (lib/adapters/scheduler/vercel-cron-adapter.ts). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/adapters/scheduler/vercel-cron-adapter";
import { isJobName, runDailyJobs, runNamedJob } from "@/lib/jobs/registry";

// Jobs make database and GitHub calls: never cached, and given the platform's full run time.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
  const auth = authorizeCron(request);
  if (!auth.ok) {
    return NextResponse.json({ error: { code: auth.status === 503 ? "NOT_CONFIGURED" : "UNAUTHORIZED", message: auth.message, details: null } }, { status: auth.status });
  }

  const { job } = await params;
  if (job === "daily") {
    const results = await runDailyJobs({ kind: "schedule" });
    const failed = results.some((r) => r.status === "failed");
    return NextResponse.json({ results }, { status: failed ? 500 : 200 });
  }
  if (!isJobName(job)) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: `No job named "${job}".`, details: null } }, { status: 404 });
  }

  const run = await runNamedJob(job, { kind: "schedule" });
  const status = run.status === "failed" ? 500 : run.status === "already_running" ? 409 : 200;
  return NextResponse.json(run, { status });
}
