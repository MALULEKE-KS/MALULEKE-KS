// components/systems/DossierParts.tsx
// The case study's figures (PAGE-BUILD-PLAYBOOK §9 "/systems/[slug]"): the
// weekly commits as bars and the languages as one stacked bar. Drawings are
// decorative — the text beside each says the same in words — and both are
// server-rendered, with no motion of their own.

import { cn } from "@/lib/utils";

/**
 * Weeks of commits, oldest first; the current week drawn in ember. Every bar
 * keeps a readable width, so a long history never squeezes or overflows: on a
 * narrow screen the strip scrolls sideways inside its own box (opening at the
 * newest week), and the page itself never widens.
 */
export function ActivityBars({ weeks, className, startLabel, endLabel }: { weeks: number[]; className?: string; startLabel?: string; endLabel?: string }) {
  const max = Math.max(1, ...weeks);
  return (
    <div className={cn("max-w-full overflow-x-auto overscroll-x-contain pb-1 [direction:rtl] [scrollbar-width:thin]", className)}>
      {/* rtl on the scroller opens it at the newest week; ltr inside keeps the order oldest → newest. */}
      <div className="[direction:ltr]" style={{ minWidth: `${weeks.length * 10}px` }}>
        <div aria-hidden="true" className="flex h-28 items-end gap-[3px]">
          {weeks.map((n, i) => (
            <span
              key={i}
              className={cn(
                "min-h-[3px] min-w-[7px] flex-1 rounded-t-[3px]",
                n === 0 ? "bg-white/[0.07]" : i === weeks.length - 1 ? "bg-ember" : "bg-ember/55",
              )}
              style={{ height: `${n === 0 ? 3 : Math.max(8, (n / max) * 100)}%` }}
            />
          ))}
        </div>
        {(startLabel || endLabel) && (
          <div className="text-mist mt-3 flex justify-between font-mono text-[11px]">
            <span>{startLabel}</span>
            <span>{endLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Shades for the language bar: the accent first, then graphite steps — tokens, not a palette in code.
const SHADES = ["bg-ember", "bg-ink", "bg-slate", "bg-mist", "bg-line"];

/** The repo's languages by share of code, as one bar and a legend. */
export function LanguageBar({ languages }: { languages: { name: string; share: number }[] }) {
  return (
    <div>
      <div aria-hidden="true" className="bg-ink/5 flex h-2 overflow-hidden rounded-full">
        {languages.map((l, i) => (
          <span key={l.name} className={SHADES[Math.min(i, SHADES.length - 1)]} style={{ width: `${l.share}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {languages.map((l, i) => (
          <li key={l.name} className="text-ink flex items-center gap-1.5 text-sm">
            <span aria-hidden="true" className={cn("size-2 rounded-full", SHADES[Math.min(i, SHADES.length - 1)])} />
            {l.name}
            <span className="type-data text-slate text-xs">{l.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
