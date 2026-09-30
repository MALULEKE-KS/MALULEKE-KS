// PATCH/DELETE /api/v1/admin/impacts/{id} (#82). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ImpactUpdateInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

function notFound(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = ImpactUpdateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid impact update", 400, { issues: parsed.error.issues });
  }
  try {
    return NextResponse.json(await write((tx) => tx.impact.update({ where: { id }, data: parsed.data })));
  } catch (err) {
    if (notFound(err)) return errorResponse("NOT_FOUND", "Impact not found", 404);
    throw err;
  }
});

export const DELETE = withAdmin<{ id: string }>(async (_request, { write }, { params }) => {
  const { id } = await params;
  try {
    await write((tx) => tx.impact.delete({ where: { id } }));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (notFound(err)) return errorResponse("NOT_FOUND", "Impact not found", 404);
    throw err;
  }
});
