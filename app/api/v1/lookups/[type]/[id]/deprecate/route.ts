// POST /api/v1/lookups/{type}/{id}/deprecate — soft-deprecate only (BR-8.2/8.3).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { isLookupType, deprecateLookupValue } from "@/lib/rules/lookups";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const POST = withAdmin<{ type: string; id: string }>(async (request, { write }, { params }) => {
  const { type, id } = await params;
  if (!isLookupType(type)) {
    return errorResponse("NOT_FOUND", `Unknown lookup type "${type}"`, 404);
  }

  const value = await write((tx) => deprecateLookupValue(tx, type, id));
  if (!value) {
    return errorResponse("NOT_FOUND", "Lookup value not found", 404);
  }

  return NextResponse.json(value);
});
