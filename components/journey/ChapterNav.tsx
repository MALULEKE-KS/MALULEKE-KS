// components/journey/ChapterNav.tsx
// The chapters as a glass bar that sticks under the header while you read,
// lighting the chapter on screen (scroll-spy via IntersectionObserver) — the
// map of the page, always one tap from any chapter. On phones it scrolls
// sideways inside itself; the page never does.

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface NavChapter {
  id: string;
  years: string;
  title: string;
  current: boolean;
}

export function ChapterNav({ chapters, aheadTitle }: { chapters: NavChapter[]; aheadTitle: string | null }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ids = [...chapters.map((c) => `chapter-${c.id}`), ...(aheadTitle ? ["ahead"] : [])];
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = ids.find((id) => seen.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [chapters, aheadTitle]);

  const items = [...chapters.map((c) => ({ href: `chapter-${c.id}`, years: c.years, title: c.title, current: c.current })), ...(aheadTitle ? [{ href: "ahead", years: "Next", title: aheadTitle, current: false }] : [])];

  return (
    <nav aria-label="Chapters" className="sticky top-16 z-30 -mt-7 mb-12 md:top-20">
      <ol className="bg-night/85 shadow-lift mx-auto flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 p-1.5 backdrop-blur-xl [scrollbar-width:none] sm:w-fit">
        {items.map((it) => {
          const on = active === it.href;
          return (
            <li key={it.href} className="shrink-0">
              <a
                href={`#${it.href}`}
                aria-current={on ? "location" : undefined}
                className={cn(
                  "focus-visible:outline-ember flex items-center gap-2 rounded-full px-3.5 py-2 text-xs transition-colors focus-visible:outline-2",
                  on ? "bg-ember text-ink" : "text-mist hover:text-paper hover:bg-white/5",
                )}
              >
                {it.current && !on && <span aria-hidden="true" className="bg-ember size-1.5 rounded-full" />}
                <span className="font-mono">{it.years}</span>
                <span className="hidden font-medium md:inline">{it.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
