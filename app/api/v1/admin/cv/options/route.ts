// GET/PATCH /api/v1/admin/cv/options — which CV options visitors see, which is
// listed first, and their labels (#92, BR-7.5). The database refuses hiding
// both, listing a hidden option first, or hiding the generated CV before any
// upload exists — answered as a 400 in the rule's words (withAdmin).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import type { CvOptions } from "@prisma/client";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { CvOptionsUpdateInputSchema } from "@/lib/schemas";

function toWire(row: CvOptions) {
  return {
    showGenerated: row.showGenerated,
    showUploaded: row.showUploaded,
    firstOption: row.firstOption as "generated" | "uploaded",
    generatedLabel: row.generatedLabel,
    generatedNote: row.generatedNote,
    uploadedLabel: row.uploadedLabel,
    uploadedNote: row.uploadedNote,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const GET = withAdmin(async () => {
  return NextResponse.json(toWire(await db.cvOptions.findUniqueOrThrow({ where: { id: 1 } })));
});

export const PATCH = withAdmin(async (request, { write }) => {
  const parsed = CvOptionsUpdateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid CV options", details: { issues: parsed.error.issues } } },
      { status: 400 },
    );
  }
  const row = await write((tx) => tx.cvOptions.update({ where: { id: 1 }, data: parsed.data }));
  return NextResponse.json(toWire(row));
});
