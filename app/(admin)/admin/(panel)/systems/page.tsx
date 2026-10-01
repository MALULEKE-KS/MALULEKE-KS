// app/(admin)/admin/(panel)/systems/page.tsx
// Every system, drafts and archived included (#105): curation first, then
// most recently changed. Filters by content status and curation; each row
// shows what a visitor can currently see and what's blocking it.
// See docs/PAGE-SPECIFICATIONS.md ("/admin/systems").

import Link from "next/link";
import { Boxes, Star } from "lucide-react";
import type { ContentStatus, Prisma } from "@prisma/client";
import { AdminPageHeader, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; where: Prisma.SystemWhereInput }[] = [
  { key: "all", label: "All", where: {} },
  { key: "curation", label: "Needs curation", where: { needsCuration: true } },
  { key: "published", label: "Published", where: { contentStatus: "PUBLISHED" } },
  { key: "draft", label: "Drafts", where: { contentStatus: "DRAFT" } },
  { key: "archived", label: "Archived", where: { contentStatus: "ARCHIVED" } },
];

const CONTENT_TONE: Record<ContentStatus, "good" | "neutral" | "attention"> = { PUBLISHED: "good", DRAFT: "neutral", ARCHIVED: "neutral" };

export default async function AdminSystemsListPage({ searchParams }: { searchParams: Promise<{ filter?: string; curation?: string }> }) {
  const params = await searchParams;
  const active = FILTERS.find((f) => f.key === (params.curation ? "curation" : params.filter)) ?? FILTERS[0]!;

  const [systems, counts] = await Promise.all([
    db.system.findMany({
      where: active.where,
      include: { organization: true, status: true, repoRelationship: true },
      orderBy: [{ needsCuration: "desc" }, { updatedAt: "desc" }],
    }),
    Promise.all(FILTERS.map((f) => db.system.count({ where: f.where }))),
  ]);
  const now = new Date(); // request time: this page renders per request

  return (
    <>
      <AdminPageHeader
        icon={Boxes}
        title="Systems"
        description="Everything in the catalogue. Systems synced from GitHub arrive as drafts needing curation (BR-1.6, BR-1.8) and are never deleted — archive to retire one (BR-1.9)."
      />

      <nav aria-label="Filter systems" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/systems" : `/admin/systems?filter=${f.key}`}
            aria-current={f.key === active.key ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              f.key === active.key ? "border-ink bg-ink text-paper" : "border-ink/15 bg-sheet text-slate hover:border-ink/30 hover:text-ink",
            )}
          >
            {f.label}
            <span className={cn("font-mono text-xs", f.key === active.key ? "text-mist" : "text-slate/70")}>{counts[i]}</span>
          </Link>
        ))}
      </nav>

      <Panel>
        {systems.length === 0 ? (
          <EmptyState icon={Boxes}>No systems here.</EmptyState>
        ) : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs text-slate">
                  <th scope="col" className="px-5 py-3 font-medium">System</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Visitors see</th>
                  <th scope="col" className="px-3 py-3 font-medium">Placement</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Changed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {systems.map((s) => {
                  const scheduled = s.contentStatus === "PUBLISHED" && s.publishAt && s.publishAt > now;
                  const blocked =
                    (s.clientVisibility !== "PUBLIC" && !s.clientApproved) ||
                    (s.repoRelationship?.requiresOwnerPermission && s.ownerPermission !== "GRANTED");
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-paper">
                      <td className="px-5 py-3">
                        <Link href={`/admin/systems/${s.id}`} className="font-medium text-ink hover:text-accent">
                          {s.name}
                        </Link>
                        <span className="block text-xs text-slate">{s.organization.name}</span>
                      </td>
                      <td className="px-3 py-3 text-slate">{s.status.label}</td>
                      <td className="px-3 py-3">
                        <span className="flex flex-wrap gap-1.5">
                          <Pill tone={scheduled ? "attention" : CONTENT_TONE[s.contentStatus]}>
                            {scheduled ? `scheduled ${formatWhen(s.publishAt)}` : s.contentStatus.toLowerCase()}
                          </Pill>
                          {s.needsCuration && <Pill tone="attention">needs curation</Pill>}
                          {blocked && s.contentStatus !== "PUBLISHED" && <Pill tone="critical">publish blocked</Pill>}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate">
                          {s.isFlagship && (
                            <span className="inline-flex items-center gap-1 text-accent">
                              <Star aria-hidden="true" className="size-3.5 fill-current" /> flagship
                            </span>
                          )}
                          {s.featuredOnHome && <span>home #{s.homeOrder}</span>}
                          {s.onCv && <span>CV</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-slate">{formatWhen(s.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
