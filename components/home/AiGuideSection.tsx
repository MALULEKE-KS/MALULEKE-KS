// components/home/AiGuideSection.tsx
// Home — the AI guide's own section (PUBLIC-REDESIGN-PLAN §3a; the owner's
// brief, 2026-09-30: the AI part clearly its own, designed at the highest
// level, a showcase of his AI work). Left: what the guide is and what it
// offers a visitor — each shown only while the thing it describes is really
// there (a tool switched on, GitHub data synced), so the page never claims
// what isn't. Its defences (BR-4.6) stay in the code, not on a billboard. Right: the
// console, built from Magic UI pieces converted to the tokens — a Magic Card
// whose border lights up under the pointer with a travelling Border Beam,
// what it knows in Shiny Text (never the model id — that's a private setting), the greeting typed out on view, suggestions
// that blur-fade in one after another, and a composer that glows on focus.
// Asking opens the chat panel.
//
// The copy is the admin-edited "ai-guide" block; the guarantees are the
// enforced rules (BR-4.1–4.6), stated here because they are claims about
// how the code behaves.

"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUp, ArrowUpRight, Compass, Database, GitBranch, Link2, PenLine, Search, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Container } from "@/components/shared/Container";
import { useGuide } from "@/components/guide/GuideProvider";
import { cn } from "@/lib/utils";
import { Accent } from "@/components/shared/Accent";

export interface AiGuideContent {
  eyebrow: string;
  heading: string;
  lede: string;
  suggestions: string[];
}

interface Props {
  content: AiGuideContent;
  /** Which tools are switched on (their flags). */
  tools: { openPage: boolean; searchSystems: boolean; draftInquiry: boolean };
  /** Whether a model provider is connected — otherwise the guide is resting. */
  ready: boolean;
  /** How many public repos the guide knows (PublicGithubRepo). */
  githubRepos: number;
}

export function AiGuideSection({ content, tools, ready, githubRepos }: Props) {
  const { enabled, ownerFirstName, lenses, lens, setLens, ask } = useGuide();
  const [input, setInput] = useState("");
  if (!enabled) return null;

  const guarantees: { icon: LucideIcon; title: string; body: string; on: boolean }[] = [
    { icon: Database, title: "Grounded in live data", body: `Everything it says about ${ownerFirstName} comes from what this site's database publishes. If it isn't there, it says so.`, on: true },
    { icon: Link2, title: "Shows its sources", body: "Facts link to the page they came from, so you can check.", on: true },
    { icon: Compass, title: "Takes you there", body: "It can open the right page for you mid-conversation.", on: tools.openPage },
    { icon: Search, title: "Searches the work", body: "Systems, journey and skills — the same search as ⌘K.", on: tools.searchSystems },
    { icon: PenLine, title: "Drafts, never sends", body: "It can draft your message; only you can send it.", on: tools.draftInquiry },
    { icon: GitBranch, title: "Knows his GitHub", body: "Every public repo in his homes, and what changed in them recently.", on: githubRepos > 0 },
  ];

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    ask(text);
  };

  return (
    <section id="ai-guide" aria-labelledby="ai-guide-title" className="text-paper relative scroll-mt-20 overflow-hidden bg-night-deep">
      {/* A hairline and a soft aurora mark the band as the AI's own space. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_91_31/0.5),transparent)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(38rem_22rem_at_78%_30%,rgb(255_91_31/0.12),transparent_70%),radial-gradient(30rem_20rem_at_10%_90%,rgb(96_130_170/0.12),transparent_70%)]"
      />

      <Container className="relative grid gap-12 py-20 md:py-24 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <p className="border-ember/30 bg-ember/10 text-paper inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <Sparkles aria-hidden="true" className="text-ember size-3.5" />
            {content.eyebrow}
          </p>
          <h2 id="ai-guide-title" className="type-h2 mt-5">
            <Accent text={content.heading} className="type-accent text-ember-gradient pr-[0.06em]" />
          </h2>
          <p className="type-lede text-mist mt-4 max-w-[52ch]">{content.lede}</p>

          <ul className="mt-9 grid gap-3 sm:grid-cols-2 sm:[&>li:last-child:nth-child(odd)]:col-span-2">
            {guarantees
              .filter((g) => g.on)
              .map(({ icon: Icon, title, body }, i) => (
                <li key={title}>
                  <BlurFade delay={0.05 * i} className="h-full">
                    <div className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
                      <span className="border-ember/25 bg-ember/10 grid size-8 place-items-center rounded-lg border">
                        <Icon aria-hidden="true" className="text-ember size-4" />
                      </span>
                      <span className="mt-3 block text-sm font-medium">{title}</span>
                      <span className="text-mist mt-1 block text-[13px] leading-snug">{body}</span>
                    </div>
                  </BlurFade>
                </li>
              ))}
          </ul>
        </div>

        {/* The console. */}
        <BlurFade className="lg:col-span-7" y={14}>
          <MagicCard className="rounded-3xl shadow-[0_50px_120px_-50px_rgb(0_0_0/0.95)]" surface="rgb(16 18 22 / 0.94)">
            <DotPattern
              width={18}
              height={18}
              cr={0.8}
              className="pointer-events-none absolute inset-x-0 top-0 h-48 fill-white/[0.07] [mask-image:linear-gradient(to_bottom,#000,transparent)]"
            />

            <div className="relative flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
              <span className="relative shrink-0">
                {ready && (
                  <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]/30 motion-safe:animate-ping" />
                )}
                <Image src="/character/guide-face.webp" alt="" width={42} height={42} className="relative size-[42px] rounded-full ring-1 ring-white/15" />
                <span aria-hidden="true" className={cn("ring-night absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2", ready ? "bg-[var(--color-signal-finished-on-dark)]" : "bg-line")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {ownerFirstName}&apos;s AI guide
                  <span aria-hidden="true" className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5">
                  <Database aria-hidden="true" className="text-line size-3" />
                  <AnimatedShinyText className="truncate text-[11px]">Knows his systems, journey and GitHub</AnimatedShinyText>
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  ready ? "bg-[color-mix(in_srgb,var(--color-signal-finished-on-dark)_14%,transparent)] text-[var(--color-signal-finished-on-dark)]" : "text-mist bg-white/5",
                )}
              >
                <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-current", ready && "motion-safe:animate-pulse")} />
                {ready ? "Online" : "Resting"}
              </span>
            </div>

            <div className="relative space-y-6 px-5 py-6">
              {/* The guide's opening line, typed out when it comes into view. */}
              <div className="flex items-start gap-3">
                <Image src="/character/guide-face.webp" alt="" width={28} height={28} className="mt-1 size-7 shrink-0 rounded-full ring-1 ring-white/10" />
                <div className="max-w-[46ch]">
                  <p className="text-mist mb-1.5 text-[11px] font-medium tracking-wide uppercase">AI guide</p>
                  <p className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-relaxed">
                    <TypingAnimation>{`Hi — I'm ${ownerFirstName}'s AI guide. I know his systems, his journey and how he builds. What brings you here?`}</TypingAnimation>
                  </p>
                  {lenses.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Pick where to start">
                      {lenses.map((l, i) => (
                        <li key={l.key}>
                          <BlurFade delay={0.25 + 0.06 * i} y={4}>
                            <button
                              type="button"
                              onClick={() => {
                                setLens(l.key);
                                ask(l.label);
                              }}
                              aria-pressed={lens === l.key}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
                                lens === l.key ? "border-ember/60 bg-ember/15 text-paper" : "border-white/12 text-mist hover:text-paper bg-white/5 hover:border-white/30",
                              )}
                            >
                              {l.label}
                            </button>
                          </BlurFade>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <p className="text-mist mb-2.5 text-[11px] font-medium tracking-wide uppercase">Try asking</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {content.suggestions.map((q, i) => (
                    <li key={q}>
                      <BlurFade delay={0.35 + 0.07 * i} className="h-full">
                        <button
                          type="button"
                          onClick={() => ask(q)}
                          className="group/q hover:border-ember/40 relative flex h-full w-full items-start gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-left text-[13px] leading-snug transition-all hover:-translate-y-px hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                        >
                          <span className="type-data text-ember/80 mt-px text-[11px]">{String(i + 1).padStart(2, "0")}</span>
                          <span className="flex-1">{q}</span>
                          <ArrowUpRight aria-hidden="true" className="text-mist group-hover/q:text-ember mt-0.5 size-3.5 shrink-0 transition-all group-hover/q:translate-x-0.5 group-hover/q:-translate-y-0.5" />
                        </button>
                      </BlurFade>
                    </li>
                  ))}
                </ul>
              </div>

              {/* The composer: a gradient ring lights up while it has focus. */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="rounded-2xl bg-white/10 p-px transition-[background] duration-300 focus-within:bg-[linear-gradient(120deg,var(--color-ember),#ffb547,rgb(96_130_170))]"
              >
                <div className="bg-night flex items-center gap-2 rounded-[15px] p-2 pl-4">
                  <Sparkles aria-hidden="true" className="text-ember/70 size-4 shrink-0" />
                  <label htmlFor="ai-guide-input" className="sr-only">
                    Ask the AI guide
                  </label>
                  <input
                    id="ai-guide-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask about ${ownerFirstName}'s work — or anything`}
                    className="placeholder:text-line min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="bg-ember text-ink grid size-9 shrink-0 place-items-center rounded-full shadow-glow-ember transition-[transform,opacity] hover:scale-105 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 motion-reduce:transition-none"
                    aria-label="Ask"
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </form>

              <p className="text-line flex items-center gap-1.5 text-[11px]">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                AI can make mistakes. It answers from this site&apos;s data, and it never sends anything for you.
              </p>
            </div>
            <BorderBeam size={180} duration={11} colorFrom="#FF5B1F" colorTo="#FFB547" />
          </MagicCard>
        </BlurFade>
      </Container>
    </section>
  );
}
