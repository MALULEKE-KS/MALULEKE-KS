// GET/POST /api/v1/admin/systems/{id}/impacts — a case study's measured
// outcomes ("Audit findings closed: 58"), shown on the case study and the CV
// (#82). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ImpactInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin<{ id: string }>(async (_request, _admin, { params }) => {
  const { id } = await params;
  const impacts = await db.impact.findMany({ where: { systemId: id }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ data: impacts });
});

export const POST = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = ImpactInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid impact", 400, { issues: parsed.error.issues });
  }
  const system = await db.system.findUnique({ where: { id }, select: { id: true } });
  if (!system) return errorResponse("NOT_FOUND", "System not found", 404);
  const impact = await write((tx) => tx.impact.create({ data: { ...parsed.data, systemId: id } }));
  return NextResponse.json(impact, { status: 201 });
});
