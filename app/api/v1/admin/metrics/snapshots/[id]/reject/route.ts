// POST /api/v1/admin/metrics/snapshots/{id}/reject — decline a pending value;
// the public one is unchanged, and the rejection stays in the history
// (BR-5.3, #82). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { listAdminMetrics, rejectMetricSnapshot } from "@/lib/metrics";
import { ruleViolation } from "@/lib/db-errors";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/auth/with-admin";

export const POST = withAdmin<{ id: string }>(async (_request, { adminUserId, write }, { params }) => {
  const { id } = await params;
  try {
    await write((tx) => rejectMetricSnapshot(tx, id, adminUserId));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Snapshot not found", details: null } }, { status: 404 });
    }
    const rule = ruleViolation(err, "BR-5.3");
    if (rule) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: rule, details: null } }, { status: 409 });
    }
    throw err;
  }
  const { metricKey } = await db.metricSnapshot.findUniqueOrThrow({ where: { id }, select: { metricKey: true } });
  return NextResponse.json((await listAdminMetrics()).find((m) => m.key === metricKey));
});
