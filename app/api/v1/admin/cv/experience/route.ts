// GET/POST /api/v1/admin/cv/experience. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ExperienceInputSchema } from "@/lib/schemas";
import { experienceWithSkills, toExperienceEntry } from "@/lib/rules/cv";
import { CONTENT_STATUS_FROM_WIRE } from "@/lib/rules/timeline";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async (request, _admin) => {
  const experience = await db.experience.findMany({
    ...experienceWithSkills,
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ data: experience.map(toExperienceEntry) });
});

export const POST = withAdmin(async (request, { write }) => {
  const body = await request.json().catch(() => null);
  const parsed = ExperienceInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid experience entry", 400, { issues: parsed.error.issues });
  }

  const experience = await write((tx) => tx.experience.create({
    data: {
      title: parsed.data.title,
      organization: parsed.data.organization,
      location: parsed.data.location ?? null,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      description: parsed.data.description,
      highlights: parsed.data.highlights,
      contentStatus: CONTENT_STATUS_FROM_WIRE[parsed.data.contentStatus ?? "published"],
      skills: { create: parsed.data.skillIds.map((skillId) => ({ skillId })) },
    },
    ...experienceWithSkills,
  }));

  return NextResponse.json(toExperienceEntry(experience), { status: 201 });
});
