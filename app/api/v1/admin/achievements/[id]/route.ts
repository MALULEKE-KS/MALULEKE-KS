// PATCH/DELETE /api/v1/admin/achievements/{id} (#74). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AchievementInputSchema } from "@/lib/schemas";
import { checkViolationMessage, toAchievement } from "@/lib/rules/profile";
import { CONTENT_STATUS_FROM_WIRE } from "@/lib/rules/timeline";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = AchievementInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid achievement", 400, { issues: parsed.error.issues });
  }

  const before = await db.achievement.findUnique({ where: { id } });
  if (!before) return errorResponse("NOT_FOUND", "Achievement not found", 404);

  try {
    const achievement = await write((tx) => tx.achievement.update({
      where: { id },
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
    return NextResponse.json(toAchievement(achievement));
  } catch (err) {
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
});

export const DELETE = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const before = await db.achievement.findUnique({ where: { id } });
  if (!before) return errorResponse("NOT_FOUND", "Achievement not found", 404);

  await write((tx) => tx.achievement.delete({ where: { id } }));
  return new NextResponse(null, { status: 204 });
});
