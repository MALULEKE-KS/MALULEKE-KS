// app/(admin)/admin/(panel)/page.tsx
// /admin — overview (#104). Action items first, each linking to where it's
// dealt with; then the pipeline, CV readiness and job health; then recent
// inquiries and activity. Built from the same overview the API serves
// (GET /admin/overview), so the screen and the API can't disagree.
// See docs/PAGE-SPECIFICATIONS.md ("/admin — Dashboard").

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, LayoutDashboard } from "lucide-react";
import { AdminPageHeader, formatWhen, Panel, Pill, Stat } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { getAdminOverview } from "@/lib/queries/admin-overview";
import { requireAdminId } from "@/lib/auth/current-admin";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const adminUserId = await requireAdminId();
  const [overview, curation, recentInquiries, recentActivity] = await Promise.all([
    getAdminOverview(siteUrl(), adminUserId),
    db.system.findMany({ where: { needsCuration: true }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, name: true } }),
    db.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { inquiryType: true } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const a = overview.attention;

  const attention = [
    { count: a.overdueInquiries, label: "Inquiries past the review window", href: "/admin/inquiries?overdue=1" },
    { count: a.systemsNeedingCuration, label: "Systems waiting for curation", href: "/admin/systems?curation=1" },
    { count: a.awaitingRepoOwnerPermission, label: "Systems waiting on a repo owner's permission", href: "/admin/systems" },
    { count: a.journeyDraftsToApprove, label: "Journey drafts to approve", href: "/admin/timeline" },
    { count: a.metricProposalsToDecide, label: "Number proposals to decide", href: "/admin/numbers" },
    { count: a.cvIssues, label: "Gaps in the CV", href: "/admin/cv" },
    { count: a.staleContent, label: "Pages nobody has reviewed lately", href: "/admin/freshness" },
    { count: a.recoveryCodesLow ? 1 : 0, label: `Recovery codes running low (${overview.security.recoveryCodesRemaining} left)`, href: "/admin/account" },
  ].filter((item) => item.count > 0);

  const failedJobs = overview.jobs.filter((j) => j.status === "failed");

  return (
    <>
      <AdminPageHeader icon={LayoutDashboard} title="Overview" description="What needs you first, then how everything is doing." />

      <Panel
        title={attention.length > 0 ? "Needs your attention" : "Nothing needs your attention"}
        className="mb-6"
      >
        {attention.length === 0 ? (
          <p className="inline-flex items-center gap-2 text-sm text-signal-finished">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            All clear — inquiries reviewed, queues empty, content fresh.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {attention.map((item) => (
              <li key={item.label} className="py-3 first:pt-0 last:pb-0">
                <Link href={item.href} className="group flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-3 text-sm text-ink">
                    <AlertTriangle aria-hidden="true" className="size-4 text-accent" />
                    {item.label}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Pill tone="attention">{item.count}</Pill>
                    <ArrowRight aria-hidden="true" className="size-4 text-slate transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Shipped" value={overview.systems.pipeline.shipped} href="/admin/systems" />
        <Stat label="In progress" value={overview.systems.pipeline.building} href="/admin/systems" />
        <Stat label="Queued" value={overview.systems.pipeline.queued} href="/admin/systems" />
        <Stat label="CV readiness" value={`${overview.cv.score}%`} href="/admin/cv" tone={overview.cv.ready ? "good" : "attention"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent inquiries" actions={<Link href="/admin/inquiries" className="text-xs font-medium text-accent">All inquiries</Link>}>
          {recentInquiries.length === 0 ? (
            <p className="text-sm text-slate">No inquiries yet.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {recentInquiries.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{i.anonymizedAt ? "Anonymised" : i.name}</span>
                    <span className="block text-xs text-slate">
                      {i.inquiryType.label} · {formatWhen(i.createdAt)}
                    </span>
                  </span>
                  <Pill tone={i.status === "NEW" ? "attention" : "neutral"}>{i.status.toLowerCase()}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Jobs" description="The daily run and anything started by hand" actions={<Link href="/admin/jobs" className="text-xs font-medium text-accent">All runs</Link>}>
          {overview.jobs.length === 0 ? (
            <p className="text-sm text-slate">No job has run yet.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {overview.jobs.map((j) => (
                <li key={j.job} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="font-mono text-sm text-ink">{j.job}</span>
                  <span className="inline-flex items-center gap-2 text-xs text-slate">
                    {formatWhen(j.startedAt)}
                    <Pill tone={j.status === "failed" ? "critical" : j.status === "succeeded" ? "good" : "neutral"}>{j.status}</Pill>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {failedJobs.length > 0 && <p className="mt-3 text-xs text-critical">{failedJobs.length} job(s) failed last time — open Jobs for the reason.</p>}
        </Panel>

        {curation.length > 0 && (
          <Panel title="Curation queue" description="Synced from GitHub; opening and saving clears the flag (BR-1.8)">
            <ul className="divide-y divide-ink/10">
              {curation.map((s) => (
                <li key={s.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link href={`/admin/systems/${s.id}`} className="flex items-center justify-between text-sm text-ink hover:text-accent">
                    {s.name}
                    <ArrowRight aria-hidden="true" className="size-4 text-slate" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title="Recent activity" description={`${overview.audit.changesLast7Days} changes in the last 7 days`} actions={<Link href="/admin/activity-log" className="text-xs font-medium text-accent">Full log</Link>}>
          <ul className="divide-y divide-ink/10">
            {recentActivity.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="truncate font-mono text-xs text-ink">{e.action}</span>
                <span className="shrink-0 text-xs text-slate">
                  {e.actorType.toLowerCase()} · {formatWhen(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
