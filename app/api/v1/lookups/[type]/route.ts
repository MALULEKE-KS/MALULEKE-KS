// GET/POST /api/v1/lookups/{type} — one contract for every EXT-1 lookup table (BR-8.1).
// Some types carry extra fields (lib/rules/lookups.ts); extras a type doesn't have are refused.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  createLookupValue,
  existingLookupConflict,
  isLookupType,
  listLookupValues,
  unsupportedExtras,
} from "@/lib/rules/lookups";
import { LookupCreateInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";
import { getSessionAdminId } from "@/lib/auth/session";

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

export const POST = withAdmin<{ type: string }>(async (request, { write }, { params }) => {
  const { type } = await params;
  if (!isLookupType(type)) {
    return errorResponse("NOT_FOUND", `Unknown lookup type "${type}"`, 404);
  }

  const parsed = LookupCreateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid lookup value", 400, { issues: parsed.error.issues });
  }
  const { key, label, ...extras } = parsed.data;
  const unsupported = unsupportedExtras(type, extras);
  if (unsupported.length) {
    return errorResponse("VALIDATION_ERROR", `${unsupported.join(", ")} do not apply to ${type} values`, 400);
  }

  let result;
  try {
    result = await write((tx) => createLookupValue(tx, type, key, label, extras));
  } catch (err) {
    // A concurrent create won the race to the unique key — same answer (BR-8.3).
    const raced = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
      ? await existingLookupConflict(type, key)
      : null;
    if (!raced) throw err;
    result = raced;
  }
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

  return NextResponse.json(result.value, { status: 201 });
});
