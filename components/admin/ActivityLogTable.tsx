// components/admin/ActivityLogTable.tsx
// The activity log's entries (#105; plain sentences since D-057): what was
// done, to which record, by whom and when, as ruled rows that read the same on
// a phone and a laptop — and one tap opens only the fields that changed
// (BR-3.4), old value struck through beside the new one. Read-only.

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { adminButton, formatWhen } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

interface ActivityLogEntry {
  id: string;
  sentence: string;
  action: string;
  who: string;
  record: string | null;
  href: string | null;
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
/** The changed fields named in the row itself — a few, then "+n". */
const FIELDS_IN_ROW = 3;

export function ActivityLogTable({ entries, page, totalPages, kind }: { entries: ActivityLogEntry[]; page: number; totalPages: number; kind: string | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageHref = (p: number) => `/admin/activity-log?${new URLSearchParams({ ...(kind && { kind }), page: String(p) })}`;

  if (entries.length === 0) return <p className="text-slate text-sm">Nothing recorded here yet.</p>;

  return (
    <div>
      <ol className="divide-ink/[0.07] -my-2 divide-y">
        {entries.map((entry) => {
          const keys = changedKeys(entry.before, entry.after);
          const expanded = expandedId === entry.id;
          const fields = keys.length > FIELDS_IN_ROW ? `${keys.slice(0, FIELDS_IN_ROW).join(", ")} +${keys.length - FIELDS_IN_ROW}` : keys.join(", ");
          return (
            <li key={entry.id} className="py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-ink text-sm font-medium">
                    {entry.sentence}
                    {entry.record && (
                      <>
                        <span className="text-slate font-normal"> · </span>
                        {entry.href ? (
                          <Link href={entry.href} className="hover:text-accent font-normal underline-offset-2 hover:underline">
                            {entry.record}
                          </Link>
                        ) : (
                          <span className="font-normal">{entry.record}</span>
                        )}
                      </>
                    )}
                  </p>
                  <p className="text-slate mt-0.5 text-xs">
                    {entry.who} · <time dateTime={entry.createdAt}>{formatWhen(entry.createdAt)}</time>
                    <span className="text-slate hidden font-mono sm:inline"> · {entry.action}</span>
                  </p>
                </div>
                {keys.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : entry.id)}
                    className="text-accent inline-flex min-h-9 shrink-0 items-center gap-1 self-start text-xs font-medium hover:underline"
                  >
                    <span className="max-w-64 truncate">{expanded ? "Hide the changes" : fields}</span>
                    <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
                  </button>
                )}
              </div>
              {expanded && (
                <dl className="mt-3 space-y-2">
                  {keys.map((k) => (
                    <div key={k} className="border-ink/10 bg-paper grid gap-2 rounded-xl border p-3 font-mono text-xs md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
                      <dt className="text-slate">{k}</dt>
                      <dd className="text-critical decoration-critical/40 break-words whitespace-pre-wrap line-through">{show(entry.before?.[k])}</dd>
                      <dd className="text-signal-finished break-words whitespace-pre-wrap">{show(entry.after?.[k])}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          );
        })}
      </ol>

      {totalPages > 1 && (
        <nav aria-label="Pages" className="border-ink/10 text-slate mt-6 flex items-center justify-between gap-4 border-t pt-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={cn(adminButton.ghost, "px-3 py-1.5")}>
              <ChevronLeft aria-hidden="true" /> Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-xs">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className={cn(adminButton.ghost, "px-3 py-1.5")}>
              Older <ChevronRight aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
