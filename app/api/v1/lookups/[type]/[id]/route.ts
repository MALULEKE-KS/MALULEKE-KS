// PATCH /api/v1/lookups/{type}/{id} — edit a lookup value's label and its
// type's extras (lib/rules/lookups.ts). The key is immutable (BR-8.3).
// Changing a status's stage moves every system in it between the homepage
// counts (EXT-1). Making a repo relationship require the owner's permission
// is refused (409) while a system using it is published without one (BR-1.11).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { isLookupType, unsupportedExtras, updateLookupValue } from "@/lib/rules/lookups";
import { ruleViolation } from "@/lib/db-errors";
import { LookupUpdateInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ type: string; id: string }>(async (request, { write }, { params }) => {
  const { type, id } = await params;
  if (!isLookupType(type)) {
    return errorResponse("NOT_FOUND", `Unknown lookup type "${type}"`, 404);
  }

  const parsed = LookupUpdateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid lookup update", 400, { issues: parsed.error.issues });
  }
  const { label: _label, ...extras } = parsed.data;
  const unsupported = unsupportedExtras(type, extras);
  if (unsupported.length) {
    return errorResponse("VALIDATION_ERROR", `${unsupported.join(", ")} do not apply to ${type} values`, 400);
  }

  let result;
  try {
    result = await write((tx) => updateLookupValue(tx, type, id, parsed.data));
  } catch (err) {
    const rule = ruleViolation(err, "BR-1.11");
    if (rule) return errorResponse("OWNER_PERMISSION_REQUIRED", rule, 409);
    throw err;
  }
  if (!result) return errorResponse("NOT_FOUND", "Lookup value not found", 404);

  return NextResponse.json(result.after);
});
