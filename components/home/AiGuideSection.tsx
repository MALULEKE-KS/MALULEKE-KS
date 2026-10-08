// components/home/AiGuideSection.tsx
// Home — the AI guide's own section (docs/AI-GUIDE-PHASE1-PLAN.md §4).
// Closed by default (owner, 2026-10-02, kept 2026-10-08: "a collapsable
// dropdown … free scrolling for those who didn't visit for AI"): a glass bar
// with the character's live bust, the heading and three questions. Opening it —
// or asking one of the questions — unfolds the guide's console right here, the
// same conversation the docked panel holds on every other page. The console's
// code loads on first open, so a visitor who never opens it never downloads it.
// An accordion by the book: the heading holds the button, aria-expanded /
// aria-controls; reduced motion opens instantly.
//
// A question asked from elsewhere on the page (a lens chip in the hero) opens
// it and scrolls here. While the guide is still answering and the console is
// off screen, a small bust in the corner says so and brings the visitor back.

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { Container } from "@/components/shared/Container";
import { Accent } from "@/components/shared/Accent";
import { useGuide } from "@/components/guide/GuideProvider";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { GuideBust, useGuideStatus } from "@/components/guide/console/GuideStage";
import { cn } from "@/lib/utils";

export interface AiGuideContent {
  eyebrow: string;
  heading: string;
  lede: string;
  suggestions: string[];
}

const GuideConsole = dynamic(() => import("@/components/guide/console/GuideConsole").then((m) => m.GuideConsole), {
  ssr: false,
  loading: () => <div className="h-[min(36rem,calc(100dvh-7rem))] animate-pulse rounded-3xl bg-white/[0.03] lg:h-[38rem]" />,
});

export function AiGuideSection({ content }: { content: AiGuideContent }) {
  const { enabled, ready, open: askedFromPage, setOpen: setAskedFromPage, ownerFirstName } = useGuide();
  const { busy, send, askedAt } = useGuideChat();
  const { label } = useGuideStatus();
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [inView, setInView] = useState(true);

  // Asked from elsewhere on the home page (there's no panel here): open, and bring the console into view.
  useEffect(() => {
    if (!askedFromPage) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a question was asked from the page: the guide opens
    setOpen(true);
    section.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    setAskedFromPage(false);
  }, [askedFromPage, setAskedFromPage, reduced]);
  // Any question asked opens the guide, wherever it was asked from.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a question was asked: show the answer
    if (askedAt !== null) setOpen(true);
  }, [askedAt]);

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

      <Container className="relative py-14 md:py-16">
        <MagicCard className="rounded-3xl shadow-[0_40px_100px_-50px_rgb(0_0_0/0.95)]" surface="rgb(16 18 22 / 0.94)">
          <div className="flex flex-col p-4 sm:p-6">
            <h2 id="ai-guide-title" className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="ai-guide-panel"
                className="group/bar flex w-full items-center gap-4 rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
              >
                <GuideBust className="size-12 sm:size-14" />
                <span className="min-w-0 flex-1">
                  <span className="text-mist flex flex-wrap items-center gap-2 text-xs font-normal">
                    <span className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
                    {content.eyebrow}
                    <span aria-hidden="true">·</span>
                    {busy ? label : ready ? "Online" : "Resting"}
                  </span>
                  <span className="mt-1 block text-[1.35rem] leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-[1.75rem]">
                    <Accent text={content.heading} className="type-accent text-ember-gradient pr-[0.06em]" />
                  </span>
                </span>
                <span className="text-mist group-hover/bar:text-paper hidden shrink-0 items-center gap-1.5 text-sm transition-colors sm:inline-flex">
                  {open ? "Close" : "Open"}
                  <span className="grid size-9 place-items-center rounded-full border border-white/12 bg-white/[0.04] transition-colors group-hover/bar:border-ember/50">
                    <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")} />
                  </span>
                </span>
                <ChevronDown aria-hidden="true" className={cn("text-mist size-5 shrink-0 transition-transform duration-300 sm:hidden motion-reduce:transition-none", open && "rotate-180")} />
                <span className="sr-only">{open ? `Close ${ownerFirstName}'s AI guide` : `Open ${ownerFirstName}'s AI guide`}</span>
              </button>
            </h2>

            {/* Closed: three questions, one tap from an answer. On phones they scroll sideways. */}
            {!open && content.suggestions.length > 0 && (
              <ul aria-label="Ask a question" className="-mx-4 mt-4 flex gap-2 overflow-x-auto border-t border-white/[0.07] px-4 pt-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 md:flex-wrap md:overflow-visible">
                {content.suggestions.slice(0, 3).map((q) => (
                  <li key={q} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => send(q)}
                      className="group/q hover:border-ember/40 text-mist hover:text-paper inline-flex min-h-10 max-w-[20rem] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                    >
                      <span className="truncate">{q}</span>
                      <ArrowUpRight aria-hidden="true" className="group-hover/q:text-ember size-3.5 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <BorderBeam size={160} duration={12} colorFrom="#FF5B1F" colorTo="#FFB547" />
        </MagicCard>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="ai-guide-panel"
              key="panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-6 md:pt-8">
                {content.lede && <p className="text-mist mb-6 max-w-2xl text-[15px] leading-relaxed sm:text-base">{content.lede}</p>}
                <GuideConsole variant="inline" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
