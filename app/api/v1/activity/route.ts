// GET /api/v1/activity — commits per week for each published system over the
// last 26 weeks, counts only (F5c). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { dbPublic } from "@/lib/db";

export async function GET() {
  const rows = await dbPublic.publicSystemActivity.findMany({ orderBy: [{ slug: "asc" }, { weekStart: "asc" }] });
  const bySlug = new Map<string, { weekStart: string; commits: number }[]>();
  for (const r of rows) bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), { weekStart: r.weekStart.toISOString().slice(0, 10), commits: r.commits }]);
  return NextResponse.json({ data: [...bySlug.entries()].map(([slug, weeks]) => ({ slug, weeks })) });
}
