// components/admin/ActivityLogTable.tsx
// Read-only table for /admin/activity-log (#105) — when, who, what, which
// record, and an expandable diff showing only the fields that changed
// (BR-3.4). Scrolls sideways on small screens rather than squashing.

"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adminButton, formatWhen } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

interface ActivityLogEntry {
  id: string;
  adminUserEmail: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

/** Fields whose value differs between before and after; all fields when one side is missing. */
function changedKeys(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  if (!before || !after) return [...keys];
  return [...keys].filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

const show = (v: unknown) => (v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v, null, 2));

export function ActivityLogTable({ entries, page, totalPages }: { entries: ActivityLogEntry[]; page: number; totalPages: number }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) return <p className="text-sm text-slate">No activity recorded yet.</p>;

  return (
    <div>
      <div className="-m-5 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs text-slate">
              <th scope="col" className="px-5 py-3 font-medium">When</th>
              <th scope="col" className="px-3 py-3 font-medium">Who</th>
              <th scope="col" className="px-3 py-3 font-medium">Action</th>
              <th scope="col" className="px-3 py-3 font-medium">Record</th>
              <th scope="col" className="px-5 py-3"><span className="sr-only">Changes</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.06]">
            {entries.map((entry) => {
              const keys = changedKeys(entry.before, entry.after);
              const expanded = expandedId === entry.id;
              return (
                <Fragment key={entry.id}>
                  <tr className={cn("transition-colors hover:bg-paper", expanded && "bg-paper")}>
                    <td className="whitespace-nowrap px-5 py-2.5 text-xs text-slate">{formatWhen(entry.createdAt)}</td>
                    <td className="px-3 py-2.5 text-xs text-slate">{entry.adminUserEmail}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink">{entry.action}</td>
                    <td className="max-w-56 truncate px-3 py-2.5 font-mono text-xs text-slate">
                      {entry.entityType ? `${entry.entityType}${entry.entityId ? ` · ${entry.entityId}` : ""}` : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {keys.length > 0 && (
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setExpandedId(expanded ? null : entry.id)}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {expanded ? "Hide" : `${keys.length} field${keys.length === 1 ? "" : "s"}`}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-paper">
                      <td colSpan={5} className="px-5 pb-4">
                        <dl className="space-y-2">
                          {keys.map((k) => (
                            <div key={k} className="grid gap-2 rounded-xl border border-ink/10 bg-sheet p-3 font-mono text-xs md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
                              <dt className="text-slate">{k}</dt>
                              <dd className="whitespace-pre-wrap break-words text-critical/90 line-through decoration-critical/40">{show(entry.before?.[k])}</dd>
                              <dd className="whitespace-pre-wrap break-words text-signal-finished">{show(entry.after?.[k])}</dd>
                            </div>
                          ))}
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-4 border-t border-ink/10 pt-4 text-sm text-slate">
          {page > 1 ? (
            <Link href={`/admin/activity-log?page=${page - 1}`} className={cn(adminButton.ghost, "px-3 py-1.5")}><ChevronLeft aria-hidden="true" /> Newer</Link>
          ) : <span />}
          <span className="font-mono text-xs">{page} / {totalPages}</span>
          {page < totalPages ? (
            <Link href={`/admin/activity-log?page=${page + 1}`} className={cn(adminButton.ghost, "px-3 py-1.5")}>Older <ChevronRight aria-hidden="true" /></Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
