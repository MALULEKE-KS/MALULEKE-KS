// PATCH /api/v1/admin/systems/{id} — publishing transitions. Transactional
// clientVisibility/clientApproved re-check at commit time (BR-1.10), 409
// CLIENT_APPROVAL_REQUIRED. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SystemUpdateInputSchema } from "@/lib/schemas";
import { canPublish, systemWithAdminRelations, toAdminSystem } from "@/lib/rules/publishing";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

const CONTENT_STATUS_MAP = { draft: "DRAFT", published: "PUBLISHED", archived: "ARCHIVED" } as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = SystemUpdateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid update", 400, { issues: parsed.error.issues });
  }

  try {
    const { updated, before } = await db.$transaction(async (tx) => {
      // BR-1.10 — read current state INSIDE the transaction, never a value
      // cached from earlier in the request, so two concurrent PATCHes can't
      // race past this check.
      const current = await tx.system.findUnique({ where: { id } });
      if (!current) {
        throw new Error("NOT_FOUND");
      }

      const nextClientApproved = parsed.data.clientApproved ?? current.clientApproved;
      const requestingPublish =
        parsed.data.contentStatus !== undefined &&
        CONTENT_STATUS_MAP[parsed.data.contentStatus] === "PUBLISHED";

      // Evaluated against the RESULTING state (this same request may also
      // be setting clientApproved=true), not the pre-update row — a single
      // PATCH that both approves and publishes in one shot is valid.
      if (
        requestingPublish &&
        !canPublish({ clientVisibility: current.clientVisibility, clientApproved: nextClientApproved })
      ) {
        throw new Error("CLIENT_APPROVAL_REQUIRED");
      }

      const updated = await tx.system.update({
        where: { id },
        data: {
          ...(parsed.data.contentStatus !== undefined && {
            contentStatus: CONTENT_STATUS_MAP[parsed.data.contentStatus],
          }),
          ...(parsed.data.clientApproved !== undefined && { clientApproved: parsed.data.clientApproved }),
          ...(parsed.data.isFlagship !== undefined && { isFlagship: parsed.data.isFlagship }),
          ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
          ...(parsed.data.caseStudyBody !== undefined && { caseStudyBody: parsed.data.caseStudyBody }),
          // BR-1.8 — cleared on every successful save, whether or not this
          // save published anything.
          needsCuration: false,
        },
        ...systemWithAdminRelations,
      });

      return { updated, before: current };
    });

    await logActivity({
      adminUserId,
      action: "system.update",
      entityType: "System",
      entityId: id,
      before: { contentStatus: before.contentStatus, clientApproved: before.clientApproved },
      after: { contentStatus: updated.contentStatus, clientApproved: updated.clientApproved },
    });

    return NextResponse.json(toAdminSystem(updated));
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return errorResponse("NOT_FOUND", "System not found", 404);
    }
    if (err instanceof Error && err.message === "CLIENT_APPROVAL_REQUIRED") {
      return errorResponse(
        "CLIENT_APPROVAL_REQUIRED",
        "Publishing requires client approval — confirm and toggle Client Approved first.",
        409
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "System not found", 404);
    }
    throw err;
  }
}
