// components/home/WorkShowcase.tsx
// Home — selected work (PUBLIC-REDESIGN-PLAN §3.3), rebuilt 2026-09-30 at the
// owner's request ("the best showcasing, at the highest level"). No repeat of
// the hero's counts; every card is a real system with its real signals:
//   - the featured system, large: its preview under a Lens (Magic UI), status,
//     organisation and domain, impact figures, stack with real brand marks,
//     26 weeks of commits as a sparkline, and its links
//   - "Now building": the owner's most recently active public repo and its
//     latest commits arriving as a live feed (Magic UI Animated List)
//   - the other picks as a list whose preview follows the pointer (21st.dev
//     "Project Showcase", adapted — components/ui/project-showcase.tsx)
// Data: lib/queries/work.ts (public views only).

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Github, GitCommitHorizontal, Layers, Lock, Radio, Star } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SystemPreviewFrame } from "@/components/shared/SystemPreviewFrame";
import { Sparkline } from "@/components/shared/Sparkline";
import { TechChip } from "@/components/shared/TechChip";
import { Lens } from "@/components/ui/lens";
import { MagicCard } from "@/components/ui/magic-card";
import { AnimatedList } from "@/components/ui/animated-list";
import { ProjectShowcase } from "@/components/ui/project-showcase";
import type { SelectedWork } from "@/lib/queries/work";
import { Accent } from "@/components/shared/Accent";

type Work = SelectedWork["work"][number];

function activityLine(w: Work) {
  const parts = [w.commitsLast4Weeks > 0 ? `${w.commitsLast4Weeks} commit${w.commitsLast4Weeks === 1 ? "" : "s"} in 4 weeks` : "Quiet this month", w.lastPush && `last push ${w.lastPush}`];
  return parts.filter(Boolean).join(" · ");
}

function hasActivity(w: Work) {
  return w.weeks.some((n) => n > 0);
}

function FeaturedCard({ w }: { w: Work }) {
  const meta = [w.organization, w.domain].filter(Boolean).join(" / ");
  return (
    <MagicCard className="h-full rounded-3xl shadow-soft" surface="var(--color-sheet)" gradientTo="#ffb547" spotlight="rgb(255 91 31 / 0.05)">
      <article className="flex h-full flex-col p-5 md:p-7">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-slate text-xs font-medium">{meta}</span>
          <span className="flex items-center gap-2">
            {w.isFlagship && (
              <span className="bg-ember/10 text-accent inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <Star aria-hidden="true" className="size-3 fill-current" />
                Flagship
              </span>
            )}
            <StatusBadge label={w.status} colorToken={w.statusColorToken} />
          </span>
        </header>

        <Lens className="mt-5 rounded-xl">
          <SystemPreviewFrame screenshotUrl={w.screenshotUrl} liveUrl={w.liveUrl} name={w.name} />
        </Lens>

        <div className="mt-6 grid flex-1 gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <h3 className="text-ink text-2xl font-semibold tracking-tight md:text-[1.75rem]">{w.name}</h3>
            <p className="text-slate mt-2 max-w-xl leading-relaxed">{w.description}</p>
            {w.techStack.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Stack">
                {w.techStack.map((t) => (
                  <li key={t}>
                    <TechChip name={t} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {w.impacts.length > 0 && (
            <dl className="grid content-start gap-3 md:min-w-44">
              {w.impacts.map((i) => (
                <div key={i.label} className="border-ink/10 rounded-2xl border bg-paper px-4 py-3">
                  <dd className="type-data text-ink text-xl font-semibold">{i.value}</dd>
                  <dt className="text-slate mt-0.5 text-xs">{i.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>

        <footer className="border-ink/10 mt-6 flex flex-col gap-4 border-t pt-5 md:flex-row md:items-center md:justify-between">
          {hasActivity(w) ? (
            <div className="flex items-center gap-3">
              <Sparkline values={w.weeks} className="w-28" />
              <span className="text-slate text-xs">{activityLine(w)}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {w.liveUrl && (
              <a href={w.liveUrl} target="_blank" rel="noopener noreferrer" className="text-slate hover:text-ink inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm transition-colors hover:bg-ink/5">
                Live <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </a>
            )}
            {w.repoUrl ? (
              <a href={w.repoUrl} target="_blank" rel="noopener noreferrer" className="text-slate hover:text-ink inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm transition-colors hover:bg-ink/5">
                <Github aria-hidden="true" className="size-3.5" /> Code
              </a>
            ) : w.repoPrivate ? (
              <span className="text-slate inline-flex h-9 items-center gap-1.5 px-3 text-sm">
                <Lock aria-hidden="true" className="size-3.5" /> Private repo
              </span>
            ) : null}
            <Link
              href={`/systems/${w.slug}`}
              className="group/cta bg-ink text-paper hover:shadow-lift focus-visible:outline-ember inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-[transform,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5"
            >
              Read the case study
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
            </Link>
          </div>
        </footer>
      </article>
    </MagicCard>
  );
}

function NowBuildingCard({ now }: { now: NonNullable<SelectedWork["nowBuilding"]> }) {
  const external = !now.onSite;
  return (
    <div className="bg-night text-paper shadow-lift relative h-full overflow-hidden rounded-3xl border border-white/10 p-5 md:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.22),transparent)]" />
      <p className="text-mist relative flex items-center gap-2 text-xs font-medium">
        <span className="relative flex size-2" aria-hidden="true">
          <span className="live-ping absolute inset-0 rounded-full bg-ember" />
          <span className="relative size-2 rounded-full bg-ember" />
        </span>
        <Radio aria-hidden="true" className="size-3.5" />
        Now building
      </p>
      <h3 className="relative mt-4 text-xl font-semibold tracking-tight">{now.name}</h3>
      <p className="text-mist relative mt-1 text-xs">
        {now.home} · last push {now.lastPush}
        {now.commitsLast4Weeks > 0 && ` · ${now.commitsLast4Weeks} commits in 4 weeks`}
      </p>

      {now.commits.length > 0 && (
        <AnimatedList className="relative mt-5">
          {now.commits.map((c) => (
            <div key={c.key} className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5">
              <GitCommitHorizontal aria-hidden="true" className="text-ember mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{c.message}</span>
                <span className="text-line block text-[11px]">{c.when}</span>
              </span>
            </div>
          ))}
        </AnimatedList>
      )}

      <a
        href={now.url}
        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
        className="text-paper hover:text-ember relative mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
      >
        {external ? (
          <>
            <Github aria-hidden="true" className="size-4" /> {now.fullName}
          </>
        ) : (
          "See the system"
        )}
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </a>
    </div>
  );
}

function CompactCard({ w }: { w: Work }) {
  return (
    <MagicCard className="h-full rounded-3xl shadow-soft" surface="var(--color-sheet)" spotlight="rgb(255 91 31 / 0.05)">
      <Link href={`/systems/${w.slug}`} className="group/c flex h-full flex-col p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember">
        <span className="flex items-center justify-between gap-2">
          <span className="text-slate truncate text-xs">{[w.organization, w.domain].filter(Boolean).join(" / ")}</span>
          <StatusBadge label={w.status} colorToken={w.statusColorToken} />
        </span>
        <span className="text-ink mt-4 flex items-center gap-1.5 text-lg font-semibold tracking-tight">
          {w.name}
          <ArrowUpRight aria-hidden="true" className="text-slate group-hover/c:text-accent size-4 transition-all group-hover/c:translate-x-0.5 group-hover/c:-translate-y-0.5" />
        </span>
        <span className="text-slate mt-1.5 line-clamp-2 text-sm leading-relaxed">{w.description}</span>
        {w.techStack.length > 0 && (
          <span className="mt-4 flex flex-wrap gap-1.5">
            {w.techStack.slice(0, 3).map((t) => (
              <TechChip key={t} name={t} />
            ))}
          </span>
        )}
        {hasActivity(w) && (
          <span className="border-ink/10 mt-auto flex items-center gap-3 border-t pt-4">
            <Sparkline values={w.weeks} className="w-20" />
            <span className="text-slate text-[11px]">{activityLine(w)}</span>
          </span>
        )}
      </Link>
    </MagicCard>
  );
}

export function WorkShowcase({ work, nowBuilding, totalPublished }: SelectedWork & { totalPublished: number }) {
  const [featured, ...rest] = work;
  if (!featured) return null;
  // Now building sits beside the featured system; if there's no recent activity, the next pick takes its place.
  const side = nowBuilding ? null : rest.shift() ?? null;

  return (
    <section aria-labelledby="work-title" className="bg-paper py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeader
            icon={Layers}
            eyebrow="Selected work"
            id="work-title"
            title={<Accent text="Shipped, running, and *still moving.*" className="type-accent text-ember-gradient pr-[0.06em]" />}
            description="Each system here is read live from this site's data — its status, its stack, and its commits straight from GitHub."
            action={{ href: "/systems", label: `All systems (${totalPublished})` }}
          />
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <FeaturedCard w={featured} />
          </Reveal>
          <Reveal className="lg:col-span-4" delay={100}>
            {nowBuilding ? <NowBuildingCard now={nowBuilding} /> : side ? <CompactCard w={side} /> : null}
          </Reveal>
        </div>

        {rest.length > 0 && (
          <Reveal className="mt-14" delay={150}>
            <p className="text-slate mb-2 font-mono text-xs tracking-wide uppercase">More work</p>
            <ProjectShowcase
              items={rest.map((w) => ({
                key: w.slug,
                title: w.name,
                description: w.description,
                href: `/systems/${w.slug}`,
                image: w.screenshotUrl,
                meta: [[w.organization, w.domain].filter(Boolean).join(" / "), hasActivity(w) ? activityLine(w) : null].filter(Boolean).join(" · "),
                aside: <StatusBadge label={w.status} colorToken={w.statusColorToken} />,
              }))}
            />
          </Reveal>
        )}
      </Container>
    </section>
  );
}
