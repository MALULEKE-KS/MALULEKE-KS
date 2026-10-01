// PATCH /api/v1/admin/inquiry-subtypes/{id} — rename, reorder, retire or
// restore a subtype (BR-8.2: retired, never deleted — past inquiries keep it).
// The "other" escape can't be retired: every category always has one (LT-1).

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";

const Update = z
  .object({ label: z.string().trim().min(1).max(80).optional(), sortOrder: z.number().int().min(0).max(999).optional(), active: z.boolean().optional() })
  .strict()
  .refine((u) => Object.keys(u).length > 0, "Nothing to change");

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = Update.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid change", details: { issues: parsed.error.issues } } }, { status: 400 });
  const current = await db.inquirySubtype.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Subtype not found", details: null } }, { status: 404 });
  if (current.key === "other" && parsed.data.active === false) {
    return NextResponse.json({ error: { code: "CONFLICT", message: "Every category keeps its \"Other\" option.", details: null } }, { status: 409 });
  }
  const updated = await write((tx) => tx.inquirySubtype.update({ where: { id }, data: parsed.data }));
  return NextResponse.json({ id: updated.id, key: updated.key, label: updated.label, sortOrder: updated.sortOrder, active: updated.active });
});
