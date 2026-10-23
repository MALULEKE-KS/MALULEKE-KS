// components/admin/SectionIndex.tsx
// A long admin page's index (D-057): one row of links to its sections that
// sticks under the page bar, the section being read lit as you scroll, the
// row sliding that link into view on a phone. Used by the system editor and
// Page content. Each section only needs an id.

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function SectionIndex({ sections, label = "On this page", className }: { sections: { id: string; label: string }[]; label?: string; className?: string }) {
  const [current, setCurrent] = useState(sections[0]?.id ?? "");
  const row = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    if (els.length === 0) return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = sections.find((s) => seen.get(s.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections]);

  // Keep the lit link in view in the scrolling row (phones).
  useEffect(() => {
    row.current?.querySelector<HTMLElement>(`[data-id="${current}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);

  if (sections.length < 2) return null;
  return (
    <nav data-chrome aria-label={label} className={cn("bg-paper/90 sticky top-14 z-20 -mx-5 mb-6 border-ink/[0.07] border-b px-5 py-2 backdrop-blur md:-mx-8 md:px-8", className)}>
      <ol ref={row} className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              data-id={s.id}
              aria-current={current === s.id ? "location" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
                current === s.id ? "border-ink bg-ink text-paper" : "border-ink/12 bg-sheet text-slate hover:text-ink hover:border-ink/25",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
