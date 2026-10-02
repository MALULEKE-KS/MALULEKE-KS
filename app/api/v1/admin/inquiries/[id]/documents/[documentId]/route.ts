// GET /api/v1/admin/inquiries/{id}/documents/{documentId} — an applicant's PDF
// (LETS-TALK-SPEC LT-8), for the admin only: always a download (never shown
// inline), sniffing off, no caching, and only if the document belongs to the
// inquiry in the path — another inquiry's id is simply not found.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";

export const GET = withAdmin<{ id: string; documentId: string }>(async (_request, _admin, { params }) => {
  const { id, documentId } = await params;
  const doc = await db.inquiryDocument.findFirst({ where: { id: documentId, inquiryId: id } });
  if (!doc) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found", details: null } }, { status: 404 });
  const ascii = doc.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  return new Response(new Uint8Array(doc.fileData), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
