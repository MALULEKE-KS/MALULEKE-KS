// app/(admin)/admin/(panel)/activity-log/page.tsx
// Read-only ActivityLogTable — the audit ledger the rest of the platform's
// discipline depends on, made visible to the one person it's for.
// See docs/PAGE-SPECIFICATIONS.md ("/admin/activity-log").

import { Activity } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { ActivityLogTable } from "@/components/admin/ActivityLogTable";

// Auth-gated and reads live audit data — must never be statically
// prerendered (same reasoning as every other DB-backed admin page).
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [entries, total] = await Promise.all([
    db.activityLog.findMany({
      include: { adminUser: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.activityLog.count(),
  ]);

  const rows = entries.map((entry) => ({
    id: entry.id,
    // Anonymous (e.g. unknown-email login) and system (operator script) entries have no admin.
    adminUserEmail: entry.adminUser?.email ?? (entry.actorType === "SYSTEM" ? "system" : "anonymous"),
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before as Record<string, unknown> | null,
    after: entry.after as Record<string, unknown> | null,
    createdAt: entry.createdAt.toISOString(),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AdminPageHeader icon={Activity} title="Activity log" description={`Every change and every sign-in attempt, written by the database — ${total.toLocaleString("en-ZA")} entries. Nothing here can be edited or deleted.`} />
      <Panel>
        <ActivityLogTable entries={rows} page={page} totalPages={totalPages} />
      </Panel>
    </>
  );
}
