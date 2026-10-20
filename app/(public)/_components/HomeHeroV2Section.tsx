// app/(public)/_components/HomeHeroV2Section.tsx
// The rebuilt home hero with its data (docs/improvements/HOME-HERO-PLAN.md §7):
// gathers what only this hero needs — the photo slots, the entrance's and the
// glow's settings, the evidence behind the ledger — and hands HomeHeroV2 ready
// values. Rendered only while the flag "home.hero_v2" is on.

import { Evidence } from "@/components/shared/Evidence";
import { HeroBackdrop, type HeroImageSource } from "@/components/shared/HeroBackdrop";
import type { ProofLedgerItem } from "@/components/shared/ProofLedger";
import { HomeHeroV2 } from "@/components/home/HomeHeroV2";
import type { ContentBody } from "@/lib/content/blocks";
import { claimsFor, type ResolvedClaim } from "@/lib/evidence";
import { getSkillEvidence } from "@/lib/queries/evidence";
import { heroCopy, heroCredential, heroLedger, heroLiveLine, heroStack } from "@/lib/home/hero";
import { getPublicPhotos } from "@/lib/queries/profile";
import type { SiteProfile } from "@/lib/queries/site";
import { getSetting } from "@/lib/settings";

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
  nowBuilding: { name: string; url: string; lastPush: string | null } | null;
  evidence: { claims: ResolvedClaim[]; source: { commit: string | null } };
}

export async function HomeHeroV2Section({ profile, block, pulse, systemsShipped, systemsPublished, titles, nowBuilding, evidence }: HomeHeroV2SectionProps) {
  const [photos, skills, durationMs, staggerMs, glow, scrim, stackCount, stackCategories] = await Promise.all([
    getPublicPhotos(),
    getSkillEvidence(),
    getSetting("home.hero.entrance.durationMs"),
    getSetting("home.hero.entrance.staggerMs"),
    getSetting("home.hero.glow"),
    getSetting("home.hero.scrim"),
    getSetting("home.hero.stackCount"),
    getSetting("home.hero.stackCategories"),
  ]);

  const copy = heroCopy(block);
  const ledger: ProofLedgerItem[] = heroLedger(
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
    };
  });

  const source = (purpose: string): HeroImageSource | null => {
    const p = photos[purpose];
    return p ? { url: p.url, width: p.width, height: p.height } : null;
  };
  const desktop = source("hero-desktop");
  const mobile = source("hero-mobile");

  const role = profile.headline ?? profile.role;
  return (
    <HomeHeroV2
      name={profile.name}
      role={role}
      statement={block?.statement ?? null}
      credential={heroCredential(titles, role)}
      liveLine={heroLiveLine(pulse.deployment, copy)}
      nowBuilding={nowBuilding}
      stack={heroStack(skills, stackCategories, stackCount)}
      copy={copy}
      ledger={ledger}
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
