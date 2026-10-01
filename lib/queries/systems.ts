// lib/queries/systems.ts
// Public Systems data — used by the API route handlers (app/api/v1/systems/*)
// and Server Component pages directly, so filtering exists in one place.
//
// Every read here goes through the database's public views (F1.7), which
// already apply BR-1.1 (published only), BR-1.3, BR-1.4, BR-1.7 and
// BR-6.1/6.2. Nothing in this file decides visibility or masks a field.

import type { Prisma } from "@prisma/client";
// Public reads only — the platform_public role (F1.8).
import { dbPublic as db } from "@/lib/db";
import { toPublicSystem } from "@/lib/rules/publishing";

export interface PublicSystemsFilters {
  organizationSlug?: string | null;
  domainKey?: string | null;
  statusKey?: string | null;
  flagship?: boolean | null;
  page?: number;
  pageSize?: number;
}

// Name and id break ties: most systems share a sortOrder, and without a total
// order the database may return ties in any order — so paging could show a
// system on two pages, or on none.
const CATALOG_ORDER = [
  { isFlagship: "desc" },
  { sortOrder: "asc" },
  { name: "asc" },
  { id: "asc" },
] satisfies Prisma.PublicSystemOrderByWithRelationInput[];

/**
 * BR-1.18: a system's stored screenshot — captured from its live site or
 * uploaded by the owner — is the one shown, ahead of a typed screenshot
 * address. Served by /api/v1/systems/{slug}/screenshot, linked by its content
 * hash so caches never show a stale one. Never for NDA work (the view excludes it).
 */
export async function withScreenshots<T extends { slug: string; screenshotUrl: string | null }>(systems: T[]): Promise<T[]> {
  if (systems.length === 0) return systems;
  const shots = await db.publicSystemScreenshot.findMany({ where: { slug: { in: systems.map((s) => s.slug) } }, select: { slug: true, sha256: true } });
  const bySlug = new Map(shots.map((s) => [s.slug, s.sha256]));
  return systems.map((s) => {
    const sha = bySlug.get(s.slug);
    return sha ? { ...s, screenshotUrl: `/api/v1/systems/${s.slug}/screenshot?v=${sha.slice(0, 12)}` } : s;
  });
}

export async function getPublicSystems({
  organizationSlug,
  domainKey,
  statusKey,
  flagship,
  page = 1,
  pageSize = 20,
}: PublicSystemsFilters) {
  // organizationSlug is null in the view for a masked client (BR-1.4), so
  // filtering by a client's slug can never surface its anonymized work.
  const where: Prisma.PublicSystemWhereInput = {
    ...(organizationSlug && { organizationSlug }),
    ...(domainKey && { domainKey }),
    ...(statusKey && { statusKey }),
    ...(flagship !== null && flagship !== undefined && { isFlagship: flagship }),
  };

  const [rows, total] = await Promise.all([
    db.publicSystem.findMany({ where, orderBy: CATALOG_ORDER, skip: (page - 1) * pageSize, take: pageSize }),
    db.publicSystem.count({ where }),
  ]);

  return { data: await withScreenshots(rows.map(toPublicSystem)), meta: { page, pageSize, total } };
}

export async function isPublicSystemSlug(slug: string): Promise<boolean> {
  return (await db.publicSystem.count({ where: { slug } })) > 0;
}

/** The current slug an old one redirects to, if its system is public (#87, BR-1.14). */
export async function publicSlugRedirect(slug: string): Promise<string | null> {
  const row = await db.publicSlugRedirect.findUnique({ where: { fromSlug: slug } });
  return row?.toSlug ?? null;
}

export async function getPublicSystemBySlug(slug: string) {
  const row = await db.publicSystem.findUnique({ where: { slug } });
  if (!row) return null;

  const [impacts, testimonials] = await Promise.all([
    db.publicImpact.findMany({ where: { systemId: row.id }, orderBy: { sortOrder: "asc" } }),
    db.publicTestimonial.findMany({ where: { systemId: row.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const [base] = await withScreenshots([toPublicSystem(row)]);
  return {
    ...base!,
    caseStudyBody: row.caseStudyBody,
    // BR-4.5: an AI-written case study is labelled as such, wherever it's shown.
    caseStudyAuthor: !row.caseStudyBody.trim() ? null : row.caseStudySource === "generated" ? ("ai" as const) : ("owner" as const),
    caseStudyWrittenAt: row.caseStudySource === "generated" ? (row.writeupGeneratedAt?.toISOString() ?? null) : null,
    impacts: impacts.map((i) => ({ label: i.label, value: i.value })),
    testimonials: testimonials.map((t) => ({
      authorName: t.authorName,
      authorRole: t.authorRole,
      organization: t.organization,
      quote: t.quote,
    })),
  };
}

/** Other published systems in the same domain as `slug`. */
export async function getRelatedSystems(slug: string, limit = 3) {
  const current = await db.publicSystem.findUnique({ where: { slug }, select: { domainKey: true } });
  if (!current?.domainKey) return [];

  const rows = await db.publicSystem.findMany({
    where: { domainKey: current.domainKey, slug: { not: slug } },
    orderBy: CATALOG_ORDER,
    take: limit,
  });
  return withScreenshots(rows.map(toPublicSystem));
}

/** Organizations for the catalog filter — only ones whose name is disclosed (BR-1.4). */
export async function getFilterOrganizations() {
  return db.publicOrganization.findMany({ orderBy: { name: "asc" } });
}
