// app/(public)/_components/HomeHeroV2Section.tsx
// The rebuilt home hero with its data (docs/improvements/HOME-HERO-PLAN.md §7):
// gathers what only this hero needs — the photo slots, the entrance's and the
// glow's settings, the phone's CV and contact buttons, the receipt and the X-ray's words
// (D-067) — and hands HomeHeroV2 ready values. The record it used to carry is in How I build (homeRecord, D-065). It is the home hero (the flag and the previous hero are gone — D-038).

import { Evidence } from "@/components/shared/Evidence";
import { HeroBackdrop, type HeroImageSource } from "@/components/shared/HeroBackdrop";
import type { ProofLedgerItem } from "@/components/shared/ProofLedger";
import { HomeHeroV2 } from "@/components/home/HomeHeroV2";
import type { ContentBody } from "@/lib/content/blocks";
import { claimsFor, evidenceSource, type ResolvedClaim } from "@/lib/evidence";
import { getSkillEvidence } from "@/lib/queries/evidence";
import { heroAsOf, heroCopy, heroCredential, heroLedger, heroLiveLine, heroStack } from "@/lib/home/hero";
import { getPublicPhotos } from "@/lib/queries/profile";
import type { SiteProfile } from "@/lib/queries/site";
import { getSetting } from "@/lib/settings";
import { getUploadedCvLink } from "@/lib/cv/options";
import { getContentBlock } from "@/lib/content/blocks";
import { PageReceipt } from "@/components/xray/PageReceipt";
import { receiptCopy, renderedAt, xrayCopy } from "@/lib/xray/copy";

interface HomeHeroV2SectionProps {
  profile: SiteProfile;
  block: ContentBody<"home-hero"> | null;
  pulse: {
    rulesEnforcedByDatabase: number;
    auditEventsLast7Days: number;
    deployment: { commit: string; environment: string | null } | null;
  };
  systemsShipped: number;
  systemsPublished: number;
  titles: { label: string; detail: string | null }[];
  nowBuilding: { name: string; url: string; when: string | null; label: string | null } | null;
  evidence: { claims: ResolvedClaim[]; source: { commit: string | null } };
}

/**
 * The record — systems shipped, rules the database enforces, changes audited — with its
 * evidence. Since D-065 (the owner's plan: "move the stats into a How I build section further
 * down") it is shown in How I build, not in the hero; its words are still the "home-hero" block's.
 */
export function homeRecord(
  { systemsShipped, systemsPublished, pulse, block, evidence }: Pick<HomeHeroV2SectionProps, "systemsShipped" | "systemsPublished" | "pulse" | "block" | "evidence">,
): { items: ProofLedgerItem[]; ariaLabel: string | null } {
  const copy = heroCopy(block);
  const items = heroLedger(
    { systemsShipped, systemsPublished, rulesEnforced: pulse.rulesEnforcedByDatabase, auditedThisWeek: pulse.auditEventsLast7Days },
    copy.ledgerLabels,
  ).map((item) => {
    const claims = item.evidenceKey ? claimsFor(evidence.claims, item.evidenceKey) : [];
    return {
      key: item.key,
      value: item.value,
      label: item.label,
      claim: item.claim,
      evidence: claims.length > 0 ? <Evidence claims={claims} label={`${item.value} ${item.label}`} commit={evidence.source.commit} /> : undefined,
      // The catalogue size opens the catalogue (D-047).
      href: item.key === "systems" ? "/systems" : undefined,
    };
  });
  return { items, ariaLabel: copy.ledgerAria };
}

export async function HomeHeroV2Section({ profile, block, pulse, systemsShipped, systemsPublished, titles, nowBuilding, evidence }: HomeHeroV2SectionProps) {
  const [photos, skills, durationMs, staggerMs, glow, scrim, stackCount, stackCategories, timeZone, cv, header, xrayBlock, repo] = await Promise.all([
    getPublicPhotos(),
    getSkillEvidence(),
    getSetting("home.hero.entrance.durationMs"),
    getSetting("home.hero.entrance.staggerMs"),
    getSetting("home.hero.glow"),
    getSetting("home.hero.scrim"),
    getSetting("home.hero.stackCount"),
    getSetting("home.hero.stackCategories"),
    getSetting("site.timeZone"),
    getUploadedCvLink(),
    getContentBlock("site-header"),
    getContentBlock("page-xray"),
    evidenceSource(),
  ]);

  const copy = heroCopy(block);
  const source = (purpose: string): HeroImageSource | null => {
    const p = photos[purpose];
    return p ? { url: p.url, width: p.width, height: p.height } : null;
  };
  const desktop = source("hero-desktop");
  const mobile = source("hero-mobile");

  const role = profile.headline ?? profile.role;
  // The receipt (D-067): when this cached copy was made, in the site's zone — written here, so the browser shows the same words.
  const commit = pulse.deployment?.commit ?? null;
  const footer = (
    <PageReceipt
      copy={receiptCopy(xrayBlock)}
      rendered={renderedAt(new Date(), timeZone)}
      build={commit ? { commit: commit.slice(0, 7), url: `https://github.com/${repo.repository}/commit/${repo.commit ?? commit}` } : null}
      rules={pulse.rulesEnforcedByDatabase}
      xray={xrayCopy(xrayBlock)}
      source={repo}
    />
  );
  return (
    <HomeHeroV2
      name={profile.name}
      role={role}
      statement={block?.statement ?? null}
      credential={heroCredential(titles, role)}
      liveLine={heroLiveLine(pulse.deployment, copy, heroAsOf(new Date(), timeZone))}
      nowBuilding={nowBuilding}
      stack={heroStack(skills, stackCategories, stackCount)}
      copy={copy}
      footer={footer}
      phoneActions={{ cvUrl: cv?.url ?? null, cvLabel: header?.cvMenuLabel?.trim() || null, contactLabel: header?.contactLabel?.trim() || null }}
      entrance={{ durationMs, staggerMs }}
      backdrop={
        desktop || mobile ? (
          <HeroBackdrop
            desktop={desktop}
            mobile={mobile}
            credit={block?.imageCredit ? { text: block.imageCredit, url: block.imageCreditUrl ?? null } : null}
            positionDesktop={block?.imagePositionDesktop ?? null}
            positionMobile={block?.imagePositionMobile ?? null}
            scrim={scrim}
            glow={glow}
          />
        ) : null
      }
    />
  );
}
