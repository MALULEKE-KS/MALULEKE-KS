// lib/queries/systems.ts
// Shared query logic for public Systems data — used by both the API route
// handlers (app/api/v1/systems/*) and Server Component pages directly.
// A page fetching its own API route over HTTP would be an unnecessary
// network hop in the App Router; both call this instead, so the BR-1.1
// query gate (PUBLISHED_WHERE) and filtering logic exist in exactly one
// place regardless of caller.

import { db } from "@/lib/db";
import {
  PUBLISHED_WHERE,
  systemWithPublicRelations,
  systemWithPublicDetailRelations,
  toPublicSystem,
  toPublicSystemDetailed,
} from "@/lib/rules/publishing";

export interface PublicSystemsFilters {
  organizationSlug?: string | null;
  domainKey?: string | null;
  statusKey?: string | null;
  flagship?: boolean | null;
  page?: number;
  pageSize?: number;
}

export async function getPublicSystems({
  organizationSlug,
  domainKey,
  statusKey,
  flagship,
  page = 1,
  pageSize = 20,
}: PublicSystemsFilters) {
  const where = {
    ...PUBLISHED_WHERE,
    ...(organizationSlug && { organization: { slug: organizationSlug } }),
    ...(domainKey && { domain: { key: domainKey } }),
    ...(statusKey && { status: { key: statusKey } }),
    ...(flagship !== null && flagship !== undefined && { isFlagship: flagship }),
  };

  const [systems, total] = await Promise.all([
    db.system.findMany({
      where,
      ...systemWithPublicRelations,
      orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.system.count({ where }),
  ]);

  return {
    data: systems.map(toPublicSystem),
    meta: { page, pageSize, total },
  };
}

export async function getPublicSystemBySlug(slug: string) {
  const system = await db.system.findFirst({
    where: { slug, ...PUBLISHED_WHERE },
    ...systemWithPublicDetailRelations,
  });

  return system ? toPublicSystemDetailed(system) : null;
}

export async function getRelatedSystems(domainKey: string | null, excludeSlug: string, limit = 3) {
  if (!domainKey) return [];

  const systems = await db.system.findMany({
    where: { ...PUBLISHED_WHERE, domain: { key: domainKey }, slug: { not: excludeSlug } },
    ...systemWithPublicRelations,
    orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }],
    take: limit,
  });

  return systems.map(toPublicSystem);
}

export async function getFilterOrganizations() {
  return db.organization.findMany({
    where: { systems: { some: PUBLISHED_WHERE } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}
