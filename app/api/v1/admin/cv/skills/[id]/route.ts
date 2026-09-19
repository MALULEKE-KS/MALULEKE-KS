// PATCH/DELETE /api/v1/admin/cv/skills/{id} — DELETE blocked 409 if still
// referenced by any System/Experience (onDelete Restrict, mirrors BR-8.2).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { SkillInputSchema } from "@/lib/schemas";
import { skillWithCategory, toSkillEntry } from "@/lib/rules/cv";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = SkillInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid skill", 400, { issues: parsed.error.issues });
  }

  try {
    const skill = await write((tx) => tx.skill.update({
      where: { id },
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        yearsExperience: parsed.data.yearsExperience ?? null,
      },
      ...skillWithCategory,
    }));

    return NextResponse.json(toSkillEntry(skill));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Skill not found", 404);
    }
    throw err;
  }
});

export const DELETE = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;

  try {
    await write((tx) => tx.skill.delete({ where: { id } }));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Skill not found", 404);
    }
    // P2003 — foreign key constraint failed, i.e. onDelete: Restrict fired
    // because this Skill is still linked to a System or Experience.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return errorResponse("SKILL_IN_USE", "Skill is still referenced by a System or Experience entry.", 409);
    }
    throw err;
  }
});
