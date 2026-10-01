// PATCH/DELETE /api/v1/admin/profile/titles/{id} — replace or remove one of
// the owner's titles (F5c, D13). To retire a title while keeping it on
// record, give it an end date instead of deleting it. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ProfileTitleInputSchema } from "@/lib/schemas";
import { titleData, titleWithKind, toAdminTitle } from "@/lib/rules/titles";
import { checkViolationMessage } from "@/lib/rules/profile";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = ProfileTitleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid title", 400, { issues: parsed.error.issues });
  }
  if (!(await db.profileTitle.findUnique({ where: { id } }))) return errorResponse("NOT_FOUND", "Title not found", 404);
  try {
    const title = await write(async (tx) => {
      const data = await titleData(tx, parsed.data);
      return data ? tx.profileTitle.update({ where: { id }, data, ...titleWithKind }) : null;
    });
    if (!title) return errorResponse("VALIDATION_ERROR", `Unknown or deprecated title kind "${parsed.data.kind}"`, 400);
    return NextResponse.json(toAdminTitle(title));
  } catch (err) {
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
});

export const DELETE = withAdmin<{ id: string }>(async (_request, { write }, { params }) => {
  const { id } = await params;
  if (!(await db.profileTitle.findUnique({ where: { id } }))) return errorResponse("NOT_FOUND", "Title not found", 404);
  await write((tx) => tx.profileTitle.delete({ where: { id } }));
  return new NextResponse(null, { status: 204 });
});
