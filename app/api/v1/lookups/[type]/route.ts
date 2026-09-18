// GET/POST /api/v1/lookups/{type} — one contract for every EXT-1 lookup table (BR-8.1).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { isLookupType, listLookupValues, createLookupValue } from "@/lib/rules/lookups";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!isLookupType(type)) {
    return errorResponse("NOT_FOUND", `Unknown lookup type "${type}"`, 404);
  }

  // includeInactive is admin-only per the contract — ignored (silently
  // treated as false) for any caller that isn't a real authenticated admin,
  // rather than trusting the query param on its own.
  const { searchParams } = new URL(request.url);
  const wantsInactive = searchParams.get("includeInactive") === "true";
  const adminUserId = wantsInactive ? await getSessionAdminId(request) : null;
  const includeInactive = wantsInactive && adminUserId !== null;

  const values = await listLookupValues(type, includeInactive);

  return NextResponse.json(
    values.map((v) => ({ id: v.id, key: v.key, label: v.label, active: v.active }))
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { type } = await params;
  if (!isLookupType(type)) {
    return errorResponse("NOT_FOUND", `Unknown lookup type "${type}"`, 404);
  }

  const body = await request.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!key || !label) {
    return errorResponse("VALIDATION_ERROR", "key and label are required", 400);
  }

  const value = await createLookupValue(type, key, label);

  await logActivity({
    adminUserId,
    action: "lookup.create",
    entityType: type,
    entityId: value.id,
    after: { key: value.key, label: value.label },
  });

  return NextResponse.json(value, { status: 201 });
}
