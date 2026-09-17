// lib/queries/homepage.ts
// Real, live-computed aggregate facts for the LedgerHero — never hardcoded
// copy (Design System §7). These are counts only, no identifying details
// about any specific unpublished System, so they're computed across all
// systems regardless of contentStatus (matching the Constitution's own
// hero mockup, which counts the full pipeline, not just published work) —
// distinct from the public Systems API, which strictly filters to
// published-only (BR-1.1) because that surfaces actual content, not a count.

import { db } from "@/lib/db";
import { toPublicSystem } from "@/lib/rules/publishing";

export async function getHomepageStats() {
  const [earliestExperience, organizationsFounded, systemsShipped, systemsQueued] = await Promise.all([
    db.experience.findFirst({ orderBy: { startDate: "asc" }, select: { startDate: true } }),
    db.organization.count({ where: { role: { not: null } } }),
    db.system.count({ where: { status: { key: "finished" } } }),
    db.system.count({ where: { status: { key: { in: ["in_progress", "planned"] } } } }),
  ]);

  const yearsBuilding = earliestExperience
    ? Math.max(1, Math.floor((Date.now() - earliestExperience.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : 0;

  return { yearsBuilding, organizationsFounded, systemsShipped, systemsQueued };
}

export async function getPrioritySystems(limit = 4) {
  const systems = await db.system.findMany({
    where: { contentStatus: "PUBLISHED" },
    include: { organization: true, status: true, domain: true },
    orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }],
    take: limit,
  });

  // Reuses the same public serialization as the catalog — a homepage
  // preview is still a public surface, same BR-1.1/1.3/1.4 rules apply.
  return systems.map(toPublicSystem);
}
