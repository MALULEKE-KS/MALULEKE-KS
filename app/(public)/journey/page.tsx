// app/(public)/journey/page.tsx
// /journey — the timeline (DESIGN-SYSTEM.md v3, #99): one vertical log in the
// ledger's language, grouped by year, filterable by MilestoneType (a lookup —
// EXT-1). Each entry has its own anchor (#entry-<id>) so instant search can
// link straight to it. The PublicTimeline view applies BR-1.12 (an entry about
// a hidden system is never shown) and BR-1.13 (scheduled entries wait).
// See docs/PAGE-SPECIFICATIONS.md ("/journey — Timeline").

import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { dbPublic as db } from "@/lib/db";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";
import { cn } from "@/lib/utils";

// Reads live, admin-editable content — never baked in at build time.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Journey",
  description: "Every milestone, dated — career, study, launches and achievements.",
  alternates: { canonical: "/journey" },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

const CHIP =
  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeType = type ?? null;

  const [milestoneTypes, entries] = await Promise.all([
    db.milestoneType.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    db.publicTimeline.findMany({
      where: activeType ? { milestoneType: activeType } : {},
      orderBy: [{ date: "desc" }, { title: "asc" }],
    }),
  ]);
  const activeLabel = milestoneTypes.find((t) => t.key === activeType)?.label ?? activeType;

  const years = new Map<number, typeof entries>();
  for (const e of entries) {
    const y = e.date.getUTCFullYear();
    years.set(y, [...(years.get(y) ?? []), e]);
  }

  return (
    <>
      <PageHero
        icon={BookOpen}
        eyebrow="Journey"
        title="The journey, dated."
        description="Career, study, launches and achievements — one log, newest first."
      />

      <section className="bg-paper py-12 md:py-16">
        <Container>
          <nav aria-label="Filter by type" className="mb-12 flex flex-wrap gap-2.5">
            <Link
              href="/journey"
              aria-current={!activeType ? "page" : undefined}
              className={cn(
                CHIP,
                !activeType
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/15 bg-sheet text-ink shadow-soft hover:border-ink/30"
              )}
            >
              All
            </Link>
            {milestoneTypes.map((t) => (
              <Link
                key={t.id}
                href={`/journey?type=${encodeURIComponent(t.key)}`}
                aria-current={activeType === t.key ? "page" : undefined}
                className={cn(
                  CHIP,
                  activeType === t.key
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/15 bg-sheet text-ink shadow-soft hover:border-ink/30"
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {entries.length === 0 ? (
            // Plain, not apologetic (spec).
            <p className="border-ink/15 bg-sheet text-ink rounded-3xl border border-dashed px-6 py-16 text-center text-lg">
              {activeType ? `No entries tagged ${activeLabel} yet.` : "No entries yet."}
            </p>
          ) : (
            <div className="space-y-14">
              {[...years.entries()].map(([year, yearEntries]) => (
                <section
                  key={year}
                  aria-labelledby={`year-${year}`}
                  className="grid gap-6 md:grid-cols-12"
                >
                  <h2
                    id={`year-${year}`}
                    className="text-slate font-mono text-2xl font-medium md:col-span-2 md:pt-5"
                  >
                    {year}
                  </h2>
                  <ol className="border-ink/15 relative space-y-5 border-l pl-6 md:col-span-10 md:pl-8">
                    {yearEntries.map((entry, i) => {
                      const typeLabel =
                        milestoneTypes.find((t) => t.key === entry.milestoneType)?.label ??
                        entry.milestoneTypeLabel;
                      return (
                        <li
                          key={entry.id}
                          id={`entry-${entry.id}`}
                          className="relative scroll-mt-24"
                        >
                          <span
                            aria-hidden="true"
                            className="border-paper bg-ember ring-ember/15 absolute top-7 -left-[31px] size-2.5 rounded-full border-2 ring-4 md:-left-[39px]"
                          />
                          <Reveal delay={Math.min(i, 4) * 60}>
                            <article className="border-ink/10 bg-sheet shadow-soft target:ring-ember rounded-2xl border p-6 target:ring-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <time
                                  dateTime={entry.date.toISOString().slice(0, 10)}
                                  className="text-slate font-mono text-xs"
                                >
                                  {formatDate(entry.date)}
                                </time>
                                <span className="bg-ink/[0.06] text-slate rounded-full px-2.5 py-0.5 text-xs font-medium">
                                  {typeLabel}
                                </span>
                              </div>
                              <h3 className="text-ink mt-3 font-sans text-lg font-semibold">
                                {entry.title}
                              </h3>
                              {entry.description && (
                                <p className="text-slate mt-2 font-serif leading-relaxed">
                                  {entry.description}
                                </p>
                              )}
                              {(entry.tags.length > 0 || entry.systemSlug) && (
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  {entry.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="border-ink/10 bg-paper text-slate rounded-full border px-2.5 py-0.5 font-mono text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {entry.systemSlug && (
                                    <Link
                                      href={`/systems/${entry.systemSlug}`}
                                      className="text-accent ml-auto inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                                    >
                                      The system
                                      <ArrowUpRight aria-hidden="true" className="size-4" />
                                    </Link>
                                  )}
                                </div>
                              )}
                            </article>
                          </Reveal>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
