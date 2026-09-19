// GET /api/v1/admin/settings/flags. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async (request, _admin) => {
  const flags = await db.flag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ data: flags });
});
