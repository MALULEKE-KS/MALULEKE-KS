// GET /api/v1/systems/{slug} — unpublished/unknown slug returns the same
// generic 404 (BR-1.3/1.4 spirit — never a distinguishable "this one's
// private" response, which would itself leak that a hidden system exists).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  PUBLISHED_WHERE,
  systemWithPublicDetailRelations,
  toPublicSystemDetailed,
} from "@/lib/rules/publishing";

function notFound() {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "System not found" } },
    { status: 404 }
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // A single findFirst with PUBLISHED_WHERE baked in — never a separate
  // "does it exist at all" query, which would make timing/existence
  // distinguishable between "doesn't exist" and "exists but unpublished".
  const system = await db.system.findFirst({
    where: { slug, ...PUBLISHED_WHERE },
    ...systemWithPublicDetailRelations,
  });

  if (!system) return notFound();

  return NextResponse.json(toPublicSystemDetailed(system));
}
