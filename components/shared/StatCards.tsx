// components/shared/StatCards.tsx
// A hero's live counters as cards (owner, 2026-10-03: the Journey and About
// numbers need "real Magic UI cards"): Magic UI's MagicCard — the border
// lights up ember→gold under the pointer, a soft spotlight inside — on
// graphite glass, each with its own mark, a ticking number (NumberTicker) and
// an ember line that draws in under it. A "live" stat carries a pulsing dot.
// Values are computed by the page from data, never typed; this only shows them.
//
// Accessibility: a list; each card's text is one plain sentence for screen
// readers ("8 chapters"), the animated number is decorative. Above the fold,
// so it rises in with CSS (.rise-in), never waiting on JavaScript.

import type { LucideIcon } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";

export interface Stat {
  value: number;
  label: string;
  icon: LucideIcon;
  /** Something happening now — a pulsing dot beside the mark. */
  live?: boolean;
}

export function StatCards({ stats, delay = 0, className }: { stats: Stat[]; delay?: number; className?: string }) {
  if (stats.length === 0) return null;
  return (
    <ul className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>
      {stats.map((s, i) => (
        <li key={s.label} className="rise-in" style={{ "--rise-delay": `${delay + i * 70}ms` } as React.CSSProperties}>
          <MagicCard className="h-full rounded-2xl backdrop-blur-md" surface="rgb(19 21 25 / 0.78)" rest="rgb(255 255 255 / 0.1)" spotlight="rgb(255 91 31 / 0.1)" gradientSize={200}>
            <div className="relative flex h-full flex-col p-4 sm:p-5">
              <span className="sr-only">
                {s.value} {s.label}
              </span>
              <div aria-hidden="true" className="flex items-center justify-between">
                <span className="bg-ember/12 text-ember ring-ember/25 grid size-9 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                  <s.icon className="size-[18px]" />
                </span>
                {s.live && (
                  <span className="relative flex size-2">
                    <span className="bg-ember absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" />
                    <span className="bg-ember relative inline-flex size-2 rounded-full" />
                  </span>
                )}
              </div>
              <p aria-hidden="true" className="type-data text-paper mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                <NumberTicker value={s.value} />
              </p>
              <p aria-hidden="true" className="text-mist mt-1 text-sm leading-snug">
                {s.label}
              </p>
              <span
                aria-hidden="true"
                className="mt-4 block h-px w-full origin-left bg-[linear-gradient(90deg,var(--color-ember),#ffb547_45%,transparent)] opacity-70 motion-safe:animate-[stat-line_900ms_cubic-bezier(0.22,1,0.36,1)_both]"
                style={{ animationDelay: `${delay + 300 + i * 90}ms` }}
              />
            </div>
          </MagicCard>
        </li>
      ))}
    </ul>
  );
}
