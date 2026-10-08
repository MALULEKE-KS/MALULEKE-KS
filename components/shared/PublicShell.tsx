// components/shared/PublicShell.tsx
// The public chrome: skip link, header, <main>, footer. Used by the (public)
// layout and by app/not-found.tsx — a root not-found renders above the
// (public) layout, so it has to compose the chrome itself.
//
// <main> deliberately does NOT wrap children in the Container: pages are
// built from full-bleed bands (DESIGN-SYSTEM.md v2 §3), so each page places
// its own content in a Container inside each band. <main> stays a plain
// block, never a flex column — in a flex column a child's `mx-auto` turns
// off stretch and the page collapses to its content width.

import { connection } from "next/server";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { ConsentProvider } from "@/components/shared/Consent";
import { getReviewSlaHours, getSiteProfile } from "@/lib/queries/site";
import { getPlatformPulse, getPublicHomes } from "@/lib/queries/profile";
import { getContentBlock } from "@/lib/content/blocks";
import { getUploadedCvLink } from "@/lib/cv/options";
import { getPublicLenses } from "@/lib/queries/lenses";
import { FLAGS, isFlagOn } from "@/lib/flags";
import { getSetting } from "@/lib/settings";
import { dbPublic } from "@/lib/db";
import { GuideProvider } from "@/components/guide/GuideProvider";
import { guideProviderConfigured } from "@/lib/guide/model";
import { GuideLauncher } from "@/components/guide/GuideLauncher";
import { GuidePanel } from "@/components/guide/GuidePanel";
import { GuideChatProvider } from "@/components/guide/GuideChatProvider";
import { getJourney } from "@/lib/queries/journey";
import { SHEETS } from "@/lib/content/sheets";
import type { GuideSiteIndex } from "@/lib/guide/receipts";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  // The chrome reads live data, so it renders per request — never prerendered
  // at build (the root 404 would otherwise be baked with build-time data, or
  // fail where the build has no database, as CI's doesn't).
  await connection();
  // The owner's details for the footer, from the admin-editable profile (#99).
  // The review promise is the admin setting, never typed-in copy (BR-2.2).
  // The footer's homes and status line are data too (F5c, D11).
  // The AI guide is on only when its flag is (BR-4.4); its lenses and limits are data.
  const [
    profile,
    reviewSlaHours,
    homes,
    pulse,
    guideEnabled,
    lenses,
    maxQuestionCharacters,
    aiGuide,
    release,
    cv,
    liveSites,
    indexSystems,
    journey,
  ] = await Promise.all([
    getSiteProfile(),
    getReviewSlaHours(),
    getPublicHomes(),
    getPlatformPulse(),
    isFlagOn(FLAGS.concierge),
    getPublicLenses(),
    getSetting("concierge.maxQuestionCharacters"),
    getContentBlock("ai-guide"),
    getContentBlock("release"),
    getUploadedCvLink(),
    // Published systems' live sites (the public view never carries an NDA system's link, BR-1.3).
    dbPublic.publicSystem.findMany({ where: { liveUrl: { not: null } }, select: { liveUrl: true } }),
    // What the guide's receipts are checked against: only records a visitor can open (docs/AI-GUIDE-PHASE1-PLAN.md §6).
    dbPublic.publicSystem.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    getJourney(),
  ]);
  const siteIndex: GuideSiteIndex = {
    systems: indexSystems,
    journey: (journey?.chapters ?? []).flatMap((c) => c.moments.map((m) => ({ id: m.id, title: m.title }))),
    pages: SHEETS.map((s) => ({ path: s.href, label: s.label })),
  };
  // Where the guide's answers may link out: GitHub, the owner's own public profiles, and his published systems' live sites.
  const httpsHost = (url: string | null) => {
    try {
      const u = new URL(url ?? "");
      return u.protocol === "https:" && !u.hostname.endsWith("wa.me") ? [u.hostname.toLowerCase().replace(/^www\./, "")] : [];
    } catch {
      return [];
    }
  };
  const linkHosts = [...new Set(["github.com", ...profile.links.flatMap((l) => httpsHost(l.url)), ...liveSites.flatMap((s) => httpsHost(s.liveUrl))])];
  return (
    // Analytics consent (BR-5.1/5.4) wraps the public site only — never the admin.
    <ConsentProvider>
      <GuideProvider
        enabled={guideEnabled}
        ready={guideProviderConfigured()}
        ownerFirstName={profile.name.split(/\s+/)[0] ?? profile.name}
        lenses={lenses}
        linkHosts={linkHosts}
      >
        <GuideChatProvider
          maxQuestionCharacters={maxQuestionCharacters}
          suggestions={aiGuide?.suggestions ?? []}
          pageSuggestions={aiGuide?.pageSuggestions ?? []}
          siteIndex={siteIndex}
        >
        <div className="flex min-h-screen flex-col">
          <a
            href="#main"
            className="focus:bg-ember focus:text-ink sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:text-sm"
          >
            Skip to content
          </a>
          <SiteHeader links={profile.links} reviewSlaHours={reviewSlaHours} cvUrl={cv?.url ?? null} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter
            profile={profile}
            reviewSlaHours={reviewSlaHours}
            homes={homes}
            pulse={pulse}
            release={release ? { current: release.current, next: release.next || null, nextNote: release.nextNote || null, link: release.link || null } : null}
          />
        </div>
        <GuideLauncher />
        <GuidePanel />
        </GuideChatProvider>
      </GuideProvider>
    </ConsentProvider>
  );
}
