// app/(public)/journey/page.tsx
// /journey — unified life/career/academic timeline, ledger-styled, filterable
// by MilestoneType. Candidate home for a richer journey visual — see
// docs/DESIGN-SYSTEM.md §7 discussion of the homepage ScaleFigure/LedgerHero.
// See docs/PAGE-SPECIFICATIONS.md ("/journey — Timeline").

import Link from "next/link";
import { db } from "@/lib/db";
import { timelineWithMilestoneType, toTimelineEntry } from "@/lib/rules/timeline";

// Reads live, admin-editable content — must not be statically baked in at
// build time (no DATABASE_URL in CI's build job; same fix as the homepage).
export const dynamic = "force-dynamic";

function formatDate(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const activeType = params.type ?? null;

  const [milestoneTypes, entryRows] = await Promise.all([
    db.milestoneType.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    db.timeline.findMany({
      where: activeType ? { milestoneType: { key: activeType } } : {},
      ...timelineWithMilestoneType,
      orderBy: { date: "desc" },
    }),
  ]);

  const entries = entryRows.map(toTimelineEntry);
  const activeLabel = milestoneTypes.find((t) => t.key === activeType)?.label ?? activeType;

  return (
    <section className="py-16 max-w-3xl">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-6">Journey</h1>

      <div className="flex flex-wrap gap-2 mb-10 font-mono text-xs">
        <Link
          href="/journey"
          className={`px-2 py-1 border ${
            !activeType ? "border-accent text-accent" : "border-slate/30 text-slate hover:border-slate"
          }`}
        >
          All
        </Link>
        {milestoneTypes.map((type) => (
          <Link
            key={type.id}
            href={`/journey?type=${type.key}`}
            className={`px-2 py-1 border ${
              activeType === type.key ? "border-accent text-accent" : "border-slate/30 text-slate hover:border-slate"
            }`}
          >
            {type.label}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="font-sans text-slate">
          {activeType ? `No entries tagged ${activeLabel} yet.` : "No entries yet."}
        </p>
      ) : (
        <ol className="space-y-8 border-l border-slate/20 pl-6">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[27px] top-1.5 w-2 h-2 bg-accent" aria-hidden="true" />
              <p className="font-mono text-xs text-slate mb-1">{formatDate(entry.date)}</p>
              <h2 className="font-sans font-medium text-ink">{entry.title}</h2>
              {entry.description && (
                <p className="font-serif text-sm text-slate mt-1 leading-relaxed">{entry.description}</p>
              )}
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="font-mono text-xs border border-slate/30 text-slate px-2 py-0.5">
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
  );
}
