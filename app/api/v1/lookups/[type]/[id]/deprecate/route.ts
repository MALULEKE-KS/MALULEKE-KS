// POST /api/v1/lookups/{type}/{id}/deprecate — soft-deprecate only (BR-8.2/8.3).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { isLookupType, deprecateLookupValue } from "@/lib/rules/lookups";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { type, id } = await params;
  if (!isLookupType(type)) {
    return errorResponse("NOT_FOUND", `Unknown lookup type "${type}"`, 404);
  }

  const value = await deprecateLookupValue(type, id);
  if (!value) {
    return errorResponse("NOT_FOUND", "Lookup value not found", 404);
  }

  await logActivity({
    adminUserId,
    action: "lookup.deprecate",
    entityType: type,
    entityId: id,
    after: { active: false },
  });

  return NextResponse.json(value);
}
