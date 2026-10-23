// app/(admin)/admin/(panel)/page.tsx
// /admin — Today (#104; rebuilt in the admin pass, D-057). Action items first,
// each as a card that says what to do and links to where it's done; then the
// shortcuts the owner reaches for most; then whether everything is healthy (the
// build that is live, the AI guide, the last run of each job); then the
// pipeline and CV readiness; then recent inquiries and activity in plain
// sentences. Built from the same overview the API serves (GET /admin/overview),
// so the screen and the API can't disagree.
// See docs/PAGE-SPECIFICATIONS.md ("/admin — Dashboard").

import Link from "next/link";
import { ArrowRight, BookOpen, Camera, CheckCircle2, FileUp, Inbox, LayoutDashboard, ListChecks, PenLine } from "lucide-react";
import { AdminPageHeader, formatWhen, Panel, Pill, Stat } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { getAdminOverview } from "@/lib/queries/admin-overview";
import { requireAdminId } from "@/lib/auth/current-admin";
import { siteUrl } from "@/lib/site-url";
import { FLAGS, isFlagOn } from "@/lib/flags";
import { describeActivity, describeActor } from "@/lib/admin/activity";
import { STATUS_LABEL } from "@/lib/rules/inquiries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SHORTCUTS = [
  { href: "/admin/inquiries", label: "Open the inbox", Icon: Inbox },
  { href: "/admin/timeline", label: "Add a journey entry", Icon: BookOpen },
  { href: "/admin/cv", label: "Upload a new CV", Icon: FileUp },
  { href: "/admin/systems", label: "Capture a screenshot", Icon: Camera },
  { href: "/admin/content", label: "Edit page words", Icon: PenLine },
  { href: "/admin/jobs", label: "Run a job now", Icon: ListChecks },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function AdminDashboardPage() {
  const adminUserId = await requireAdminId();
  const [overview, curation, recentInquiries, recentActivity, guideOn] = await Promise.all([
    getAdminOverview(siteUrl(), adminUserId),
    db.system.findMany({ where: { needsCuration: true }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, name: true } }),
    db.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { inquiryType: true } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { adminUser: { select: { email: true } } } }),
    isFlagOn(FLAGS.concierge),
  ]);
  const a = overview.attention;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;

  // What needs the owner — each says what to do, and where.
  const attention = [
    {
      count: a.overdueInquiries,
      title: `Reply to ${plural(a.overdueInquiries, "inquiry", "inquiries")} past the review window`,
      detail: a.oldestOverdueSince ? `The oldest has waited since ${formatWhen(a.oldestOverdueSince)}.` : null,
      href: "/admin/inquiries?overdue=1",
    },
    {
      count: a.systemsNeedingCuration,
      title: `Look over ${plural(a.systemsNeedingCuration, "system", "systems")} from GitHub`,
      detail: "Open each, check what visitors see, and save — or tap Looks right in the list.",
      href: "/admin/systems?curation=1",
    },
    { count: a.awaitingRepoOwnerPermission, title: `Record a repo owner's answer for ${plural(a.awaitingRepoOwnerPermission, "system", "systems")}`, detail: "Collaborated repos go live only with their owner's permission.", href: "/admin/systems" },
    { count: a.journeyDraftsToApprove, title: `Approve ${plural(a.journeyDraftsToApprove, "journey draft", "journey drafts")}`, detail: "Drafted by the sync when a system shipped.", href: "/admin/timeline" },
    { count: a.metricProposalsToDecide, title: `Decide ${plural(a.metricProposalsToDecide, "number proposal", "number proposals")}`, detail: "A new value waits for Approve or Reject before the site shows it.", href: "/admin/numbers" },
    { count: a.cvIssues, title: `Fill ${plural(a.cvIssues, "gap", "gaps")} in the CV`, detail: `CV readiness is ${overview.cv.score}%.`, href: "/admin/cv" },
    { count: a.staleContent, title: `Check ${plural(a.staleContent, "page", "pages")} nobody has reviewed lately`, detail: "Edit it, or mark it still accurate.", href: "/admin/freshness" },
    {
      count: a.recoveryCodesLow ? 1 : 0,
      title: "Make new recovery codes",
      detail: `${overview.security.recoveryCodesRemaining} left.`,
      href: "/admin/account",
    },
  ].filter((item) => item.count > 0);

  const failedJobs = overview.jobs.filter((j) => j.status === "failed");
  const today = new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <AdminPageHeader
        icon={LayoutDashboard}
        title={attention.length > 0 ? `${plural(attention.length, "thing needs", "things need")} you` : "Nothing needs you"}
        description={`${today}. What needs you first, then how everything is doing.`}
      />

      {/* What needs you. */}
      {attention.length === 0 ? (
        <Panel className="mb-6">
          <p className="text-signal-finished inline-flex items-center gap-2 text-sm">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            All clear — inquiries answered, queues empty, content fresh.
          </p>
        </Panel>
      ) : (
        <ul className="mb-6 grid gap-3 sm:grid-cols-2">
          {attention.map((item) => (
            <li key={item.href + item.title}>
              <Link
                href={item.href}
                className="group border-ink/10 bg-sheet shadow-soft hover:border-ember/40 hover:shadow-lift flex h-full items-start gap-4 rounded-2xl border p-4 transition-[border-color,box-shadow]"
              >
                <span className="bg-ember/10 text-accent grid size-10 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold">{item.count}</span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink block text-sm font-semibold">{item.title}</span>
                  {item.detail && <span className="text-slate mt-0.5 block text-xs leading-relaxed">{item.detail}</span>}
                </span>
                <ArrowRight aria-hidden="true" className="text-slate group-hover:text-accent mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Shortcuts. */}
      <section aria-labelledby="shortcuts" className="mb-6">
        <h2 id="shortcuts" className="text-slate mb-2 font-mono text-xs tracking-[0.06em] uppercase">
          Shortcuts
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {SHORTCUTS.map(({ href, label, Icon }) => (
            <li key={label}>
              <Link href={href} className="border-ink/10 bg-sheet text-ink hover:border-ink/25 flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-sm font-medium transition-colors">
                <Icon aria-hidden="true" className="text-slate size-4 shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Health. */}
      <Panel title="How everything is running" className="mb-6">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Pill tone={commit ? "good" : "neutral"}>{commit ? `Live build ${commit}` : "Local build"}</Pill>
          </li>
          <li>
            <Pill tone={guideOn ? "good" : "neutral"}>{guideOn ? "AI guide on" : "AI guide off"}</Pill>
          </li>
          {overview.jobs.map((j) => (
            <li key={j.job}>
              <Pill tone={j.status === "failed" ? "critical" : j.status === "succeeded" ? "good" : "neutral"}>
                <span className="font-mono">{j.job}</span>&nbsp;· {j.status === "succeeded" ? "ok" : j.status} {formatWhen(j.startedAt)}
              </Pill>
            </li>
          ))}
        </ul>
        {failedJobs.length > 0 && (
          <p className="text-critical mt-3 text-xs">
            {plural(failedJobs.length, "job", "jobs")} failed last time — <Link href="/admin/jobs" className="underline">open Jobs</Link> for the reason.
          </p>
        )}
      </Panel>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Shipped" value={overview.systems.pipeline.shipped} href="/admin/systems" />
        <Stat label="In progress" value={overview.systems.pipeline.building} href="/admin/systems" />
        <Stat label="Queued" value={overview.systems.pipeline.queued} href="/admin/systems" />
        <Stat label="CV readiness" value={`${overview.cv.score}%`} href="/admin/cv" tone={overview.cv.ready ? "good" : "attention"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent inquiries" actions={<Link href="/admin/inquiries" className="text-accent text-xs font-medium">All inquiries</Link>}>
          {recentInquiries.length === 0 ? (
            <p className="text-slate text-sm">No inquiries yet.</p>
          ) : (
            <ul className="divide-ink/10 divide-y">
              {recentInquiries.map((i) => (
                <li key={i.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link href={`/admin/inquiries/${i.id}`} className="group flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-ink group-hover:text-accent block truncate text-sm font-medium">{i.anonymizedAt ? "Anonymised" : i.name}</span>
                      <span className="text-slate block text-xs">
                        {i.inquiryType.label} · {formatWhen(i.createdAt)}
                      </span>
                    </span>
                    <Pill tone={i.status === "NEW" ? "attention" : "neutral"}>{STATUS_LABEL[i.status]}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {curation.length > 0 && (
          <Panel title="Waiting to be looked over" description="Synced from GitHub; opening and saving clears the flag (BR-1.8)">
            <ul className="divide-ink/10 divide-y">
              {curation.map((s) => (
                <li key={s.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link href={`/admin/systems/${s.id}`} className="text-ink hover:text-accent flex items-center justify-between text-sm">
                    {s.name}
                    <ArrowRight aria-hidden="true" className="text-slate size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel
          title="Recent activity"
          description={`${overview.audit.changesLast7Days} changes in the last 7 days`}
          actions={<Link href="/admin/activity-log" className="text-accent text-xs font-medium">Full log</Link>}
          className={cn(curation.length === 0 && "lg:col-span-1")}
        >
          <ul className="divide-ink/10 divide-y">
            {recentActivity.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-ink min-w-0 truncate text-sm">{describeActivity(e.action).sentence}</span>
                <span className="text-slate shrink-0 text-xs">
                  {describeActor(e.actorType, e.adminUser?.email ?? null)} · {formatWhen(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
