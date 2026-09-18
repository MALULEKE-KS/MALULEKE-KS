// GET/POST /api/v1/admin/cv/skills. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SkillInputSchema } from "@/lib/schemas";
import { skillWithCategory, toSkillEntry } from "@/lib/rules/cv";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const skills = await db.skill.findMany({ ...skillWithCategory, orderBy: { name: "asc" } });
  return NextResponse.json({ data: skills.map(toSkillEntry) });
}

export async function POST(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const body = await request.json().catch(() => null);
  const parsed = SkillInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid skill", 400, { issues: parsed.error.issues });
  }

  const category = await db.skillCategory.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) {
    return errorResponse("VALIDATION_ERROR", "Unknown categoryId", 400);
  }

  const skill = await db.skill.create({
    data: {
      name: parsed.data.name,
      categoryId: parsed.data.categoryId,
      yearsExperience: parsed.data.yearsExperience ?? null,
    },
    ...skillWithCategory,
  });

  await logActivity({
    adminUserId,
    action: "skill.create",
    entityType: "Skill",
    entityId: skill.id,
    after: { name: skill.name },
  });

  return NextResponse.json(toSkillEntry(skill), { status: 201 });
}
