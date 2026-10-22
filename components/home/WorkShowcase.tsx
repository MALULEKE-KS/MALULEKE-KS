// components/home/WorkShowcase.tsx
// Home — selected work (PUBLIC-REDESIGN-PLAN §3.3), the second section since the
// premium pass (D-047, owner-approved 2026-10-23: "proof first"). No repeat of
// the hero's counts; every case is a real system with its real signals:
//   - each featured system as a case: one sheet, its live site in a browser
//     frame under a Lens (Magic UI) beside its story — organisation and domain,
//     name, what it is, status, impact figures, the first five technologies
//     with their real marks, 26 weeks of commits as a labelled sparkline, and one
//     row of actions. Sides alternate on a laptop; on a phone the site comes first
//   - "Latest commit" / "Building now": a slim strip — the repository and its
//     latest commits as a live feed (Magic UI Animated List), no screenshot: the
//     visitor is already on this site (D-047, the owner's choice D2)
//   - the other picks as a ruled list whose preview follows the pointer (21st.dev
//     "Project Showcase", adapted — components/ui/project-showcase.tsx)
// Data: lib/queries/work.ts (public views only).

import Link from "next/link";
import { activityText } from "@/lib/rules/activity";
import { ArrowRight, ArrowUpRight, Github, GitCommitHorizontal, Lock, Star } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { HeroLabel } from "@/components/shared/HeroKit";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SystemPreviewFrame } from "@/components/shared/SystemPreviewFrame";
import { Sparkline } from "@/components/shared/Sparkline";
import { techMark } from "@/components/shared/TechChip";
import { Lens } from "@/components/ui/lens";
import { AnimatedList } from "@/components/ui/animated-list";
import { ProjectShowcase } from "@/components/ui/project-showcase";
import type { SelectedWork } from "@/lib/queries/work";
import { Accent } from "@/components/shared/Accent";
import { cn } from "@/lib/utils";

type Work = SelectedWork["featured"][number];

/** How many technologies a case names; the rest are counted, and listed in the case study. */
const STACK_SHOWN = 5;
/** How many commits the strip lists. */
const COMMITS_SHOWN = 3;

function hasActivity(w: Work) {
  return w.weeks.some((n) => n > 0);
}

function FeaturedCase({ w, flip }: { w: Work; flip: boolean }) {
  const meta = [w.organization, w.domain].filter(Boolean).join(" · ");
  const extra = w.techStack.length - STACK_SHOWN;
  return (
    <article className="bg-sheet border-ink/[0.07] shadow-soft group/case relative overflow-hidden rounded-[1.75rem] border transition-shadow duration-500 hover:shadow-lift">
      <div className="grid grid-cols-1 items-center gap-6 p-4 sm:p-6 lg:grid-cols-12 lg:gap-10 lg:p-8">
        <div className={cn("min-w-0 lg:col-span-7", flip && "lg:order-2")}>
          <Lens className="rounded-xl">
            <SystemPreviewFrame screenshotUrl={w.screenshotUrl} liveUrl={w.liveUrl} name={w.name} />
          </Lens>
        </div>

        <div className={cn("min-w-0 px-1 pb-2 sm:px-0 lg:col-span-5 lg:pb-0", flip && "lg:order-1")}>
          {meta && <p className="text-slate font-mono text-xs">{meta}</p>}
          <h3 className="text-ink mt-3 text-[1.75rem] leading-tight font-semibold tracking-tight md:text-[2rem]">
            <Link href={`/systems/${w.slug}`} className="focus-visible:outline-ember rounded-sm decoration-ember/60 underline-offset-[6px] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
              {w.name}
            </Link>
          </h3>
          <p className="text-slate mt-3 max-w-[46ch] leading-relaxed">{w.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {w.isFlagship && (
              <span className="text-accent inline-flex items-center gap-1 text-xs font-medium">
                <Star aria-hidden="true" className="size-3 fill-current" />
                Flagship
              </span>
            )}
            <StatusBadge label={w.status} colorToken={w.statusColorToken} />
          </div>

          {w.impacts.length > 0 && (
            <dl className="border-ink/10 mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5">
              {w.impacts.slice(0, 4).map((i) => (
                <div key={i.label} className="flex flex-col-reverse gap-0.5">
                  <dt className="text-slate text-xs">{i.label}</dt>
                  <dd className="type-data text-ink text-xl font-semibold">{i.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {w.techStack.length > 0 && (
            <ul className="text-ink/85 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]" aria-label="Built with">
              {w.techStack.slice(0, STACK_SHOWN).map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  {techMark(t)}
                  {t}
                </li>
              ))}
              {extra > 0 && <li className="text-slate font-mono text-xs">+{extra}</li>}
            </ul>
          )}

          {hasActivity(w) && (
            <div className="mt-5 flex items-center gap-3">
              <Sparkline values={w.weeks} className="w-28" />
              <span className="text-slate text-xs">
                <span className="text-ink/80 block font-mono text-[11px]">26 weeks of commits</span>
                {activityText(w)}
              </span>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href={`/systems/${w.slug}`}
              className="group/cta bg-ink text-paper hover:shadow-lift focus-visible:outline-ember inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition-[transform,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5"
            >
              Read the case study
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
            </Link>
            {w.liveUrl && (
              <a href={w.liveUrl} target="_blank" rel="noopener noreferrer" className="text-ink/80 hover:text-ink hover:border-ember border-ink/20 inline-flex items-center gap-1 border-b pb-0.5 text-sm transition-colors">
                Live site <ArrowUpRight aria-hidden="true" className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            {w.repoUrl ? (
              <a href={w.repoUrl} target="_blank" rel="noopener noreferrer" className="text-ink/80 hover:text-ink hover:border-ember border-ink/20 inline-flex items-center gap-1.5 border-b pb-0.5 text-sm transition-colors">
                <Github aria-hidden="true" className="size-3.5" /> Code
                <span className="sr-only">(opens GitHub in a new tab)</span>
              </a>
            ) : w.repoPrivate ? (
              <span className="text-slate inline-flex items-center gap-1.5 text-sm">
                <Lock aria-hidden="true" className="size-3.5" /> Private repo
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

/** What's moving: the repository and its latest commits, as one slim graphite strip. */
function CommitStrip({ now, label }: { now: NonNullable<SelectedWork["nowBuilding"]>; label: string | null }) {
  const external = !now.onSite;
  const commits = now.commits.slice(0, COMMITS_SHOWN);
  return (
    <div className="bg-ink text-paper relative overflow-hidden rounded-[1.5rem] border border-white/[0.06] p-5 shadow-lift sm:p-7">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-4">
          {label && (
            <p className="text-mist flex items-center gap-2 font-mono text-xs">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="live-ping bg-ember absolute inset-0 rounded-full" />
                <span className="bg-ember relative size-2 rounded-full" />
              </span>
              {label}
              {now.lastPush && <span className="text-line">· {now.lastPush}</span>}
            </p>
          )}
          <h3 className="mt-3 text-xl font-semibold tracking-tight">{now.name}</h3>
          <p className="text-mist mt-1 text-sm">
            {now.home}
            {now.commitsLast4Weeks > 0 && ` · ${now.commitsLast4Weeks} commits in 4 weeks`}
          </p>
          <a
            href={now.url}
            {...(external && { target: "_blank", rel: "noopener noreferrer" })}
            className="text-paper hover:border-ember mt-5 inline-flex items-center gap-1.5 border-b border-white/25 pb-0.5 text-sm font-medium transition-colors"
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
        {commits.length > 0 && (
          <AnimatedList className="min-w-0 gap-0 lg:col-span-8" delay={420}>
            {commits.map((c) => (
              <div key={c.key} className="flex items-start gap-3 border-b border-white/[0.08] py-3 first:pt-0 last:border-b-0 last:pb-0">
                <GitCommitHorizontal aria-hidden="true" className="text-ember mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm">{c.message}</span>
                <span className="text-line shrink-0 font-mono text-[11px]">{c.when}</span>
              </div>
            ))}
          </AnimatedList>
        )}
      </div>
    </div>
  );
}

/**
 * Selected work on the home page. The systems the owner features (admin:
 * "Featured on home") lead as cases, one under another; then what's moving;
 * then more work.
 */
export function WorkShowcase({ featured, more, nowBuilding, totalPublished, nowLabel }: SelectedWork & { totalPublished: number; /** The owner's wording for the strip ("Building now" / "Latest commit") — empty hides its label. */ nowLabel: string | null }) {
  if (featured.length === 0) return null;
  return (
    <section aria-labelledby="work-title" className="bg-paper py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeader
            copyKey="home.selected-work"
            eyebrow="Selected work"
            id="work-title"
            title={<Accent text="Shipped, running, and *still moving.*" className="type-accent text-ember-gradient pr-[0.06em]" />}
            description="Each system here is read live from this site's data — its status, its stack, and its commits straight from GitHub."
            action={{ href: "/systems", label: `All ${totalPublished} systems` }}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:gap-8">
          {featured.map((w, i) => (
            <Reveal key={w.slug} className="min-w-0" delay={i * 80}>
              <FeaturedCase w={w} flip={i % 2 === 1} />
            </Reveal>
          ))}
          {nowBuilding && (
            <Reveal className="min-w-0" delay={120}>
              <CommitStrip now={nowBuilding} label={nowLabel} />
            </Reveal>
          )}
        </div>

        {more.length > 0 && (
          <Reveal className="mt-16" delay={120}>
            <HeroLabel tone="light" className="mb-3">More work</HeroLabel>
            <ProjectShowcase
              items={more.map((w) => ({
                key: w.slug,
                title: w.name,
                description: w.description,
                href: `/systems/${w.slug}`,
                image: w.screenshotUrl,
                meta: [[w.organization, w.domain].filter(Boolean).join(" · "), hasActivity(w) ? activityText(w) : null].filter(Boolean).join(" · "),
                aside: <StatusBadge label={w.status} colorToken={w.statusColorToken} />,
              }))}
            />
          </Reveal>
        )}
      </Container>
    </section>
  );
}
