// app/(public)/journey/page.tsx
// /journey — the owner's life and career, in chapters (owner, 2026-10-02:
// "the journey is about me and my life since day one"). Built to the showcase
// level (owner, 2026-10-03: "at the highest level … showcasing components"),
// with a clear structure underneath so it never gets noisy:
//   1. Hero — the shape every inner page shares (D-046): a plain label, his
//      headline and introduction over his Journey image, then one hairline row
//      of live figures from his own data (years on the journey, chapters,
//      milestones, chapters happening now).
//   2. Chapters (premium pass, D-050) — a quiet index that sticks under the
//      header while you read (scroll-spy), then one editorial column: the years
//      and place in a margin beside each chapter, a rail whose ember beam grows
//      with the scroll and lights each chapter's dot, the moments as a ruled list.
//   3. What's next — an open graphite band: his ambition, the actions, and the
//      next milestone once, large — a live "months to go" when its month is
//      known, its year when only the year is.
// Words are his content block (Admin → Page content → Journey) and the
// page-copy block; dates are his milestones (Admin → Journey); every number is
// computed. No GitHub entries — the systems live on /systems.

import Link from "next/link";
import { PageHeroBackdrop } from "@/components/shared/PageHeroBackdrop";
import { ArrowRight, FileText } from "lucide-react";
import { HeroFigures, HeroLabel, type HeroFigure } from "@/components/shared/HeroKit";
import { Container } from "@/components/shared/Container";
import { Accent } from "@/components/shared/Accent";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ChapterNav } from "@/components/journey/ChapterNav";
import { ChapterTimeline, type TimelineChapter } from "@/components/journey/ChapterTimeline";
import { getJourney } from "@/lib/queries/journey";
import { getUploadedCvLink } from "@/lib/cv/options";
import { formatMilestoneDate } from "@/lib/rules/timeline";
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
  const { chapters, ahead, span } = journey;

  // Everything the client timeline needs, dates already formatted as precisely as he gave them.
  const timeline: TimelineChapter[] = chapters.map((c) => ({
    id: c.id,
    years: years(c.from, c.to),
    title: c.title,
    place: c.place,
    body: c.body,
    current: c.current,
    moments: c.moments.map((m) => ({ id: m.id, when: formatMilestoneDate(m.date, m.precision), title: m.title, detail: m.detail, href: m.href })),
  }));

  // Live counters — computed, never typed; a zero is an absence, not a figure.
  const stats = (
    [
      { value: Math.max(1, span.now - span.first), label: "years on the journey" },
      { value: chapters.length, label: chapters.length === 1 ? "chapter" : "chapters" },
      { value: chapters.reduce((n, c) => n + c.moments.length, 0) + (ahead?.moments.length ?? 0), label: "milestones" },
      { value: chapters.filter((c) => c.current).length, label: "happening now", live: true },
    ] satisfies HeroFigure[]
  ).filter((f) => f.value > 0);

  // What's next, counted down from his own milestone (computed in getJourney).
  const next = ahead?.moments[0] ?? null;
  const monthsToGo = ahead?.monthsToNext ?? null;

  return (
    <>
      {/* ─── 1. Hero — the shape every inner page shares (D-046) ─── */}
      <section aria-labelledby="journey-title" className="hero-field text-paper relative isolate overflow-hidden">
        <PageHeroBackdrop purpose="hero-journey" />
        <Container className="relative pt-28 pb-14 md:pt-32 md:pb-20">
          <HeroLabel className="rise-in">
            Journey · {span.first} — now
          </HeroLabel>
          <div className="rise-in" style={{ "--rise-delay": "80ms" } as React.CSSProperties}>
            <h1 id="journey-title" className="type-display mt-6 max-w-4xl">
              <Accent text={journey.headline} className="type-accent text-ember-gradient pr-[0.06em]" />
            </h1>
          </div>
          <p className="type-lede text-mist rise-in mt-6 max-w-2xl" style={{ "--rise-delay": "160ms" } as React.CSSProperties}>
            {journey.lede}
          </p>
          <HeroFigures figures={stats} className="rise-in mt-12 md:mt-16" style={{ "--rise-delay": "240ms" } as React.CSSProperties} />
        </Container>
      </section>

      {/* ─── 2. Chapters ─── */}
      <section aria-label="The chapters" className="bg-paper relative pt-10 pb-12 md:pt-14 md:pb-16">
        <Container className="relative">
          <ChapterNav chapters={timeline.map((c) => ({ id: c.id, years: c.years, title: c.title, current: c.current }))} aheadTitle={ahead?.title ?? null} />
          <ChapterTimeline chapters={timeline} />
        </Container>
      </section>

      {/* ─── 3. What's next — an open band; the next milestone said once (D-050) ─── */}
      {ahead && (
        <section id="ahead" aria-labelledby="ahead-title" className="hero-field text-paper relative scroll-mt-24 overflow-hidden py-20 md:py-28">
          <Container className="relative">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end lg:gap-16">
              <div className="min-w-0 lg:col-span-7">
                <HeroLabel>{aheadCopy.eyebrow}</HeroLabel>
                <h2 id="ahead-title" className="type-h2 mt-5">
                  {ahead.title}
                </h2>
                <p className="type-lede text-paper/85 mt-5 max-w-2xl">{ahead.body}</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link href="/contact" className="press bg-ember text-ink focus-visible:outline-paper inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
                    Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                  {cv && (
                    <a href={cv.url} className="press text-paper inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 font-medium transition-colors hover:bg-white/10">
                      <FileText aria-hidden="true" className="size-4" /> Get my CV
                    </a>
                  )}
                </div>
              </div>
              {next && (
                <div id={`entry-${next.id}`} className="min-w-0 scroll-mt-28 border-t border-white/15 pt-6 lg:col-span-5">
                  {/* A countdown only when the date is known to the month; a year-only milestone shows its year (never an invented day). */}
                  <p className="type-data text-ember-gradient text-7xl font-semibold tracking-tight md:text-8xl">
                    {monthsToGo !== null && monthsToGo > 0 ? <NumberTicker value={monthsToGo} /> : formatMilestoneDate(next.date, next.precision)}
                  </p>
                  <p className="text-mist mt-3 text-sm">{monthsToGo !== null && monthsToGo > 0 ? `months to go · ${next.title}` : next.title}</p>
                  {ahead.moments.length > 1 && (
                    <ul aria-label="Further milestones" className="mt-6 border-t border-white/10">
                      {ahead.moments.slice(1).map((m) => (
                        <li key={m.id} id={`entry-${m.id}`} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 border-b border-white/10 py-3 text-sm">
                          <span className="text-ember font-mono text-xs">{formatMilestoneDate(m.date, m.precision)}</span>
                          <span className="text-paper">{m.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
