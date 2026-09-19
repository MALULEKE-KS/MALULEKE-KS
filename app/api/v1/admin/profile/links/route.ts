// POST /api/v1/admin/profile/links — add a social or contact link (#74).
// Links are rows, not columns (EXT-1); onCv decides whether the CV carries it.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ProfileLinkInputSchema } from "@/lib/schemas";
import { checkViolationMessage, toProfileLink } from "@/lib/rules/profile";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function POST(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const parsed = ProfileLinkInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid link", 400, { issues: parsed.error.issues });
  }

  try {
    const link = await db.profileLink.create({ data: { ...parsed.data, profileId: 1 } });
    await logActivity({
      adminUserId,
      action: "profile.link_create",
      entityType: "ProfileLink",
      entityId: link.id,
      after: toProfileLink(link),
      request,
    });
    return NextResponse.json(toProfileLink(link), { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return errorResponse("VALIDATION_ERROR", `A "${parsed.data.kind}" link already exists — edit it instead.`, 400);
    }
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
}
