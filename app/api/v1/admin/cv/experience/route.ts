// GET/POST /api/v1/admin/cv/experience. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ExperienceInputSchema } from "@/lib/schemas";
import { experienceWithSkills, toExperienceEntry } from "@/lib/rules/cv";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const experience = await db.experience.findMany({
    ...experienceWithSkills,
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ data: experience.map(toExperienceEntry) });
}

export async function POST(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const body = await request.json().catch(() => null);
  const parsed = ExperienceInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid experience entry", 400, { issues: parsed.error.issues });
  }

  const experience = await db.experience.create({
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

  await logActivity({
    adminUserId,
    action: "experience.create",
    entityType: "Experience",
    entityId: experience.id,
    after: { title: experience.title, organization: experience.organization },
  });

  return NextResponse.json(toExperienceEntry(experience), { status: 201 });
}
