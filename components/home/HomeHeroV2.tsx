// components/home/HomeHeroV2.tsx
// Home, section 1 — Direction C, chosen by the owner on 2026-10-20
// (docs/improvements/HOME-HERO-PLAN.md §5–6): the name large, one plain
// statement, two actions, the hero photograph, and the record as a hairline
// ledger. No illustration, no effects: the type is the hero, and the one
// flourish is its scale.
//
// Nothing is typed in here. The name and role are the profile's; the statement,
// every label, the photo's credit and focal point are the owner's "home-hero"
// block (the shipped wording is only a fallback, lib/home/hero.ts); the live
// line and the ledger are computed per request; the entrance's timing is two
// settings. Shown only while the flag "home.hero_v2" is on; the previous hero
// (HomeHero) stays until the sprint review.

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
  liveLine: string;
  copy: HeroCopy;
  ledger: ProofLedgerItem[];
  /** The hero photograph (HeroImage) — null renders nothing, no empty box. */
  image: ReactNode | null;
  entrance: { durationMs: number; staggerMs: number };
}

/** Each part settles in after the one before it (the delay is the part's index × the stagger setting). */
const rise = (i: number): CSSProperties => ({ "--i": i }) as CSSProperties;

export function HomeHeroV2({ name, role, statement, liveLine, copy, ledger, image, entrance }: HomeHeroV2Props) {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-night-deep text-paper overflow-hidden"
      style={heroEntranceVars(entrance.durationMs, entrance.staggerMs) as CSSProperties}
    >
      <Container className="flex flex-col items-center pt-28 pb-14 text-center md:pt-36 md:pb-20">
        <p
          className="hero-rise text-mist inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs backdrop-blur"
          style={rise(0)}
        >
          <span className="relative flex size-2" aria-hidden="true">
            <span className="live-ping absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
            <span className="relative size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
          </span>
          {liveLine}
        </p>

        <h1 id="hero-title" className="hero-rise type-hero-name mt-7 max-w-[22ch]" style={rise(1)}>
          {name}
        </h1>
        <p className="hero-rise text-mist mt-4 text-xl font-medium md:text-3xl" style={rise(2)}>
          {role}
        </p>
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

        {image && (
          <div className="hero-rise mt-14 w-full md:mt-20" style={rise(5)}>
            {image}
          </div>
        )}

        <div className="hero-rise mt-14 w-full md:mt-20" style={rise(6)}>
          <ProofLedger items={ledger} ariaLabel={copy.ledgerAria} />
        </div>
      </Container>
    </section>
  );
}
