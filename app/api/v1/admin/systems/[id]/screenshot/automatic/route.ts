// POST /api/v1/admin/systems/{id}/screenshot/automatic — "Back to automatic"
// (BR-1.18): retire the owner's uploaded screenshot so the daily job captures
// the live site again (the upload stays in the history). Nothing to retire is
// not an error. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { backToAutomatic, currentScreenshot } from "@/lib/systems/screenshots";

export const POST = withAdmin<{ id: string }>(async (_request, { write }, { params }) => {
  const { id } = await params;
  if (!(await db.system.findUnique({ where: { id }, select: { id: true } }))) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "System not found", details: null } }, { status: 404 });
  }
  const retired = await write((tx) => backToAutomatic(tx, id));
  return NextResponse.json({ retired, screenshot: await currentScreenshot(id) });
});
