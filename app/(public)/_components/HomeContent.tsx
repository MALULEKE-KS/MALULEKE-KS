// app/(public)/_components/HomeContent.tsx
// Home (DESIGN-SYSTEM.md v3 §7). The async data-fetching for /, inside an
// explicit <Suspense> boundary in page.tsx (same pattern as the Systems
// catalog — see SystemsGridSkeleton.tsx for why not a loading.tsx).

import { ContactBand } from "@/components/home/ContactBand";
import { HomeHero } from "@/components/home/HomeHero";
import { PrinciplesBand } from "@/components/home/PrinciplesBand";
import { WorkBento } from "@/components/home/WorkBento";
import { NumbersStrip } from "@/components/home/NumbersStrip";
import { getPublicMetrics } from "@/lib/metrics";
import {
  getAffiliations,
  getInquiryTypes,
  getReviewSlaHours,
  getSiteProfile,
} from "@/lib/queries/site";
import { JsonLd } from "@/components/shared/JsonLd";
import { siteUrl } from "@/lib/site-url";
import {
  countPublishedSystems,
  getHomepageStats,
  getPrioritySystems,
} from "@/lib/queries/homepage";

export async function HomeContent() {
  const [
    stats,
    prioritySystems,
    totalPublished,
    numbers,
    profile,
    affiliations,
    inquiryTypes,
    reviewSlaHours,
  ] = await Promise.all([
    getHomepageStats(),
    getPrioritySystems(4),
    countPublishedSystems(),
    getPublicMetrics(), // approved values only (BR-5.3)
    getSiteProfile(),
    getAffiliations(),
    getInquiryTypes(),
    getReviewSlaHours(),
  ]);

  // Ordered by the admin's homepage curation, so the first is the one to feature.
  const featured = prioritySystems[0];

  const base = siteUrl();
  // Structured data (#101): who this is and what the site is — the same data the page shows.
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.headline ?? profile.role,
    url: base,
    email: `mailto:${profile.email}`,
    // Public profiles only — not the WhatsApp link, which reaches a phone number.
    sameAs: profile.links
      .filter((l) => l.url.startsWith("https://") && !l.url.includes("wa.me"))
      .map((l) => l.url),
    ...(profile.location && {
      address: { "@type": "PostalAddress", addressCountry: profile.location },
    }),
    ...(affiliations.length > 0 && {
      worksFor: affiliations.map((a) => ({ "@type": "Organization", name: a.name })),
    }),
  };
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MALULEKE-KS",
    url: base,
    author: { "@type": "Person", name: profile.name },
  };

  return (
    <>
      <JsonLd data={personLd} />
      <JsonLd data={siteLd} />
      <HomeHero
        stats={stats}
        systems={prioritySystems}
        profile={profile}
        affiliations={affiliations}
      />
      {featured && (
        <WorkBento
          featured={featured}
          totalPublished={totalPublished}
          shipped={stats.systemsShipped}
          building={stats.systemsBuilding}
          queued={stats.systemsQueued}
        />
      )}
      <NumbersStrip numbers={numbers} />
      <PrinciplesBand />
      <ContactBand profile={profile} inquiryTypes={inquiryTypes} reviewSlaHours={reviewSlaHours} />
    </>
  );
}
