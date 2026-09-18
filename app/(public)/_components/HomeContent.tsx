// app/(public)/_components/HomeContent.tsx
// Sheet 01 — Home (DESIGN-SYSTEM.md v2 §7). The async data-fetching for /,
// inside an explicit <Suspense> boundary in page.tsx (same pattern as the
// Systems catalog — see SystemsGridSkeleton.tsx for why not a loading.tsx).

import { ContactBand } from "@/components/home/ContactBand";
import { FeaturedSystem } from "@/components/home/FeaturedSystem";
import { HomeHero } from "@/components/home/HomeHero";
import { PrinciplesBand } from "@/components/home/PrinciplesBand";
import { countPublishedSystems, getHomepageStats, getPrioritySystems } from "@/lib/queries/homepage";

export async function HomeContent() {
  const [stats, prioritySystems, totalSystems] = await Promise.all([
    getHomepageStats(),
    getPrioritySystems(4),
    countPublishedSystems(),
  ]);

  // Ordered flagship-first, so the first is the one to feature.
  const featured = prioritySystems[0];

  return (
    <>
      <HomeHero stats={stats} systems={prioritySystems} />
      {featured && <FeaturedSystem system={featured} totalSystems={totalSystems} />}
      <PrinciplesBand />
      <ContactBand />
    </>
  );
}
