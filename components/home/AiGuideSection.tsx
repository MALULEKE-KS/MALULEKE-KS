// components/home/AiGuideSection.tsx
// Home — the AI guide's own section (docs/AI-GUIDE-PHASE1-PLAN.md §4, owner
// 2026-10-08): no bar to open and no brochure — the section *is* the guide's
// console, the same conversation the docked panel holds on every other page.
// The heading and one line are the admin-edited "ai-guide" block; what the
// guide does is shown by the console itself (its trail, cards and receipts),
// not claimed in cards beside it.
//
// A question asked from elsewhere on the page (a lens chip in the hero) lands
// here: the section scrolls into view. While the guide is still answering and
// the console is off screen, a small bust in the corner says so and brings the
// visitor back — the character stays visible while it works.

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Container } from "@/components/shared/Container";
import { Accent } from "@/components/shared/Accent";
import { useGuide } from "@/components/guide/GuideProvider";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { GuideConsole } from "@/components/guide/console/GuideConsole";
import { GuideBust, useGuideStatus } from "@/components/guide/console/GuideStage";

export interface AiGuideContent {
  eyebrow: string;
  heading: string;
  lede: string;
  suggestions: string[];
}

export function AiGuideSection({ content }: { content: AiGuideContent }) {
  const { enabled, ready, open, setOpen } = useGuide();
  const { busy } = useGuideChat();
  const { label } = useGuideStatus();
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);

  // Asked from elsewhere on the home page: bring the console into view (there's no panel here).
  useEffect(() => {
    if (!open) return;
    section.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    setOpen(false);
  }, [open, setOpen, reduced]);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!enabled) return null;

  return (
    <section ref={section} id="ai-guide" aria-labelledby="ai-guide-title" className="text-paper bg-night-deep relative scroll-mt-20 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_91_31/0.5),transparent)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(38rem_22rem_at_22%_40%,rgb(255_91_31/0.12),transparent_70%),radial-gradient(30rem_20rem_at_90%_90%,rgb(96_130_170/0.12),transparent_70%)]"
      />

      <Container className="relative py-14 md:py-20">
        <div className="mb-7 max-w-2xl md:mb-9">
          <p className="text-mist flex flex-wrap items-center gap-2 text-xs">
            <span className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
            {content.eyebrow}
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={ready ? "size-1.5 rounded-full bg-[var(--color-signal-finished-on-dark)]" : "bg-line size-1.5 rounded-full"} />
              {ready ? "Online" : "Resting"}
            </span>
          </p>
          <h2 id="ai-guide-title" className="mt-3 text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-[2.25rem]">
            <Accent text={content.heading} className="type-accent text-ember-gradient pr-[0.06em]" />
          </h2>
          {content.lede && <p className="text-mist mt-3 text-[15px] leading-relaxed sm:text-base">{content.lede}</p>}
        </div>

        <GuideConsole variant="inline" />
      </Container>

      {/* Still answering, out of sight: the character waits in the corner and brings you back. */}
      <AnimatePresence>
        {busy && !inView && (
          <motion.button
            type="button"
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
            onClick={() => section.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })}
            className="bg-night/90 text-paper focus-visible:outline-ember fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-white/15 py-1.5 pr-4 pl-1.5 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl focus-visible:outline-2 sm:right-6 sm:bottom-6"
          >
            <GuideBust className="size-11" />
            <span className="min-w-0 text-left">
              <span className="block text-[13px] font-medium">Still answering…</span>
              <span className="text-mist block truncate text-[11px]">{label}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
