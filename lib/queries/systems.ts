// lib/queries/systems.ts
// Public Systems data — used by the API route handlers (app/api/v1/systems/*)
// and Server Component pages directly, so filtering exists in one place.
//
// Every read here goes through the database's public views (F1.7), which
// already apply BR-1.1 (published only), BR-1.3, BR-1.4, BR-1.7 and
// BR-6.1/6.2. Nothing in this file decides visibility or masks a field.

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toPublicSystem } from "@/lib/rules/publishing";

export interface PublicSystemsFilters {
  organizationSlug?: string | null;
  domainKey?: string | null;
  statusKey?: string | null;
  flagship?: boolean | null;
  page?: number;
  pageSize?: number;
}

const CATALOG_ORDER = [{ isFlagship: "desc" }, { sortOrder: "asc" }] satisfies Prisma.PublicSystemOrderByWithRelationInput[];

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

  return { data: rows.map(toPublicSystem), meta: { page, pageSize, total } };
}

export async function getPublicSystemBySlug(slug: string) {
  const row = await db.publicSystem.findUnique({ where: { slug } });
  if (!row) return null;

  const [impacts, testimonials] = await Promise.all([
    db.publicImpact.findMany({ where: { systemId: row.id }, orderBy: { sortOrder: "asc" } }),
    db.publicTestimonial.findMany({ where: { systemId: row.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    ...toPublicSystem(row),
    caseStudyBody: row.caseStudyBody,
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
  return rows.map(toPublicSystem);
}

/** Organizations for the catalog filter — only ones whose name is disclosed (BR-1.4). */
export async function getFilterOrganizations() {
  return db.publicOrganization.findMany({ orderBy: { name: "asc" } });
}
