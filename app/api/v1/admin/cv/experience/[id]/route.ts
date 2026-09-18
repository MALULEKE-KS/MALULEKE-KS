// PATCH/DELETE /api/v1/admin/cv/experience/{id}. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ExperienceInputSchema } from "@/lib/schemas";
import { experienceWithSkills, toExperienceEntry } from "@/lib/rules/cv";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = ExperienceInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid experience entry", 400, { issues: parsed.error.issues });
  }

  try {
    const experience = await db.$transaction(async (tx) => {
      // Replace the skill links wholesale — simpler and less error-prone
      // than diffing add/remove sets for a small per-entry list.
      await tx.skillOnExperience.deleteMany({ where: { experienceId: id } });
      return tx.experience.update({
        where: { id },
        data: {
          title: parsed.data.title,
          organization: parsed.data.organization,
          startDate: new Date(parsed.data.startDate),
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
          description: parsed.data.description,
          skills: { create: parsed.data.skillIds.map((skillId) => ({ skillId })) },
        },
        ...experienceWithSkills,
      });
    });

    await logActivity({
      adminUserId,
      action: "experience.update",
      entityType: "Experience",
      entityId: id,
      after: { title: experience.title, organization: experience.organization },
    });

    return NextResponse.json(toExperienceEntry(experience));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Experience entry not found", 404);
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;

  try {
    await db.experience.delete({ where: { id } });
    await logActivity({ adminUserId, action: "experience.delete", entityType: "Experience", entityId: id });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Experience entry not found", 404);
    }
    throw err;
  }
}
