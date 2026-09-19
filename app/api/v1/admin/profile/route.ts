// GET/PATCH /api/v1/admin/profile — the owner's details as data (#74): name,
// headline, role, contact, summary, bio. The CV header and the site read
// them; every change is audited. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ProfileUpdateInputSchema } from "@/lib/schemas";
import { checkViolationMessage, profileWithLinks, toProfile } from "@/lib/rules/profile";
import { withAdmin } from "@/lib/auth/with-admin";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async (request, _admin) => {
  const profile = await db.profile.findUnique({ where: { id: 1 }, ...profileWithLinks });
  if (!profile) return errorResponse("NOT_FOUND", "Profile not found", 404);
  return NextResponse.json(toProfile(profile));
});

export const PATCH = withAdmin(async (request, { write }) => {
  const parsed = ProfileUpdateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid profile update", 400, { issues: parsed.error.issues });
  }

  const before = await db.profile.findUnique({ where: { id: 1 } });
  if (!before) return errorResponse("NOT_FOUND", "Profile not found", 404);

  try {
    const profile = await write((tx) => tx.profile.update({ where: { id: 1 }, data: parsed.data, ...profileWithLinks }));
    const changed = Object.keys(parsed.data) as (keyof typeof parsed.data)[];
    return NextResponse.json(toProfile(profile));
  } catch (err) {
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
});
