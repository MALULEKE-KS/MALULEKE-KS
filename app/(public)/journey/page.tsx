// app/(public)/journey/page.tsx
// /journey — the owner's life and career, in chapters (owner, 2026-10-02:
// "the journey is about me and my life since day one"). Its own idea, in the
// site's family:
//   - a life line under the title: every year from the first chapter to the
//     year ahead, each chapter a segment, "now" pulsing, the future dashed
//   - chapters as cards: number, years and place; his words; and the dated
//     moments inside — milestones shown only as precisely as he gave them.
//     The chapter he's living now glows.
//   - what's next: the ambition, with his CV (while it's on) and Let's talk.
// Words are his content block (Admin → Page content → Journey); dates are his
// milestones (Admin → Journey). No GitHub entries — the systems live on /systems.

import Link from "next/link";
import { ArrowRight, Award, BookOpen, Briefcase, FileText, Flag, GraduationCap, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { Accent } from "@/components/shared/Accent";
import { BorderBeam } from "@/components/ui/border-beam";
import { getJourney, type JourneyMoment } from "@/lib/queries/journey";
import { getUploadedCvLink } from "@/lib/cv/options";
import { formatMilestoneDate } from "@/lib/rules/timeline";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Journey",
  description: "From Basopa Secondary School to building companies — the chapters so far, and what's next.",
  alternates: { canonical: "/journey" },
};

const ICON: Record<string, LucideIcon> = { Education: GraduationCap, Job: Briefcase, Role: Briefcase, Launch: Rocket, Achievement: Award };

function Moment({ m }: { m: JourneyMoment }) {
  const Icon = ICON[m.label] ?? Flag;
  return (
    <li id={`entry-${m.id}`} className="flex scroll-mt-28 gap-3">
      <span className="bg-ink/[0.05] text-ink mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="text-slate block font-mono text-xs">{formatMilestoneDate(m.date, m.precision)}</span>
        <span className="text-ink block font-medium">
          {m.href ? (
            <Link href={m.href} className="decoration-ember/50 underline-offset-4 hover:underline">
              {m.title}
            </Link>
          ) : (
            m.title
          )}
        </span>
        {m.detail && <span className="text-slate block text-sm">{m.detail}</span>}
      </span>
    </li>
  );
}

export default async function JourneyPage() {
  const [journey, cv] = await Promise.all([getJourney(), getUploadedCvLink()]);
  if (!journey) {
    return (
      <section className="bg-paper py-32">
        <Container>
          <p className="text-slate text-center text-lg">The journey is being written.</p>
        </Container>
      </section>
    );
  }
  const { chapters, ahead, span } = journey;
  const years = Array.from({ length: span.last - span.first + 1 }, (_, i) => span.first + i);
  const pct = (y: number) => ((y - span.first) / years.length) * 100;

  return (
    <>
      <section aria-labelledby="journey-title" className="hero-field text-paper overflow-hidden">
        <Container className="pt-28 pb-14 md:pt-32 md:pb-20">
          <span className="text-mist inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
            <BookOpen aria-hidden="true" className="text-ember size-3.5" />
            Journey
          </span>
          <h1 id="journey-title" className="type-display mt-6 max-w-4xl">
            <Accent text={journey.headline} className="type-accent text-ember-gradient pr-[0.06em]" />
          </h1>
          <p className="type-lede text-mist mt-5 max-w-2xl">{journey.lede}</p>

          {/* The life line: every year, each chapter a segment, now pulsing, the future dashed. */}
          <nav aria-label="Chapters" className="mt-14">
            <div className="relative h-14">
              <div aria-hidden="true" className="absolute top-6 right-0 left-0 h-px bg-white/10" />
              {chapters.map((c, i) => {
                const end = c.to ?? span.now;
                return (
                  <a
                    key={c.id}
                    href={`#chapter-${c.id}`}
                    title={`${c.title} — ${c.from}${c.to === c.from ? "" : `–${c.to ?? "now"}`}`}
                    className={cn("absolute h-1.5 rounded-full transition-[filter] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember", c.current ? "bg-ember" : "bg-white/35")}
                    style={{ left: `${pct(c.from)}%`, width: `${Math.max(pct(end + 1) - pct(c.from), 3)}%`, top: `${18 + (i % 2) * 10}px` }}
                  >
                    <span className="sr-only">{c.title}</span>
                  </a>
                );
              })}
              {ahead && span.last > span.now && (
                <span aria-hidden="true" className="absolute top-[22px] h-1.5 rounded-full border border-dashed border-white/40" style={{ left: `${pct(span.now + 1)}%`, width: `${pct(span.last + 1) - pct(span.now + 1)}%` }} />
              )}
              <span aria-hidden="true" className="absolute top-[14px] size-3.5 -translate-x-1/2" style={{ left: `${pct(span.now) + 50 / years.length}%` }}>
                <span className="bg-ember/40 absolute inset-0 rounded-full motion-safe:animate-ping" />
                <span className="bg-ember absolute inset-0.5 rounded-full" />
              </span>
            </div>
            <ol aria-hidden="true" className="text-mist grid font-mono text-[10px] sm:text-xs" style={{ gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))` }}>
              {years.map((y) => (
                <li key={y} className={cn("text-center", y === span.now && "text-ember font-semibold", y > span.now && "text-line")}>
                  <span className="hidden sm:inline">{y}</span>
                  <span className="sm:hidden">&rsquo;{String(y).slice(2)}</span>
                </li>
              ))}
            </ol>
          </nav>
        </Container>
      </section>

      <section aria-label="The chapters" className="bg-paper py-16 md:py-24">
        <Container>
          <ol className="relative space-y-10 md:space-y-14">
            <span aria-hidden="true" className="from-ink/15 via-ink/10 absolute top-4 bottom-4 left-[19px] w-px bg-gradient-to-b to-transparent md:left-[27px]" />
            {chapters.map((c, i) => (
              <li key={c.id} id={`chapter-${c.id}`} className="relative scroll-mt-28 pl-14 md:pl-20">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-2 left-0 grid size-10 place-items-center rounded-full font-mono text-sm font-semibold md:size-14 md:text-base",
                    c.current ? "bg-ember text-ink shadow-glow-ember" : "bg-ink text-paper",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Reveal>
                  <article className={cn("relative overflow-hidden rounded-3xl border p-6 sm:p-8 md:p-10", c.current ? "border-ember/30 bg-sheet shadow-lift" : "border-ink/10 bg-sheet shadow-soft")}>
                    {c.current && <BorderBeam size={140} duration={10} colorFrom="#FF5B1F" colorTo="#FFB547" />}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-accent font-mono text-sm font-medium">
                        {c.from}
                        {c.to === c.from ? "" : ` — ${c.to ?? "now"}`}
                      </span>
                      {c.place && <span className="text-slate text-sm">{c.place}</span>}
                      {c.current && <span className="bg-ember/15 text-accent rounded-full px-2.5 py-0.5 text-xs font-medium">Now</span>}
                    </p>
                    <h2 className="text-ink mt-3 font-sans text-2xl font-semibold tracking-tight md:text-3xl">{c.title}</h2>
                    <p className="text-ink/85 mt-4 max-w-3xl font-serif text-lg leading-relaxed md:text-xl md:leading-relaxed">{c.body}</p>
                    {c.moments.length > 0 && (
                      <ul className="border-ink/10 mt-7 grid gap-4 border-t pt-6 sm:grid-cols-2">
                        {c.moments.map((m) => (
                          <Moment key={m.id} m={m} />
                        ))}
                      </ul>
                    )}
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {ahead && (
        <section aria-labelledby="ahead-title" className="bg-night-deep text-paper relative overflow-hidden py-20 md:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_24rem_at_80%_20%,rgb(255_91_31/0.16),transparent_70%)]" />
          <Container className="relative">
            <p className="text-mist inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
              <Sparkles aria-hidden="true" className="text-ember size-3.5" /> Ahead
            </p>
            <h2 id="ahead-title" className="type-h2 mt-4 max-w-3xl">
              {ahead.title}
            </h2>
            <p className="type-lede text-mist mt-5 max-w-3xl">{ahead.body}</p>
            {ahead.moments.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-3">
                {ahead.moments.map((m) => (
                  <li key={m.id} id={`entry-${m.id}`} className="rounded-full border border-dashed border-white/25 px-4 py-2 text-sm">
                    <span className="text-ember font-mono">{formatMilestoneDate(m.date, m.precision)}</span> <span className="text-paper">{m.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="bg-ember text-ink shadow-glow-ember focus-visible:outline-paper inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
                Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              {cv && (
                <a href={cv.url} className="text-paper inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 font-medium hover:bg-white/10">
                  <FileText aria-hidden="true" className="size-4" /> Get my CV
                </a>
              )}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
