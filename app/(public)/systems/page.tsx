// app/(public)/systems/page.tsx
// /systems — the catalog (PAGE-BUILD-PLAYBOOK §9; PAGE-SPECIFICATIONS
// "/systems"). A graphite hero with the owner's "systems-page" copy and live
// counts, then the filters and results on bone. Since BR-1.6 was replaced
// (2026-10-01) the catalog is every repo in his own homes that he hasn't
// hidden, beside the written-up case studies.
//
// The data fetching lives in SystemsResults, inside an explicit <Suspense>
// rather than a loading.tsx — see SystemsGridSkeleton.tsx for why.

import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { PageHeroBackdrop } from "@/components/shared/PageHeroBackdrop";
import { HeroFigures } from "@/components/shared/HeroKit";
import { Accent, plainAccent } from "@/components/shared/Accent";
import { getContentBlock } from "@/lib/content/blocks";
import { getCatalog } from "@/lib/queries/catalog";
import { SystemsResults } from "./_components/SystemsResults";
import { SystemsGridSkeleton } from "./_components/SystemsGridSkeleton";
import { SystemsSpotlight } from "@/components/systems/SystemsSpotlight";
import { SPOTLIGHT_CARD_ASPECT, SPOTLIGHT_CARD_WIDTH } from "@/components/systems/spotlight-size";

export async function generateMetadata(): Promise<Metadata> {
  const intro = await getContentBlock("systems-page").catch(() => null);
  return pageMetadata({ title: "Systems", description: intro ? plainAccent(intro.lede) : null, path: "/systems", imageAlt: "Systems — MALULEKE-KS" });
}

interface SystemsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

/** The hero's live counts and, unfiltered, every published system on a ring in featured order — fetched together so they arrive together. */
async function HeroExtras({ spotlight }: { spotlight: boolean }) {
  const [{ stats }, catalog] = await Promise.all([getCatalog({ pageSize: 1 }), spotlight ? getCatalog({ pageSize: 100 }) : null]);
  const items = [
    { value: stats.systems, label: stats.systems === 1 ? "system" : "systems" },
    { value: stats.homes, label: stats.homes === 1 ? "GitHub home" : "GitHub homes" },
    { value: stats.caseStudies, label: stats.caseStudies === 1 ? "case study" : "case studies" },
    { value: stats.activeThisMonth, label: "active this month", live: true },
  ].filter((i) => i.value > 0); // a zero is an absence, not a figure — it isn't shown
  return (
    <>
      <HeroFigures figures={items} />
      {catalog && (
        <div className="mt-8 -mx-4 sm:mx-0 md:mt-10">
          <SystemsSpotlight systems={catalog.systems} />
        </div>
      )}
    </>
  );
}

/**
 * Holds the height the figures and the ring take once they arrive, so the catalog below doesn't jump
 * when they stream in (layout shift, WP-102). Measured on the page, 2026-10-22 (D-046): the figures
 * are 153 px on a phone (two rows) and 93 px from 768 px wide (one row); with the ring, the figures,
 * its frame, dots and caption are 367 px on a phone and 316 px from 768 px, plus the card's own
 * height — its width over its shape (spotlight-size.ts).
 */
function HeroExtrasFallback({ spotlight }: { spotlight: boolean }) {
  return spotlight ? (
    <div aria-hidden="true" className="h-[var(--ring-phone)] md:h-[var(--ring-wide)]" style={{ "--ring-phone": `calc(367px + ${SPOTLIGHT_CARD_WIDTH} / ${SPOTLIGHT_CARD_ASPECT})`, "--ring-wide": `calc(316px + ${SPOTLIGHT_CARD_WIDTH} / ${SPOTLIGHT_CARD_ASPECT})` } as React.CSSProperties} />
  ) : (
    <div aria-hidden="true" className="h-[153px] md:h-[93px]" />
  );
}

export default async function SystemsPage({ searchParams }: SystemsPageProps) {
  const [params, intro] = await Promise.all([searchParams, getContentBlock("systems-page")]);

  // The ring is the unfiltered first view only.
  const showSpotlight = !(params.home || params.status || params.domain || params.tech || (params.page && params.page !== "1"));

  return (
    <>
      <PageHero
        eyebrow="Systems"
        wide
        backdrop={<PageHeroBackdrop purpose="hero-systems" />}
        title={<Accent text={intro?.heading ?? "The systems."} className="type-accent text-ember-gradient pr-[0.06em]" />}
        description={intro?.lede}
      >
        <Suspense fallback={<HeroExtrasFallback spotlight={showSpotlight} />}>
          <HeroExtras spotlight={showSpotlight} />
        </Suspense>
      </PageHero>
      <section className="bg-paper py-14 md:py-20">
        <Container>
          <Suspense fallback={<SystemsGridSkeleton />}>
            <SystemsResults searchParams={params} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
