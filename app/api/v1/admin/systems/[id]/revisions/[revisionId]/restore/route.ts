// POST /api/v1/admin/systems/{id}/revisions/{revisionId}/restore — write an
// earlier version of the case study or description back. The database records
// the restore as a new version, attributed to the admin; history only grows
// (#88, BR-1.15). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { restoreRevision } from "@/lib/rules/revisions";

export const POST = withAdmin<{ id: string; revisionId: string }>(async (_request, { write }, { params }) => {
  const { id, revisionId } = await params;
  const result = await write((tx) => restoreRevision(tx, id, revisionId));
  if (!result) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Revision not found for this system", details: null } }, { status: 404 });
  }
  return NextResponse.json(result);
});
