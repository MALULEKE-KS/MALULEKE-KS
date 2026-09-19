// GET/POST /api/v1/lookups/{type} — one contract for every EXT-1 lookup table (BR-8.1).
// Status values also carry a pipeline stage and a curated colour (#52).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { isLookupType, listLookupValues, createLookupValue } from "@/lib/rules/lookups";
import { LookupCreateInputSchema } from "@/lib/schemas";
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

  return NextResponse.json(await listLookupValues(type, includeInactive));
}

export async function POST(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { type } = await params;
  if (!isLookupType(type)) {
    return errorResponse("NOT_FOUND", `Unknown lookup type "${type}"`, 404);
  }

  const parsed = LookupCreateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid lookup value", 400, { issues: parsed.error.issues });
  }
  const { key, label, stage, colorToken } = parsed.data;

  const result = await createLookupValue(type, key, label, { stage, colorToken });
  if (!result.ok) {
    // BR-8.3 — an actionable answer, never a raw uniqueness failure.
    return result.code === "LOOKUP_KEY_DEPRECATED"
      ? errorResponse(
          "LOOKUP_KEY_DEPRECATED",
          `"${key}" exists but is deprecated — reactivate it instead of creating it again.`,
          409,
          { existingId: result.existingId },
        )
      : errorResponse("LOOKUP_KEY_EXISTS", `"${key}" already exists.`, 409, { existingId: result.existingId });
  }

  await logActivity({
    adminUserId,
    action: "lookup.create",
    entityType: type,
    entityId: result.value.id,
    after: result.value,
    request,
  });

  return NextResponse.json(result.value, { status: 201 });
}
