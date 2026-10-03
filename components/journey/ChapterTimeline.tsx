// components/journey/ChapterTimeline.tsx
// Journey's chapters as a scroll-driven timeline (owner, 2026-10-03: "at the
// highest level … showcasing components"). The pattern is 21st.dev's growth-
// story timeline (alternating chapters on a rail that fills as you scroll),
// built from this site's own pieces:
//   - a rail with an ember beam that grows with the scroll (motion useScroll)
//   - a node per chapter that lights when the beam reaches it
//   - each chapter a MagicCard (spotlight under the pointer); the ones he's
//     living now carry a ShineBorder and a pulsing "Now"
//   - moments rising in one after another (Reveal — never hidden without JS)
// Desktop: chapters alternate sides of a centred rail. Phone: one column, the
// rail on the left. Reduced motion: the rail is full, nothing moves.

"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { MagicCard } from "@/components/ui/magic-card";
import { ShineBorder } from "@/components/ui/shine-border";
import { Reveal } from "@/components/shared/Reveal";
import { cn } from "@/lib/utils";

export interface TimelineMoment {
  id: string;
  when: string;
  title: string;
  detail: string | null;
  href: string | null;
}

export interface TimelineChapter {
  id: string;
  years: string;
  title: string;
  place: string | null;
  body: string;
  current: boolean;
  moments: TimelineMoment[];
}

function Node({ index, current }: { index: number; current: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Lights once the reader's eye (the middle of the screen) has reached it.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start center"] });
  const lit = useTransform(scrollYProgress, [0.85, 1], [0, 1]);
  return (
    <span ref={ref} aria-hidden="true" className="relative grid size-11 place-items-center">
      <span className="bg-paper border-ink/15 text-ink absolute inset-0 grid place-items-center rounded-full border font-mono text-xs font-semibold shadow-soft">{String(index + 1).padStart(2, "0")}</span>
      <motion.span style={{ opacity: lit }} className="bg-ember text-ink shadow-glow-ember absolute inset-0 grid place-items-center rounded-full font-mono text-xs font-semibold">
        {String(index + 1).padStart(2, "0")}
      </motion.span>
      {current && <span className="bg-ember/40 absolute -inset-1.5 -z-10 rounded-full motion-safe:animate-ping" />}
    </span>
  );
}

function ChapterCard({ c, side }: { c: TimelineChapter; side: "left" | "right" }) {
  return (
    <MagicCard className="rounded-3xl shadow-soft" surface="var(--color-sheet)" rest="rgb(11 12 14 / 0.1)" spotlight="rgb(255 91 31 / 0.06)" gradientSize={320}>
      {c.current && <ShineBorder borderWidth={1.5} duration={12} />}
      <article className={cn("p-6 sm:p-8", side === "left" && "lg:text-right")}>
        <p className={cn("flex flex-wrap items-center gap-2", side === "left" && "lg:justify-end")}>
          <span className={cn("rounded-full px-3 py-1 font-mono text-xs font-semibold", c.current ? "bg-ember text-ink" : "bg-ink text-paper")}>{c.years}</span>
          {c.place && <span className="text-slate border-ink/10 rounded-full border px-3 py-1 text-xs">{c.place}</span>}
          {c.current && (
            <span className="text-accent inline-flex items-center gap-1.5 text-xs font-medium">
              <span className="relative flex size-2">
                <span className="bg-ember/60 absolute inline-flex size-full rounded-full motion-safe:animate-ping" />
                <span className="bg-ember relative inline-flex size-2 rounded-full" />
              </span>
              Now
            </span>
          )}
        </p>
        <h2 className="text-ink mt-4 font-sans text-2xl font-semibold tracking-tight md:text-3xl">{c.title}</h2>
        <p className="text-ink/80 mt-4 font-serif text-base leading-relaxed sm:text-lg">{c.body}</p>
        {c.moments.length > 0 && (
          <ul aria-label={`Moments — ${c.title}`} className="border-ink/10 mt-6 space-y-3 border-t pt-5 text-left">
            {c.moments.map((m, i) => (
              <li key={m.id} id={`entry-${m.id}`} className="scroll-mt-28">
                <Reveal delay={i * 80}>
                  <div className="bg-paper/70 border-ink/[0.06] flex items-start gap-3 rounded-2xl border px-4 py-3">
                    <span className="text-accent bg-ember/10 mt-0.5 shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium">{m.when}</span>
                    <span className="min-w-0">
                      <span className="text-ink block text-sm font-medium">
                        {m.href ? (
                          <Link href={m.href} className="decoration-ember/40 hover:decoration-ember underline underline-offset-4">
                            {m.title}
                          </Link>
                        ) : (
                          m.title
                        )}
                      </span>
                      {m.detail && <span className="text-slate mt-0.5 block text-sm leading-relaxed">{m.detail}</span>}
                    </span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </article>
    </MagicCard>
  );
}

const BEAM = "linear-gradient(to bottom, var(--color-ember), #ffb547 55%, var(--color-ember))";

export function ChapterTimeline({ chapters }: { chapters: TimelineChapter[] }) {
  const rail = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: rail, offset: ["start 60%", "end 60%"] });
  const grow = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const height = useTransform(grow, (v) => `${Math.min(100, Math.max(0, v * 100))}%`);

  return (
    <ol ref={rail} className="relative space-y-14 md:space-y-20">
      {/* The rail and its beam: left on phones, centred on desktop. */}
      <span aria-hidden="true" className="bg-ink/10 absolute top-0 bottom-0 left-[21px] w-px lg:left-1/2 lg:-translate-x-1/2" />
      {/* The same markup on server and client: the moving beam, and a full one that only reduced-motion visitors see. */}
      <motion.span
        aria-hidden="true"
        style={{ height, backgroundImage: BEAM }}
        className="absolute top-0 left-[20px] w-[3px] rounded-full shadow-[0_0_18px_rgb(255_91_31/0.55)] motion-reduce:hidden lg:left-1/2 lg:-translate-x-1/2"
      />
      <span aria-hidden="true" style={{ backgroundImage: BEAM }} className="absolute top-0 bottom-0 left-[20px] hidden w-[3px] rounded-full motion-reduce:block lg:left-1/2 lg:-translate-x-1/2" />
      {chapters.map((c, i) => {
        const side = i % 2 === 0 ? "left" : "right";
        return (
          <li key={c.id} id={`chapter-${c.id}`} className="relative grid scroll-mt-36 grid-cols-[44px_minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:gap-10">
            <div className={cn("min-w-0", side === "left" ? "col-start-2 lg:col-start-1" : "col-start-2 lg:col-start-3")}>
              <ChapterCard c={c} side={side} />
            </div>
            <div className="col-start-1 row-start-1 flex justify-center pt-6 lg:col-start-2">
              <Node index={i} current={c.current} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
