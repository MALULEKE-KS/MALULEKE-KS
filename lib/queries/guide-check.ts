// lib/queries/guide-check.ts
// The AI guide's latest nightly self-check, for the public site
// (docs/AI-GUIDE-PHASE2-PLAN.md §7). Read through the public role from the
// PublicGuideCheck view: when it ran, how many fixed questions it asked, and how
// each came out — never an answer or anything a visitor wrote.

import { cache } from "react";
import { dbPublic } from "@/lib/db";

export interface GuideCheck {
  ranAt: string;
  total: number;
  passed: number;
  failed: number;
  /** Fixed questions the guide could not answer at all that night (busy, resting) — not counted against it. */
  unavailable: number;
  checks: { id: string; category: string; pass: boolean | null }[];
}

export const getGuideCheck = cache(async (): Promise<GuideCheck | null> => {
  const row = await dbPublic.publicGuideCheck.findFirst();
  if (!row) return null;
  return {
    ranAt: row.ranAt.toISOString(),
    total: row.total,
    passed: row.passed,
    failed: row.failed,
    unavailable: row.unavailable,
    checks: Array.isArray(row.checks) ? (row.checks as GuideCheck["checks"]) : [],
  };
});
