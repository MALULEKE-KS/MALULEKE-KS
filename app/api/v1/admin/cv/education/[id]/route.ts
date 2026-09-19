// PATCH/DELETE /api/v1/admin/cv/education/{id}. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { EducationInputSchema } from "@/lib/schemas";
import { educationWithSkills, toEducationEntry } from "@/lib/rules/cv";
import { CONTENT_STATUS_FROM_WIRE } from "@/lib/rules/timeline";
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
  const parsed = EducationInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid education entry", 400, { issues: parsed.error.issues });
  }

  try {
    const education = await db.$transaction(async (tx) => {
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
          skills: { create: parsed.data.skillIds.map((skillId) => ({ skillId })) },
        },
        ...educationWithSkills,
      });
    });

    await logActivity({
      adminUserId,
      action: "education.update",
      entityType: "Education",
      entityId: id,
      after: {
        institution: education.institution,
        qualification: education.qualification,
        contentStatus: education.contentStatus,
      },
    });

    return NextResponse.json(toEducationEntry(education));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Education entry not found", 404);
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;

  try {
    await db.education.delete({ where: { id } });
    await logActivity({ adminUserId, action: "education.delete", entityType: "Education", entityId: id });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Education entry not found", 404);
    }
    throw err;
  }
}
