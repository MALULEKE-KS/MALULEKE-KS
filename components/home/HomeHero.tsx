// components/home/HomeHero.tsx
// Home, section 1 (DESIGN-SYSTEM.md v3 §7.1). Dual-column hero on the quiet
// graphite field: left — a live-data badge, who, the ledger of real facts,
// what to do next; right — the live system map in a glass window with a
// travelling ember border beam (Magic UI).
//
// Every statement is sourced: numbers are computed per request, the role
// comes from seed data, the organizations from /about. Nothing invented.

import Link from "next/link";
import { ArrowRight, Building2, MapPin, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { Container } from "@/components/shared/Container";
import { LedgerHero } from "@/components/home/LedgerHero";
import { SystemsBlueprint } from "@/components/home/SystemsBlueprint";
import { OWNER, PLATFORM_STACK } from "@/lib/content/sheets";

interface HomeHeroProps {
  stats: { yearsBuilding: number; organizationsFounded: number; systemsShipped: number; systemsQueued: number };
  systems: { slug: string; name: string; status: string; statusColorToken: string; isFlagship: boolean }[];
}

export function HomeHero({ stats, systems }: HomeHeroProps) {
  // The ledger is computed per request, so "as of" is literally now.
  const asOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section aria-labelledby="hero-name" className="hero-field overflow-hidden text-paper">
      <Container className="grid items-center gap-14 py-16 md:py-24 lg:grid-cols-12 lg:gap-12 lg:py-28">
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pl-2.5 pr-3.5 text-xs text-mist backdrop-blur">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="live-ping absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
              <span className="relative size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
            </span>
            Live data, as of {asOf}
          </span>

          <h1 id="hero-name" className="mt-8 font-sans text-lg font-medium text-paper md:text-xl">
            {OWNER.name}
            <span className="mt-1 block text-sm font-normal text-mist md:text-base">{OWNER.role}</span>
          </h1>

          <div className="mt-8">
            <LedgerHero {...stats} />
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
              <Link href="/systems">
                Explore the systems
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="glass" size="lg" className="w-full sm:w-auto">
              <Link href="/contact">
                <MessageSquareText />
                Start a conversation
              </Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-mist">
            <li className="inline-flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 text-line" />
              {OWNER.location}
            </li>
            <li className="inline-flex items-center gap-2">
              <Building2 aria-hidden="true" className="size-4 text-line" />
              KSDRILL-SA &amp; GrowthCore Solutions
            </li>
          </ul>
        </div>

        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                </span>
                <span className="font-mono text-xs text-mist">system-map / published</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-signal-finished-on-dark)_14%,transparent)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-signal-finished-on-dark)]">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                Live
              </span>
            </div>
            <div className="px-4 pb-4 pt-6 sm:px-6">
              <SystemsBlueprint systems={systems} stack={PLATFORM_STACK} ownerLabel={OWNER.initials} />
            </div>
            <BorderBeam size={120} duration={9} colorFrom="#FF5B1F" colorTo="#FFB547" />
          </div>
        </div>
      </Container>
    </section>
  );
}
