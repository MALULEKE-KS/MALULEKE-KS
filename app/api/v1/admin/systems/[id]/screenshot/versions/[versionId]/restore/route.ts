// POST /api/v1/admin/systems/{id}/screenshot/versions/{versionId}/restore — make an
// earlier screenshot current again (BR-1.18 — superseded, never altered; D-054).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { restoreScreenshot } from "@/lib/systems/screenshots";

export const POST = withAdmin<{ id: string; versionId: string }>(async (_request, { write }, { params }) => {
  const { id, versionId } = await params;
  const restored = await write((tx) => restoreScreenshot(tx, id, versionId));
  if (!restored) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Screenshot not found", details: null } }, { status: 404 });
  return NextResponse.json({ id: restored.id, current: true });
});
