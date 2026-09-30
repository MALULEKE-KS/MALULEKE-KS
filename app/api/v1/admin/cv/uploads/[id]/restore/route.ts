// POST /api/v1/admin/cv/uploads/{id}/restore — make an earlier version the
// current file of its format again; the one it replaces is superseded, not
// deleted (#92, BR-7.2). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { restoreCvUpload, toCvUploadVersion } from "@/lib/cv/uploads";

export const POST = withAdmin<{ id: string }>(async (_request, { write }, { params }) => {
  const { id } = await params;
  const version = await write((tx) => restoreCvUpload(tx, id));
  if (!version) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Upload not found", details: null } }, { status: 404 });
  }
  return NextResponse.json(toCvUploadVersion(version));
});
