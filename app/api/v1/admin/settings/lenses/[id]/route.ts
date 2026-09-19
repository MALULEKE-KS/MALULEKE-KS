// PATCH /api/v1/admin/settings/lenses/{id}. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { VisitorLensInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = VisitorLensInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid visitor lens", 400, { issues: parsed.error.issues });
  }

  try {
    const lens = await write((tx) => tx.visitorLens.update({
      where: { id },
      data: {
        key: parsed.data.key,
        label: parsed.data.label,
        priorityContent: parsed.data.priorityContent as Prisma.InputJsonValue,
        aiFramingPrompt: parsed.data.aiFramingPrompt,
      },
    }));

    return NextResponse.json(lens);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Visitor lens not found", 404);
    }
    throw err;
  }
});
