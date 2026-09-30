// POST /api/v1/admin/metrics/compute — compute every registered metric from
// public data now and propose any changed value (#82). Recorded as a job run
// (one at a time — the database is the lock); the proposals are attributed to
// the admin who asked. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { proposeComputedMetrics } from "@/lib/metrics";
import { runJob } from "@/lib/jobs/run-job";
import { withAdmin } from "@/lib/auth/with-admin";

export const POST = withAdmin(async (_request, { adminUserId, write }) => {
  const run = await runJob("metrics.compute", () => write((tx) => proposeComputedMetrics(tx)), { kind: "admin", adminUserId });
  if (run.status === "already_running") {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "A metrics computation is already running.", details: null } },
      { status: 409 },
    );
  }
  if (run.status === "failed") {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: run.error, details: { runId: run.runId } } },
      { status: 500 },
    );
  }
  return NextResponse.json({ runId: run.runId, ...run.result });
});
