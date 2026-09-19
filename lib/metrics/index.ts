// lib/metrics/index.ts
// Curated numbers (approved feature 6, BR-5.3). The platform proposes values;
// only a value the admin approves is ever public (the PublicMetric view).
// The database owns the rules: a proposed value is fixed, transitions only
// move forward, one approved and one pending value per metric, history is
// never deleted, and approving swaps the public value atomically
// (propose_metric_snapshot / approve_metric_snapshot, migration 20260919070000).

import type { MetricSource, Prisma } from "@prisma/client";
import { db, dbPublic } from "@/lib/db";
import { METRIC_COMPUTATIONS, isComputedMetric } from "@/lib/metrics/registry";

/** Propose one value. Returns the pending snapshot id, or null when it already is the approved value. */
export async function proposeMetric(key: string, value: number, source: MetricSource): Promise<string | null> {
  const [row] = await db.$queryRaw<{ id: string | null }[]>`
    SELECT propose_metric_snapshot(${key}, ${value}::double precision, ${source}::"MetricSource") AS id`;
  return row?.id ?? null;
}

/**
 * Compute every active metric that has a registered computation and propose
 * the result. Unchanged values propose nothing. Designed to run as a job
 * (lib/jobs/run-job.ts) on the scheduler in F4.
 */
export async function proposeComputedMetrics(): Promise<{ proposed: string[]; unchanged: string[] }> {
  const metrics = await db.metric.findMany({ where: { active: true }, select: { key: true } });
  const proposed: string[] = [];
  const unchanged: string[] = [];
  for (const { key } of metrics) {
    if (!isComputedMetric(key)) continue; // a manual metric: the admin enters it
    const value = await METRIC_COMPUTATIONS[key]();
    (await proposeMetric(key, value, "COMPUTED")) ? proposed.push(key) : unchanged.push(key);
  }
  return { proposed, unchanged };
}

// Decisions run inside the admin's audited transaction (lib/audit.ts): the
// database logs each snapshot change, attributed to that admin (F2.1).

/** The admin approves a pending value; it becomes the public one. */
export async function approveMetricSnapshot(tx: Prisma.TransactionClient, snapshotId: string, adminUserId: string): Promise<void> {
  await tx.$executeRaw`SELECT approve_metric_snapshot(${snapshotId}, ${adminUserId})`;
}

/** The admin rejects a pending value; the public one is unchanged. */
export async function rejectMetricSnapshot(tx: Prisma.TransactionClient, snapshotId: string, adminUserId: string): Promise<void> {
  await tx.metricSnapshot.update({
    where: { id: snapshotId },
    data: { status: "REJECTED", decidedById: adminUserId },
  });
}

/** The public, approved numbers, in the admin's order. */
export async function getPublicMetrics() {
  return dbPublic.publicMetric.findMany({ orderBy: { sortOrder: "asc" } });
}
