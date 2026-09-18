// components/admin/ActivityLogTable.tsx
// Read-only table for /admin/activity-log — timestamp, action, entity,
// admin, expandable before/after diff (BR-3.4).

"use client";

import { Fragment, useState } from "react";
import Link from "next/link";

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

interface ActivityLogTableProps {
  entries: ActivityLogEntry[];
  page: number;
  totalPages: number;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityLogTable({ entries, page, totalPages }: ActivityLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return <p className="font-sans text-slate">No activity recorded yet.</p>;
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate/30 text-left font-mono text-xs text-slate">
            <th className="py-2 pr-4">Timestamp</th>
            <th className="py-2 pr-4">Admin</th>
            <th className="py-2 pr-4">Action</th>
            <th className="py-2 pr-4">Entity</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const hasDiff = entry.before !== null || entry.after !== null;
            const expanded = expandedId === entry.id;
            return (
              <Fragment key={entry.id}>
                <tr className="border-b border-slate/10 hover:bg-slate/5">
                  <td className="py-2 pr-4 font-mono text-xs text-slate whitespace-nowrap">
                    {formatTimestamp(entry.createdAt)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate">{entry.adminUserEmail}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-ink">{entry.action}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate">
                    {entry.entityType ? `${entry.entityType}${entry.entityId ? ` · ${entry.entityId}` : ""}` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {hasDiff && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : entry.id)}
                        className="font-mono text-xs text-slate hover:text-accent transition-colors"
                      >
                        {expanded ? "Hide" : "Diff"}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded && (
                  <tr key={`${entry.id}-diff`} className="border-b border-slate/10 bg-slate/5">
                    <td colSpan={5} className="py-3 px-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                        <div>
                          <p className="text-slate mb-1">Before</p>
                          <pre className="whitespace-pre-wrap text-ink">
                            {entry.before ? JSON.stringify(entry.before, null, 2) : "—"}
                          </pre>
                        </div>
                        <div>
                          <p className="text-slate mb-1">After</p>
                          <pre className="whitespace-pre-wrap text-ink">
                            {entry.after ? JSON.stringify(entry.after, null, 2) : "—"}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center gap-4 mt-6 font-mono text-xs text-slate">
          {page > 1 ? (
            <Link href={`/admin/activity-log?page=${page - 1}`} className="hover:text-accent transition-colors">
              ← Prev
            </Link>
          ) : (
            <span className="opacity-40">← Prev</span>
          )}
          <span>
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/admin/activity-log?page=${page + 1}`} className="hover:text-accent transition-colors">
              Next →
            </Link>
          ) : (
            <span className="opacity-40">Next →</span>
          )}
        </div>
      )}
    </div>
  );
}
