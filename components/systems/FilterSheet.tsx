// components/systems/FilterSheet.tsx
// /systems on a phone: one "Filter" button (with how many filters are on) that
// opens every facet in a sheet rising from the bottom (D-049, the owner's
// choice D3). Each option is a plain link with its count, 44 px tall; choosing
// one updates the catalogue behind the sheet (the URL changes, the page keeps
// its place) and the sheet stays open, so several can be chosen; its button
// says how many systems will show and closes it. The technologies show the most
// used first, the rest a tap away. Built on the site's dialog (Radix): focus is
// trapped while open and returns to the button; Escape or the backdrop closes it.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { brandMark } from "@/components/shared/TechChip";
import { cn } from "@/lib/utils";

export interface SheetGroup {
  name: string;
  param: string;
  options: { key: string; label: string; count: number; on: boolean; href: string }[];
}

/** How many options a long facet (the technologies) shows before "Show all". */
const FIRST = 12;

function Group({ g }: { g: SheetGroup }) {
  const [all, setAll] = useState(false);
  const long = g.options.length > FIRST;
  const shown = all || !long ? g.options : g.options.filter((o, i) => i < FIRST || o.on);
  return (
    <section aria-labelledby={`sheet-${g.param}`} className="border-t border-white/[0.08] pt-4 first:border-t-0 first:pt-0">
      <h3 id={`sheet-${g.param}`} className="text-line font-mono text-xs tracking-[0.1em] uppercase">
        {g.name}
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {shown.map((o) => (
          <li key={o.key}>
            <Link
              href={o.href}
              scroll={false}
              aria-current={o.on ? "true" : undefined}
              className={cn(
                "press focus-visible:outline-ember inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors focus-visible:outline-2",
                o.on ? "border-ember bg-ember/15 text-paper" : "text-paper/90 border-white/12 hover:border-white/25",
              )}
            >
              {o.on && <Check aria-hidden="true" className="text-ember size-4" />}
              {g.param === "tech" && brandMark(o.label, "size-4")}
              {o.label}
              <span className="text-line type-data text-xs">{o.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      {long && (
        <button type="button" onClick={() => setAll((v) => !v)} className="press text-mist hover:text-paper mt-3 inline-flex min-h-11 items-center rounded-full border border-dashed border-white/15 px-4 text-sm">
          {all ? "Show the most used" : `Show all ${g.options.length}`}
        </button>
      )}
    </section>
  );
}

export function FilterSheet({ groups, active, total, clearHref, className }: { groups: SheetGroup[]; active: number; total: number; clearHref: string; className?: string }) {
  if (groups.length === 0) return null;
  return (
    <Dialog>
      <DialogTrigger className={cn("press bg-ink text-paper focus-visible:outline-ember inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2", className)}>
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filter
        {active > 0 && (
          <span className="bg-ember text-ink type-data rounded-full px-1.5 text-xs font-semibold">
            {active}
            <span className="sr-only"> active</span>
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="top-auto bottom-0 left-0 w-full max-w-none translate-x-0 rounded-t-[1.75rem] rounded-b-none border-x-0 border-b-0 motion-safe:data-[state=open]:slide-in-from-bottom-8 motion-safe:data-[state=open]:zoom-in-100">
        <div className="flex max-h-[85dvh] flex-col">
          <div aria-hidden="true" className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/25" />
          <div className="px-5 pt-3 pb-2">
            <DialogTitle className="text-lg font-semibold tracking-tight">Filter systems</DialogTitle>
            <DialogDescription className="text-mist mt-0.5 text-sm">The catalogue updates behind this sheet as you choose.</DialogDescription>
          </div>
          <div className="grid flex-1 gap-5 overflow-y-auto overscroll-contain px-5 py-4">
            {groups.map((g) => (
              <Group key={g.param} g={g} />
            ))}
          </div>
          <div className="flex gap-3 border-t border-white/[0.08] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Link href={clearHref} scroll={false} className="press text-paper inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/15 text-sm font-medium">
              Clear
            </Link>
            <DialogClose className="press bg-ember text-ink inline-flex min-h-12 flex-[1.6] items-center justify-center rounded-full text-sm font-semibold" aria-live="polite">
              Show {total} {total === 1 ? "system" : "systems"}
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
