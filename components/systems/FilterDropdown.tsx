// components/systems/FilterDropdown.tsx
// One /systems filter as a dropdown (owner, 2026-10-03: the chip rows were
// noise — "make them drop downs, all of them"). Built on <details>, so it
// opens and every option works without JavaScript; each option is a plain
// link (a filtered view stays a shareable URL). With JavaScript it also closes
// on an outside click, Escape or a choice, moves with the arrow keys, and a
// long list gets a search box. Options carry their real brand mark where one
// exists (TechChip's marks), their count, and a check on the current choice.
// Styled as the site's glass panels: bone sheet, hairline, soft lift, an
// ember ring on the open trigger; it drops in with CSS (still under reduced motion).

"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Search } from "lucide-react";
import { brandMark } from "@/components/shared/TechChip";
import { cn } from "@/lib/utils";

export interface FilterOption {
  key: string;
  label: string;
  count: number;
  href: string;
}

interface Props {
  name: string;
  /** A short line under the name in the panel — how the list is ordered. */
  hint?: string;
  options: FilterOption[];
  allHref: string;
  current: string | null;
  /** Show each option's brand mark (technologies). */
  marks?: boolean;
}

const SEARCH_FROM = 9;

export function FilterDropdown({ name, hint, options, allHref, current, marks = false }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // How far the panel moves sideways to stay on screen (a trigger near the edge of a phone).
  const [shift, setShift] = useState(0);
  const [query, setQuery] = useState("");
  const id = useId();
  const selected = options.find((o) => o.key.toLowerCase() === current?.toLowerCase()) ?? null;
  const shown = query.trim() ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())) : options;

  useEffect(() => {
    if (!open) return;
    // Measured from the trigger, where the panel starts before any shift.
    const panel = panelRef.current;
    const trigger = ref.current?.querySelector("summary");
    if (panel && trigger) {
      const margin = 16;
      const left = trigger.getBoundingClientRect().left;
      const over = left + panel.offsetWidth - (window.innerWidth - margin);
      setShift(over > 0 ? -Math.min(over, Math.max(0, left - margin)) : 0);
    }
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !ref.current) return;
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Arrow keys move between the options (and from the search box into them).
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = [...(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    if (links.length === 0) return;
    e.preventDefault();
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = e.key === "ArrowDown" ? (at + 1) % links.length : at <= 0 ? links.length - 1 : at - 1;
    links[next]!.focus();
  };

  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  return (
    <details
      ref={ref}
      onToggle={(e) => {
        const isOpen = (e.currentTarget as HTMLDetailsElement).open;
        setOpen(isOpen);
        if (!isOpen) setQuery("");
      }}
      className="group/dd relative"
    >
      <summary
        className={cn(
          "flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border px-4 text-[13px] transition-colors select-none [&::-webkit-details-marker]:hidden",
          "focus-visible:outline-ember focus-visible:outline-2 focus-visible:outline-offset-2",
          selected ? "border-ink bg-ink text-paper" : "border-ink/12 bg-sheet text-ink hover:border-ink/30",
          "group-open/dd:ring-ember/40 group-open/dd:ring-2",
        )}
        aria-label={`${name}: ${selected ? selected.label : "all"}`}
      >
        <span className={cn("font-mono text-[11px] tracking-wide uppercase", selected ? "text-mist" : "text-slate")}>{name}</span>
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          {selected && marks && brandMark(selected.label, "size-3.5 shrink-0")}
          <span className="max-w-[9rem] truncate">{selected ? selected.label : "All"}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 transition-transform duration-200 group-open/dd:rotate-180" />
      </summary>

      {/* No box at all while closed (display: none), so nothing hangs off a phone's edge. */}
      <div
        id={id}
        ref={panelRef}
        onKeyDown={onListKey}
        style={{ translate: `${shift}px 0` }}
        className="bg-sheet/95 border-ink/10 shadow-lift absolute top-full left-0 z-40 mt-2 hidden w-[min(20rem,calc(100vw-2rem))] origin-top-left rounded-2xl border p-2 backdrop-blur-xl group-open/dd:block motion-safe:animate-[dd-in_160ms_cubic-bezier(0.2,0.8,0.2,1)]"
      >
        <div className="flex items-baseline justify-between gap-3 px-2 pt-1 pb-2">
          <span className="text-ink text-sm font-semibold">{name}</span>
          {hint && <span className="text-slate text-[11px]">{hint}</span>}
        </div>
        {options.length >= SEARCH_FROM && (
          <label className="border-ink/10 bg-paper focus-within:border-ember/50 mx-1 mb-2 flex items-center gap-2 rounded-xl border px-3">
            <Search aria-hidden="true" className="text-slate size-3.5 shrink-0" />
            <span className="sr-only">Find in {name}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Find in ${name.toLowerCase()}…`} className="text-ink placeholder:text-slate h-9 w-full bg-transparent text-[13px] outline-none" />
          </label>
        )}
        <ul ref={listRef} className="max-h-72 overflow-y-auto overscroll-contain">
          {!query && (
            <li>
              <Option href={allHref} label="All" on={!selected} onPick={close} />
            </li>
          )}
          {shown.map((o) => (
            <li key={o.key}>
              <Option href={o.href} label={o.label} count={o.count} on={selected?.key === o.key} mark={marks ? brandMark(o.label, "size-4 shrink-0") : null} onPick={close} />
            </li>
          ))}
          {shown.length === 0 && <li className="text-slate px-3 py-3 text-[13px]">Nothing matches &ldquo;{query}&rdquo;.</li>}
        </ul>
      </div>
    </details>
  );
}

function Option({ href, label, count, on, mark, onPick }: { href: string; label: string; count?: number; on: boolean; mark?: React.ReactNode; onPick: () => void }) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onPick}
      aria-current={on ? "true" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors outline-none",
        on ? "bg-ink text-paper" : "text-ink hover:bg-ink/[0.05] focus-visible:bg-ink/[0.06]",
      )}
    >
      {mark !== undefined && <span className={cn("grid size-4 shrink-0 place-items-center", on ? "text-paper" : "text-slate")}>{mark}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className={cn("type-data text-[11px]", on ? "text-mist" : "text-slate")}>{count}</span>}
      <Check aria-hidden="true" className={cn("size-3.5 shrink-0", on ? "opacity-100" : "opacity-0")} />
    </Link>
  );
}
