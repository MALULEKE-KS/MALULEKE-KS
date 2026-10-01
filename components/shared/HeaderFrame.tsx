// components/shared/HeaderFrame.tsx
// The header's frame (F5c, D10 — rebuilt at the owner's request, 2026-09-30:
// "it looks like a fixture just put there"). One header, two states:
//   at the top  — a full-width bar that belongs to the page's first band: the
//                 content on the page's grid, a hairline beneath it
//   scrolled    — the same bar gathers into one floating glass capsule, a
//                 little slimmer, with a thin ember line showing how far
//                 through the page you are
// It slips away while you scroll down to read and comes back the moment you
// scroll up (never while something inside it has focus, e.g. the menu).
// Every page opens on a dark band (hero-field), so the top state is always
// legible.

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SCROLLED_AFTER_PX = 16;
const HIDE_AFTER_PX = 320;

export function HeaderFrame({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const progress = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > SCROLLED_AFTER_PX);
      // Only a deliberate scroll changes visibility — small jitters don't.
      if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > HIDE_AFTER_PX);
        lastY = y;
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      data-hidden={hidden || undefined}
      className={cn(
        "group/header pointer-events-none fixed inset-x-0 top-0 z-40 transition-transform duration-300 ease-out motion-reduce:transition-none",
        // Hide on scroll down — unless focus is inside (the open menu, a focused link).
        "data-[hidden]:[&:not(:focus-within)]:-translate-y-[130%]",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto relative mx-auto transition-[max-width,margin,border-radius,background-color,border-color,box-shadow,height] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
          scrolled
            ? "mt-2.5 h-14 w-[calc(100%-1.25rem)] max-w-[70rem] rounded-full border border-white/10 bg-night-deep/75 shadow-[0_18px_50px_-20px_rgb(0_0_0/0.85)] backdrop-blur-xl backdrop-saturate-150"
            : "mt-0 h-[4.25rem] w-full max-w-[100vw] rounded-none border border-transparent border-b-white/[0.07] bg-transparent",
        )}
      >
        <div className={cn("mx-auto flex h-full max-w-6xl items-center justify-between gap-3 transition-[padding] duration-500", scrolled ? "px-2 sm:px-2.5" : "px-6")}>
          {children}
        </div>
        {/* Reading progress: a thin ember line along the capsule's lower edge. */}
        <span
          ref={progress}
          aria-hidden="true"
          style={{ transform: "scaleX(0)" }}
          className={cn(
            "absolute inset-x-8 -bottom-px h-px origin-left bg-[linear-gradient(90deg,var(--color-ember),#ffb547)] transition-opacity duration-300",
            scrolled ? "opacity-80" : "opacity-0",
          )}
        />
      </div>
    </header>
  );
}
