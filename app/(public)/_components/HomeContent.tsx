// app/(public)/_components/HomeContent.tsx
// Home (DESIGN-SYSTEM.md v3 §7). The async data-fetching for /, inside an
// explicit <Suspense> boundary in page.tsx (same pattern as the Systems
// catalog — see SystemsGridSkeleton.tsx for why not a loading.tsx).

import { ContactBand } from "@/components/home/ContactBand";
import { HomeHeroV2Section } from "./HomeHeroV2Section";
import { PrinciplesBand } from "@/components/home/PrinciplesBand";
import { WorkShowcase } from "@/components/home/WorkShowcase";
import { getSelectedWork } from "@/lib/queries/work";
import { SystemMap } from "@/components/home/SystemMap";
import { getSystemMap } from "@/lib/queries/map";
import { ControlRoom } from "@/components/home/ControlRoom";
import { getPublicMetrics } from "@/lib/metrics";
import {
  getAffiliations,
  getInquiryTypes,
  getReviewSlaHours,
  getSiteProfile,
} from "@/lib/queries/site";
import { JsonLd } from "@/components/shared/JsonLd";
import { personLd } from "@/lib/seo/person";
import { getContentBlock } from "@/lib/content/blocks";
import { getEvidence } from "@/lib/evidence";
import { siteUrl } from "@/lib/site-url";
import { getPlatformPulse, getPublicTitles } from "@/lib/queries/profile";
import { FLAGS, getFlags } from "@/lib/flags";
import { getSetting } from "@/lib/settings";
import { AiGuideSection } from "@/components/home/AiGuideSection";
import {
  countPublishedSystems,
  countSystemsInProduction,
  getHomepageStats,
} from "@/lib/queries/homepage";

export async function HomeContent() {
  const [
    stats,
    selectedWork,
    totalPublished,
    inProduction,
    numbers,
    profile,
    affiliations,
    inquiryTypes,
    reviewSlaHours,
    titles,
    flags,
    heroBlock,
    aiGuide,
    systemMap,
    pulse,
  ] = await Promise.all([
    getHomepageStats(),
    getSelectedWork(3),
    countPublishedSystems(),
    countSystemsInProduction(),
    getPublicMetrics(), // approved values only (BR-5.3)
    getSiteProfile(),
    getAffiliations(),
    getInquiryTypes(),
    getReviewSlaHours(),
    getPublicTitles(),
    getFlags(),
    getContentBlock("home-hero"),
    getContentBlock("ai-guide"),
    getSystemMap(),
    getPlatformPulse(),
  ]);
  const guideEnabled = flags[FLAGS.concierge] === true;
  const [howIBuild, evidence] = await Promise.all([getContentBlock("how-i-build"), getEvidence()]);


  const base = siteUrl();
  // Structured data (#101): who this is and what the site is — the same data the page shows.
  const personLdData = { "@context": "https://schema.org", ...personLd(profile, base, { organisations: affiliations }) };
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MALULEKE-KS",
    url: base,
    author: { "@type": "Person", name: profile.name },
  };

  return (
    <>
      <JsonLd data={personLdData} />
      <JsonLd data={siteLd} />
      <HomeHeroV2Section
        profile={profile}
        block={heroBlock}
        pulse={pulse}
        systemsShipped={inProduction}
        systemsPublished={totalPublished}
        titles={titles}
        nowBuilding={selectedWork.nowBuilding ? { name: selectedWork.nowBuilding.name, url: selectedWork.nowBuilding.url, lastPush: selectedWork.nowBuilding.lastPush } : null}
        evidence={evidence}
      />
      {guideEnabled && aiGuide && (
        <AiGuideSection content={aiGuide} />
      )}
      <WorkShowcase {...selectedWork} totalPublished={totalPublished} />
      <SystemMap data={systemMap} />
      <ControlRoom pulse={pulse} numbers={numbers} />
      <PrinciplesBand content={howIBuild} evidence={evidence} />
      <ContactBand inquiryTypes={inquiryTypes} reviewSlaHours={reviewSlaHours} />
    </>
  );
}
