// components/guide/console/Receipts.tsx
// Receipts (docs/AI-GUIDE-PHASE1-PLAN.md §6): the records an answer used,
// each checked against the site's index (lib/guide/receipts.ts) and opening
// the real page. An answer that used none says so.

"use client";

import Link from "next/link";
import { FileText, LayoutGrid, Milestone, type LucideIcon } from "lucide-react";
import type { Receipt, ReceiptKind } from "@/lib/guide/receipts";

const ICON: Record<ReceiptKind, LucideIcon> = { system: LayoutGrid, journey: Milestone, page: FileText };

export function Receipts({ receipts }: { receipts: Receipt[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-line mr-0.5 font-mono text-[10px] tracking-[0.12em] uppercase">{receipts.length ? "Sources" : "Sources · none on this site"}</span>
      {receipts.map((r) => {
        const Icon = ICON[r.kind];
        return (
          <Link
            key={r.href}
            href={r.href}
            className="text-mist hover:text-paper hover:border-ember/40 inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] transition-colors"
          >
            <Icon aria-hidden="true" className="text-ember/80 size-3 shrink-0" />
            <span className="truncate">{r.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
