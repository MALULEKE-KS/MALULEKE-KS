// GET/POST /api/v1/admin/metrics — curated numbers for the admin (BR-5.3, #82):
// every metric with its current public value, the proposal awaiting a
// decision and recent history; POST defines a new metric (computed when its
// key has a registered computation, otherwise entered by hand).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { MetricInputSchema } from "@/lib/schemas";
import { listAdminMetrics } from "@/lib/metrics";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async () => NextResponse.json({ data: await listAdminMetrics() }));

export const POST = withAdmin(async (request, { write }) => {
  const parsed = MetricInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid metric", 400, { issues: parsed.error.issues });
  }
  try {
    await write((tx) => tx.metric.create({ data: parsed.data }));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return errorResponse("VALIDATION_ERROR", `A metric "${parsed.data.key}" already exists.`, 400);
    }
    throw err;
  }
  const created = (await listAdminMetrics()).find((m) => m.key === parsed.data.key);
  return NextResponse.json(created, { status: 201 });
});
