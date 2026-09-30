// GET /api/v1/admin/systems/{id}/revisions?field=caseStudyBody|description —
// every version of a system's case study or description, newest first, each
// attributed and dated; backfilled = the text when history began (#88,
// BR-1.15). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { listRevisions, REVISION_FIELDS, type RevisionField } from "@/lib/rules/revisions";

export const GET = withAdmin<{ id: string }>(async (request, _admin, { params }) => {
  const { id } = await params;
  const field = new URL(request.url).searchParams.get("field") ?? "caseStudyBody";
  if (!(REVISION_FIELDS as readonly string[]).includes(field)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: `field must be one of: ${REVISION_FIELDS.join(", ")}`, details: null } },
      { status: 400 },
    );
  }
  const revisions = await listRevisions(db, id, field as RevisionField);
  if (!revisions) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "System not found", details: null } }, { status: 404 });
  }
  return NextResponse.json({ field, revisions });
});
