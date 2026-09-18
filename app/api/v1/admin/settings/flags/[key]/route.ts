// PATCH /api/v1/admin/settings/flags/{key} — one at a time, no bulk-enable (BR-4.4).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { FlagUpdateInputSchema } from "@/lib/schemas";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { key } = await params;
  const body = await request.json().catch(() => null);
  const parsed = FlagUpdateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid flag update", 400, { issues: parsed.error.issues });
  }

  try {
    const flag = await db.flag.update({ where: { key }, data: { enabled: parsed.data.enabled } });

    await logActivity({
      adminUserId,
      action: "flag.update",
      entityType: "Flag",
      entityId: flag.id,
      after: { key: flag.key, enabled: flag.enabled },
    });

    return NextResponse.json(flag);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Flag not found", 404);
    }
    throw err;
  }
}
