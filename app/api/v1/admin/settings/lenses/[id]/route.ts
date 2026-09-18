// PATCH /api/v1/admin/settings/lenses/{id}. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { VisitorLensInputSchema } from "@/lib/schemas";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = VisitorLensInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid visitor lens", 400, { issues: parsed.error.issues });
  }

  try {
    const lens = await db.visitorLens.update({
      where: { id },
      data: {
        key: parsed.data.key,
        label: parsed.data.label,
        priorityContent: parsed.data.priorityContent as Prisma.InputJsonValue,
        aiFramingPrompt: parsed.data.aiFramingPrompt,
      },
    });

    await logActivity({
      adminUserId,
      action: "visitorLens.update",
      entityType: "VisitorLens",
      entityId: id,
      after: { key: lens.key, label: lens.label },
    });

    return NextResponse.json(lens);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Visitor lens not found", 404);
    }
    throw err;
  }
}
