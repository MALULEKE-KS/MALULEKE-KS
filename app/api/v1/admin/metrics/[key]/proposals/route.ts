// POST /api/v1/admin/metrics/{key}/proposals — enter a value by hand (#82).
// It becomes the pending proposal, never public until approved (BR-5.3); an
// unchanged value proposes nothing. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { MetricProposalInputSchema } from "@/lib/schemas";
import { proposeMetric } from "@/lib/metrics";
import { ruleViolation } from "@/lib/db-errors";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const POST = withAdmin<{ key: string }>(async (request, { write }, { params }) => {
  const { key } = await params;
  const parsed = MetricProposalInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Body must be { value: number }", 400, { issues: parsed.error.issues });
  }
  try {
    const snapshotId = await write((tx) => proposeMetric(key, parsed.data.value, "MANUAL", tx));
    return NextResponse.json({ snapshotId, unchanged: snapshotId === null }, { status: snapshotId ? 201 : 200 });
  } catch (err) {
    const rule = ruleViolation(err, "BR-5.3");
    if (rule) return errorResponse("NOT_FOUND", rule, 404); // unknown or inactive metric
    throw err;
  }
});
