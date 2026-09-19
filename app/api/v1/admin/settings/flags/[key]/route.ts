// PATCH /api/v1/admin/settings/flags/{key} — one at a time, no bulk-enable (BR-4.4).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { FlagUpdateInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ key: string }>(async (request, { write }, { params }) => {
  const { key } = await params;
  const body = await request.json().catch(() => null);
  const parsed = FlagUpdateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid flag update", 400, { issues: parsed.error.issues });
  }

  try {
    const flag = await write((tx) => tx.flag.update({ where: { key }, data: { enabled: parsed.data.enabled } }));

    return NextResponse.json(flag);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Flag not found", 404);
    }
    throw err;
  }
});
