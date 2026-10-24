// app/(public)/systems/page.tsx
// /systems — the catalog (PAGE-BUILD-PLAYBOOK §9; PAGE-SPECIFICATIONS
// "/systems"). A graphite hero with the owner's "systems-page" copy and live
// counts, then the filters and results on bone. Since BR-1.6 was replaced
// (2026-10-01) the catalog is every repo in his own homes that he hasn't
// hidden, beside the written-up case studies.
//
// Served from the cache (D-063): the page is rendered ahead with every published
// system; the filters in the URL are applied in the browser (SystemsResults,
// lib/catalog/apply.ts), so the page never waits on a database round trip.

import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { PageHeroBackdrop } from "@/components/shared/PageHeroBackdrop";
import { HeroFigures } from "@/components/shared/HeroKit";
import { Accent, plainAccent } from "@/components/shared/Accent";
import { getContentBlock } from "@/lib/content/blocks";
import { loadCatalogData, type CatalogData } from "@/lib/queries/catalog";
import { applyCatalog } from "@/lib/catalog/apply";
import { sectionCopy } from "@/lib/content/copy";
import { GROUP_FALLBACK, SystemsResults, SystemsResultsView, WhenUnfiltered, type GroupCopy } from "./_components/SystemsResults";
import { SystemsSpotlight } from "@/components/systems/SystemsSpotlight";

export async function generateMetadata(): Promise<Metadata> {
  const intro = await getContentBlock("systems-page").catch(() => null);
  return pageMetadata({ title: "Systems", description: intro ? plainAccent(intro.lede) : null, path: "/systems", imageAlt: "Systems — MALULEKE-KS" });
}

/** The hero's live counts and, while no filter is on, every published system on a ring in featured order. */
function HeroExtras({ data }: { data: CatalogData }) {
  const { stats } = applyCatalog(data, { pageSize: 1 });
  const ring = applyCatalog(data, { pageSize: 100 }).systems;
  const items = [
    { value: stats.systems, label: stats.systems === 1 ? "system" : "systems" },
    { value: stats.homes, label: stats.homes === 1 ? "GitHub home" : "GitHub homes" },
    { value: stats.caseStudies, label: stats.caseStudies === 1 ? "case study" : "case studies" },
    { value: stats.activeThisMonth, label: "active this month", live: true },
  ].filter((i) => i.value > 0); // a zero is an absence, not a figure — it isn't shown
  const spotlight = (
    <div className="mt-8 -mx-4 sm:mx-0 md:mt-10">
      <SystemsSpotlight systems={ring} />
    </div>
  );
  return (
    <>
      <HeroFigures figures={items} />
      {/* The ring shows in the first HTML; a filter in the URL hides it once the browser reads it. */}
      <Suspense fallback={spotlight}>
        <WhenUnfiltered>{spotlight}</WhenUnfiltered>
      </Suspense>
    </>
  );
}

export default async function SystemsPage() {
  // Served from the cache (D-063): every published system is in the page; the filters run in the browser.
  const [intro, data, flagships, ventures, coursework] = await Promise.all([
    getContentBlock("systems-page"),
    loadCatalogData(),
    sectionCopy("systems.flagships", GROUP_FALLBACK.flagships),
    sectionCopy("systems.ventures", GROUP_FALLBACK.ventures),
    sectionCopy("systems.coursework", GROUP_FALLBACK.coursework),
  ]);
  const groupCopy: GroupCopy = { flagships, ventures, coursework };

  return (
    <>
      <PageHero
        eyebrow="Systems"
        wide
        backdrop={<PageHeroBackdrop purpose="hero-systems" />}
        title={<Accent text={intro?.heading ?? "The systems."} className="type-accent text-ember-gradient pr-[0.06em]" />}
        description={intro?.lede}
      >
        <HeroExtras data={data} />
      </PageHero>
      <section className="bg-paper py-14 md:py-20">
        <Container>
          <Suspense fallback={<SystemsResultsView data={data} groupCopy={groupCopy} params={{}} />}>
            <SystemsResults data={data} groupCopy={groupCopy} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
