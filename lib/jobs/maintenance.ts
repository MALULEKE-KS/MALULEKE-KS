// lib/jobs/maintenance.ts
// The daily maintenance job (#96, F4.3): BR-5.2 retention — inquiries and
// events past data.retentionMonths lose their personal data, keeping the
// aggregate facts — and pruning of rows that have served their purpose:
// expired rate-limit windows (hashed IPs, BR-2.4) and finished sign-in
// challenges (BR-3.5). The work is done by database functions
// (apply_retention, prune_expired); this passes them the admin's settings.

import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export interface MaintenanceSummary {
  [key: string]: number;
  retentionMonths: number;
  inquiriesAnonymized: number;
  eventsAnonymized: number;
  rateLimitRows: number;
  loginChallenges: number;
}

export async function runDailyMaintenance(): Promise<MaintenanceSummary> {
  const [retentionMonths, challengeDays] = await Promise.all([
    getSetting("data.retentionMonths"),
    getSetting("maintenance.challengeRetentionDays"),
  ]);
  const [retention] = await db.$queryRaw<{ inquiriesAnonymized: number; eventsAnonymized: number }[]>`
    SELECT * FROM apply_retention(${retentionMonths}::int)`;
  const [pruned] = await db.$queryRaw<{ rateLimitRows: number; loginChallenges: number }[]>`
    SELECT * FROM prune_expired(${challengeDays}::int)`;
  return { retentionMonths, ...retention!, ...pruned! };
}
