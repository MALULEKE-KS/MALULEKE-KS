// GET /api/v1/cv/documents/{id} — streams a previously generated CV (PDF or
// DOCX, #74). Public, same as the generate endpoint it's paired with; the id
// is an unguessable cuid, not a sequential index, so there's no enumeration
// concern beyond what any public download link already has.

import { NextResponse } from "next/server";
import { db, dbPublic } from "@/lib/db";
import { CV_CONTENT_TYPE, type CvFormat } from "@/lib/cv/generate";
import { fileName } from "@/lib/cv/format";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [document, profile] = await Promise.all([
    db.documentGen.findUnique({ where: { id } }),
    dbPublic.publicProfile.findFirst({ select: { displayName: true } }),
  ]);

  if (!document) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found", details: null } }, { status: 404 });
  }

  const format = document.format as CvFormat;

  return new NextResponse(new Uint8Array(document.fileData), {
    status: 200,
    headers: {
      "Content-Type": CV_CONTENT_TYPE[format],
      "Content-Disposition": `attachment; filename="${fileName(profile?.displayName ?? "", format, document.generatedAt)}"`,
    },
  });
}
