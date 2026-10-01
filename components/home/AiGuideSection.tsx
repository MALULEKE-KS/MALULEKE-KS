// components/home/AiGuideSection.tsx
// Home — the AI guide's own section, closed by default (owner, 2026-10-02:
// "a very beautiful drop-down, not always opened"; EVIDENCE-SPEC §9). The
// closed state is an inviting glass bar: the guide's portrait and status, the
// heading, and three of its suggested questions — a question asks it straight
// away; the bar opens the full guide (what it is, what it can do, the console)
// beneath it. The opened part's code loads on first open, so a visitor who
// never opens it never downloads it. An accordion by the book: the heading
// holds the button, aria-expanded/aria-controls; reduced motion opens instantly.

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { Container } from "@/components/shared/Container";
import { Accent } from "@/components/shared/Accent";
import { useGuide } from "@/components/guide/GuideProvider";
import { cn } from "@/lib/utils";

export interface AiGuideContent {
  eyebrow: string;
  heading: string;
  lede: string;
  suggestions: string[];
}

export interface AiGuideProps {
  content: AiGuideContent;
  /** Which tools are switched on (their flags). */
  tools: { openPage: boolean; searchSystems: boolean; draftInquiry: boolean };
  /** Whether a model provider is connected — otherwise the guide is resting. */
  ready: boolean;
  /** How many public repos the guide knows (PublicGithubRepo). */
  githubRepos: number;
}

const AiGuideExpanded = dynamic(() => import("@/components/home/AiGuideExpanded"), {
  ssr: false,
  loading: () => <div className="h-[28rem] animate-pulse rounded-3xl bg-white/[0.03]" />,
});

export function AiGuideSection(props: AiGuideProps) {
  const { content, ready } = props;
  const { enabled, ownerFirstName, ask } = useGuide();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  if (!enabled) return null;

  return (
    <section id="ai-guide" aria-labelledby="ai-guide-title" className="text-paper relative scroll-mt-20 overflow-hidden bg-night-deep">
      {/* A hairline and a soft aurora mark the band as the AI's own space. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_91_31/0.5),transparent)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(38rem_22rem_at_78%_30%,rgb(255_91_31/0.12),transparent_70%),radial-gradient(30rem_20rem_at_10%_90%,rgb(96_130_170/0.12),transparent_70%)]"
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
                <span className="relative shrink-0">
                  {ready && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]/30 motion-safe:animate-ping" />}
                  <Image src="/character/guide-face.webp" alt="" width={56} height={56} className="relative size-12 rounded-full ring-1 ring-white/15 sm:size-14" />
                  <span aria-hidden="true" className={cn("ring-night absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-2", ready ? "bg-[var(--color-signal-finished-on-dark)]" : "bg-line")} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-mist flex flex-wrap items-center gap-2 text-xs font-normal">
                    <span className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
                    {content.eyebrow}
                    <span aria-hidden="true">·</span>
                    {ready ? "Online" : "Resting"}
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

            {/* Three questions, one tap from an answer — beneath, on one line; on phones they scroll sideways. */}
            {content.suggestions.length > 0 && (
              <ul aria-label="Ask a question" className="-mx-4 mt-4 flex gap-2 overflow-x-auto border-t border-white/[0.07] px-4 pt-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 md:flex-wrap md:overflow-visible">
                {content.suggestions.slice(0, 3).map((q) => (
                  <li key={q} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => ask(q)}
                      className="group/q hover:border-ember/40 text-mist hover:text-paper inline-flex max-w-[20rem] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
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
              <div className="pt-10">
                <AiGuideExpanded {...props} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </section>
  );
}
