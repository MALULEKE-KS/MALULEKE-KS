// GET/POST /api/v1/admin/settings/lenses. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { VisitorLensInputSchema } from "@/lib/schemas";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const lenses = await db.visitorLens.findMany({ orderBy: { label: "asc" } });
  return NextResponse.json({ data: lenses });
}

export async function POST(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const body = await request.json().catch(() => null);
  const parsed = VisitorLensInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid visitor lens", 400, { issues: parsed.error.issues });
  }

  const lens = await db.visitorLens.create({
    data: {
      key: parsed.data.key,
      label: parsed.data.label,
      priorityContent: parsed.data.priorityContent as Prisma.InputJsonValue,
      aiFramingPrompt: parsed.data.aiFramingPrompt,
    },
  });

  await logActivity({
    adminUserId,
    action: "visitorLens.create",
    entityType: "VisitorLens",
    entityId: lens.id,
    after: { key: lens.key, label: lens.label },
  });

  return NextResponse.json(lens, { status: 201 });
}
