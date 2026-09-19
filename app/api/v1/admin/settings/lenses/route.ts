// GET/POST /api/v1/admin/settings/lenses. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { VisitorLensInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async (request, _admin) => {
  const lenses = await db.visitorLens.findMany({ orderBy: { label: "asc" } });
  return NextResponse.json({ data: lenses });
});

export const POST = withAdmin(async (request, { write }) => {
  const body = await request.json().catch(() => null);
  const parsed = VisitorLensInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid visitor lens", 400, { issues: parsed.error.issues });
  }

  const lens = await write((tx) => tx.visitorLens.create({
    data: {
      key: parsed.data.key,
      label: parsed.data.label,
      priorityContent: parsed.data.priorityContent as Prisma.InputJsonValue,
      aiFramingPrompt: parsed.data.aiFramingPrompt,
    },
  }));

  return NextResponse.json(lens, { status: 201 });
});
