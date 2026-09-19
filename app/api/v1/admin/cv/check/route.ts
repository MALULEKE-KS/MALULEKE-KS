// GET /api/v1/admin/cv/check?targetRole= — the CV completeness report (#74):
// a score, what's missing or weak section by section, a summary drafted only
// from facts already on the CV, and a preview of the CV's content — for the
// admin, before generating. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { CvCheckQuerySchema } from "@/lib/schemas";
import { buildCvModel } from "@/lib/cv/model";
import { checkCv } from "@/lib/cv/check";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async (request, _admin) => {
  const url = new URL(request.url);
  const parsed = CvCheckQuerySchema.safeParse({ targetRole: url.searchParams.get("targetRole") ?? undefined });
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid targetRole", 400, { issues: parsed.error.issues });
  }

  const model = await buildCvModel({ targetRole: parsed.data.targetRole || null, siteUrl: url.origin });
  return NextResponse.json({ ...checkCv(model), preview: model });
});
