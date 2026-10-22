// components/home/AiGuideSection.tsx
// Home — the AI guide's own band (docs/AI-GUIDE-PHASE1-PLAN.md §4; rebuilt on the
// owner's choice "A", 2026-10-22, D-043). Its own section, clearly apart from the
// hero: on the left the owner's introduction and what makes the answers worth
// trusting (three points, his wording); on the right the guide itself, ready —
// three questions and the box to ask your own, with nothing to open first.
//
// Asking — here, or from the hero's "Ask the guide" — turns the right side into the
// conversation in place. The conversation's code loads on that first question, so a
// visitor who never asks never downloads it. No portrait, no glows, no moving lines:
// the small bust is the guide's identity, and everything else is the answer.
//
// While the guide is still answering and the band is off screen, a small bust in the
// corner says so and brings the visitor back.

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Database, FileSearch, ShieldCheck, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Accent } from "@/components/shared/Accent";
import { useGuide } from "@/components/guide/GuideProvider";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { Composer } from "@/components/guide/console/Composer";
import { GuideBust, useGuideStatus } from "@/components/guide/console/GuideStage";

export interface AiGuideContent {
  eyebrow: string;
  heading: string;
  lede: string;
  suggestions: string[];
  /** What makes the answers worth trusting — up to three, the owner's wording. */
  points?: { title: string; text: string }[];
  /** The line above the example questions. */
  tryLabel?: string;
}

// One icon per point, in order: where the answers come from, that they show their sources, that the guide never acts for you.
const POINT_ICONS: LucideIcon[] = [Database, FileSearch, ShieldCheck];

const GuideConsole = dynamic(() => import("@/components/guide/console/GuideConsole").then((m) => m.GuideConsole), {
  ssr: false,
  loading: () => <div className="h-[min(34rem,calc(100dvh-7rem))] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />,
});

/** The guide before the first question: who it is, three questions, and the box. */
function AskCard({ content }: { content: AiGuideContent }) {
  const { ownerFirstName } = useGuide();
  const { send, busy } = useGuideChat();
  const { label } = useGuideStatus();
  const questions = content.suggestions.slice(0, 3);
  return (
    <div className="bg-night-deep/70 overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)]">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
        <GuideBust className="size-11" />
        <div className="min-w-0">
          <p className="text-paper flex items-center gap-2 text-sm font-semibold">
            {ownerFirstName}&apos;s AI guide
            <span className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
          </p>
          <p className="text-mist mt-0.5 truncate text-xs">{label}</p>
        </div>
      </div>
      {questions.length > 0 && (
        <div className="px-5 pt-5">
          {content.tryLabel && <p className="text-line mb-3 font-mono text-[11px] tracking-[0.14em] uppercase">{content.tryLabel}</p>}
          <ul className="grid gap-2">
            {questions.map((q, i) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => send(q)}
                  disabled={busy}
                  className="group/q hover:border-ember/40 focus-visible:outline-ember flex w-full items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left text-[15px] leading-snug transition-colors hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
                >
                  <span className="type-data text-ember mt-0.5 text-xs">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-paper flex-1">{q}</span>
                  <ArrowUpRight aria-hidden="true" className="text-mist group-hover/q:text-ember mt-0.5 size-4 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4">
        <Composer id="guide-input-home" />
      </div>
    </div>
  );
}

export function AiGuideSection({ content }: { content: AiGuideContent }) {
  const { enabled, open: askedFromPage, setOpen: setAskedFromPage } = useGuide();
  const { busy, messages, askedAt } = useGuideChat();
  const { label } = useGuideStatus();
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  // The conversation shows once there is one: a question asked now, or one restored from earlier in the visit.
  const live = askedAt !== null || messages.length > 0;

  // Asked to open from elsewhere on the page (the hero's "Ask the guide"): bring the band into view and put the cursor in the box.
  useEffect(() => {
    if (!askedFromPage) return;
    section.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    if (!live) document.getElementById("guide-input-home")?.focus({ preventScroll: true });
    setAskedFromPage(false);
  }, [askedFromPage, setAskedFromPage, reduced, live]);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!enabled) return null;
  const points = (content.points ?? []).slice(0, POINT_ICONS.length);

  return (
    <section ref={section} id="ai-guide" aria-labelledby="ai-guide-title" className="bg-night text-paper relative scroll-mt-20 border-t border-white/[0.08]">
      <Container className="py-16 md:py-24">
        {/* Phone: introduction, the guide, then the points. Larger screens: the guide beside both. */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-10">
          <div className="lg:col-span-5 lg:row-start-1">
            <p className="text-mist inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium">
              <span className="text-ember font-semibold tracking-wide">AI</span>
              <span aria-hidden="true" className="bg-line size-1 rounded-full" />
              {content.eyebrow}
            </p>
            <h2 id="ai-guide-title" className="mt-5 font-sans text-3xl leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl">
              <Accent text={content.heading} className="type-accent text-ember-gradient pr-[0.06em]" />
            </h2>
            {content.lede && <p className="text-mist mt-5 max-w-xl text-lg leading-relaxed">{content.lede}</p>}
          </div>

          <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">{live ? <GuideConsole variant="inline" /> : <AskCard content={content} />}</div>

          {points.length > 0 && (
            <div className="lg:col-span-5 lg:row-start-2">
              <ul className="grid gap-5">
                {points.map((p, i) => {
                  const Icon = POINT_ICONS[i]!;
                  return (
                    <li key={p.title} className="flex gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                        <Icon aria-hidden="true" className="text-ember size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="text-paper block text-[15px] font-semibold">{p.title}</span>
                        <span className="text-mist mt-1 block text-sm leading-relaxed">{p.text}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
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
