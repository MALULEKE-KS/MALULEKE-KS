// GET/POST /api/v1/admin/inquiry-subtypes — the kinds within each Let's Talk
// category (LETS-TALK-SPEC LT-1; EXT-1: a new kind is a row). Every category
// keeps its "other" escape; subtypes are retired, never deleted (BR-8.2).

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";

const Create = z
  .object({
    inquiryType: z.string().trim().min(1).max(60),
    key: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60),
    label: z.string().trim().min(1).max(80),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })
  .strict();

const view = (s: { id: string; key: string; label: string; sortOrder: number; active: boolean; inquiryType: { key: string } }) => ({
  id: s.id,
  inquiryType: s.inquiryType.key,
  key: s.key,
  label: s.label,
  sortOrder: s.sortOrder,
  active: s.active,
});

export const GET = withAdmin(async () => {
  const rows = await db.inquirySubtype.findMany({ include: { inquiryType: { select: { key: true } } }, orderBy: [{ inquiryType: { sortOrder: "asc" } }, { sortOrder: "asc" }] });
  return NextResponse.json(rows.map(view));
});

export const POST = withAdmin(async (request, { write }) => {
  const parsed = Create.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid subtype", details: { issues: parsed.error.issues } } }, { status: 400 });
  const type = await db.inquiryType.findUnique({ where: { key: parsed.data.inquiryType } });
  if (!type) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Unknown category", details: null } }, { status: 404 });
  try {
    const created = await write((tx) =>
      tx.inquirySubtype.create({ data: { inquiryTypeId: type.id, key: parsed.data.key, label: parsed.data.label, sortOrder: parsed.data.sortOrder ?? 50 }, include: { inquiryType: { select: { key: true } } } }),
    );
    return NextResponse.json(view(created), { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: { code: "LOOKUP_KEY_EXISTS", message: `"${parsed.data.key}" already exists in this category.`, details: null } }, { status: 409 });
    }
    throw err;
  }
});
