// app/(public)/journey/page.tsx
// /journey — the owner's life and career, in chapters (owner, 2026-10-02:
// "the journey is about me and my life since day one"). Redesigned the same
// day (owner: the first version was "noisy … not professional"): an
// editorial timeline — no cards, no glow, hairlines and type doing the work.
//   1. Hero — his headline and introduction, then the chapters as a row of
//      stops (years and title); the chapters he's living now carry one ember
//      dot, what's next is dashed.
//   2. Chapters — years and place in a sticky column, then the title, his
//      words, and the dated moments inside (milestones shown only as
//      precisely as he gave them).
//   3. What's next — the ambition, the moments ahead, Let's talk and his CV.
// Words are his content block (Admin → Page content → Journey); dates are his
// milestones (Admin → Journey). No GitHub entries — the systems live on /systems.

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Accent } from "@/components/shared/Accent";
import { getJourney, type JourneyMoment } from "@/lib/queries/journey";
import { getUploadedCvLink } from "@/lib/cv/options";
import { formatMilestoneDate } from "@/lib/rules/timeline";
import { cn } from "@/lib/utils";
import { getContentBlock } from "@/lib/content/blocks";
import { pageMetadata } from "@/lib/seo/metadata";
import { sectionCopy } from "@/lib/content/copy";

export const dynamic = "force-dynamic";
// The description is his own introduction to the page (data), never typed here.
export async function generateMetadata() {
  const block = await getContentBlock("journey");
  return pageMetadata({ title: "Journey", description: block?.lede ?? null, path: "/journey", imageAlt: "Journey — MALULEKE-KS" });
}

const years = (from: number, to: number | null) => (to === from ? String(from) : `${from} — ${to ?? "now"}`);

function Moment({ m }: { m: JourneyMoment }) {
  const title = m.href ? (
    <Link href={m.href} className="decoration-ember/40 hover:decoration-ember underline underline-offset-4">
      {m.title}
    </Link>
  ) : (
    m.title
  );
  return (
    <li id={`entry-${m.id}`} className="grid scroll-mt-28 grid-cols-1 gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
      <span className="text-slate font-mono text-xs sm:pt-0.5">{formatMilestoneDate(m.date, m.precision)}</span>
      <span className="min-w-0">
        <span className="text-ink block font-medium">{title}</span>
        {m.detail && <span className="text-slate mt-0.5 block text-sm leading-relaxed">{m.detail}</span>}
      </span>
    </li>
  );
}

export default async function JourneyPage() {
  const [journey, cv, aheadCopy] = await Promise.all([getJourney(), getUploadedCvLink(), sectionCopy("journey.ahead", { eyebrow: "Ahead" })]);
  if (!journey) {
    return (
      <section className="bg-paper py-32">
        <Container>
          <p className="text-slate text-center text-lg">The journey is being written.</p>
        </Container>
      </section>
    );
  }
  const { chapters, ahead } = journey;

  return (
    <>
      {/* ─── 1. Hero ─── */}
      <section aria-labelledby="journey-title" className="hero-field text-paper">
        <Container className="pt-28 pb-14 md:pt-32 md:pb-20">
          <p className="type-eyebrow text-mist">Journey</p>
          <h1 id="journey-title" className="type-display mt-5 max-w-4xl">
            <Accent text={journey.headline} className="type-accent text-ember-gradient pr-[0.06em]" />
          </h1>
          <p className="type-lede text-mist mt-6 max-w-2xl">{journey.lede}</p>

          {/* The chapters as stops — a map of the page, not a second copy of it. */}
          <nav aria-label="Chapters" className="mt-14">
            <ol className="grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/10 pt-6 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
              {chapters.map((c) => (
                <li key={c.id} className="min-w-0">
                  <a href={`#chapter-${c.id}`} className="group block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember">
                    <span className="flex items-center gap-2 font-mono text-xs">
                      <span aria-hidden="true" className={cn("size-1.5 rounded-full", c.current ? "bg-ember" : "bg-white/30")} />
                      <span className={c.current ? "text-ember" : "text-mist"}>{years(c.from, c.to)}</span>
                    </span>
                    <span className="text-paper/90 group-hover:text-paper mt-2 block text-sm font-medium">{c.title}</span>
                    {c.current && <span className="sr-only"> (now)</span>}
                  </a>
                </li>
              ))}
              {ahead && (
                <li className="min-w-0">
                  <a href="#ahead" className="group block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember">
                    <span className="text-line flex items-center gap-2 font-mono text-xs">
                      <span aria-hidden="true" className="size-1.5 rounded-full border border-dashed border-white/50" />
                      Next
                    </span>
                    <span className="text-mist group-hover:text-paper mt-2 block text-sm font-medium">{ahead.title}</span>
                  </a>
                </li>
              )}
            </ol>
          </nav>
        </Container>
      </section>

      {/* ─── 2. Chapters ─── */}
      <section aria-label="The chapters" className="bg-paper py-12 md:py-20">
        <Container>
          <ol className="divide-ink/10 divide-y">
            {chapters.map((c, i) => (
              <li key={c.id} id={`chapter-${c.id}`} className="grid scroll-mt-24 grid-cols-1 gap-6 py-14 first:pt-4 lg:grid-cols-12 lg:gap-10 md:py-16">
                <div className="min-w-0 lg:col-span-4">
                  <div className="lg:sticky lg:top-28">
                    <p className="text-slate font-mono text-xs">{String(i + 1).padStart(2, "0")}</p>
                    <p className={cn("mt-2 font-mono text-2xl font-medium tracking-tight md:text-3xl", c.current ? "text-accent" : "text-ink")}>{years(c.from, c.to)}</p>
                    {c.place && <p className="text-slate mt-2 text-sm">{c.place}</p>}
                    {c.current && (
                      <p className="text-accent mt-3 inline-flex items-center gap-2 text-xs font-medium">
                        <span aria-hidden="true" className="bg-ember size-1.5 rounded-full" /> Now
                      </p>
                    )}
                  </div>
                </div>
                <div className="min-w-0 lg:col-span-8">
                  <h2 className="text-ink font-sans text-2xl font-semibold tracking-tight md:text-3xl">{c.title}</h2>
                  <p className="text-ink/80 mt-5 max-w-3xl font-serif text-lg leading-relaxed md:text-xl md:leading-relaxed">{c.body}</p>
                  {c.moments.length > 0 && (
                    <ul aria-label={`Moments — ${c.title}`} className="divide-ink/10 border-ink/10 mt-8 max-w-3xl divide-y border-t">
                      {c.moments.map((m) => (
                        <Moment key={m.id} m={m} />
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ─── 3. What's next ─── */}
      {ahead && (
        <section id="ahead" aria-labelledby="ahead-title" className="hero-field text-paper scroll-mt-20 py-20 md:py-28">
          <Container className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-4">
              <p className="type-eyebrow text-mist">{aheadCopy.eyebrow}</p>
              <h2 id="ahead-title" className="type-h2 mt-4">
                {ahead.title}
              </h2>
            </div>
            <div className="min-w-0 lg:col-span-8">
              <p className="type-lede text-paper/85 max-w-3xl">{ahead.body}</p>
              {ahead.moments.length > 0 && (
                <ul className="mt-8 max-w-3xl divide-y divide-white/10 border-y border-white/10">
                  {ahead.moments.map((m) => (
                    <li key={m.id} id={`entry-${m.id}`} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                      <span className="text-ember font-mono text-xs sm:pt-0.5">{formatMilestoneDate(m.date, m.precision)}</span>
                      <span className="text-paper">{m.title}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/contact" className="bg-ember text-ink shadow-glow-ember focus-visible:outline-paper inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
                  Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                {cv && (
                  <a href={cv.url} className="text-paper inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 font-medium transition-colors hover:bg-white/10">
                    <FileText aria-hidden="true" className="size-4" /> Get my CV
                  </a>
                )}
              </div>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
