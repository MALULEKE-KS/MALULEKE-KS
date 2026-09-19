// lib/queries/homepage.ts
// Real, live-computed facts for the LedgerHero — never hardcoded copy
// (Design System §7). Read from the database's public views (F1.7):
//   PublicLedger — aggregate counts of the owner's own catalog by pipeline
//                  stage (archived excluded). Counts only, so they span the
//                  whole pipeline, published or not, without naming anything
//                  unpublished. Content facts, not statistics (BR-5.3).
//   PublicSystem — the admin's homepage picks; published-only and masked.

import { db } from "@/lib/db";
import { toPublicSystem } from "@/lib/rules/publishing";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export async function getHomepageStats() {
  const ledger = await db.publicLedger.findFirst();
  const first = ledger?.firstExperienceAt;
  const yearsBuilding = first ? Math.max(1, Math.floor((Date.now() - first.getTime()) / MS_PER_YEAR)) : 0;

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
    : await db.publicSystem.findMany({ orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }], take: limit });
  return rows.map(toPublicSystem);
}

// The "All systems (n)" link on the home page — labels real, visible content.
export async function countPublishedSystems() {
  return db.publicSystem.count();
}
