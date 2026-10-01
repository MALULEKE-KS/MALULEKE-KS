// GET /api/v1/content/{key} — a page content block (#106), e.g. how-i-build:
// the owner-edited copy a page shows. Unknown or absent keys are a 404.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getContentBlock, isContentKey } from "@/lib/content/blocks";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const body = isContentKey(key) ? await getContentBlock(key) : null;
  if (!body) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No such content", details: null } }, { status: 404 });
  }
  return NextResponse.json({ key, body });
}
