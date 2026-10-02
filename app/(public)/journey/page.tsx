// app/(public)/journey/page.tsx
// /journey — the one dated log (PAGE-SPECIFICATIONS "/journey"; PAGE-BUILD-
// PLAYBOOK §9). Its own idea, in the site's family: a single rail through
// time. A year scrubber (sticky beside the rail on wide screens, a swipeable
// strip on phones) jumps between years; on the rail, "Today" pulses at the
// top, anything still ahead (an expected graduation) is drawn dashed, and
// every event wears the icon of what it is — a milestone, a role, study, an
// achievement, a system started or shipped. Every fact comes from the site's
// own data (lib/queries/journey.ts); filters are the kinds actually present.
// Each entry keeps its #entry-<id> anchor so instant search can land on it.

import Link from "next/link";
import { ArrowUpRight, Award, BookOpen, Briefcase, Flag, GraduationCap, Hammer, Rocket, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";
import { getJourney, type JourneyEvent, type JourneyKind } from "@/lib/queries/journey";
import { dbPublic } from "@/lib/db";
import { cn } from "@/lib/utils";
import { formatMilestoneDate } from "@/lib/rules/timeline";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Journey",
  description: "From the first commit to today — roles, study, systems started and shipped, and milestones, dated and sourced.",
  alternates: { canonical: "/journey" },
};

const ICON: Record<JourneyKind, LucideIcon> = { milestone: Flag, role: Briefcase, study: GraduationCap, achievement: Award, shipped: Rocket, started: Hammer };

const CHIP = (on: boolean) =>
  cn(
    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
    on ? "border-ink bg-ink text-paper" : "border-ink/15 bg-sheet text-ink hover:border-ink/35",
  );


function Entry({ e, i }: { e: JourneyEvent; i: number }) {
  const Icon = ICON[e.kind];
  const external = e.href?.startsWith("http");
  return (
    <li id={`entry-${e.id}`} className="relative scroll-mt-28 pl-12 sm:pl-14">
      {/* The node on the rail: solid for what happened, dashed for what's ahead. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-5 left-0 grid size-9 place-items-center rounded-full border-2 sm:size-10",
          e.ahead ? "border-ink/30 bg-paper text-slate border-dashed" : e.kind === "shipped" ? "border-ember bg-ember text-ink" : "border-ink/15 bg-sheet text-ink shadow-soft",
        )}
      >
        <Icon className="size-4" />
      </span>
      <Reveal delay={Math.min(i, 4) * 50}>
        <article className={cn("rounded-2xl border p-5 transition-shadow target:ring-2 target:ring-ember sm:p-6", e.ahead ? "border-ink/15 border-dashed bg-transparent" : "border-ink/10 bg-sheet shadow-soft")}>
          <div className="flex flex-wrap items-center gap-2.5">
            <time dateTime={e.date.toISOString().slice(0, 10)} className="text-slate font-mono text-xs">
              {formatMilestoneDate(e.date, e.precision, "short")}
            </time>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", e.kind === "shipped" ? "bg-ember/15 text-accent" : "bg-ink/[0.06] text-slate")}>{e.label}</span>
          </div>
          <h3 className="text-ink mt-2.5 font-sans text-[1.05rem] leading-snug font-semibold sm:text-lg">{e.title}</h3>
          {e.detail && <p className="text-slate mt-2 font-serif leading-relaxed">{e.detail}</p>}
          {(e.tags.length > 0 || e.href) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {e.tags.map((t) => (
                <span key={t} className="border-ink/10 bg-paper text-slate rounded-full border px-2.5 py-0.5 font-mono text-xs">
                  {t}
                </span>
              ))}
              {e.href && (
                <Link
                  href={e.href}
                  {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                  className="text-accent ml-auto inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                >
                  {e.href.startsWith("/systems/") ? "The system" : "See it"}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              )}
            </div>
          )}
        </article>
      </Reveal>
    </li>
  );
}

export default async function JourneyPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ type }, { events: all, filters }, profile] = await Promise.all([
    searchParams,
    getJourney(),
    dbPublic.publicProfile.findFirst({ select: { buildingSinceYear: true } }),
  ]);
  const active = filters.find((f) => f.key === type) ? type! : null;
  const events = active ? all.filter((e) => e.filter === active) : all;

  // Years, newest first — the scrubber and the rail's sections.
  const years = new Map<number, JourneyEvent[]>();
  for (const e of events) {
    const y = e.date.getUTCFullYear();
    years.set(y, [...(years.get(y) ?? []), e]);
  }
  const yearList = [...years.keys()];
  const since = profile?.buildingSinceYear ?? (all.length ? all[all.length - 1]!.date.getUTCFullYear() : null);
  const today = new Date();

  return (
    <>
      <PageHero
        icon={BookOpen}
        eyebrow="Journey"
        title="From the first commit to today."
        description={
          since
            ? `Building since ${since} — every role, course, system and milestone, dated and taken from this site's own records.`
            : "Every role, course, system and milestone, dated and taken from this site's own records."
        }
      />

      <section className="bg-paper py-12 md:py-16">
        <Container>
          {filters.length > 1 && (
            <nav aria-label="Show only" className="-mx-4 mb-10 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              <Link href="/journey" aria-current={!active ? "page" : undefined} className={CHIP(!active)}>
                All <span className="font-mono text-xs opacity-70">{all.length}</span>
              </Link>
              {filters.map((f) => (
                <Link key={f.key} href={`/journey?type=${encodeURIComponent(f.key)}`} aria-current={active === f.key ? "page" : undefined} className={CHIP(active === f.key)}>
                  {f.label} <span className="font-mono text-xs opacity-70">{f.count}</span>
                </Link>
              ))}
            </nav>
          )}

          {events.length === 0 ? (
            <p className="border-ink/15 bg-sheet text-ink rounded-3xl border border-dashed px-6 py-16 text-center text-lg">Nothing dated here yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[9rem_minmax(0,1fr)] lg:gap-12">
              {/* The year scrubber: a swipeable strip on phones, a sticky column beside the rail on wide screens. */}
              {yearList.length > 1 && (
                <nav aria-label="Jump to a year" className="lg:sticky lg:top-28 lg:self-start">
                  <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:gap-1">
                    {yearList.map((y) => (
                      <li key={y} className="shrink-0">
                        <a href={`#year-${y}`} className="group/y hover:bg-ink/[0.04] focus-visible:outline-ember flex items-baseline gap-2 rounded-xl px-3 py-2 focus-visible:outline-2 lg:px-2">
                          <span className="text-ink font-mono text-lg font-medium lg:text-2xl">{y}</span>
                          <span className="text-slate font-mono text-xs">{years.get(y)!.length}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              <div className={cn("relative min-w-0", yearList.length <= 1 && "lg:col-span-2")}>
                {/* The rail itself — one line through every year. */}
                <span aria-hidden="true" className="from-ember/70 via-ink/15 to-ink/5 absolute top-2 bottom-0 left-[17px] w-px bg-gradient-to-b sm:left-[19px]" />

                {!active && (
                  <div className="relative mb-10 pl-12 sm:pl-14">
                    <span aria-hidden="true" className="absolute top-1 left-0 grid size-9 place-items-center sm:size-10">
                      <span className="bg-ember/30 absolute inset-1 rounded-full motion-safe:animate-ping" />
                      <span className="bg-ember relative size-3 rounded-full ring-4 ring-[var(--color-ember)]/20" />
                    </span>
                    <p className="text-ink font-sans text-lg font-semibold">Today</p>
                    <p className="text-slate text-sm">
                      <time dateTime={today.toISOString().slice(0, 10)}>{today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
                      {" — "}
                      <Link href="/systems" className="text-accent underline-offset-4 hover:underline">
                        what&rsquo;s being built now
                      </Link>
                    </p>
                  </div>
                )}

                <div className="space-y-14">
                  {yearList.map((y) => (
                    <section key={y} aria-labelledby={`year-${y}-title`} className="scroll-mt-28" id={`year-${y}`}>
                      <h2 id={`year-${y}-title`} className="relative pl-12 sm:pl-14">
                        <span className="text-ink/80 font-mono text-3xl font-medium tracking-tight sm:text-4xl">{y}</span>
                      </h2>
                      <ol className="mt-6 space-y-5">
                        {years.get(y)!.map((e, i) => (
                          <Entry key={e.id} e={e} i={i} />
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
