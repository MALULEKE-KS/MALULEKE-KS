// app/(public)/_components/HomeContent.tsx
// Home (DESIGN-SYSTEM.md v3 §7). The async data-fetching for /, inside an
// explicit <Suspense> boundary in page.tsx (same pattern as the Systems
// catalog).

import { ContactBand } from "@/components/home/ContactBand";
import { HomeHeroV2Section } from "./HomeHeroV2Section";
import { heroCopy } from "@/lib/home/hero";
import { PrinciplesBand } from "@/components/home/PrinciplesBand";
import { WorkShowcase } from "@/components/home/WorkShowcase";
import { ago, getSelectedWork } from "@/lib/queries/work";
import { SystemMap } from "@/components/home/SystemMap";
import { getSystemMap } from "@/lib/queries/map";
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
  // First: the owner's hero block names the system he is building (if he has), which decides what "now" is.
  const heroBlock = await getContentBlock("home-hero");
  const building = heroBlock?.buildingSlug?.trim() || null;
  const heroWords = heroCopy(heroBlock);
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
    aiGuide,
    systemMap,
    pulse,
  ] = await Promise.all([
    getHomepageStats(),
    getSelectedWork(3, building),
    countPublishedSystems(),
    countSystemsInProduction(),
    getPublicMetrics(), // approved values only (BR-5.3)
    getSiteProfile(),
    getAffiliations(),
    getInquiryTypes(),
    getReviewSlaHours(),
    getPublicTitles(),
    getFlags(),
    getContentBlock("ai-guide"),
    getSystemMap(),
    getPlatformPulse(),
  ]);
  const guideEnabled = flags[FLAGS.concierge] === true;
  const [howIBuild, evidence] = await Promise.all([getContentBlock("how-i-build"), getEvidence()]);


  // The line before the name: "Building now" when the owner named the system, "Latest commit" when it is only the latest real commit.
  const nowLabel = selectedWork.nowBuilding?.chosen ? heroWords.buildingLabel : heroWords.nowLabel;

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
        nowBuilding={selectedWork.nowBuilding ? { name: selectedWork.nowBuilding.name, url: selectedWork.nowBuilding.url, when: selectedWork.nowBuilding.lastPush, label: nowLabel } : null}
        evidence={evidence}
      />
      {/* The order since the premium pass (D-047): who he is, the proof, a way to question it, how he
          thinks, how the platform holds together, a way to talk — graphite and bone alternating.
          Each section skips its own layout and paint until it nears the screen (.below-fold, globals.css) —
          except the AI guide's band: it holds fixed-position UI (the phone's full-screen conversation, the
          "still answering" button), which a content-visibility wrapper would trap inside the section. */}
      <div className="below-fold">
        <WorkShowcase {...selectedWork} totalPublished={totalPublished} nowLabel={nowLabel} />
      </div>
      {guideEnabled && aiGuide && (
        <AiGuideSection
          content={aiGuide}
          facts={{ systems: totalPublished, synced: ago(pulse.lastGithubSyncAt ? new Date(pulse.lastGithubSyncAt) : null) }}
        />
      )}
      <div className="below-fold">
        <PrinciplesBand content={howIBuild} evidence={evidence} />
      </div>
      <div className="below-fold">
        <SystemMap data={systemMap} pulse={pulse} numbers={numbers} />
      </div>
      <div className="below-fold">
        <ContactBand inquiryTypes={inquiryTypes} reviewSlaHours={reviewSlaHours} />
      </div>
    </>
  );
}
