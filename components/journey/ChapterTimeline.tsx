// components/journey/ChapterTimeline.tsx
// Journey's chapters as one editorial column (premium pass, D-050, on the
// owner's advance approval 2026-10-23 — it was alternating cards on a centred
// rail, half of every row empty and the left-side paragraphs right-aligned):
//   - a laptop: the years, the place and "Now" in a margin that stays in view
//     beside its chapter; the rail; the chapter to the right — read straight down
//   - a phone: the rail on the left, the years above each title
//   - the rail's ember beam grows with the scroll (motion useScroll) and each
//     chapter's dot lights when the beam reaches it
//   - the moments as a ruled list (date, title, detail), rising in one after
//     another (Reveal — never hidden without JS)
// No cards, no pills, no shining borders: the words carry the page, with depth
// from the margin's numbers (they fill with ember once reached) and a faint ember
// wash behind the chapters he is living now. Reduced motion: the rail is full,
// nothing moves.

"use client";

import { useRef } from "react";
import Link from "@/components/shared/IntentLink";
import { useScroll, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";
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

/** The chapter's dot on the rail: it lights once the reader's eye (the middle of the screen) reaches it. */
function Dot({ current }: { current: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start center"] });
  const lit = useTransform(scrollYProgress, [0.85, 1], [0, 1]);
  return (
    <span ref={ref} aria-hidden="true" className="relative grid size-4 place-items-center">
      <span className="bg-paper border-line/60 absolute inset-0 rounded-full border-2" />
      <m.span style={{ opacity: lit }} className="bg-ember absolute inset-0 rounded-full shadow-[0_0_0_5px_rgb(255_91_31/0.16)]" />
      {current && <span className="bg-ember/35 absolute -inset-1.5 -z-10 rounded-full motion-safe:animate-ping" />}
    </span>
  );
}

/** The chapter's number in the margin: an outline that fills with ember once the reader reaches it (chapters are a real sequence). */
function Numeral({ n }: { n: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start center"] });
  const lit = useTransform(scrollYProgress, [0.75, 1], [0, 1]);
  const label = String(n).padStart(2, "0");
  return (
    <span ref={ref} aria-hidden="true" className="relative block font-mono text-5xl leading-none font-semibold tracking-tighter">
      <span className="text-transparent [-webkit-text-stroke:1px_rgb(18_20_23/0.18)]">{label}</span>
      <m.span style={{ opacity: lit }} className="text-ember-gradient absolute inset-0">
        {label}
      </m.span>
    </span>
  );
}

/** "Now": a word and a dot — the chapter he is living. */
function Now() {
  return (
    <span className="text-accent inline-flex items-center gap-1.5 text-xs font-semibold">
      <span aria-hidden="true" className="bg-ember size-1.5 rounded-full" />
      Now
    </span>
  );
}

function Chapter({ c }: { c: TimelineChapter }) {
  return (
    <article
      className={cn(
        "relative isolate min-w-0 pb-14 md:pb-20",
        // The chapters he is living now sit on a faint ember wash that fades out from the rail.
        c.current && "before:pointer-events-none before:absolute before:-top-5 before:-left-5 before:-z-10 before:h-[calc(100%-1.5rem)] before:w-[min(100%,48rem)] before:rounded-3xl before:bg-[linear-gradient(100deg,rgb(255_91_31/0.07),rgb(255_181_71/0.03)_45%,transparent_80%)] md:before:-left-8",
      )}
    >
      {/* A phone: the years over the title (the margin is a laptop's). */}
      <p className="text-ink flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[13px] font-semibold md:hidden">
        {c.years}
        {c.current && <Now />}
      </p>
      <h2 className="text-ink mt-2 font-sans text-2xl font-semibold tracking-tight text-balance md:mt-0 md:text-[2rem] md:leading-tight">{c.title}</h2>
      {c.place && <p className="text-slate mt-1.5 text-sm md:hidden">{c.place}</p>}
      <p className="text-ink/80 mt-4 max-w-[62ch] font-serif text-[17px] leading-relaxed md:text-lg">{c.body}</p>
      {c.moments.length > 0 && (
        <ul aria-label={`Moments — ${c.title}`} className="border-ink/12 mt-7 max-w-[62ch] border-t">
          {c.moments.map((m, i) => (
            <li key={m.id} id={`entry-${m.id}`} className="border-ink/12 scroll-mt-32 border-b">
              <Reveal delay={i * 70} className="hover:bg-ink/[0.025] -mx-3 grid grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)] gap-x-4 rounded-lg px-3 py-3.5 transition-colors sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                <span className="text-accent pt-0.5 font-mono text-xs font-medium">{m.when}</span>
                <span className="min-w-0">
                  <span className="text-ink block text-[15px] font-medium">
                    {m.href ? (
                      <Link href={m.href} className="tap-target decoration-ember/40 hover:decoration-ember underline underline-offset-4 transition-colors">
                        {m.title}
                      </Link>
                    ) : (
                      m.title
                    )}
                  </span>
                  {m.detail && <span className="text-slate mt-0.5 block text-sm leading-relaxed">{m.detail}</span>}
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

const BEAM = "linear-gradient(to bottom, var(--color-ember), #ffb547 55%, var(--color-ember))";

export function ChapterTimeline({ chapters }: { chapters: TimelineChapter[] }) {
  const rail = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: rail, offset: ["start 60%", "end 60%"] });
  const grow = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const height = useTransform(grow, (v) => `${Math.min(100, Math.max(0, v * 100))}%`);

  // The rail sits in its own column: 1rem on a phone (left), and after the years' margin on a laptop.
  const railX = "left-2 md:left-[calc(11rem+2.5rem+0.5rem)]";
  return (
    <ol ref={rail} className="relative">
      <span aria-hidden="true" className={cn("bg-ink/12 absolute top-2 bottom-0 w-px", railX)} />
      {/* The same markup on server and client: the moving beam, and a full one that only reduced-motion visitors see. */}
      <m.span aria-hidden="true" style={{ height, backgroundImage: BEAM }} className={cn("absolute top-2 -ml-px w-[3px] rounded-full shadow-[0_0_16px_rgb(255_91_31/0.45)] motion-reduce:hidden", railX)} />
      <span aria-hidden="true" style={{ backgroundImage: BEAM }} className={cn("absolute top-2 bottom-0 -ml-px hidden w-[3px] rounded-full motion-reduce:block", railX)} />
      {chapters.map((c, i) => (
        <li key={c.id} id={`chapter-${c.id}`} className="relative grid scroll-mt-36 grid-cols-[1rem_minmax(0,1fr)] gap-x-5 md:grid-cols-[11rem_1rem_minmax(0,1fr)] md:gap-x-10">
          {/* The margin: years, place and "Now", staying in view beside the chapter (a laptop). */}
          <div className="hidden md:block">
            <div className="sticky top-40 text-right">
              <Numeral n={i + 1} />
              <p className="text-ink mt-3 font-mono text-sm font-semibold">{c.years}</p>
              {c.place && <p className="text-slate mt-1.5 text-[13px] leading-snug">{c.place}</p>}
              {c.current && (
                <p className="mt-2">
                  <Now />
                </p>
              )}
            </div>
          </div>
          <div className="pt-1.5">
            <Dot current={c.current} />
          </div>
          <Chapter c={c} />
        </li>
      ))}
    </ol>
  );
}
