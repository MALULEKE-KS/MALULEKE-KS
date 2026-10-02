// GET/PATCH /api/v1/admin/inquiries/{id} — one inquiry in full, and the
// changes to it (LETS-TALK-SPEC LT-6, LT-7): a status change (only the moves
// the database allows; refused from a stale screen via expectedVersion; with
// a private reason and an optional message for the applicant) or a priority.
// 2FA-gated and audited by withAdmin. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { z } from "zod";
import { InquiryStatusUpdateInputSchema } from "@/lib/schemas";
import { STATUS_FROM_API, toAdminInquiry } from "@/lib/rules/inquiries";
import { getSetting } from "@/lib/settings";
import { withAdmin } from "@/lib/auth/with-admin";
import { changeStatus, inquiryDetail, InquiryChangeError } from "@/lib/inquiries/admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

const PriorityUpdate = z.object({ priority: z.enum(["low", "normal", "high", "urgent"]) }).strict();

export const GET = withAdmin<{ id: string }>(async (_request, _admin, { params }) => {
  const { id } = await params;
  const detail = await inquiryDetail(id);
  return detail ? NextResponse.json(detail) : errorResponse("NOT_FOUND", "Inquiry not found", 404);
});

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  // Priority is admin metadata only — it never decides anything (LT-11).
  const priority = PriorityUpdate.safeParse(body);
  if (priority.success) {
    const updated = await write((tx) => tx.inquiry.update({ where: { id }, data: { priority: priority.data.priority.toUpperCase() as "LOW" } })).catch(() => null);
    return updated ? NextResponse.json({ id, priority: priority.data.priority }) : errorResponse("NOT_FOUND", "Inquiry not found", 404);
  }

  const parsed = InquiryStatusUpdateInputSchema.safeParse(body);
  if (!parsed.success) return errorResponse("VALIDATION_ERROR", "Invalid status update", 400, { issues: parsed.error.issues });

  try {
    const updated = await write((tx) =>
      changeStatus(tx, id, STATUS_FROM_API[parsed.data.status], {
        expectedVersion: parsed.data.expectedVersion,
        internalReason: parsed.data.internalReason,
        applicantMessage: parsed.data.applicantMessage,
      }),
    );
    return NextResponse.json({ ...toAdminInquiry(updated, await getSetting("inquiry.reviewSlaHours")), version: updated.version });
  } catch (err) {
    if (err instanceof InquiryChangeError) {
      const status = err.code === "NOT_FOUND" ? 404 : 409;
      return errorResponse(err.code, err.message, status);
    }
    throw err;
  }
});
