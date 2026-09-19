// PATCH/DELETE /api/v1/admin/cv/experience/{id}. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ExperienceInputSchema } from "@/lib/schemas";
import { experienceWithSkills, toExperienceEntry } from "@/lib/rules/cv";
import { CONTENT_STATUS_FROM_WIRE } from "@/lib/rules/timeline";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = ExperienceInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid experience entry", 400, { issues: parsed.error.issues });
  }

  try {
    const experience = await write(async (tx) => {
      // Replace the skill links wholesale — simpler and less error-prone
      // than diffing add/remove sets for a small per-entry list.
      await tx.skillOnExperience.deleteMany({ where: { experienceId: id } });
      return tx.experience.update({
        where: { id },
        data: {
          title: parsed.data.title,
          organization: parsed.data.organization,
          location: parsed.data.location ?? null,
          startDate: new Date(parsed.data.startDate),
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
          description: parsed.data.description,
          highlights: parsed.data.highlights,
          // Showing or hiding a role is the admin's call (#74).
          ...(parsed.data.contentStatus && { contentStatus: CONTENT_STATUS_FROM_WIRE[parsed.data.contentStatus] }),
          skills: { create: parsed.data.skillIds.map((skillId) => ({ skillId })) },
        },
        ...experienceWithSkills,
      });
    });

    return NextResponse.json(toExperienceEntry(experience));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Experience entry not found", 404);
    }
    throw err;
  }
});

export const DELETE = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;

  try {
    await write((tx) => tx.experience.delete({ where: { id } }));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Experience entry not found", 404);
    }
    throw err;
  }
});
