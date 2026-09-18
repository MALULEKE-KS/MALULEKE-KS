// components/shared/TitleBlock.tsx
// The drafting title block (DESIGN-SYSTEM.md v2 §3/§6): the ruled table in
// the corner of every engineering drawing, carrying the sheet's real facts.
// Every cell is real data — never a label invented to fill a cell.

import { cn } from "@/lib/utils";

interface TitleBlockProps {
  cells: { label: string; value: string; wide?: boolean }[];
  tone?: "dark" | "light";
  className?: string;
}

export function TitleBlock({ cells, tone = "dark", className }: TitleBlockProps) {
  const dark = tone === "dark";
  return (
    <dl
      className={cn(
        "grid grid-cols-2 border-t border-l font-mono text-xs",
        dark ? "border-line/35 bg-blueprint-deep/70" : "border-ink/25 bg-sheet",
        className
      )}
    >
      {cells.map((cell) => (
        <div
          key={cell.label}
          className={cn(
            "border-r border-b px-3 py-2",
            cell.wide && "col-span-2",
            dark ? "border-line/35" : "border-ink/25"
          )}
        >
          <dt className={dark ? "text-line" : "text-slate"}>{cell.label}</dt>
          <dd className={cn("mt-0.5", dark ? "text-paper" : "text-ink")}>{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}
