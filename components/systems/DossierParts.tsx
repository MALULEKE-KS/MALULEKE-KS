// components/systems/DossierParts.tsx
// The case study's figures (PAGE-BUILD-PLAYBOOK §9 "/systems/[slug]"): the
// weekly commits as bars and the languages as one stacked bar. Drawings are
// decorative — the text beside each says the same in words — and both are
// server-rendered, with no motion of their own.

import { cn } from "@/lib/utils";

/** 26 weeks of commits, oldest first; the current week drawn in ember. */
export function ActivityBars({ weeks, className }: { weeks: number[]; className?: string }) {
  const max = Math.max(1, ...weeks);
  return (
    <div aria-hidden="true" className={cn("flex h-28 items-end gap-[3px]", className)}>
      {weeks.map((n, i) => (
        <span
          key={i}
          className={cn(
            "min-h-[3px] flex-1 rounded-t-[3px]",
            n === 0 ? "bg-white/[0.07]" : i === weeks.length - 1 ? "bg-ember" : "bg-ember/55",
          )}
          style={{ height: `${n === 0 ? 3 : Math.max(8, (n / max) * 100)}%` }}
        />
      ))}
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
