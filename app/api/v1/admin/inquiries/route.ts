// GET /api/v1/admin/inquiries — triage inbox, filterable by status/type.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import type { InquiryStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionAdminId } from "@/lib/auth/session";
import { toAdminInquiry } from "@/lib/rules/inquiries";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

const STATUS_QUERY_MAP: Record<string, InquiryStatus> = {
  new: "NEW",
  reviewed: "REVIEWED",
  responded: "RESPONDED",
  closed: "CLOSED",
};

export async function GET(request: Request) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const inquiryTypeParam = searchParams.get("inquiryType");

  const status = statusParam ? STATUS_QUERY_MAP[statusParam] : undefined;
  if (statusParam && !status) {
    return errorResponse("VALIDATION_ERROR", `Unknown status "${statusParam}"`, 400);
  }

  const inquiries = await db.inquiry.findMany({
    where: {
      ...(status && { status }),
      ...(inquiryTypeParam && { inquiryType: { key: inquiryTypeParam } }),
    },
    include: { inquiryType: true },
    // NEW first (BR-2.2's 48h triage SLA), then oldest-first within a
    // status so the inquiry closest to breaching the SLA surfaces first.
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ data: inquiries.map(toAdminInquiry) });
}
