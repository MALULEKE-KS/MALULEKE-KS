// components/shared/ProofLedger.tsx
// The record as a hairline ledger (docs/improvements/HOME-HERO-PLAN.md §10) —
// part of the kit other pages inherit: computed figures under a rule, no boxes,
// no tickers. A figure that has evidence behind it carries the quiet
// "Evidence · n" chip beside it (EV-1: no claims → nothing). Values and labels
// arrive ready-made from the database and the owner's wording; nothing is
// typed here.

import type { ReactNode } from "react";

export interface ProofLedgerItem {
  key: string;
  value: number;
  label: string;
  /** The claim this figure proves — set above it, so the record reads as the proof of the statement. */
  claim?: string | null;
  /** The evidence chip for this figure, when it has claims. */
  evidence?: ReactNode;
}

export function ProofLedger({ items, ariaLabel, className, bare = false }: { items: ProofLedgerItem[]; ariaLabel?: string | null; className?: string; /** No rule above it — for a bar that draws its own. */ bare?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className={className}>
      <div className={bare ? undefined : "border-t border-white/15 pt-8"}>
        <ul aria-label={ariaLabel ?? undefined} className="grid grid-cols-2 gap-x-6 gap-y-8 text-left md:grid-cols-4">
          {items.map((item) => (
            <li key={item.key} className="flex flex-col gap-1">
              {item.claim ? (
                <span className="text-paper/90 mb-1 flex items-center gap-2 font-mono text-[11px] tracking-wide">
                  <span aria-hidden="true" className="bg-ember h-px w-5" />
                  {item.claim}
                </span>
              ) : (
                <span aria-hidden="true" className="mb-1 h-4" />
              )}
              <span className="text-3xl font-medium tracking-tight tabular-nums md:text-4xl">{item.value}</span>
              <span className="text-mist text-sm">{item.label}</span>
              {item.evidence && <span className="mt-1.5">{item.evidence}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
