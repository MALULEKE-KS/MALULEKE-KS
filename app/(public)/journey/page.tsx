// app/(public)/journey/page.tsx
// /journey — the owner's life and career, in chapters (owner, 2026-10-02:
// "the journey is about me and my life since day one"). Built to the showcase
// level (owner, 2026-10-03: "at the highest level … showcasing components"),
// with a clear structure underneath so it never gets noisy:
//   1. Hero — ember light rays over graphite; his headline; four live
//      counters from his own data (years on the journey, chapters, milestones,
//      chapters happening now).
//   2. Chapters — a glass chapter bar that sticks while you read (scroll-spy),
//      then a scroll-driven timeline: an ember beam filling the rail, a lit
//      node per chapter, spotlight cards on alternating sides, a shine border
//      on the chapters he's living now, moments fading in one by one.
//   3. What's next — a glass card with a shine border, his ambition, a live
//      "months to go" to what's next, Let's talk and his CV.
// Words are his content block (Admin → Page content → Journey) and the
// page-copy block; dates are his milestones (Admin → Journey); every number is
// computed. No GitHub entries — the systems live on /systems.

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Accent } from "@/components/shared/Accent";
import { LightRays } from "@/components/ui/light-rays";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { DotPattern } from "@/components/ui/dot-pattern";
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

  // Live counters — computed, never typed.
  const stats = [
    { value: Math.max(1, span.now - span.first), label: "years on the journey" },
    { value: chapters.length, label: chapters.length === 1 ? "chapter" : "chapters" },
    { value: chapters.reduce((n, c) => n + c.moments.length, 0) + (ahead?.moments.length ?? 0), label: "milestones" },
    { value: chapters.filter((c) => c.current).length, label: "happening now" },
  ];

  // What's next, counted down from his own milestone (computed in getJourney).
  const next = ahead?.moments[0] ?? null;
  const monthsToGo = ahead?.monthsToNext ?? null;

  return (
    <>
      {/* ─── 1. Hero ─── */}
      <section aria-labelledby="journey-title" className="hero-field text-paper relative overflow-hidden">
        <LightRays count={6} length="85vh" />
        <Container className="relative pt-28 pb-20 md:pt-32 md:pb-24">
          <div className="rise-in">
            <p className="text-mist inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="bg-ember size-1.5 rounded-full" />
              Journey · {span.first} — now
            </p>
          </div>
          <div className="rise-in" style={{ "--rise-delay": "80ms" } as React.CSSProperties}>
            <h1 id="journey-title" className="type-display mt-6 max-w-4xl">
              <Accent text={journey.headline} className="type-accent text-ember-gradient pr-[0.06em]" />
            </h1>
          </div>
          <p className="type-lede text-mist rise-in mt-6 max-w-2xl" style={{ "--rise-delay": "160ms" } as React.CSSProperties}>
            {journey.lede}
          </p>
          <dl className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className="rise-in" style={{ "--rise-delay": `${240 + i * 70}ms` } as React.CSSProperties}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
                  <dd className="type-data text-paper text-4xl font-semibold tracking-tight md:text-5xl">
                    <NumberTicker value={s.value} />
                  </dd>
                  <dt className="text-mist mt-1 text-sm">{s.label}</dt>
                </div>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ─── 2. Chapters ─── */}
      <section aria-label="The chapters" className="bg-paper relative pb-20 md:pb-28">
        <DotPattern width={22} height={22} cr={1} className="pointer-events-none absolute inset-x-0 top-0 h-72 fill-[rgb(11_12_14/0.07)] [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
        <Container className="relative">
          <ChapterNav chapters={timeline.map((c) => ({ id: c.id, years: c.years, title: c.title, current: c.current }))} aheadTitle={ahead?.title ?? null} />
          <ChapterTimeline chapters={timeline} />
        </Container>
      </section>

      {/* ─── 3. What's next ─── */}
      {ahead && (
        <section id="ahead" aria-labelledby="ahead-title" className="hero-field text-paper relative scroll-mt-24 overflow-hidden py-20 md:py-28">
          <Container className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl md:p-12">
              <ShineBorder borderWidth={1.5} duration={16} />
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
                <div className="min-w-0 lg:col-span-8">
                  <p className="text-mist inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                    <span className="border-ember/60 size-2 rounded-full border border-dashed" />
                    {aheadCopy.eyebrow}
                  </p>
                  <h2 id="ahead-title" className="type-h2 mt-4">
                    {ahead.title}
                  </h2>
                  <p className="type-lede text-paper/85 mt-5 max-w-2xl">{ahead.body}</p>
                  {ahead.moments.length > 0 && (
                    <ul className="mt-7 flex flex-wrap gap-2">
                      {ahead.moments.map((m) => (
                        <li key={m.id} id={`entry-${m.id}`} className="rounded-full border border-dashed border-white/25 px-4 py-2 text-sm">
                          <span className="text-ember font-mono">{formatMilestoneDate(m.date, m.precision)}</span> <span className="text-paper">{m.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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
                {next && (
                  <div className="min-w-0 lg:col-span-4">
                    <div className="bg-night/60 rounded-3xl border border-white/10 p-6 text-center">
                      {/* A countdown only when the date is known to the month; a year-only milestone shows its year (never an invented day). */}
                      <p className="type-data text-ember-gradient text-6xl font-semibold tracking-tight md:text-7xl">
                        {monthsToGo !== null && monthsToGo > 0 ? <NumberTicker value={monthsToGo} /> : formatMilestoneDate(next.date, next.precision)}
                      </p>
                      <p className="text-mist mt-2 text-sm">{monthsToGo !== null && monthsToGo > 0 ? `months to go · ${next.title}` : next.title}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
