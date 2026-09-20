// GET /api/v1/skills — every skill with the evidence behind it (approved
// feature 4, #82): the published systems that use it, the roles and the
// published study that taught it — strongest first. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getSkillEvidence } from "@/lib/queries/evidence";

export async function GET() {
  const skills = await getSkillEvidence();
  return NextResponse.json(
    skills.map((s) => ({
      name: s.name,
      category: s.categoryKey,
      systemSlugs: s.systemSlugs,
      systemCount: s.systemCount,
      roleCount: s.roleCount,
      studyCount: s.studyCount,
      firstUsed: s.firstUsed ? s.firstUsed.toISOString().slice(0, 10) : null,
      lastEnded: s.lastEnded ? s.lastEnded.toISOString().slice(0, 10) : null,
      inCurrentRole: s.inCurrentRole,
    })),
  );
}
