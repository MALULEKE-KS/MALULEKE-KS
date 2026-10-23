// components/shared/ProofLedger.tsx
// The record as a hairline ledger (docs/improvements/HOME-HERO-PLAN.md §10) —
// part of the kit other pages inherit: computed figures under a rule, no boxes,
// no tickers. A figure that has evidence behind it carries the quiet
// "Evidence" link under it (EV-1: no claims → nothing); a figure that can be seen
// in full links its label there (D-047). Every figure has the same anatomy —
// claim, number, label, then its proof or its link. Values and labels
// arrive ready-made from the database and the owner's wording; nothing is
// typed here.

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export interface ProofLedgerItem {
  key: string;
  value: number;
  label: string;
  /** The claim this figure proves — set above it, so the record reads as the proof of the statement. */
  claim?: string | null;
  /** The evidence link for this figure, when it has claims. */
  evidence?: ReactNode;
  /** Where the figure can be seen in full (e.g. the catalogue) — its label becomes the link. */
  href?: string;
}

export function ProofLedger({ items, ariaLabel, className, bare = false, compact = false }: { items: ProofLedgerItem[]; ariaLabel?: string | null; className?: string; /** No rule above it — for a bar that draws its own. */ bare?: boolean; /** Tighter on a phone, so the record starts in the first screen (the home hero, D-048). */ compact?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className={className}>
      <div className={bare ? undefined : "border-t border-white/15 pt-8"}>
        <ul aria-label={ariaLabel ?? undefined} className={compact ? "grid grid-cols-2 gap-x-5 gap-y-5 text-left md:grid-cols-4 md:gap-x-6 md:gap-y-8" : "grid grid-cols-2 gap-x-6 gap-y-8 text-left md:grid-cols-4"}>
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
              <span className={compact ? "text-[1.75rem] leading-tight font-medium tracking-tight tabular-nums md:text-4xl" : "text-3xl font-medium tracking-tight tabular-nums md:text-4xl"}>{item.value}</span>
              {item.href ? (
                <Link href={item.href} className="group/fl tap-target text-mist hover:text-paper focus-visible:outline-ember inline-flex items-center gap-1 self-start text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2">
                  {item.label}
                  <ArrowUpRight aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover/fl:-translate-y-0.5 group-hover/fl:translate-x-0.5 motion-reduce:transition-none" />
                </Link>
              ) : (
                <span className="text-mist text-sm">{item.label}</span>
              )}
              {item.evidence && <span className="mt-1.5">{item.evidence}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
