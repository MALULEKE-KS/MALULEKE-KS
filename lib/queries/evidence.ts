// lib/queries/evidence.ts
// Reads the two database views F1.6b adds (#70). Both are computed by
// Postgres from real rows, so the numbers can't drift from the data:
//   SystemPace     — shipped date and time-in-progress, from status history
//                    (approved feature 1). Backfilled history is never read
//                    as a date: a system that shipped before history began
//                    has no shippedAt rather than a made-up one.
//   SkillEvidence  — what proves each skill: published systems (BR-1.1),
//                    career roles and published education (approved feature 4).

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface SystemPace {
  systemId: string;
  buildingSince: Date | null;
  shippedAt: Date | null;
  trackedSince: Date | null;
  /** Whole days from first BUILDING to first SHIPPED; null unless both are real transitions. */
  daysToShip: number | null;
}

export async function getSystemPace(systemIds: string[]): Promise<SystemPace[]> {
  if (systemIds.length === 0) return [];
  const rows = await db.$queryRaw<Omit<SystemPace, "daysToShip">[]>`
    SELECT "systemId", "buildingSince", "shippedAt", "trackedSince"
      FROM "SystemPace"
     WHERE "systemId" IN (${Prisma.join(systemIds)})`;
  return rows.map((row) => ({
    ...row,
    daysToShip:
      row.buildingSince && row.shippedAt && row.shippedAt >= row.buildingSince
        ? Math.floor((row.shippedAt.getTime() - row.buildingSince.getTime()) / 86_400_000)
        : null,
  }));
}

export interface SkillEvidence {
  skillId: string;
  name: string;
  categoryKey: string;
  systemSlugs: string[];
  systemCount: number;
  roleCount: number;
  firstUsed: Date | null;
  lastEnded: Date | null;
  inCurrentRole: boolean;
  /** Published education entries that taught it. */
  studyCount: number;
}

/** Every skill with its evidence, strongest first. */
export async function getSkillEvidence(): Promise<SkillEvidence[]> {
  return db.$queryRaw<SkillEvidence[]>`
    SELECT "skillId", name, "categoryKey", "systemSlugs", "systemCount", "roleCount",
           "firstUsed", "lastEnded", "inCurrentRole", "studyCount"
      FROM "SkillEvidence"
     ORDER BY "systemCount" + "roleCount" + "studyCount" DESC, name ASC`;
}
