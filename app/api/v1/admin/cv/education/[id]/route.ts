// PATCH/DELETE /api/v1/admin/cv/education/{id}. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { EducationInputSchema } from "@/lib/schemas";
import { educationWithSkills, toEducationEntry } from "@/lib/rules/cv";
import { CONTENT_STATUS_FROM_WIRE } from "@/lib/rules/timeline";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = EducationInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid education entry", 400, { issues: parsed.error.issues });
  }

  try {
    const education = await write(async (tx) => {
      // Replace the skill links wholesale, as Experience does.
      await tx.skillOnEducation.deleteMany({ where: { educationId: id } });
      return tx.education.update({
        where: { id },
        data: {
          institution: parsed.data.institution,
          qualification: parsed.data.qualification,
          startDate: new Date(parsed.data.startDate),
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
          honors: parsed.data.honors ?? null,
          fieldOfStudy: parsed.data.fieldOfStudy ?? null,
          description: parsed.data.description ?? null,
          certificateUrl: parsed.data.certificateUrl ?? null,
          // Showing or hiding is the admin's call (#70).
          ...(parsed.data.contentStatus && { contentStatus: CONTENT_STATUS_FROM_WIRE[parsed.data.contentStatus] }),
          expectedGraduation: parsed.data.expectedGraduation ? new Date(parsed.data.expectedGraduation) : null,
          coursework: parsed.data.coursework,
          skills: { create: parsed.data.skillIds.map((skillId) => ({ skillId })) },
        },
        ...educationWithSkills,
      });
    });

    return NextResponse.json(toEducationEntry(education));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Education entry not found", 404);
    }
    throw err;
  }
});

export const DELETE = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;

  try {
    await write((tx) => tx.education.delete({ where: { id } }));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Education entry not found", 404);
    }
    throw err;
  }
});
