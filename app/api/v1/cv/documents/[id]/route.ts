// GET /api/v1/cv/documents/{id} — streams a previously generated CV PDF's
// bytes. Public, same as the generate endpoint it's paired with; the id is
// an unguessable cuid, not a sequential index, so there's no enumeration
// concern beyond what any public download link already has.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await db.documentGen.findUnique({ where: { id } });

  if (!document) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found", details: null } }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(document.fileData), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cv-${document.generatedAt.toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
