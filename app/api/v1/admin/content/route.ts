// GET /api/v1/admin/content — every page content block the admin can edit
// (#106): key, title, description, and when it was last changed.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { CONTENT_BLOCKS } from "@/lib/content/blocks";

export const GET = withAdmin(async () => {
  const rows = await db.siteContent.findMany({ select: { key: true, updatedAt: true } });
  const updated = new Map(rows.map((r) => [r.key, r.updatedAt.toISOString()]));
  return NextResponse.json({
    blocks: Object.entries(CONTENT_BLOCKS).map(([key, def]) => ({
      key,
      title: def.title,
      description: def.description,
      updatedAt: updated.get(key) ?? null,
    })),
  });
});
