// GET /api/v1/cv?targetRole= — the CV as structured data (#82): the same model
// the PDF and Word files are rendered from (lib/cv/model.ts), so a frontend
// can show the CV on screen exactly as it downloads. Built only from what the
// site shows (BR-7.3); a target role reorders by relevance, never rewrites.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { buildCvModel } from "@/lib/cv/model";
import { cvOptionNotOffered, isCvOptionOffered } from "@/lib/cv/options";

export async function GET(request: Request) {
  // BR-7.5 — a hidden option is refused, not just unlisted (#92).
  if (!(await isCvOptionOffered("generated"))) return cvOptionNotOffered();
  const url = new URL(request.url);
  const targetRole = url.searchParams.get("targetRole")?.trim().slice(0, 100) || null;
  const model = await buildCvModel({ targetRole, siteUrl: url.origin });
  const date = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  return NextResponse.json({
    ...model,
    experience: model.experience.map((r) => ({ ...r, start: date(r.start), end: date(r.end) })),
    education: model.education.map((e) => ({
      ...e,
      start: date(e.start),
      end: date(e.end),
      expectedGraduation: date(e.expectedGraduation),
    })),
    certifications: model.certifications.map((c) => ({ ...c, date: date(c.date) })),
  });
}
