// lib/queries/homepage.ts
// Real, live-computed facts for the LedgerHero — never hardcoded copy
// (Design System §7). Read from the database's public views (F1.7):
//   PublicLedger — aggregate counts of the owner's own catalog by pipeline
//                  stage (archived excluded). Counts only, so they span the
//                  whole pipeline, published or not, without naming anything
//                  unpublished. Content facts, not statistics (BR-5.3).
//   PublicSystem — the admin's homepage picks; published-only and masked.

// Public reads only — the platform_public role (F1.8).
import { dbPublic as db } from "@/lib/db";
import { toPublicSystem } from "@/lib/rules/publishing";
import { withScreenshots } from "@/lib/queries/systems";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Years building (#100): the year the owner says they started building
 * (Profile.buildingSinceYear, admin-editable) wins; only when it isn't set
 * does the first published role stand in for it.
 */
export function yearsBuildingFrom(
  buildingSinceYear: number | null | undefined,
  firstRole: Date | null | undefined,
  now = new Date()
): number {
  if (buildingSinceYear) return Math.max(1, now.getUTCFullYear() - buildingSinceYear);
  return firstRole
    ? Math.max(1, Math.floor((now.getTime() - firstRole.getTime()) / MS_PER_YEAR))
    : 0;
}

export async function getHomepageStats() {
  const [ledger, profile] = await Promise.all([
    db.publicLedger.findFirst(),
    db.publicProfile.findFirst({ select: { buildingSinceYear: true } }),
  ]);
  const yearsBuilding = yearsBuildingFrom(profile?.buildingSinceYear, ledger?.firstExperienceAt);

  return {
    yearsBuilding,
    organizationsFounded: ledger?.organizationsFounded ?? 0,
    systemsShipped: ledger?.systemsShipped ?? 0,
    systemsBuilding: ledger?.systemsBuilding ?? 0,
    systemsQueued: ledger?.systemsQueued ?? 0,
  };
}

// The homepage selection is the admin's call (#52): systems marked
// featuredOnHome, in homeOrder. The view is published-only (BR-1.1), so
// featuring never bypasses publishing. Until anything is featured, it falls
// back to flagship-first so the homepage is never empty.
export async function getPrioritySystems(limit = 4) {
  const curated = await db.publicSystem.findMany({
    where: { featuredOnHome: true },
    orderBy: [{ homeOrder: "asc" }, { sortOrder: "asc" }],
    take: limit,
  });
  const rows = curated.length
    ? curated
    : await db.publicSystem.findMany({
        orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }],
        take: limit,
      });
  return withScreenshots(rows.map(toPublicSystem));
}

// The "All systems (n)" link on the home page — labels real, visible content.
export async function countPublishedSystems() {
  return db.publicSystem.count();
}
