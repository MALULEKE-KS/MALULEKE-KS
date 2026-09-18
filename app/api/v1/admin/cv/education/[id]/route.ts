// PATCH/DELETE /api/v1/admin/cv/education/{id}. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { EducationInputSchema } from "@/lib/schemas";
import { toEducationEntry } from "@/lib/rules/cv";
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
    const education = await db.education.update({
      where: { id },
      data: {
        institution: parsed.data.institution,
        qualification: parsed.data.qualification,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        honors: parsed.data.honors ?? null,
      },
    });

    await logActivity({
      adminUserId,
      action: "education.update",
      entityType: "Education",
      entityId: id,
      after: { institution: education.institution, qualification: education.qualification },
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
