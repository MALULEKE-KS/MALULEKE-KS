// app/(public)/_components/HomeContent.tsx
// Home (DESIGN-SYSTEM.md v3 §7). The async data-fetching for /, inside an
// explicit <Suspense> boundary in page.tsx (same pattern as the Systems
// catalog — see SystemsGridSkeleton.tsx for why not a loading.tsx).

import { ContactBand } from "@/components/home/ContactBand";
import { HomeHero } from "@/components/home/HomeHero";
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
import { getContentBlock } from "@/lib/content/blocks";
import { siteUrl } from "@/lib/site-url";
import { getPlatformPulse, getPublicTitles } from "@/lib/queries/profile";
import { FLAGS, getFlags } from "@/lib/flags";
import { getSetting } from "@/lib/settings";
import { guideProviderConfigured } from "@/lib/guide/model";
import { AiGuideSection } from "@/components/home/AiGuideSection";
import { isAnyCvOffered } from "@/lib/cv/options";
import { dbPublic } from "@/lib/db";
import {
  countPublishedSystems,
  getHomepageStats,
} from "@/lib/queries/homepage";

export async function HomeContent() {
  const [
    stats,
    selectedWork,
    totalPublished,
    numbers,
    profile,
    affiliations,
    inquiryTypes,
    reviewSlaHours,
    titles,
    flags,
    intro,
    aiGuide,
    hasCv,
    githubRepos,
    systemMap,
    pulse,
  ] = await Promise.all([
    getHomepageStats(),
    getSelectedWork(5),
    countPublishedSystems(),
    getPublicMetrics(), // approved values only (BR-5.3)
    getSiteProfile(),
    getAffiliations(),
    getInquiryTypes(),
    getReviewSlaHours(),
    getPublicTitles(),
    getFlags(),
    getContentBlock("home-intro"),
    getContentBlock("ai-guide"),
    isAnyCvOffered(),
    dbPublic.publicGithubRepo.count(),
    getSystemMap(),
    getPlatformPulse(),
  ]);
  const guideEnabled = flags[FLAGS.concierge] === true;
  const howIBuild = await getContentBlock("how-i-build");


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
        profile={profile}
        titles={titles}
        intro={intro}
        hasCv={hasCv}
      />
      {guideEnabled && aiGuide && (
        <AiGuideSection
          content={aiGuide}
          tools={{
            openPage: flags[FLAGS.openPage] === true,
            searchSystems: flags[FLAGS.searchSystems] === true,
            draftInquiry: flags[FLAGS.draftInquiry] === true,
          }}
          ready={guideProviderConfigured()}
          githubRepos={githubRepos}
        />
      )}
      <WorkShowcase {...selectedWork} totalPublished={totalPublished} />
      <SystemMap data={systemMap} />
      <ControlRoom pulse={pulse} numbers={numbers} />
      <PrinciplesBand content={howIBuild} />
      <ContactBand profile={profile} inquiryTypes={inquiryTypes} reviewSlaHours={reviewSlaHours} />
    </>
  );
}
