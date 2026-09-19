// PATCH /api/v1/admin/systems/{id} — publishing transitions. Transactional
// clientVisibility/clientApproved re-check at commit time (BR-1.10), 409
// CLIENT_APPROVAL_REQUIRED. Repo relationship and the owner's permission
// (#69): the database refuses to publish a collaborated system without a
// GRANTED answer (BR-1.11), answered here as 409 OWNER_PERMISSION_REQUIRED.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SystemUpdateInputSchema } from "@/lib/schemas";
import { canPublish, systemWithAdminRelations, toAdminSystem } from "@/lib/rules/publishing";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";
import { ruleViolation } from "@/lib/db-errors";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

const CONTENT_STATUS_MAP = { draft: "DRAFT", published: "PUBLISHED", archived: "ARCHIVED" } as const;
const OWNER_PERMISSION_MAP = {
  not_requested: "NOT_REQUESTED",
  requested: "REQUESTED",
  granted: "GRANTED",
  declined: "DECLINED",
} as const;

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

      // A relationship is named by its key; an unknown or deprecated key is a 400.
      let repoRelationshipId: string | null | undefined;
      if (parsed.data.repoRelationship !== undefined) {
        if (parsed.data.repoRelationship === null) {
          repoRelationshipId = null;
        } else {
          const relationship = await tx.repoRelationship.findUnique({
            where: { key: parsed.data.repoRelationship },
          });
          if (!relationship || !relationship.active) throw new Error("UNKNOWN_REPO_RELATIONSHIP");
          repoRelationshipId = relationship.id;
        }
      }

      const updated = await tx.system.update({
        where: { id },
        data: {
          ...(parsed.data.contentStatus !== undefined && {
            contentStatus: CONTENT_STATUS_MAP[parsed.data.contentStatus],
          }),
          ...(parsed.data.clientApproved !== undefined && { clientApproved: parsed.data.clientApproved }),
          ...(parsed.data.nameDisclosureApproved !== undefined && {
            nameDisclosureApproved: parsed.data.nameDisclosureApproved,
          }),
          // #69 — the database normalises ownerPermission against the
          // relationship, stamps ownerPermissionAt, and enforces BR-1.11.
          ...(repoRelationshipId !== undefined && { repoRelationshipId }),
          ...(parsed.data.ownerPermission !== undefined && {
            ownerPermission: OWNER_PERMISSION_MAP[parsed.data.ownerPermission],
          }),
          ...(parsed.data.ownerPermissionFrom !== undefined && { ownerPermissionFrom: parsed.data.ownerPermissionFrom }),
          ...(parsed.data.ownerPermissionNote !== undefined && { ownerPermissionNote: parsed.data.ownerPermissionNote }),
          ...(parsed.data.isFlagship !== undefined && { isFlagship: parsed.data.isFlagship }),
          ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
          // Homepage curation (#52) — the admin hand-picks and orders these.
          ...(parsed.data.featuredOnHome !== undefined && { featuredOnHome: parsed.data.featuredOnHome }),
          ...(parsed.data.homeOrder !== undefined && { homeOrder: parsed.data.homeOrder }),
          // CV inclusion and order (#74) — the CV lists published systems only.
          ...(parsed.data.onCv !== undefined && { onCv: parsed.data.onCv }),
          ...(parsed.data.cvOrder !== undefined && { cvOrder: parsed.data.cvOrder }),
          ...(parsed.data.caseStudyBody !== undefined && { caseStudyBody: parsed.data.caseStudyBody }),
          ...(parsed.data.repoUrl !== undefined && { repoUrl: parsed.data.repoUrl }),
          ...(parsed.data.liveUrl !== undefined && { liveUrl: parsed.data.liveUrl }),
          ...(parsed.data.screenshotUrl !== undefined && { screenshotUrl: parsed.data.screenshotUrl }),
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
      before: {
        contentStatus: before.contentStatus,
        clientApproved: before.clientApproved,
        repoRelationshipId: before.repoRelationshipId,
        ownerPermission: before.ownerPermission,
      },
      after: {
        contentStatus: updated.contentStatus,
        clientApproved: updated.clientApproved,
        repoRelationshipId: updated.repoRelationshipId,
        ownerPermission: updated.ownerPermission,
      },
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
    if (err instanceof Error && err.message === "UNKNOWN_REPO_RELATIONSHIP") {
      return errorResponse("VALIDATION_ERROR", "Unknown or deprecated repo relationship", 400);
    }
    const ownerRule = ruleViolation(err, "BR-1.11");
    if (ownerRule) {
      // Two refusals share the rule: an answer on a system that needs none
      // is a bad request; publishing without a granted answer is a conflict.
      return /does not require/.test(ownerRule)
        ? errorResponse("VALIDATION_ERROR", ownerRule, 400)
        : errorResponse("OWNER_PERMISSION_REQUIRED", ownerRule, 409);
    }
    if (err instanceof Error && /System_br_1_11_answer_has_source/.test(err.message)) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Record who gave the answer (ownerPermissionFrom) when permission is granted or declined.",
        400,
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "System not found", 404);
    }
    throw err;
  }
}
