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

import { cache } from "react";
import { dbPublic } from "@/lib/db";
import { applyCatalog } from "@/lib/catalog/apply";
import { getSetting } from "@/lib/settings";
import { withScreenshots } from "@/lib/queries/systems";
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

/** Every published system's row and the homes, from the public views (React cache: once per render). */
export const loadCatalogData = cache(async () => {
  const now = new Date();
  const [systems, homes, links, repos, activity, languagesPerRepo] = await Promise.all([
    dbPublic.publicSystem.findMany({ orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }, { name: "asc" }, { id: "asc" }] }),
    getPublicHomes(),
    dbPublic.publicSystemHome.findMany(),
    dbPublic.publicGithubRepo.findMany({ where: { published: true } }),
    dbPublic.publicSystemActivity.findMany(),
    getSetting("github.languagesPerRepo"),
  ]);

  const start = monday(now);
  const weekKeys = Array.from({ length: WEEKS }, (_, i) => new Date(start.getTime() - (WEEKS - 1 - i) * 7 * DAY).toISOString().slice(0, 10));

  // Each system's stored screenshot (BR-1.18) where it has one — the spotlight shows it.
  const shots = await withScreenshots(systems.map((s) => ({ slug: s.slug, screenshotUrl: s.screenshotUrl })));
  const shotOf = new Map(shots.map((s) => [s.slug, s.screenshotUrl]));

  const rows = systems.map((s) => {
    const repo = repos.find((r) => r.slug === s.slug);
    const counts = new Map(activity.filter((a) => a.slug === s.slug).map((a) => [a.weekStart.toISOString().slice(0, 10), a.commits]));
    const weeks = weekKeys.map((k) => counts.get(k) ?? 0);
    const languages = Object.entries((repo?.languages ?? {}) as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, languagesPerRepo)
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
      screenshotUrl: shotOf.get(s.slug) ?? null,
      pushedAt: (repo?.pushedAt ?? s.githubPushedAt ?? null)?.toISOString() ?? null,
      lastPush: ago(repo?.pushedAt ?? s.githubPushedAt ?? null, now),
    };
  });

  return { rows, homes };
});

/** Everything the catalog is drawn from — every published system's row and the homes — read once per request. */
export type CatalogData = Awaited<ReturnType<typeof loadCatalogData>>;
export type CatalogRow = CatalogData["rows"][number];

/** The catalog, filtered and paged: the data, then the same pure step the browser runs (lib/catalog/apply.ts). */
export async function getCatalog(params: CatalogParams = {}) {
  return applyCatalog(await loadCatalogData(), params);
}

export type Catalog = Awaited<ReturnType<typeof getCatalog>>;
export type CatalogSystem = Catalog["systems"][number];
