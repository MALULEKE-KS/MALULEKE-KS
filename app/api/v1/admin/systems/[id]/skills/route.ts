// PUT /api/v1/admin/systems/{id}/skills — set which skills a system proves
// (#82). Replaces the links wholesale, like roles and education. Feeds skill
// evidence (SkillEvidence) once the system is published. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SystemSkillsInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PUT = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = SystemSkillsInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Body must be { skillIds: string[] }", 400, { issues: parsed.error.issues });
  }
  const skillIds = [...new Set(parsed.data.skillIds)];
  const [system, found] = await Promise.all([
    db.system.findUnique({ where: { id }, select: { id: true } }),
    db.skill.count({ where: { id: { in: skillIds } } }),
  ]);
  if (!system) return errorResponse("NOT_FOUND", "System not found", 404);
  if (found !== skillIds.length) return errorResponse("VALIDATION_ERROR", "Unknown skill id", 400);

  const skills = await write(async (tx) => {
    await tx.skillOnSystem.deleteMany({ where: { systemId: id } });
    await tx.skillOnSystem.createMany({ data: skillIds.map((skillId) => ({ skillId, systemId: id })) });
    return tx.skill.findMany({ where: { id: { in: skillIds } }, orderBy: { name: "asc" } });
  });
  return NextResponse.json({ data: skills.map((s) => ({ id: s.id, name: s.name })) });
});
