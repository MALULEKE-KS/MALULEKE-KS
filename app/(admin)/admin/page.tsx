// app/(admin)/admin/page.tsx
// /admin — dashboard. Quick-stats strip, needs-curation queue (BR-1.8 clears
// on open+save), recent inquiries, recent ActivityLog entries. Action items
// first, metrics second — no vanity-metric dashboard.
// See docs/PAGE-SPECIFICATIONS.md ("/admin — Dashboard").

import Link from "next/link";
import { db } from "@/lib/db";

// Auth-gated and reads live operational state — must never be statically
// prerendered (same reasoning as every other DB-backed admin page).
export const dynamic = "force-dynamic";

function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-ZA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function oneDayAgo(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

export default async function AdminDashboardPage() {
  const [openInquiriesCount, needsCurationSystems, recentInquiries, recentActivityCount, recentActivity] =
    await Promise.all([
      db.inquiry.count({ where: { status: { not: "CLOSED" } } }),
      db.system.findMany({
        where: { needsCuration: true },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true },
      }),
      db.inquiry.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { inquiryType: true },
      }),
      db.activityLog.count({ where: { createdAt: { gte: oneDayAgo() } } }),
      db.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { adminUser: true },
      }),
    ]);

  return (
    <section className="px-6 py-12 max-w-5xl mx-auto">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate/20 border border-slate/20 mb-10 font-mono">
        <div className="bg-paper p-4">
          <p className="text-xs text-slate uppercase tracking-wide mb-1">Open inquiries</p>
          <p className="text-2xl text-ink">{openInquiriesCount}</p>
        </div>
        <div className="bg-paper p-4">
          <p className="text-xs text-slate uppercase tracking-wide mb-1">Needs curation</p>
          <p className={`text-2xl ${needsCurationSystems.length > 0 ? "text-accent" : "text-ink"}`}>
            {needsCurationSystems.length}
          </p>
        </div>
        <div className="bg-paper p-4">
          <p className="text-xs text-slate uppercase tracking-wide mb-1">Activity, last 24h</p>
          <p className="text-2xl text-ink">{recentActivityCount}</p>
        </div>
      </div>

      {needsCurationSystems.length > 0 && (
        <div className="mb-10">
          <h2 className="font-mono text-xs text-slate uppercase tracking-wide mb-3">Needs curation</h2>
          <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
            {needsCurationSystems.map((system) => (
              <li key={system.id} className="py-2.5">
                <Link
                  href={`/admin/systems/${system.id}`}
                  className="font-sans text-sm text-ink underline underline-offset-2 hover:text-accent"
                >
                  {system.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-xs text-slate uppercase tracking-wide">Recent inquiries</h2>
            <Link href="/admin/inquiries" className="font-mono text-xs text-slate hover:text-accent">
              View all →
            </Link>
          </div>
          {recentInquiries.length === 0 ? (
            <p className="font-sans text-sm text-slate">No inquiries yet.</p>
          ) : (
            <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
              {recentInquiries.map((inquiry) => (
                <li key={inquiry.id} className="py-2.5">
                  <p className="font-sans text-sm text-ink">{inquiry.name}</p>
                  <p className="font-mono text-xs text-slate">
                    {inquiry.inquiryType.label} · {formatTimestamp(inquiry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-xs text-slate uppercase tracking-wide">Recent activity</h2>
            <Link href="/admin/activity-log" className="font-mono text-xs text-slate hover:text-accent">
              View all →
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="font-sans text-sm text-slate">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="py-2.5">
                  <p className="font-mono text-xs text-ink">{entry.action}</p>
                  <p className="font-mono text-xs text-slate">
                    {entry.adminUser?.email ?? (entry.actorType === "SYSTEM" ? "system" : "anonymous")} ·{" "}
                    {formatTimestamp(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
