// GET/POST /api/v1/admin/achievements — certifications and awards (#74).
// They start as drafts; only published ones reach the site and the CV.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AchievementInputSchema } from "@/lib/schemas";
import { checkViolationMessage, toAchievement } from "@/lib/rules/profile";
import { CONTENT_STATUS_FROM_WIRE } from "@/lib/rules/timeline";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async (request, _admin) => {
  const achievements = await db.achievement.findMany({ orderBy: [{ sortOrder: "asc" }, { achievedOn: "desc" }] });
  return NextResponse.json({ data: achievements.map(toAchievement) });
});

export const POST = withAdmin(async (request, { write }) => {
  const parsed = AchievementInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid achievement", 400, { issues: parsed.error.issues });
  }

  try {
    const achievement = await write((tx) => tx.achievement.create({
      data: {
        title: parsed.data.title,
        issuer: parsed.data.issuer ?? null,
        achievedOn: new Date(parsed.data.achievedOn),
        description: parsed.data.description ?? null,
        url: parsed.data.url ?? null,
        systemId: parsed.data.systemId ?? null,
        sortOrder: parsed.data.sortOrder,
        ...(parsed.data.contentStatus && { contentStatus: CONTENT_STATUS_FROM_WIRE[parsed.data.contentStatus] }),
      },
    }));
    return NextResponse.json(toAchievement(achievement), { status: 201 });
  } catch (err) {
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
});
