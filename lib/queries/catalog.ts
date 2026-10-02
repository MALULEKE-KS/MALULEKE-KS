// lib/queries/catalog.ts
// /systems — the catalog (PAGE-BUILD-PLAYBOOK §9). Every published system
// with what makes it alive: its GitHub home (PublicSystemHome), 26 weeks of
// activity (PublicSystemActivity), last push and languages (PublicGithubRepo —
// public repos only; a private repo's languages are never read), and whether
// it has a written case study. Filters and counts come from the same rows, so
// a filter can never offer something that isn't there.
//
// The catalog is small (tens of systems), so it is filtered and paged here in
// one pass rather than in several queries; public role only (F1.8).

import { dbPublic } from "@/lib/db";
import { getPublicHomes } from "@/lib/queries/profile";
import { ago } from "@/lib/queries/work";

const WEEKS = 26;
const DAY = 86_400_000;

export type CatalogSort = "featured" | "active";

export interface CatalogParams {
  home?: string | null;
  status?: string | null;
  domain?: string | null;
  tech?: string | null;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * What the card says the system is. A synced repo's description is often just
 * its own name ("my-angular-portfolio") — that says nothing, so the start of
 * the README (public repos only) stands in, or nothing at all: never filler.
 */
export function describe(description: string | null, name: string, slug: string, readme: string | null): string | null {
  const d = description?.trim() ?? "";
  if (d && squash(d) !== squash(name) && squash(d) !== squash(slug)) return d;
  const r = readme?.trim().split(/\n\s*\n/)[0]?.trim() ?? "";
  return r.length >= 20 ? r : null;
}

function monday(d: Date) {
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  m.setUTCDate(m.getUTCDate() - ((m.getUTCDay() + 6) % 7));
  return m;
}

export async function getCatalog({ home, status, domain, tech, sort = "featured", page = 1, pageSize = 12 }: CatalogParams) {
  const now = new Date();
  const [systems, homes, links, repos, activity] = await Promise.all([
    dbPublic.publicSystem.findMany({ orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }, { name: "asc" }, { id: "asc" }] }),
    getPublicHomes(),
    dbPublic.publicSystemHome.findMany(),
    dbPublic.publicGithubRepo.findMany({ where: { published: true } }),
    dbPublic.publicSystemActivity.findMany(),
  ]);

  const start = monday(now);
  const weekKeys = Array.from({ length: WEEKS }, (_, i) => new Date(start.getTime() - (WEEKS - 1 - i) * 7 * DAY).toISOString().slice(0, 10));

  const rows = systems.map((s) => {
    const repo = repos.find((r) => r.slug === s.slug);
    const counts = new Map(activity.filter((a) => a.slug === s.slug).map((a) => [a.weekStart.toISOString().slice(0, 10), a.commits]));
    const weeks = weekKeys.map((k) => counts.get(k) ?? 0);
    const languages = Object.entries((repo?.languages ?? {}) as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([n]) => n);
    // The technologies shown: the curated stack first, then the repo's languages.
    const tech = [...new Map([...s.techStack, ...languages].map((t) => [t.toLowerCase(), t])).values()];
    const homeSlug = links.find((l) => l.slug === s.slug)?.homeSlug ?? null;
    return {
      slug: s.slug,
      name: s.name,
      description: describe(s.description, s.name, s.slug, repo?.readmeExcerpt ?? null),
      organization: s.organization,
      domain: s.domain,
      domainKey: s.domainKey,
      status: s.status,
      statusKey: s.statusKey,
      statusColorToken: s.statusColorToken,
      stage: s.stage,
      isFlagship: s.isFlagship,
      repoPrivate: s.repoPrivate,
      hasCaseStudy: s.caseStudyBody.trim().length > 0,
      home: homes.find((h) => h.slug === homeSlug)?.name ?? null,
      homeSlug,
      tech,
      weeks,
      commitsLast4Weeks: weeks.slice(-4).reduce((a, b) => a + b, 0),
      pushedAt: repo?.pushedAt ?? s.githubPushedAt ?? null,
      lastPush: ago(repo?.pushedAt ?? s.githubPushedAt ?? null, now),
    };
  });

  // Facets, counted over everything (so the counts don't change as you filter).
  const count = <K extends string | null>(pick: (r: (typeof rows)[number]) => K[]) => {
    const m = new Map<string, number>();
    for (const r of rows) for (const k of pick(r)) if (k) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const homeCounts = count((r) => [r.homeSlug]);
  const statusCounts = count((r) => [r.statusKey]);
  const domainCounts = count((r) => [r.domainKey]);
  const techCounts = count((r) => r.tech.map((t) => t.toLowerCase()));
  const techSpelling = new Map(rows.flatMap((r) => r.tech.map((t) => [t.toLowerCase(), t] as const)));

  const facets = {
    homes: homes.filter((h) => homeCounts.has(h.slug)).map((h) => ({ key: h.slug, label: h.name, count: homeCounts.get(h.slug)! })),
    statuses: [...statusCounts].map(([key, n]) => ({ key, label: rows.find((r) => r.statusKey === key)!.status, count: n })).sort((a, b) => b.count - a.count),
    domains: [...domainCounts].map(([key, n]) => ({ key, label: rows.find((r) => r.domainKey === key)!.domain ?? key, count: n })).sort((a, b) => b.count - a.count),
    tech: [...techCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([key, n]) => ({ key, label: techSpelling.get(key) ?? key, count: n })),
  };

  let filtered = rows.filter(
    (r) =>
      (!home || r.homeSlug === home) &&
      (!status || r.statusKey === status) &&
      (!domain || r.domainKey === domain) &&
      (!tech || r.tech.some((t) => t.toLowerCase() === tech.toLowerCase())),
  );
  if (sort === "active") {
    filtered = [...filtered].sort((a, b) => (b.pushedAt?.getTime() ?? 0) - (a.pushedAt?.getTime() ?? 0));
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize).map(({ pushedAt: _p, ...r }) => r);

  const stats = {
    systems: rows.length,
    homes: facets.homes.length,
    caseStudies: rows.filter((r) => r.hasCaseStudy).length,
    activeThisMonth: rows.filter((r) => r.commitsLast4Weeks > 0).length,
  };

  // The homes, in the site's order (personal first), with what the page says about each.
  const homeList = homes
    .filter((h) => homeCounts.has(h.slug))
    .map((h) => ({ slug: h.slug, name: h.name, role: h.role, github: h.github, count: homeCounts.get(h.slug)! }));

  return { systems: pageRows, total, page: current, totalPages, facets, stats, homes: homeList };
}

export type Catalog = Awaited<ReturnType<typeof getCatalog>>;
export type CatalogSystem = Catalog["systems"][number];
