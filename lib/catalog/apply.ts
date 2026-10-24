// lib/catalog/apply.ts
// The catalog's filters, counts and pages (PAGE-BUILD-PLAYBOOK §9), as a pure function
// of its rows — no database, so the same code runs on the server and in the browser.
// /systems is served from the cache (D-063): the page carries every published system
// and the browser applies the URL's filters with this; the server uses it too
// (getCatalog), so a filtered view reads the same wherever it is drawn.

import type { CatalogData, CatalogParams } from "@/lib/queries/catalog";

export function applyCatalog(data: CatalogData, { home, status, domain, tech, sort = "featured", page = 1, pageSize = 12 }: CatalogParams) {
  const rows = data.rows;
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
    homes: data.homes.filter((h) => homeCounts.has(h.slug)).map((h) => ({ key: h.slug, label: h.name, count: homeCounts.get(h.slug)! })),
    statuses: [...statusCounts].map(([key, n]) => ({ key, label: rows.find((r) => r.statusKey === key)!.status, count: n })).sort((a, b) => b.count - a.count),
    domains: [...domainCounts].map(([key, n]) => ({ key, label: rows.find((r) => r.domainKey === key)!.domain ?? key, count: n })).sort((a, b) => b.count - a.count),
    // Every technology the catalog's work uses — a filter never hides one.
    tech: [...techCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, n]) => ({ key, label: techSpelling.get(key) ?? key, count: n })),
  };

  let filtered = rows.filter(
    (r) =>
      (!home || r.homeSlug === home) &&
      (!status || r.statusKey === status) &&
      (!domain || r.domainKey === domain) &&
      (!tech || r.tech.some((t) => t.toLowerCase() === tech.toLowerCase())),
  );
  if (sort === "active") {
    filtered = [...filtered].sort((a, b) => (b.pushedAt ? Date.parse(b.pushedAt) : 0) - (a.pushedAt ? Date.parse(a.pushedAt) : 0));
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
  const homeList = data.homes
    .filter((h) => homeCounts.has(h.slug))
    .map((h) => ({ slug: h.slug, name: h.name, role: h.role, kind: h.kind, github: h.github, count: homeCounts.get(h.slug)! }));

  return { systems: pageRows, total, page: current, totalPages, facets, stats, homes: homeList };
}

