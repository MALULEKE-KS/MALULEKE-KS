// components/home/HomeHeroV2.tsx
// Home, section 1 — Direction C, chosen by the owner on 2026-10-20
// (docs/improvements/HOME-HERO-PLAN.md §5–6): the name large, one plain
// statement, two actions and the record as a hairline ledger — all sitting on
// one cover image behind the whole hero (HeroBackdrop; the owner's direction,
// same day). No illustration, no effects: the type is the hero, and the one
// flourish is its scale.
//
// Nothing is typed in here. The name and role are the profile's; the statement,
// every label, the image's credit and focal points are the owner's "home-hero"
// block (the shipped wording is only a fallback, lib/home/hero.ts); the live
// line and the ledger are computed per request; the entrance's timing, the
// overlay and the glow are settings. Shown only while the flag "home.hero_v2"
// is on; the previous hero (HomeHero) stays until the sprint review.

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AskGuideButton } from "@/components/guide/AskGuideButton";
import { Container } from "@/components/shared/Container";
import { ProofLedger, type ProofLedgerItem } from "@/components/shared/ProofLedger";
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
  liveLine: string;
  /** The repository being built right now — null when nothing was pushed lately. */
  nowBuilding: { name: string; url: string; lastPush: string | null } | null;
  copy: HeroCopy;
  ledger: ProofLedgerItem[];
  /** The cover image behind everything (HeroBackdrop) — null leaves a graphite field. */
  backdrop: ReactNode | null;
  entrance: { durationMs: number; staggerMs: number };
}

/** Each part settles in after the one before it (the delay is the part's index × the stagger setting). */
const rise = (i: number): CSSProperties => ({ "--i": i }) as CSSProperties;

export function HomeHeroV2({ name, role, statement, credential, liveLine, nowBuilding, copy, ledger, backdrop, entrance }: HomeHeroV2Props) {
  const chip = "text-mist inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs backdrop-blur";
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-night-deep text-paper relative isolate flex min-h-svh flex-col overflow-hidden md:min-h-[min(100svh,64rem)]"
      style={heroEntranceVars(entrance.durationMs, entrance.staggerMs) as CSSProperties}
    >
      {backdrop}
      <Container className="flex flex-1 flex-col items-center justify-center pt-28 pb-12 text-center md:pt-32 md:pb-16">
        <div className="hero-rise flex flex-wrap items-center justify-center gap-2" style={rise(0)}>
          <p className={chip}>
            <span className="relative flex size-2" aria-hidden="true">
              <span className="live-ping absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
              <span className="relative size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
            </span>
            {liveLine}
          </p>
          {nowBuilding && (
            <p className={chip}>
              <span className="text-line">{copy.nowLabel}</span>
              <Link href={nowBuilding.url} className="text-paper hover:text-ember underline-offset-2 hover:underline">
                {nowBuilding.name}
              </Link>
              {nowBuilding.lastPush && <span className="text-line">· {nowBuilding.lastPush}</span>}
            </p>
          )}
        </div>

        <h1 id="hero-title" className="hero-rise type-hero-name mt-7 max-w-[22ch]" style={rise(1)}>
          {name}
        </h1>
        <p className="hero-rise text-mist mt-4 text-xl font-medium md:text-3xl" style={rise(2)}>
          {role}
        </p>
        {credential && (
          <p className="hero-rise text-line mt-2 max-w-[60ch] text-sm md:text-base" style={rise(2)}>
            {credential}
          </p>
        )}
        {statement && (
          <p className="hero-rise type-lede text-mist mt-5 max-w-[44ch]" style={rise(3)}>
            {statement}
          </p>
        )}

        {/* The header already carries the CV and Let's talk, so the hero has no CV button (no duplicate). */}
        <div className="hero-rise mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={rise(4)}>
          <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
            <Link href="/systems">
              {copy.primaryLabel}
              <ArrowRight />
            </Link>
          </Button>
          <AskGuideButton variant="glass" size="lg" showFace={false} className="w-full sm:w-auto">
            {copy.secondaryLabel}
          </AskGuideButton>
        </div>

        <div className="hero-rise mt-14 w-full md:mt-20" style={rise(5)}>
          <ProofLedger items={ledger} ariaLabel={copy.ledgerAria} />
        </div>
      </Container>
    </section>
  );
}
