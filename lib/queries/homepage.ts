// lib/queries/homepage.ts
// Real, live-computed aggregate facts for the LedgerHero — never hardcoded
// copy (Design System §7). These are counts only, no identifying details
// about any specific unpublished System, so they're computed across all
// systems regardless of contentStatus (matching the Constitution's own
// hero mockup, which counts the full pipeline, not just published work) —
// distinct from the public Systems API, which strictly filters to
// published-only (BR-1.1) because that surfaces actual content, not a count.

import type { PipelineStage } from "@prisma/client";
import { db } from "@/lib/db";
import { toPublicSystem } from "@/lib/rules/publishing";

// Counted by each status's pipeline stage (#52), never by hardcoded status
// keys: add a status, or move one between stages, and these follow with no
// code change (EXT-1). Archived systems are retired, so they're not counted.
export async function getHomepageStats() {
  const [earliestExperience, organizationsFounded, byStage] = await Promise.all([
    db.experience.findFirst({ orderBy: { startDate: "asc" }, select: { startDate: true } }),
    db.organization.count({ where: { role: { not: null } } }),
    countSystemsByStage(),
  ]);
  const { SHIPPED: systemsShipped, BUILDING: systemsBuilding, QUEUED: systemsQueued } = byStage;

  const yearsBuilding = earliestExperience
    ? Math.max(1, Math.floor((Date.now() - earliestExperience.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : 0;

  return { yearsBuilding, organizationsFounded, systemsShipped, systemsBuilding, systemsQueued };
}

async function countSystemsByStage(): Promise<Record<PipelineStage, number>> {
  const statuses = await db.status.findMany({
    select: { stage: true, _count: { select: { systems: { where: { contentStatus: { not: "ARCHIVED" } } } } } },
  });
  const counts: Record<PipelineStage, number> = { SHIPPED: 0, BUILDING: 0, QUEUED: 0 };
  for (const s of statuses) counts[s.stage] += s._count.systems;
  return counts;
}

// The homepage selection is the admin's call (#52): systems marked
// featuredOnHome, in homeOrder. Published-only (BR-1.1) — featuring never
// bypasses publishing. Until anything is featured, it falls back to
// flagship-first so the homepage is never empty.
export async function getPrioritySystems(limit = 4) {
  const include = { organization: true, status: true, domain: true } as const;
  const curated = await db.system.findMany({
    where: { contentStatus: "PUBLISHED", featuredOnHome: true },
    include,
    orderBy: [{ homeOrder: "asc" }, { sortOrder: "asc" }],
    take: limit,
  });
  const systems = curated.length
    ? curated
    : await db.system.findMany({
        where: { contentStatus: "PUBLISHED" },
        include,
        orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }],
        take: limit,
      });

  // Reuses the same public serialization as the catalog — a homepage
  // preview is still a public surface, same BR-1.1/1.3/1.4 rules apply.
  return systems.map(toPublicSystem);
}

// Count of published systems — the "All systems (n)" link on the home page.
// Published-only (BR-1.1): this labels a link to real, visible content.
export async function countPublishedSystems() {
  return db.system.count({ where: { contentStatus: "PUBLISHED" } });
}
