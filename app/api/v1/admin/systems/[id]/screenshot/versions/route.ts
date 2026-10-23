// GET /api/v1/admin/systems/{id}/screenshot/versions — every version of the
// system's screenshot, newest first, without the bytes: the admin's history
// (BR-1.18 — superseded, never altered; D-054). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { listScreenshotVersions } from "@/lib/systems/screenshots";

export const GET = withAdmin<{ id: string }>(async (_request, _ctx, { params }) => {
  const { id } = await params;
  if (!(await db.system.findUnique({ where: { id }, select: { id: true } }))) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "System not found", details: null } }, { status: 404 });
  }
  return NextResponse.json({ data: await listScreenshotVersions(id) });
});
