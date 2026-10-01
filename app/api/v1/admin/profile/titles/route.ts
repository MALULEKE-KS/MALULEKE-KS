// GET/POST /api/v1/admin/profile/titles — the owner's titles and
// qualifications, current and past (F5c, D13): "Software & AI Engineer",
// "Final-year BSc … student", and whatever comes next — rows, not code.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ProfileTitleInputSchema } from "@/lib/schemas";
import { titleData, titleWithKind, toAdminTitle } from "@/lib/rules/titles";
import { checkViolationMessage } from "@/lib/rules/profile";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async () => {
  const titles = await db.profileTitle.findMany({ ...titleWithKind, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ data: titles.map((t) => toAdminTitle(t)) });
});

export const POST = withAdmin(async (request, { write }) => {
  const parsed = ProfileTitleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid title", 400, { issues: parsed.error.issues });
  }
  try {
    const title = await write(async (tx) => {
      const data = await titleData(tx, parsed.data);
      return data ? tx.profileTitle.create({ data: { ...data, profileId: 1 }, ...titleWithKind }) : null;
    });
    if (!title) return errorResponse("VALIDATION_ERROR", `Unknown or deprecated title kind "${parsed.data.kind}"`, 400);
    return NextResponse.json(toAdminTitle(title), { status: 201 });
  } catch (err) {
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
});
