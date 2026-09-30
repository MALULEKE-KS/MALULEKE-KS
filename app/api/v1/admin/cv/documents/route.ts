// GET /api/v1/admin/cv/documents — every generated CV (#82): format, target
// role, when, its completeness score at the time, and whether a newer one
// superseded it (BR-7.2 — none are deleted). The file bytes aren't sent here;
// each has a download link. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/auth/with-admin";

const PAGE = 100;

export const GET = withAdmin(async () => {
  const docs = await db.documentGen.findMany({
    select: {
      id: true,
      type: true,
      format: true,
      targetRole: true,
      generatedAt: true,
      fileUrl: true,
      supersededByFileUrl: true,
      completeness: true,
    },
    orderBy: { generatedAt: "desc" },
    take: PAGE,
  });
  return NextResponse.json({
    data: docs.map((d) => ({
      id: d.id,
      type: d.type,
      format: d.format,
      targetRole: d.targetRole,
      generatedAt: d.generatedAt.toISOString(),
      fileUrl: d.fileUrl,
      current: d.supersededByFileUrl === null,
      supersededBy: d.supersededByFileUrl,
      completeness: d.completeness,
    })),
  });
});
