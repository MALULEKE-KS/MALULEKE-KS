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
import { Boxes } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { Accent, plainAccent } from "@/components/shared/Accent";
import { getContentBlock } from "@/lib/content/blocks";
import { getCatalog } from "@/lib/queries/catalog";
import { SystemsResults } from "./_components/SystemsResults";
import { SystemsGridSkeleton } from "./_components/SystemsGridSkeleton";
import { SystemsSpotlight } from "@/components/systems/SystemsSpotlight";

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
    { value: stats.activeThisMonth, label: "active this month" },
  ].filter((i) => i.value > 0); // a zero is an absence, not a figure — it isn't shown
  return (
    <>
      {items.length > 0 && (
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {items.map((i) => (
            <div key={i.label} className="flex items-baseline gap-2">
              <dd className="type-data text-paper text-2xl font-semibold">{i.value}</dd>
              <dt className="text-mist text-sm">{i.label}</dt>
            </div>
          ))}
        </dl>
      )}
      {catalog && (
        <div className="mt-10 -mx-4 sm:mx-0">
          <SystemsSpotlight systems={catalog.systems} />
        </div>
      )}
    </>
  );
}

/**
 * Holds the height the counts and the ring take once they arrive, so the catalog below doesn't jump
 * when they stream in (layout shift, WP-102). Measured on the page, 2026-10-10: on a phone the counts
 * are 76 px and the ring 40 + 299; from 640 px wide, 32 px and 40 + 398.
 */
function HeroExtrasFallback({ spotlight }: { spotlight: boolean }) {
  return <div aria-hidden="true" className={spotlight ? "h-[415px] sm:h-[470px]" : "h-[76px] sm:h-[32px]"} />;
}

export default async function SystemsPage({ searchParams }: SystemsPageProps) {
  const [params, intro] = await Promise.all([searchParams, getContentBlock("systems-page")]);

  // The ring is the unfiltered first view only.
  const showSpotlight = !(params.home || params.status || params.domain || params.tech || (params.page && params.page !== "1"));

  return (
    <>
      <PageHero
        icon={Boxes}
        eyebrow="Systems"
        wide
        title={<Accent text={intro?.heading ?? "The systems."} className="type-accent text-ember-gradient pr-[0.06em]" />}
        description={intro?.lede}
      >
        <Suspense fallback={<HeroExtrasFallback spotlight={showSpotlight} />}>
          <HeroExtras spotlight={showSpotlight} />
        </Suspense>
      </PageHero>
      <section className="bg-paper py-12 md:py-16">
        <Container>
          <Suspense fallback={<SystemsGridSkeleton />}>
            <SystemsResults searchParams={params} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
