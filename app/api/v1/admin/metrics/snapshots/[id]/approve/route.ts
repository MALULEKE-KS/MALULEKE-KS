// POST /api/v1/admin/metrics/snapshots/{id}/approve — the pending value
// becomes the public one, the previous one superseded, atomically (BR-5.3,
// #82). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { approveMetricSnapshot, listAdminMetrics } from "@/lib/metrics";
import { ruleViolation } from "@/lib/db-errors";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/auth/with-admin";

export const POST = withAdmin<{ id: string }>(async (_request, { adminUserId, write }, { params }) => {
  const { id } = await params;
  try {
    await write((tx) => approveMetricSnapshot(tx, id, adminUserId));
  } catch (err) {
    const rule = ruleViolation(err, "BR-5.3");
    if (rule) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: rule, details: null } }, { status: 409 });
    }
    throw err;
  }
  const { metricKey } = await db.metricSnapshot.findUniqueOrThrow({ where: { id }, select: { metricKey: true } });
  return NextResponse.json((await listAdminMetrics()).find((m) => m.key === metricKey));
});
