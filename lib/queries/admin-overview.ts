// lib/queries/admin-overview.ts
// The admin dashboard in one call (#82): what needs attention, and the state
// of everything else. Every number is computed from the database now.

import { db } from "@/lib/db";
import { getStaleContent } from "@/lib/queries/freshness";
import { recoveryCodeStatus } from "@/lib/auth/recovery-codes";
import { getSetting } from "@/lib/settings";
import { buildCvModel } from "@/lib/cv/model";
import { checkCv } from "@/lib/cv/check";

export async function getAdminOverview(siteUrl: string, adminUserId: string) {
  const slaHours = await getSetting("inquiry.reviewSlaHours");
  const dueBefore = new Date(Date.now() - slaHours * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    inquiriesByStatus,
    overdue,
    oldestOverdue,
    systemsByContent,
    needsCuration,
    ownerPermissionPending,
    journeyDrafts,
    pendingMetrics,
    lastRuns,
    changesThisWeek,
    ledger,
    cv,
    stale,
    ownAccount,
  ] = await Promise.all([
    db.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    db.inquiry.count({ where: { status: "NEW", createdAt: { lt: dueBefore } } }),
    db.inquiry.findFirst({ where: { status: "NEW", createdAt: { lt: dueBefore } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    db.system.groupBy({ by: ["contentStatus"], _count: { _all: true } }),
    db.system.count({ where: { needsCuration: true } }),
    db.system.count({ where: { ownerPermission: { in: ["NOT_REQUESTED", "REQUESTED"] }, contentStatus: { not: "ARCHIVED" } } }),
    db.timeline.count({ where: { autoDrafted: true, contentStatus: "DRAFT" } }),
    db.metricSnapshot.count({ where: { status: "PROPOSED" } }),
    db.jobRun.findMany({ distinct: ["job"], orderBy: [{ job: "asc" }, { startedAt: "desc" }] }),
    db.activityLog.count({ where: { createdAt: { gte: weekAgo } } }),
    db.publicLedger.findFirst(),
    buildCvModel({ siteUrl }).then(checkCv),
    getStaleContent(),
    db.adminUser.findUniqueOrThrow({ where: { id: adminUserId }, select: { recoveryCodes: true } }),
  ]);
  const recoveryCodes = recoveryCodeStatus(ownAccount.recoveryCodes);


  return {
    attention: {
      overdueInquiries: overdue,
      oldestOverdueSince: oldestOverdue?.createdAt.toISOString() ?? null,
      systemsNeedingCuration: needsCuration,
      awaitingRepoOwnerPermission: ownerPermissionPending,
      journeyDraftsToApprove: journeyDrafts,
      metricProposalsToDecide: pendingMetrics,
      cvIssues: cv.issues.length,
      // #89, BR-1.16 — live content untouched for content.freshnessDays.
      staleContent: stale.items.length,
      // BR-3.12 — a persistent, non-blocking notice to regenerate.
      recoveryCodesLow: recoveryCodes.low,
    },
    security: { recoveryCodesRemaining: recoveryCodes.remaining },
    inquiries: {
      byStatus: Object.fromEntries(inquiriesByStatus.map((r) => [r.status.toLowerCase(), r._count._all])),
      reviewSlaHours: slaHours,
    },
    systems: {
      byContentStatus: Object.fromEntries(systemsByContent.map((r) => [r.contentStatus.toLowerCase(), r._count._all])),
      pipeline: {
        shipped: ledger?.systemsShipped ?? 0,
        building: ledger?.systemsBuilding ?? 0,
        queued: ledger?.systemsQueued ?? 0,
      },
    },
    cv: { score: cv.score, ready: cv.ready },
    jobs: lastRuns.map((r) => ({
      job: r.job,
      status: r.status.toLowerCase(),
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
    })),
    audit: { changesLast7Days: changesThisWeek },
  };
}
