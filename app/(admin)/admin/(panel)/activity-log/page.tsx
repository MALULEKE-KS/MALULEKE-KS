// app/(admin)/admin/(panel)/activity-log/page.tsx
// The audit ledger the rest of the platform's discipline depends on, made
// visible to the one person it's for — in plain sentences since the admin pass
// (D-057): "Changed a system · Xkimi Xa Mali · status, summary", filtered by
// kind (sign-ins, systems, inquiries, content, settings). Read-only: the
// database refuses any edit or delete of an entry (BR-3.4).
// See docs/PAGE-SPECIFICATIONS.md ("/admin/activity-log").

import Link from "next/link";
import { Activity } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { ActivityLogTable } from "@/components/admin/ActivityLogTable";
import { ACTIVITY_KINDS, describeActivity, describeActor, tablesOfKind, type ActivityKind } from "@/lib/admin/activity";
import { CONTENT_BLOCKS, type ContentKey } from "@/lib/content/blocks";
import { cn } from "@/lib/utils";

// Auth-gated and reads live audit data — must never be statically
// prerendered (same reasoning as every other DB-backed admin page).
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function whereFor(kind: ActivityKind | null): Prisma.ActivityLogWhereInput {
  if (!kind) return {};
  if (kind === "signins") return { OR: [{ action: { startsWith: "auth." } }, { action: { startsWith: "adminuser." } }] };
  return { OR: tablesOfKind(kind).map((t) => ({ action: { startsWith: `${t}.` } })) };
}

export default async function AdminActivityLogPage({ searchParams }: { searchParams: Promise<{ page?: string; kind?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const kind = ACTIVITY_KINDS.find((k) => k.key === params.kind)?.key ?? null;
  const where = whereFor(kind);

  const [entries, total, all] = await Promise.all([
    db.activityLog.findMany({ where, include: { adminUser: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.activityLog.count({ where }),
    kind ? db.activityLog.count() : null,
  ]);

  // Name the records where a name exists: systems by name, inquiries by reference, content blocks by title.
  const idsOf = (type: string) => [...new Set(entries.filter((e) => e.entityType === type && e.entityId).map((e) => e.entityId!))];
  const [systems, inquiries] = await Promise.all([
    db.system.findMany({ where: { id: { in: idsOf("System") } }, select: { id: true, name: true } }),
    db.inquiry.findMany({ where: { id: { in: idsOf("Inquiry") } }, select: { id: true, reference: true } }),
  ]);
  const names = new Map<string, string>([...systems.map((s) => [s.id, s.name] as const), ...inquiries.map((i) => [i.id, i.reference] as const)]);
  const recordOf = (type: string | null, id: string | null) => {
    if (!id) return null;
    if (type === "SiteContent") return CONTENT_BLOCKS[id as ContentKey]?.title ?? id;
    if (type === "PlatformSetting") return id;
    return names.get(id) ?? null;
  };
  const linkOf = (type: string | null, id: string | null) =>
    !id ? null : type === "System" && names.has(id) ? `/admin/systems/${id}` : type === "Inquiry" && names.has(id) ? `/admin/inquiries/${id}` : null;

  const rows = entries.map((entry) => ({
    id: entry.id,
    sentence: describeActivity(entry.action).sentence,
    action: entry.action,
    who: describeActor(entry.actorType, entry.adminUser?.email ?? null),
    record: recordOf(entry.entityType, entry.entityId),
    href: linkOf(entry.entityType, entry.entityId),
    before: entry.before as Record<string, unknown> | null,
    after: entry.after as Record<string, unknown> | null,
    createdAt: entry.createdAt.toISOString(),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm transition-colors",
      active ? "border-ink bg-ink text-paper" : "border-ink/15 bg-sheet text-slate hover:border-ink/30 hover:text-ink",
    );

  return (
    <>
      <AdminPageHeader
        icon={Activity}
        title="Activity log"
        description={`Every change and every sign-in, written by the database itself — ${(all ?? total).toLocaleString("en-ZA")} entries. Nothing here can be edited or deleted.`}
      />
      <nav aria-label="Filter the log" className="mb-5 flex flex-wrap gap-2">
        <Link href="/admin/activity-log" aria-current={!kind ? "page" : undefined} className={chip(!kind)}>
          All
        </Link>
        {ACTIVITY_KINDS.map((k) => (
          <Link key={k.key} href={`/admin/activity-log?kind=${k.key}`} aria-current={kind === k.key ? "page" : undefined} className={chip(kind === k.key)}>
            {k.label}
          </Link>
        ))}
      </nav>
      <Panel>
        <ActivityLogTable entries={rows} page={page} totalPages={totalPages} kind={kind} />
      </Panel>
    </>
  );
}
