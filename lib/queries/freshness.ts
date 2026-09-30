// lib/queries/freshness.ts
// Freshness nudges (#89, BR-1.16). The database stamps when content was last
// really edited, and stale_content() lists live content untouched for the
// admin's threshold (content.freshnessDays). "Mark reviewed" stamps it by
// hand: the owner looked and it's still accurate.

import type { Tx } from "@/lib/audit";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export const FRESHNESS_KINDS = ["system", "experience", "education", "profile"] as const;
export type FreshnessKind = (typeof FRESHNESS_KINDS)[number];

export interface StaleItem {
  kind: FreshnessKind;
  id: string;
  title: string;
  reviewedAt: Date;
  daysSince: number;
}

export async function getStaleContent() {
  const thresholdDays = await getSetting("content.freshnessDays");
  const items = await db.$queryRaw<StaleItem[]>`SELECT * FROM stale_content(${thresholdDays}::int)`;
  return {
    thresholdDays,
    items: items.map((i) => ({ ...i, reviewedAt: i.reviewedAt.toISOString() })),
  };
}

/** Stamp an item as reviewed now. False if it doesn't exist. */
export async function markReviewed(tx: Tx, kind: FreshnessKind, id: string): Promise<boolean> {
  const data = { contentReviewedAt: new Date() };
  const where = { id };
  switch (kind) {
    case "system":
      return (await tx.system.updateMany({ where, data })).count === 1;
    case "experience":
      return (await tx.experience.updateMany({ where, data })).count === 1;
    case "education":
      return (await tx.education.updateMany({ where, data })).count === 1;
    case "profile": {
      const profileId = Number(id);
      if (!Number.isInteger(profileId)) return false;
      return (await tx.profile.updateMany({ where: { id: profileId }, data })).count === 1;
    }
  }
}
