// PATCH /api/v1/admin/inquiries/{id} — sequential transitions only (BR-2.1):
// new->reviewed mandatory; reviewed->responded|closed; responded->closed;
// anything else 409 INVALID_STATUS_TRANSITION. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { InquiryStatusUpdateInputSchema } from "@/lib/schemas";
import { STATUS_FROM_API, isValidStatusTransition, toAdminInquiry } from "@/lib/rules/inquiries";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = InquiryStatusUpdateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid status update", 400, { issues: parsed.error.issues });
  }

  const nextStatus = STATUS_FROM_API[parsed.data.status];

  try {
    const { updated, before } = await db.$transaction(async (tx) => {
      // BR-2.1 — read current state INSIDE the transaction, never a value
      // cached from earlier in the request, so two concurrent PATCHes on
      // the same inquiry can't both pass the transition check.
      const current = await tx.inquiry.findUnique({ where: { id } });
      if (!current) throw new Error("NOT_FOUND");

      if (!isValidStatusTransition(current.status, nextStatus)) {
        throw new Error("INVALID_STATUS_TRANSITION");
      }

      const updated = await tx.inquiry.update({
        where: { id },
        data: { status: nextStatus },
        include: { inquiryType: true },
      });

      return { updated, before: current };
    });

    await logActivity({
      adminUserId,
      action: "inquiry.status_update",
      entityType: "Inquiry",
      entityId: id,
      before: { status: before.status },
      after: { status: updated.status },
    });

    return NextResponse.json(toAdminInquiry(updated));
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return errorResponse("NOT_FOUND", "Inquiry not found", 404);
    }
    if (err instanceof Error && err.message === "INVALID_STATUS_TRANSITION") {
      return errorResponse(
        "INVALID_STATUS_TRANSITION",
        `Cannot move to "${parsed.data.status}" from the inquiry's current status — see BR-2.1.`,
        409
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Inquiry not found", 404);
    }
    throw err;
  }
}
