// GET /api/v1/admin/inquiries — triage inbox, filterable by status/type, and
// ?overdue=true for NEW inquiries past the review deadline (BR-2.2, #82).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import type { InquiryStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/auth/with-admin";
import { toAdminInquiry } from "@/lib/rules/inquiries";
import { getSetting } from "@/lib/settings";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

const STATUS_QUERY_MAP: Record<string, InquiryStatus> = {
  new: "NEW",
  reviewed: "REVIEWED",
  responded: "RESPONDED",
  closed: "CLOSED",
};

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const inquiryTypeParam = searchParams.get("inquiryType");

  const status = statusParam ? STATUS_QUERY_MAP[statusParam] : undefined;
  if (statusParam && !status) {
    return errorResponse("VALIDATION_ERROR", `Unknown status "${statusParam}"`, 400);
  }

  const slaHours = await getSetting("inquiry.reviewSlaHours");
  const overdueOnly = searchParams.get("overdue") === "true";
  const dueBefore = new Date(Date.now() - slaHours * 60 * 60 * 1000);

  const inquiries = await db.inquiry.findMany({
    where: {
      ...(status && { status }),
      ...(overdueOnly && { status: "NEW", createdAt: { lt: dueBefore } }),
      ...(inquiryTypeParam && { inquiryType: { key: inquiryTypeParam } }),
    },
    include: { inquiryType: true },
    // NEW first (BR-2.2's 48h triage SLA), then oldest-first within a
    // status so the inquiry closest to breaching the SLA surfaces first.
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ data: inquiries.map((i) => toAdminInquiry(i, slaHours)) });
});
