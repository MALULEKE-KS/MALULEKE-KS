// lib/metrics/registry.ts
// How each computable metric is counted (F1.7, BR-5.3). Which metrics exist,
// their labels and their order are data (the Metric table); only the
// counting lives here, and it reads the public views only — a public number
// is always about public content. A Metric row with no entry here is manual.

// Counted through the public role (F1.8): a public number can only ever come from public data.
import { dbPublic as db } from "@/lib/db";

export const METRIC_COMPUTATIONS = {
  "systems.published": () => db.publicSystem.count(),
  "systems.shipped": () => db.publicSystem.count({ where: { stage: "shipped" } }),
  "skills.evidenced": async () => {
    const [row] = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "SkillEvidence"
       WHERE "systemCount" + "roleCount" + "studyCount" > 0`;
    return row?.n ?? 0;
  },
  "journey.milestones": () => db.publicTimeline.count(),
} satisfies Record<string, () => Promise<number>>;

export type ComputedMetricKey = keyof typeof METRIC_COMPUTATIONS;

export function isComputedMetric(key: string): key is ComputedMetricKey {
  return Object.prototype.hasOwnProperty.call(METRIC_COMPUTATIONS, key);
}
