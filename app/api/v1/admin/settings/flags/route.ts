// GET /api/v1/admin/settings/flags. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdminId } from "@/lib/auth/session";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const flags = await db.flag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ data: flags });
}
