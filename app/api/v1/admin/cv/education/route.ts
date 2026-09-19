// GET/POST /api/v1/admin/cv/education. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EducationInputSchema } from "@/lib/schemas";
import { educationWithSkills, toEducationEntry } from "@/lib/rules/cv";
import { CONTENT_STATUS_FROM_WIRE } from "@/lib/rules/timeline";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const education = await db.education.findMany({ ...educationWithSkills, orderBy: { startDate: "desc" } });
  return NextResponse.json({ data: education.map(toEducationEntry) });
}

export async function POST(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const body = await request.json().catch(() => null);
  const parsed = EducationInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid education entry", 400, { issues: parsed.error.issues });
  }

  const education = await db.education.create({
    data: {
      institution: parsed.data.institution,
      qualification: parsed.data.qualification,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      honors: parsed.data.honors ?? null,
      fieldOfStudy: parsed.data.fieldOfStudy ?? null,
      description: parsed.data.description ?? null,
      certificateUrl: parsed.data.certificateUrl ?? null,
      contentStatus: CONTENT_STATUS_FROM_WIRE[parsed.data.contentStatus ?? "published"],
      skills: { create: parsed.data.skillIds.map((skillId) => ({ skillId })) },
    },
    ...educationWithSkills,
  });

  await logActivity({
    adminUserId,
    action: "education.create",
    entityType: "Education",
    entityId: education.id,
    after: { institution: education.institution, qualification: education.qualification },
  });

  return NextResponse.json(toEducationEntry(education), { status: 201 });
}
