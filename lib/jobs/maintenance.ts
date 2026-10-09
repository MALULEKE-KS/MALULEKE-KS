// lib/jobs/maintenance.ts
// The daily maintenance job (#96, F4.3): BR-5.2 retention — inquiries and
// events past data.retentionMonths lose their personal data, keeping the
// aggregate facts — and pruning of rows that have served their purpose:
// expired rate-limit windows (hashed IPs, BR-2.4) and finished sign-in
// challenges (BR-3.5), and the AI guide's speed numbers past
// concierge.metricsRetentionDays (docs/AI-GUIDE-PHASE2-PLAN.md). The work is
// done by database functions (apply_retention, prune_expired,
// prune_guide_logs); this passes them the admin's settings.

import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export interface MaintenanceSummary {
  [key: string]: number;
  retentionMonths: number;
  inquiriesAnonymized: number;
  eventsAnonymized: number;
  rateLimitRows: number;
  loginChallenges: number;
  guideTurns: number;
}

export async function runDailyMaintenance(): Promise<MaintenanceSummary> {
  const [retentionMonths, challengeDays, guideMetricsDays] = await Promise.all([
    getSetting("data.retentionMonths"),
    getSetting("maintenance.challengeRetentionDays"),
    getSetting("concierge.metricsRetentionDays"),
  ]);
  const [retention] = await db.$queryRaw<{ inquiriesAnonymized: number; eventsAnonymized: number }[]>`
    SELECT * FROM apply_retention(${retentionMonths}::int)`;
  const [pruned] = await db.$queryRaw<{ rateLimitRows: number; loginChallenges: number }[]>`
    SELECT * FROM prune_expired(${challengeDays}::int)`;
  const [guide] = await db.$queryRaw<{ n: number }[]>`SELECT prune_guide_logs(${guideMetricsDays}::int) AS n`;
  return { retentionMonths, ...retention!, ...pruned!, guideTurns: guide!.n };
}
