// app/(public)/journey/page.tsx
// /journey — unified life/career/academic timeline, ledger-styled, filterable
// by MilestoneType. Candidate home for a richer journey visual — see
// docs/DESIGN-SYSTEM.md v2 §7 (the scale figure now lives in the hero drawing).
// See docs/PAGE-SPECIFICATIONS.md ("/journey — Timeline").

import Link from "next/link";
import { db } from "@/lib/db";
import { PUBLISHED_TIMELINE_WHERE, timelineWithMilestoneType, toTimelineEntry } from "@/lib/rules/timeline";
import { Container } from "@/components/shared/Container";

// Reads live, admin-editable content — must not be statically baked in at
// build time (no DATABASE_URL in CI's build job; same fix as the homepage).
export const dynamic = "force-dynamic";

export const metadata = { title: "Journey" };

function formatDate(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function JourneyPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const activeType = params.type ?? null;

  const [milestoneTypes, entryRows] = await Promise.all([
    db.milestoneType.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    db.timeline.findMany({
      where: { ...PUBLISHED_TIMELINE_WHERE, ...(activeType && { milestoneType: { key: activeType } }) },
      ...timelineWithMilestoneType,
      orderBy: { date: "desc" },
    }),
  ]);

  const entries = entryRows.map(toTimelineEntry);
  const activeLabel = milestoneTypes.find((t) => t.key === activeType)?.label ?? activeType;

  return (
    <Container>
      <section className="max-w-3xl py-16">
        <h1 className="text-ink mb-6 font-sans text-2xl font-semibold">Journey</h1>

        <div className="mb-10 flex flex-wrap gap-2 font-mono text-xs">
          <Link
            href="/journey"
            className={`border px-3 py-2 ${
              !activeType ? "border-accent text-accent" : "border-slate/30 text-slate hover:border-slate"
            }`}
          >
            All
          </Link>
          {milestoneTypes.map((type) => (
            <Link
              key={type.id}
              href={`/journey?type=${type.key}`}
              className={`border px-3 py-2 ${
                activeType === type.key ? "border-accent text-accent" : "border-slate/30 text-slate hover:border-slate"
              }`}
            >
              {type.label}
            </Link>
          ))}
        </div>

        {entries.length === 0 ? (
          <p className="text-slate font-sans">
            {activeType ? `No entries tagged ${activeLabel} yet.` : "No entries yet."}
          </p>
        ) : (
          <ol className="border-slate/20 space-y-8 border-l pl-6">
            {entries.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="bg-ink absolute top-1.5 -left-[27px] h-2 w-2" aria-hidden="true" />
                <p className="text-slate mb-1 font-mono text-xs">{formatDate(entry.date)}</p>
                <h2 className="text-ink font-sans font-medium">{entry.title}</h2>
                {entry.description && (
                  <p className="text-slate mt-1 font-serif text-sm leading-relaxed">{entry.description}</p>
                )}
                {entry.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="border-slate/30 text-slate border px-2 py-0.5 font-mono text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </Container>
  );
}
