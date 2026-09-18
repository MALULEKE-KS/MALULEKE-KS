// app/(public)/_components/HomeContent.tsx
// Home (DESIGN-SYSTEM.md v3 §7). The async data-fetching for /, inside an
// explicit <Suspense> boundary in page.tsx (same pattern as the Systems
// catalog — see SystemsGridSkeleton.tsx for why not a loading.tsx).

import { ContactBand } from "@/components/home/ContactBand";
import { HomeHero } from "@/components/home/HomeHero";
import { PrinciplesBand } from "@/components/home/PrinciplesBand";
import { WorkBento } from "@/components/home/WorkBento";
import { countPublishedSystems, getHomepageStats, getPrioritySystems } from "@/lib/queries/homepage";

export async function HomeContent() {
  const [stats, prioritySystems, totalPublished] = await Promise.all([
    getHomepageStats(),
    getPrioritySystems(4),
    countPublishedSystems(),
  ]);

  // Ordered flagship-first, so the first is the one to feature.
  const featured = prioritySystems[0];

  return (
    <>
      <HomeHero stats={stats} systems={prioritySystems} />
      {featured && (
        <WorkBento
          featured={featured}
          totalPublished={totalPublished}
          shipped={stats.systemsShipped}
          queued={stats.systemsQueued}
        />
      )}
      <PrinciplesBand />
      <ContactBand />
    </>
  );
}
