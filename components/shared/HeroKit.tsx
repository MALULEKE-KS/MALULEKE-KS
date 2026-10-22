// components/shared/HeroKit.tsx
// The pieces every inner page's hero shares (docs/improvements/HOME-HERO-PLAN.md §22,
// D-046): one shape for Systems, Journey, About and Let's talk, the same as the home
// hero's — a plain label, the headline, one or two lines, then the record as a
// hairline row of live figures. No pills, no icon tiles, no glowing borders.
//
// HeroLabel  — the page's label: an ember hairline and the words, no capsule.
// HeroFigures — the hero's live figures under a hairline (the home hero's ledger
//               style, ProofLedger): computed by the page from data, never typed;
//               a zero is an absence, not a figure, so it is never passed in.

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HeroLabel({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <p className={cn("text-mist flex items-center gap-2.5 text-sm font-medium", className)} style={style}>
      <span aria-hidden="true" className="bg-ember h-px w-5" />
      {children}
    </p>
  );
}

export interface HeroFigure {
  value: number;
  label: string;
  /** Something happening now — a small ember dot beside the label. */
  live?: boolean;
}

export function HeroFigures({ figures, className, style }: { figures: HeroFigure[]; className?: string; style?: CSSProperties }) {
  if (figures.length === 0) return null;
  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-6 md:grid-cols-4 md:gap-y-6 md:pt-7", className)} style={style}>
      {figures.map((f) => (
        <div key={f.label} className="flex flex-col-reverse gap-0.5 md:gap-1">
          <dt className="text-mist flex items-center gap-2 text-sm">
            {f.label}
            {f.live && (
              <span aria-hidden="true" className="relative flex size-1.5">
                <span className="bg-ember absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" />
                <span className="bg-ember relative inline-flex size-1.5 rounded-full" />
              </span>
            )}
          </dt>
          <dd className="text-paper text-2xl font-medium tracking-tight tabular-nums md:text-4xl">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
