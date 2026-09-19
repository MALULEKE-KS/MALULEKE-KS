// GET /api/v1/admin/settings/platform — every platform tunable with its
// effective value, default and the business rule it serves (#67).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getSessionAdminId } from "@/lib/auth/session";
import { listSettings } from "@/lib/settings";

export async function GET(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Session expired or invalid.", details: null } },
      { status: 401 },
    );
  }
  return NextResponse.json(await listSettings());
}
