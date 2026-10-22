// components/home/HomeHeroV2.tsx
// Home, section 1 — Direction C, chosen by the owner on 2026-10-20
// (docs/improvements/HOME-HERO-PLAN.md §5–6): the name large, one plain
// statement, two actions, the technologies you build with, and the record as a
// frosted bar docked to the bottom — all on one cover image behind the whole
// hero (HeroBackdrop; the owner's direction, same day), the two giving each
// other room: on larger screens the type sits at the left, in the image's quiet
// zone, and the right of the image shows at full strength; on phones the type is
// centred over the image, which shows behind the whole hero under an even veil.
//
// Nothing is typed in here. The name and role are the profile's; the statement,
// every label, the image's credit and focal points are the owner's "home-hero"
// block (the shipped wording is only a fallback, lib/home/hero.ts); the live
// line, the "building now" line, the technologies and the ledger are computed per
// request; the entrance's timing, the overlay, the glow and how many technologies
// show are settings. It is the home hero — the previous one was removed when the
// owner approved the release (D-038).

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AskGuideButton } from "@/components/guide/AskGuideButton";
import { Container } from "@/components/shared/Container";
import { ProofLedger, type ProofLedgerItem } from "@/components/shared/ProofLedger";
import { TechChip } from "@/components/shared/TechChip";
import { Button } from "@/components/ui/button";
import { heroEntranceVars, type HeroCopy } from "@/lib/home/hero";

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
  ledger: ProofLedgerItem[];
  /** The cover image behind everything (HeroBackdrop) — null leaves a graphite field. */
  backdrop: ReactNode | null;
  entrance: { durationMs: number; staggerMs: number };
}

/** Each part settles in after the one before it (the delay is the part's index × the stagger setting). */
const rise = (i: number): CSSProperties => ({ "--i": i }) as CSSProperties;

export function HomeHeroV2({ name, role, statement, credential, liveLine, stack, nowBuilding, copy, ledger, backdrop, entrance }: HomeHeroV2Props) {
  const chip = "text-mist bg-night-deep/50 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 px-3 py-1 font-mono text-xs whitespace-nowrap backdrop-blur";
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-night-deep text-paper relative isolate flex min-h-svh flex-col overflow-hidden md:min-h-[min(100svh,60rem)]"
      style={heroEntranceVars(entrance.durationMs, entrance.staggerMs) as CSSProperties}
    >
      {backdrop}

      <Container className="flex flex-1 flex-col justify-start pt-28 pb-8 md:justify-center md:pt-[5.5rem] md:pb-10">
        {/* One column: centred on a phone, set at the left on larger screens so the image's right side has the room. */}
        <div className="flex max-w-[46rem] flex-col items-center text-center max-md:[text-shadow:0_1px_18px_rgb(11_12_14/0.7)] md:items-start md:text-left">
          <div className="hero-rise flex max-w-full flex-wrap items-center justify-center gap-2 md:justify-start" style={rise(0)}>
            {liveLine && (
              <p className={chip}>
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="live-ping absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
                  <span className="relative size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
                </span>
                <span className="min-w-0 truncate">{liveLine}</span>
              </p>
            )}
            {nowBuilding && (
              <p className={chip}>
                {nowBuilding.label && <span className="text-line shrink-0">{nowBuilding.label}</span>}
                <Link href={nowBuilding.url} className="text-paper hover:text-ember min-w-0 truncate underline-offset-2 hover:underline">
                  {nowBuilding.name}
                </Link>
                {nowBuilding.when && <span className="text-line shrink-0">· {nowBuilding.when}</span>}
              </p>
            )}
          </div>

          <h1 id="hero-title" className="hero-rise type-hero-name mt-6 max-w-[18ch] md:mt-7" style={rise(1)}>
            {name}
          </h1>

          <div className="hero-rise mt-4" style={rise(2)}>
            <p className="text-paper/90 text-xl font-medium md:text-3xl">{role}</p>
            {credential && <p className="text-mist mt-2 max-w-[56ch] text-sm md:text-base">{credential}</p>}
          </div>

          {statement && (
            <p className="hero-rise type-lede text-mist mt-6 max-w-[40ch]" style={rise(3)}>
              {statement}
            </p>
          )}

          {/* The header already carries the CV and Let's talk, so the hero has no CV button (no duplicate). */}
          <div className="hero-rise mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={rise(4)}>
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
                  <li key={tech}>
                    <TechChip name={tech} tone="dark" className="bg-night-deep/55 backdrop-blur" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Container>

      {/* The record, docked to the bottom of the hero as a frosted instrument bar. */}
      {ledger.length > 0 && (
        <div className="hero-rise border-t border-white/15 bg-night-deep/55 backdrop-blur-md" style={rise(6)}>
          <Container className="py-6">
            <ProofLedger items={ledger} ariaLabel={copy.ledgerAria} bare />
          </Container>
        </div>
      )}
    </section>
  );
}
