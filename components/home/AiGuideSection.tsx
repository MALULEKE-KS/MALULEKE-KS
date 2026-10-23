// components/home/AiGuideSection.tsx
// Home — the AI guide's own band (docs/AI-GUIDE-PHASE1-PLAN.md §4; rebuilt on the
// owner's choice "A", 2026-10-22, D-043; the premium pass the same day). Its own
// section, clearly apart from the hero: on the left the owner's introduction and
// what makes the answers worth trusting, set as an editorial list; on the right the
// guide itself, ready — the site's mark with its state, what it reads right now
// (live counts), its own self-check, three questions and the box to ask, with
// nothing to open first. Proof instead of adjectives; few boxes, hairlines between.
//
// Asking — here, or from the hero's "Ask the guide" — turns the right side into the
// conversation in place. The conversation's code loads on that first question, so a
// visitor who never asks never downloads it. On a desktop, "/" puts the cursor in
// the box. While the guide is still answering and the band is off screen, a small
// mark in the corner says so and brings the visitor back.

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { HeroLabel } from "@/components/shared/HeroKit";
import { AiBadge } from "@/components/guide/AiBadge";
import { Accent } from "@/components/shared/Accent";
import { useGuide } from "@/components/guide/GuideProvider";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { Composer } from "@/components/guide/console/Composer";
import { GuideMark, useGuideStatus } from "@/components/guide/console/GuideStage";
import { fillKnows, type AiGuideFacts } from "@/lib/home/guide-knows";

export interface AiGuideContent {
  eyebrow: string;
  heading: string;
  lede: string;
  suggestions: string[];
  /** What makes the answers worth trusting — up to three, the owner's wording. */
  points?: { title: string; text: string }[];
  /** The line above the example questions. */
  tryLabel?: string;
  /** What the guide reads right now, with fill-ins {systems} and {synced}; a part whose figure is missing is left out. */
  knowsLine?: string;
  /** Beside the "/" key on a desktop: what it does. Empty shows no hint. */
  shortcutLabel?: string;
}

const GuideConsole = dynamic(() => import("@/components/guide/console/GuideConsole").then((m) => m.GuideConsole), {
  ssr: false,
  loading: () => <div className="h-[min(34rem,calc(100dvh-7rem))] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />,
});

/** The guide before the first question: who it is, what it reads, how it last checked itself, three questions, and the box. */
function AskCard({ content, facts }: { content: AiGuideContent; facts: AiGuideFacts }) {
  const { ownerFirstName } = useGuide();
  const { send, busy, checkNote } = useGuideChat();
  const { label } = useGuideStatus();
  const questions = content.suggestions.slice(0, 3);
  const knows = fillKnows(content.knowsLine, facts);

  // On a desktop, "/" puts the cursor in the box — unless the visitor is already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      const box = document.getElementById("guide-input-home");
      if (!box) return;
      e.preventDefault();
      box.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="bg-night-deep/60 overflow-hidden rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_30px_80px_-40px_rgb(0_0_0/0.9)]">
      <div className="flex items-start gap-3.5 px-5 pt-5 pb-4 sm:px-6">
        <GuideMark className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="text-paper flex items-center gap-2 text-[15px] font-semibold">
            {ownerFirstName}&apos;s AI guide
            <AiBadge />
          </p>
          <p className="text-mist mt-0.5 truncate text-[13px]">{label}</p>
        </div>
      </div>

      {(knows || checkNote) && (
        <dl className="text-mist grid gap-1.5 border-t border-white/[0.07] px-5 py-3.5 text-[13px] sm:px-6">
          {knows && (
            <div>
              <dt className="sr-only">What it reads</dt>
              <dd>{knows}</dd>
            </div>
          )}
          {checkNote && (
            <div className="flex items-start gap-1.5">
              <dt className="sr-only">Its own check</dt>
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <dd>{checkNote}</dd>
            </div>
          )}
        </dl>
      )}

      {questions.length > 0 && (
        <div className="border-t border-white/[0.07]">
          {content.tryLabel && <p className="text-line px-5 pt-4 pb-1 type-micro sm:px-6">{content.tryLabel}</p>}
          <ul className="divide-y divide-white/[0.06]">
            {questions.map((q, i) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => send(q)}
                  disabled={busy}
                  className="group/q focus-visible:outline-ember flex w-full items-start gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:opacity-60 sm:px-6"
                >
                  <span className="type-data text-ember mt-[3px] text-xs">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-paper flex-1 text-[15px] leading-snug">{q}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-line group-hover/q:text-ember mt-0.5 size-4 shrink-0 transition-[transform,color] duration-200 group-hover/q:translate-x-0.5 motion-reduce:transition-none"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-white/[0.07]">
        {content.shortcutLabel && (
          <p className="text-line hidden items-center gap-1.5 px-6 pt-3 text-xs lg:flex">
            <kbd className="text-mist rounded-md border border-white/15 bg-white/[0.04] px-1.5 py-px font-mono text-[11px]">/</kbd>
            {content.shortcutLabel}
          </p>
        )}
        <Composer id="guide-input-home" compact />
      </div>
    </div>
  );
}

export function AiGuideSection({ content, facts }: { content: AiGuideContent; facts: AiGuideFacts }) {
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
  const points = (content.points ?? []).slice(0, 3);

  return (
    <section ref={section} id="ai-guide" aria-labelledby="ai-guide-title" className="bg-night text-paper relative scroll-mt-20 border-t border-white/[0.08]">
      <Container className="py-16 md:py-24">
        {/* Phone: introduction, the guide, then the points. Larger screens: the guide beside both. */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-16 lg:gap-y-12">
          <div className="lg:col-span-5 lg:row-start-1">
            {/* The plain label every section opens with (D-047), the AI label kept in it (BR-4.3). */}
            <HeroLabel>
              <span className="text-ember font-semibold tracking-wide">AI</span>
              <span aria-hidden="true" className="text-line">·</span>
              {content.eyebrow}
            </HeroLabel>
            <h2 id="ai-guide-title" className="type-h2 mt-5 text-balance">
              <Accent text={content.heading} className="type-accent text-ember-gradient pr-[0.06em]" />
            </h2>
            {content.lede && <p className="text-mist mt-5 max-w-[52ch] text-lg leading-relaxed text-pretty">{content.lede}</p>}
          </div>

          {/* Centred against the introduction and the points, so the band ends where its content does. */}
          <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 lg:self-center">
            {live ? <GuideConsole variant="inline" /> : <AskCard content={content} facts={facts} />}
          </div>

          {points.length > 0 && (
            <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08] lg:col-span-5 lg:row-start-2 lg:self-start">
              {points.map((p) => (
                <div key={p.title} className="py-4">
                  <dt className="text-paper text-[15px] font-semibold">{p.title}</dt>
                  <dd className="text-mist mt-1 text-sm leading-relaxed text-pretty">{p.text}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </Container>

      {/* Still answering, out of sight: the guide waits in the corner and brings you back. */}
      <AnimatePresence>
        {busy && !inView && (
          <motion.button
            type="button"
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
            onClick={() => section.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })}
            className="above-dock bg-night/90 text-paper focus-visible:outline-ember fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-white/15 py-1.5 pr-4 pl-1.5 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl focus-visible:outline-2 sm:right-6 sm:bottom-6"
          >
            <GuideMark className="size-10" />
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
