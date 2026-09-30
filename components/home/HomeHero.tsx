// components/home/HomeHero.tsx
// Home, section 1 (DESIGN-SYSTEM.md v3 §7.1). Dual-column hero on the quiet
// graphite field: left — a live-data badge, who, the ledger of real facts,
// what to do next; right — the live system map in a glass window with a
// travelling ember border beam (Magic UI).
//
// Every statement is sourced: numbers are computed per request; the name,
// role and location come from the admin-editable profile, the organizations
// from the owner's affiliations (#99). Nothing invented, nothing in code.

import Link from "next/link";
import { ArrowRight, Building2, MapPin, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { Container } from "@/components/shared/Container";
import { LedgerHero } from "@/components/home/LedgerHero";
import { SystemsBlueprint } from "@/components/home/SystemsBlueprint";
import { PLATFORM_STACK } from "@/lib/content/sheets";
import type { Affiliation, SiteProfile } from "@/lib/queries/site";

interface HomeHeroProps {
  stats: {
    yearsBuilding: number;
    organizationsFounded: number;
    systemsShipped: number;
    systemsBuilding: number;
    systemsQueued: number;
  };
  systems: {
    slug: string;
    name: string;
    status: string;
    statusColorToken: string;
    isFlagship: boolean;
  }[];
  profile: SiteProfile;
  affiliations: Affiliation[];
}

export function HomeHero({ stats, systems, profile, affiliations }: HomeHeroProps) {
  // The ledger is computed per request, so "as of" is literally now.
  const asOf = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <section aria-labelledby="hero-name" className="hero-field text-paper overflow-hidden">
      <Container className="grid items-center gap-14 py-16 md:py-24 lg:grid-cols-12 lg:gap-12 lg:py-28">
        <div className="lg:col-span-7">
          <span className="text-mist inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pr-3.5 pl-2.5 text-xs backdrop-blur">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="live-ping absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
              <span className="relative size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
            </span>
            Live data, as of {asOf}
          </span>

          <h1 id="hero-name" className="text-paper mt-8 font-sans text-lg font-medium md:text-xl">
            {profile.name}
            <span className="text-mist mt-1 block text-sm font-normal md:text-base">
              {profile.role}
            </span>
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

          <ul className="text-mist mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {profile.location && (
              <li className="inline-flex items-center gap-2">
                <MapPin aria-hidden="true" className="text-line size-4" />
                {profile.location}
              </li>
            )}
            {affiliations.length > 0 && (
              <li className="inline-flex items-center gap-2">
                <Building2 aria-hidden="true" className="text-line size-4" />
                {new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
                  affiliations.map((a) => a.name)
                )}
              </li>
            )}
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
                <span className="text-mist font-mono text-xs">system-map / published</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-signal-finished-on-dark)_14%,transparent)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-signal-finished-on-dark)]">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                Live
              </span>
            </div>
            <div className="px-4 pt-6 pb-4 sm:px-6">
              <SystemsBlueprint
                systems={systems}
                stack={PLATFORM_STACK}
                ownerLabel={profile.initials ?? profile.name}
              />
            </div>
            <BorderBeam size={120} duration={9} colorFrom="#FF5B1F" colorTo="#FFB547" />
          </div>
        </div>
      </Container>
    </section>
  );
}
