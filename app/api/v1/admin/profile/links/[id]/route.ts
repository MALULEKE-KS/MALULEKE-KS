// PATCH/DELETE /api/v1/admin/profile/links/{id} — edit or remove a link (#74).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ProfileLinkUpdateInputSchema } from "@/lib/schemas";
import { checkViolationMessage, toProfileLink } from "@/lib/rules/profile";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;
  const parsed = ProfileLinkUpdateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid link update", 400, { issues: parsed.error.issues });
  }

  const before = await db.profileLink.findUnique({ where: { id } });
  if (!before) return errorResponse("NOT_FOUND", "Link not found", 404);

  try {
    const link = await db.profileLink.update({ where: { id }, data: parsed.data });
    await logActivity({
      adminUserId,
      action: "profile.link_update",
      entityType: "ProfileLink",
      entityId: id,
      before: toProfileLink(before),
      after: toProfileLink(link),
      request,
    });
    return NextResponse.json(toProfileLink(link));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return errorResponse("VALIDATION_ERROR", "Another link already has that kind.", 400);
    }
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;
  const before = await db.profileLink.findUnique({ where: { id } });
  if (!before) return errorResponse("NOT_FOUND", "Link not found", 404);

  await db.profileLink.delete({ where: { id } });
  await logActivity({
    adminUserId,
    action: "profile.link_delete",
    entityType: "ProfileLink",
    entityId: id,
    before: toProfileLink(before),
    request,
  });
  return new NextResponse(null, { status: 204 });
}
