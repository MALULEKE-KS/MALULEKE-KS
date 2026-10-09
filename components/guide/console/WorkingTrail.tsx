// components/guide/console/WorkingTrail.tsx
// The working trail (docs/AI-GUIDE-PHASE1-PLAN.md §5): the real steps behind
// an answer, live while they run, then folded into one line a visitor can open.
// Built only from the message's parts (lib/guide/trail.ts) — no timers.

"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Activity, ArrowLeftRight, Brain, Check, ChevronDown, Compass, Footprints, LayoutGrid, ListChecks, LoaderCircle, Milestone, PenLine, Search, Sparkles, X, type LucideIcon } from "lucide-react";
import type { StepKind, TrailStep } from "@/lib/guide/trail";
import { cn } from "@/lib/utils";

const ICON: Record<StepKind, LucideIcon> = {
  think: Brain,
  search: Search,
  systems: LayoutGrid,
  journey: Milestone,
  skills: Sparkles,
  pulse: Activity,
  compare: ArrowLeftRight,
  fit: ListChecks,
  tour: Footprints,
  navigate: Compass,
  compose: PenLine,
};

export function WorkingTrail({ steps, live, thoughtFor }: { steps: TrailStep[]; live: boolean; thoughtFor?: number }) {
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(false);
  if (steps.length === 0) return null;
  const expanded = live || opened;
  const summary = `${steps.length} ${steps.length === 1 ? "step" : "steps"}${thoughtFor && thoughtFor >= 2 ? ` · ${thoughtFor}s` : ""}`;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] text-[12px]">
      <button
        type="button"
        onClick={() => setOpened((o) => !o)}
        disabled={live}
        aria-expanded={expanded}
        className="text-mist hover:text-paper flex w-full items-center gap-2 px-3 py-2 text-left transition-colors disabled:cursor-default disabled:hover:text-mist"
      >
        {live ? <LoaderCircle aria-hidden="true" className="text-ember size-3.5 motion-safe:animate-spin" /> : <Check aria-hidden="true" className="size-3.5 text-[var(--color-signal-finished-on-dark)]" />}
        <span className="flex-1">{live ? "Working on it" : `How it answered · ${summary}`}</span>
        {!live && <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", opened && "rotate-180")} />}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ol
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="space-y-1.5 overflow-hidden px-3 pb-2.5"
          >
            {steps.map((s) => {
              const Icon = ICON[s.kind];
              return (
                <motion.li key={s.key} initial={reduced ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
                  <span className={cn("mt-px grid size-5 shrink-0 place-items-center rounded-md border", s.state === "running" ? "border-ember/40 bg-ember/10" : s.state === "error" ? "border-white/10" : "border-white/10 bg-white/[0.04]")}>
                    {s.state === "error" ? <X aria-hidden="true" className="text-mist size-3" /> : <Icon aria-hidden="true" className={cn("size-3", s.state === "running" ? "text-ember" : "text-mist")} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block leading-5", s.state === "running" ? "text-paper" : "text-mist")}>
                      {s.label}
                      {s.state === "running" && <span className="sr-only"> (in progress)</span>}
                    </span>
                    {s.links && s.links.length > 0 && s.kind === "search" && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {s.links.map((l) => (
                          <Link key={l.href} href={l.href} className="text-line hover:text-paper rounded-full border border-white/10 px-2 py-px text-[10.5px] transition-colors">
                            {l.label}
                          </Link>
                        ))}
                      </span>
                    )}
                  </span>
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
