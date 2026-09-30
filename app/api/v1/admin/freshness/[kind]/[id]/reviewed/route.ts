// POST /api/v1/admin/freshness/{kind}/{id}/reviewed — the owner looked and the
// content is still accurate: its freshness clock restarts (#89, BR-1.16).
// kind = system | experience | education | profile. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { FRESHNESS_KINDS, markReviewed, type FreshnessKind } from "@/lib/queries/freshness";

export const POST = withAdmin<{ kind: string; id: string }>(async (_request, { write }, { params }) => {
  const { kind, id } = await params;
  if (!(FRESHNESS_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: `kind must be one of: ${FRESHNESS_KINDS.join(", ")}`, details: null } },
      { status: 400 },
    );
  }
  const found = await write((tx) => markReviewed(tx, kind as FreshnessKind, id));
  if (!found) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found", details: null } }, { status: 404 });
  }
  return NextResponse.json({ kind, id, reviewedAt: new Date().toISOString() });
});
