// GET/POST /api/v1/admin/cv/skills. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SkillInputSchema } from "@/lib/schemas";
import { skillWithCategory, toSkillEntry } from "@/lib/rules/cv";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async (request, _admin) => {
  const skills = await db.skill.findMany({ ...skillWithCategory, orderBy: { name: "asc" } });
  return NextResponse.json({ data: skills.map(toSkillEntry) });
});

export const POST = withAdmin(async (request, { write }) => {
  const body = await request.json().catch(() => null);
  const parsed = SkillInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid skill", 400, { issues: parsed.error.issues });
  }

  const category = await db.skillCategory.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) {
    return errorResponse("VALIDATION_ERROR", "Unknown categoryId", 400);
  }

  const skill = await write((tx) => tx.skill.create({
    data: {
      name: parsed.data.name,
      categoryId: parsed.data.categoryId,
      yearsExperience: parsed.data.yearsExperience ?? null,
    },
    ...skillWithCategory,
  }));

  return NextResponse.json(toSkillEntry(skill), { status: 201 });
});
