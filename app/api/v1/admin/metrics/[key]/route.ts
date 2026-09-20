// PATCH /api/v1/admin/metrics/{key} — label, description, unit, order, and
// whether it's shown at all (active). The key and the history are fixed
// (BR-5.3, #82). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { MetricUpdateInputSchema } from "@/lib/schemas";
import { listAdminMetrics } from "@/lib/metrics";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ key: string }>(async (request, { write }, { params }) => {
  const { key } = await params;
  const parsed = MetricUpdateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid metric update", 400, { issues: parsed.error.issues });
  }
  try {
    await write((tx) => tx.metric.update({ where: { key }, data: parsed.data }));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Metric not found", 404);
    }
    throw err;
  }
  return NextResponse.json((await listAdminMetrics()).find((m) => m.key === key));
});
