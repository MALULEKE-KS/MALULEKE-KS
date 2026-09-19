// POST /api/v1/inquiries — the single visitor write path (BR-2.1–BR-2.7).
// Used identically by the human contact form and (once built) the agent's
// submit_inquiry tool (BR-4.2) — no privileged bypass on validation or rate
// limiting for either caller. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { InquiryCreateInputSchema } from "@/lib/schemas";
import { isHoneypotFilled, sourceFromReferer } from "@/lib/rules/inquiries";
import { hitRateLimit } from "@/lib/auth/rate-limit";
import { getSetting } from "@/lib/settings";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400);
  }

  // BR-2.7 — honeypot check happens before anything else, including
  // validation. A bot that filled it gets the identical 201 shape as a
  // real success, no distinguishable signal, and nothing is created.
  if (isHoneypotFilled((body as Record<string, unknown>).website)) {
    return NextResponse.json(
      { id: "ok", status: "new", submittedAt: new Date().toISOString() },
      { status: 201 }
    );
  }

  const parsed = InquiryCreateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid inquiry submission", 400, {
      issues: parsed.error.issues,
    });
  }

  // BR-2.4 — identical rate limit for the human form and the future agent
  // tool; keyed by IP regardless of caller.
  // Limits are admin-tunable platform settings (#67), bounded by the registry.
  const [maxPerWindow, windowHours] = await Promise.all([
    getSetting("inquiry.rateLimit.maxPerWindow"),
    getSetting("inquiry.rateLimit.windowHours"),
  ]);
  const rateLimit = await hitRateLimit("inquiry", request, maxPerWindow, windowHours * 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many requests from this connection — try again later.",
      429,
      { retryAfterMs: rateLimit.retryAfterMs }
    );
  }

  const inquiryType = await db.inquiryType.findUnique({ where: { key: parsed.data.inquiryType } });
  if (!inquiryType) {
    return errorResponse("VALIDATION_ERROR", `Unknown inquiry type "${parsed.data.inquiryType}"`, 400);
  }

  const source = sourceFromReferer(request.headers.get("referer"));

  try {
    const inquiry = await db.inquiry.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
        inquiryTypeId: inquiryType.id,
        source,
        idempotencyKey: parsed.data.idempotencyKey,
      },
    });

    return NextResponse.json(
      { id: inquiry.id, status: "new", submittedAt: inquiry.createdAt.toISOString() },
      { status: 201 }
    );
  } catch (err) {
    // BR-2.6 — a resubmission with a previously-used idempotencyKey returns
    // the original confirmation instead of creating a duplicate.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      parsed.data.idempotencyKey
    ) {
      const existing = await db.inquiry.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
      });
      if (existing) {
        return NextResponse.json(
          { id: existing.id, status: "new", submittedAt: existing.createdAt.toISOString() },
          { status: 201 }
        );
      }
    }
    throw err;
  }
}
