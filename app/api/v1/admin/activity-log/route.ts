// GET /api/v1/admin/activity-log — read-only, most recent first (BR-3.4).
// See openapi-contract.yaml.

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { PaginationQuerySchema } from "@/lib/schemas";
import { getSessionAdminId } from "@/lib/auth/session";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: NextRequest) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const searchParams = request.nextUrl.searchParams;
  const entityType = searchParams.get("entityType");
  const { page, pageSize } = PaginationQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  const where = entityType ? { entityType } : {};

  const [entries, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: { adminUser: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.activityLog.count({ where }),
  ]);

  return NextResponse.json({
    data: entries.map((entry) => ({
      id: entry.id,
      adminUserEmail: entry.adminUser.email,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before as Record<string, unknown> | null,
      after: entry.after as Record<string, unknown> | null,
      createdAt: entry.createdAt.toISOString(),
    })),
    meta: { page, pageSize, total },
  });
}
