// GET /api/v1/admin/cv/uploads/{id} — download any version of the uploaded CV,
// current or superseded, so the owner can check what they uploaded (#92).
// Always an attachment, never sniffed (BR-7.6). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { CV_CONTENT_TYPE } from "@/lib/cv/generate";
import type { UploadFormat } from "@/lib/cv/uploads";

export const GET = withAdmin<{ id: string }>(async (_request, _admin, { params }) => {
  const { id } = await params;
  const file = await db.cvUpload.findUnique({ where: { id } });
  if (!file) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Upload not found", details: null } }, { status: 404 });
  }
  const safeName = file.fileName.replace(/[^A-Za-z0-9._-]+/g, "-");
  return new NextResponse(new Uint8Array(file.fileData), {
    status: 200,
    headers: {
      "Content-Type": CV_CONTENT_TYPE[file.format as UploadFormat],
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
});
