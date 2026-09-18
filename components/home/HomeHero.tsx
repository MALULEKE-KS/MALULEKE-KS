// components/home/HomeHero.tsx
// Sheet 01, section 1 (DESIGN-SYSTEM.md v2 §7.1): the full-bleed blueprint
// band. Left: who, the live ledger, what to do next. Right: Fig. 1, the
// platform as built. Bottom: the sheet's title block.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { TitleBlock } from "@/components/shared/TitleBlock";
import { LedgerHero } from "@/components/home/LedgerHero";
import { SystemsBlueprint } from "@/components/home/SystemsBlueprint";
import { OWNER, PLATFORM_STACK, SHEETS } from "@/lib/content/sheets";

interface HomeHeroProps {
  stats: { yearsBuilding: number; organizationsFounded: number; systemsShipped: number; systemsQueued: number };
  systems: { slug: string; name: string; status: string; statusColorToken: string; isFlagship: boolean }[];
}

export function HomeHero({ stats, systems }: HomeHeroProps) {
  // The ledger is computed per request, so "data as of" is literally now.
  const asOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section aria-labelledby="hero-name" className="bp-grid text-paper relative overflow-hidden">
      <Container className="grid items-center gap-14 py-14 md:py-20 lg:grid-cols-12 lg:gap-10 lg:py-24">
        <div className="lg:col-span-7">
          <p className="text-line flex items-center gap-3 font-mono text-xs">
            <span aria-hidden="true" className="bg-amber size-2" />
            Sheet 01 / System log
          </p>
          <h1 id="hero-name" className="text-paper mt-6 font-sans text-lg font-medium md:text-xl">
            {OWNER.name}
            <span className="text-mist block font-mono text-sm font-normal">{OWNER.role}</span>
          </h1>

          <div className="mt-10">
            <LedgerHero {...stats} />
          </div>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
              <Link href="/systems">Explore the systems</Link>
            </Button>
            <Button asChild variant="outline-light" size="lg" className="w-full sm:w-auto">
              <Link href="/contact">Start a conversation</Link>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-5">
          <SystemsBlueprint systems={systems} stack={PLATFORM_STACK} ownerLabel={OWNER.initials} />
          {/* The title block sits in the drawing's corner, as on a real sheet. */}
          <TitleBlock
            className="mt-8"
            cells={[
              { label: "Drawn by", value: OWNER.initials },
              { label: "Sheet", value: `01 of ${SHEETS.length.toString().padStart(2, "0")}` },
              { label: "Data as of", value: asOf },
              { label: "Rev", value: "2.0" },
            ]}
          />
        </div>
      </Container>
    </section>
  );
}
