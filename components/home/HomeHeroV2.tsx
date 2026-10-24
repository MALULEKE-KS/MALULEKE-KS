// components/home/HomeHeroV2.tsx
// Home, section 1 — Direction C, chosen by the owner on 2026-10-20
// (docs/improvements/HOME-HERO-PLAN.md §5–6): the name large, one plain
// statement, two actions (on a phone, the CV and Let's talk), the technologies you build
// with — the record moved to How I build (D-065) — and, since D-069, the Orbit over the cover image:
// every published system around the platform's core, its instrument bar at the hero's foot (the
// receipt and X-ray left the hero; the X-ray is in How it all connects) — all on one cover image behind the whole
// hero (HeroBackdrop; the owner's direction, same day), the two giving each
// other room: on larger screens the type sits at the left, in the image's quiet
// zone, and the right of the image shows at full strength; on phones the type sits
// at the left too (the shape every page shares, D-046/D-047), over the image under
// an even veil. Above the name, one plain live line — a dot and words, no capsules.
//
// Nothing is typed in here. The name and role are the profile's; the statement,
// every label, the image's credit and focal points are the owner's "home-hero"
// block (the shipped wording is only a fallback, lib/home/hero.ts); the live
// line, the "building now" line, the technologies and the ledger are computed per
// request; the entrance's timing, the overlay, the glow and how many technologies
// show are settings. It is the home hero — the previous one was removed when the
// owner approved the release (D-038).

import type { CSSProperties, ReactNode } from "react";
import Link from "@/components/shared/IntentLink";
import { ArrowRight, FileDown } from "lucide-react";
import { AskGuideButton } from "@/components/guide/AskGuideButton";
import { Container } from "@/components/shared/Container";
import { TechChip } from "@/components/shared/TechChip";
import { Button } from "@/components/ui/button";
import { heroEntranceVars, type HeroCopy } from "@/lib/home/hero";
import { cn } from "@/lib/utils";

interface HomeHeroV2Props {
  name: string;
  /** The role line under the name — the profile's headline. */
  role: string;
  /** The owner-edited statement ("home-hero" block); omitted when the block isn't written. */
  statement: string | null;
  /** The qualification under the role (the owner's own titles), when there is one. */
  credential: string | null;
  /** True to where the page runs (live / preview / local) — null when the owner has written no wording for it. */
  liveLine: string | null;
  /** The technologies the systems are built with, most used first (already limited by the setting). */
  stack: string[];
  /** What the owner is building (named by him) or, failing that, the repository with his latest real commit — null when there is neither. */
  nowBuilding: { name: string; url: string; when: string | null; label: string | null } | null;
  copy: HeroCopy;
  /** The phone's two actions (owner, 2026-10-24): the uploaded CV — the phone's header has no room for it — and Let's talk. */
  phoneActions: { cvUrl: string | null; cvLabel: string | null; contactLabel: string | null };
  /** The Orbit (OrbitStage, D-069): the stage beside the words, over the cover photo, and its instrument bar at the hero's foot — or null. */
  orbit: ReactNode | null;
  /** The cover image behind everything (HeroBackdrop) — null leaves a graphite field. */
  backdrop: ReactNode | null;
  entrance: { durationMs: number; staggerMs: number };
}

/** Each part settles in after the one before it (the delay is the part's index × the stagger setting). */
const rise = (i: number): CSSProperties => ({ "--i": i }) as CSSProperties;

export function HomeHeroV2({ name, role, statement, credential, liveLine, stack, nowBuilding, copy, phoneActions, orbit, backdrop, entrance }: HomeHeroV2Props) {
  return (
    <section
      aria-labelledby="hero-title"
      className={cn("bg-night-deep text-paper relative isolate flex min-h-svh flex-col overflow-hidden md:min-h-[min(100svh,60rem)]", orbit && "lg:h-svh lg:min-h-[600px]")}
      style={heroEntranceVars(entrance.durationMs, entrance.staggerMs) as CSSProperties}
    >
      {/* With the Orbit, the photo stays (owner, 2026-10-24), a little dimmer so the Orbit reads over it: the first screen on a phone (the Orbit's band follows the words), the whole hero from lg. */}
      {orbit && backdrop ? <div className="absolute inset-x-0 top-0 -z-10 h-svh brightness-[0.8] lg:inset-y-0 lg:h-auto">{backdrop}</div> : backdrop}

      <Container className={cn("flex flex-1 flex-col justify-start pt-24 pb-6 md:justify-center md:pt-[5.5rem] md:pb-10", orbit && "relative z-10 min-h-0 lg:pointer-events-none lg:pb-6")}>
        {/* One column at the left, so the image's (or the Orbit's) right side has the room; the Orbit keeps clear of it (data-orbit-copy). With the Orbit, the rest of the frame lets clicks through to it. */}
        <div data-orbit-copy="" className={cn("flex max-w-[46rem] flex-col items-start text-left max-md:[text-shadow:0_1px_18px_rgb(11_12_14/0.7)]", orbit && "lg:pointer-events-auto lg:max-w-[min(34rem,40vw)]")}>
          {(liveLine || nowBuilding) && (
            // A phone sets the two facts one under the other; wider screens run them on one line.
            <p className="hero-rise text-mist flex max-w-full flex-col items-start gap-y-1.5 font-mono text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2.5" style={rise(0)}>
              {liveLine && (
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="relative flex size-2 shrink-0" aria-hidden="true">
                    <span className="live-ping absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
                    <span className="relative size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
                  </span>
                  <span className="text-paper/85">{liveLine}</span>
                </span>
              )}
              {liveLine && nowBuilding && <span aria-hidden="true" className="text-line hidden sm:inline">·</span>}
              {nowBuilding && (
                <span className="inline-flex max-w-full min-w-0 flex-wrap items-center gap-x-1.5 max-sm:pl-4">
                  {nowBuilding.label && <span className="text-line">{nowBuilding.label}</span>}
                  <Link href={nowBuilding.url} data-orbit-system={/^\/systems\/([^/?#]+)/.exec(nowBuilding.url)?.[1]} className="tap-target text-paper hover:text-ember decoration-white/30 underline underline-offset-4 transition-colors">
                    {nowBuilding.name}
                  </Link>
                  {nowBuilding.when && <span className="text-line">· {nowBuilding.when}</span>}
                </span>
              )}
            </p>
          )}

          {/* With the Orbit, the name scales with the screen's height too, so the hero and its line fit one screen. */}
          <h1 id="hero-title" className={cn("hero-rise type-hero-name mt-5 max-w-[18ch] md:mt-7", orbit && "lg:mt-5 lg:[font-size:clamp(2.75rem,min(5.2vw,8.6svh),5.5rem)]")} style={rise(1)}>
            {name}
          </h1>

          <div className="hero-rise mt-3 md:mt-4" style={rise(2)}>
            <p className="text-paper/90 text-xl font-medium md:text-3xl">{role}</p>
            {credential && <p className="text-mist mt-2 max-w-[56ch] text-sm md:text-base">{credential}</p>}
          </div>

          {/* The statement is the page's largest paint, so it is there from the first frame — no entrance (D-062). */}
          {statement && (
            <p className="type-lede text-mist mt-4 max-w-[40ch] md:mt-6">
              {statement}
            </p>
          )}

          {/* On a phone: the CV and Let's talk — what a recruiter on a phone came for (the owner's plan, Phase 2; owner,
              2026-10-24: "only in mobile", where the header has no room for the CV). From a tablet up the header carries
              both, and the hero keeps the work and the guide. */}
          {(phoneActions.cvUrl && phoneActions.cvLabel) || phoneActions.contactLabel ? (
            <div className="hero-rise mt-6 grid w-full grid-cols-2 gap-3 sm:hidden" style={rise(4)}>
              {phoneActions.cvUrl && phoneActions.cvLabel && (
                <Button asChild variant="glass" size="lg" className="bg-night-deep/40 w-full backdrop-blur">
                  <a href={phoneActions.cvUrl}>
                    <FileDown />
                    {phoneActions.cvLabel}
                  </a>
                </Button>
              )}
              {phoneActions.contactLabel && (
                <Button asChild variant="accent" size="lg" className={phoneActions.cvUrl && phoneActions.cvLabel ? "w-full" : "col-span-2 w-full"}>
                  <Link href="/contact">
                    {phoneActions.contactLabel}
                    <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          ) : null}

          {/* From a tablet up: the work and the guide — the header carries the CV and Let's talk there. */}
          <div className="hero-rise mt-6 hidden w-auto gap-3 sm:flex md:mt-7" style={rise(4)}>
            {copy.primaryLabel && (
              <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
                <Link href="/systems">
                  {copy.primaryLabel}
                  <ArrowRight />
                </Link>
              </Button>
            )}
            {copy.secondaryLabel && (
              <AskGuideButton variant="glass" size="lg" showMark={false} className="bg-night-deep/40 w-full backdrop-blur sm:w-auto">
                {copy.secondaryLabel}
              </AskGuideButton>
            )}
          </div>

          {/* The technologies: shown when the screen is wide and tall enough to give them room (.hero-tall-only) — a phone's or a short laptop's first view keeps to the essentials. */}
          {stack.length > 0 && (
            <div className="hero-rise hero-tall-only mt-8 flex-col items-start gap-3" style={rise(5)}>
              {copy.stackLabel && <p className="text-mist font-mono text-[11px] tracking-wide">{copy.stackLabel}</p>}
              <ul className="flex flex-wrap gap-2" aria-label={copy.stackLabel ?? undefined}>
                {stack.map((tech) => (
                  <li key={tech} data-orbit-tech={tech}>
                    <TechChip name={tech} tone="dark" className="bg-night-deep/55 backdrop-blur" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Container>

      {orbit}
    </section>
  );
}
