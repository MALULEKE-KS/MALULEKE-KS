// GET/POST /api/v1/lookups/{type} — one contract for every EXT-1 lookup table (BR-8.1).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { isLookupType, listLookupValues } from "@/lib/rules/lookups";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!isLookupType(type)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Unknown lookup type "${type}"` } },
      { status: 404 }
    );
  }

  // includeInactive is admin-only per the contract; ignored here since this
  // route has no session check yet — every caller gets active-only until
  // admin auth exists to gate it properly.
  const values = await listLookupValues(type, false);

  return NextResponse.json(
    values.map((v) => ({ id: v.id, key: v.key, label: v.label, active: v.active }))
  );
}

export async function POST() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Not implemented — requires admin auth" } },
    { status: 501 }
  );
}
