// PATCH/DELETE /api/v1/admin/achievements/{id} (#74). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AchievementInputSchema } from "@/lib/schemas";
import { checkViolationMessage, toAchievement } from "@/lib/rules/profile";
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
  const parsed = AchievementInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid achievement", 400, { issues: parsed.error.issues });
  }

  const before = await db.achievement.findUnique({ where: { id } });
  if (!before) return errorResponse("NOT_FOUND", "Achievement not found", 404);

  try {
    const achievement = await db.achievement.update({
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
    });
    await logActivity({
      adminUserId,
      action: "achievement.update",
      entityType: "Achievement",
      entityId: id,
      before: toAchievement(before),
      after: toAchievement(achievement),
      request,
    });
    return NextResponse.json(toAchievement(achievement));
  } catch (err) {
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;
  const before = await db.achievement.findUnique({ where: { id } });
  if (!before) return errorResponse("NOT_FOUND", "Achievement not found", 404);

  await db.achievement.delete({ where: { id } });
  await logActivity({
    adminUserId,
    action: "achievement.delete",
    entityType: "Achievement",
    entityId: id,
    before: toAchievement(before),
    request,
  });
  return new NextResponse(null, { status: 204 });
}
