// GET/PUT /api/v1/admin/content/{key} — read and replace one page content
// block (#106). The body must match the block's schema (lib/content/blocks.ts);
// every change is written to the audit trail by the database (F2.1).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { CONTENT_BLOCKS, isContentKey } from "@/lib/content/blocks";

function notFound() {
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "No such content block", details: null } }, { status: 404 });
}

export const GET = withAdmin<{ key: string }>(async (_request, _admin, { params }) => {
  const { key } = await params;
  if (!isContentKey(key)) return notFound();
  const row = await db.siteContent.findUnique({ where: { key } });
  const def = CONTENT_BLOCKS[key];
  return NextResponse.json({ key, title: def.title, description: def.description, body: row?.body ?? null, updatedAt: row?.updatedAt.toISOString() ?? null });
});

export const PUT = withAdmin<{ key: string }>(async (request, { write }, { params }) => {
  const { key } = await params;
  if (!isContentKey(key)) return notFound();
  const parsed = CONTENT_BLOCKS[key].schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid content", details: { issues: parsed.error.issues } } },
      { status: 400 },
    );
  }
  const body = parsed.data as Prisma.InputJsonValue;
  const row = await write((tx) => tx.siteContent.upsert({ where: { key }, create: { key, body }, update: { body } }));
  return NextResponse.json({ key, body: row.body, updatedAt: row.updatedAt.toISOString() });
});
