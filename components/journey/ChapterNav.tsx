// components/journey/ChapterNav.tsx
// The chapters as a quiet index that sticks under the header while you read
// (premium pass, D-050): years and titles as plain text on bone, an ember
// underline on the chapter on screen (scroll-spy via IntersectionObserver) —
// the map of the page, always one tap from any chapter. It rises to the top
// when the header slips away (.under-header). On a phone it scrolls sideways
// inside itself with faded edges, and the chapter you're reading slides into
// view; the page never scrolls sideways.

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface NavChapter {
  id: string;
  years: string;
  title: string;
  current: boolean;
}

export function ChapterNav({ chapters, aheadTitle }: { chapters: NavChapter[]; aheadTitle: string | null }) {
  const [active, setActive] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);

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

  // The chapter being read slides into view inside the index (a phone's narrow bar) — the page itself never moves.
  useEffect(() => {
    const box = list.current;
    const link = active ? box?.querySelector<HTMLElement>(`a[href="#${active}"]`) : null;
    if (!box || !link) return;
    const left = link.offsetLeft - box.clientWidth / 2 + link.offsetWidth / 2;
    box.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [active]);

  const items = [...chapters.map((c) => ({ href: `chapter-${c.id}`, years: c.years, title: c.title, current: c.current })), ...(aheadTitle ? [{ href: "ahead", years: "Next", title: aheadTitle, current: false }] : [])];

  return (
    <nav aria-label="Chapters" className="under-header sticky z-30 mb-12 md:mb-16">
      <ol
        ref={list}
        className="bg-sheet/90 border-ink/10 flex max-w-full gap-1 overflow-x-auto rounded-2xl border px-2 shadow-[0_18px_40px_-28px_rgb(18_20_23/0.55)] backdrop-blur-xl [mask-image:linear-gradient(to_right,transparent,#000_1rem,#000_calc(100%-1rem),transparent)] [scrollbar-width:none] md:w-fit md:[mask-image:none]"
      >
        {items.map((it) => {
          const on = active === it.href;
          return (
            <li key={it.href} className="shrink-0">
              <a
                href={`#${it.href}`}
                aria-current={on ? "location" : undefined}
                className={cn(
                  "group/n press focus-visible:outline-ember relative flex min-h-12 items-center gap-2 px-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2",
                  on ? "text-ink" : "text-slate hover:text-ink",
                )}
              >
                {it.current && <span aria-hidden="true" className="bg-ember size-1.5 rounded-full" />}
                <span className="text-ink font-mono text-xs font-semibold">{it.years}</span>
                <span className="hidden font-medium lg:inline">{it.title}</span>
                <span aria-hidden="true" className={cn("bg-ember absolute inset-x-3 bottom-1.5 h-0.5 rounded-full transition-[opacity,transform] duration-300", on ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0")} />
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
