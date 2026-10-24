// tests/unit/catalog-apply.test.ts
// The catalog's filters, counts and pages are one pure step (D-063): the browser applies
// them to the cached page exactly as the server did — counts over everything, the filter
// narrows, a page past the end is the last page, "active" sorts by the latest push.

import { describe, expect, it } from "vitest";
import { applyCatalog } from "@/lib/catalog/apply";
import type { CatalogData, CatalogRow } from "@/lib/queries/catalog";

const row = (slug: string, statusKey: string, pushedAt: string | null, tech: string[] = []): CatalogRow =>
  ({ slug, name: slug, statusKey, status: statusKey, domainKey: null, domain: null, homeSlug: "me", home: "Me", tech, pushedAt, hasCaseStudy: false, commitsLast4Weeks: 0, isFlagship: false }) as unknown as CatalogRow;

const data = {
  rows: [row("a", "finished", "2026-10-01T00:00:00Z", ["Next.js"]), row("b", "coursework", "2026-10-20T00:00:00Z"), row("c", "coursework", null)],
  homes: [{ slug: "me", name: "Me", role: null, kind: "personal", github: [], publishedSystems: 3, systems: ["a", "b", "c"] }],
} as unknown as CatalogData;

describe("applyCatalog", () => {
  it("narrows by a filter while the counts stay over everything", () => {
    const got = applyCatalog(data, { status: "coursework" });
    expect(got.systems.map((s) => s.slug)).toEqual(["b", "c"]);
    expect(got.facets.statuses.find((f) => f.key === "coursework")?.count).toBe(2);
    expect(got.stats.systems).toBe(3);
  });

  it("matches a technology in any case, sorts by the latest push, and keeps the page in range", () => {
    expect(applyCatalog(data, { tech: "next.js" }).systems.map((s) => s.slug)).toEqual(["a"]);
    expect(applyCatalog(data, { sort: "active" }).systems.map((s) => s.slug)).toEqual(["b", "a", "c"]);
    const paged = applyCatalog(data, { page: 9, pageSize: 2 });
    expect([paged.page, paged.totalPages, paged.systems.length]).toEqual([2, 2, 1]);
  });
});
