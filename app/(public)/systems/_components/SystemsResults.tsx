// app/(public)/systems/_components/SystemsResults.tsx
// The catalog's filters and results (PAGE-BUILD-PLAYBOOK §9), inside the
// page's <Suspense> (see SystemsGridSkeleton.tsx for why not a loading.tsx).
// Data: lib/queries/catalog.ts — filters, counts and pages from one read.

import Link from "next/link";
import { ArrowLeft, ArrowRight, SearchX } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";
import { CatalogCard } from "@/components/systems/CatalogCard";
import { CatalogFilters } from "@/components/systems/CatalogFilters";
import { getCatalog, type Catalog } from "@/lib/queries/catalog";
import { PaginationQuerySchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const PAGER =
  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

type Params = Record<string, string | undefined>;

export async function loadCatalog(params: Params): Promise<Catalog> {
  const { page } = PaginationQuerySchema.parse({ page: params.page });
  return getCatalog({
    home: params.home ?? null,
    status: params.status ?? null,
    domain: params.domain ?? null,
    tech: params.tech ?? null,
    sort: params.sort === "active" ? "active" : "featured",
    page,
    pageSize: PAGE_SIZE,
  });
}

export async function SystemsResults({ searchParams: params }: { searchParams: Params }) {
  const catalog = await loadCatalog(params);
  const { systems, total, page, totalPages, facets } = catalog;
  const filtered = Boolean(params.home || params.status || params.tech || params.domain);

  const pageHref = (target: number) => {
    const next = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    next.set("page", String(target));
    return `/systems?${next.toString()}`;
  };

  return (
    <>
      <CatalogFilters facets={facets} params={params} total={total} />

      {systems.length === 0 ? (
        // Plainly stated, never a dead end (PAGE-SPECIFICATIONS /systems: one-click clear-filters).
        <div className="border-ink/15 bg-sheet grid place-items-center rounded-3xl border border-dashed px-6 py-20 text-center">
          <SearchX aria-hidden="true" className="text-slate size-8" />
          <p className="text-ink mt-4 text-lg font-medium">{filtered ? "No systems match these filters." : "No systems published yet."}</p>
          {filtered && (
            <Link href="/systems" className="bg-ink text-paper focus-visible:outline-ember mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {systems.map((s, i) => (
              <li key={s.slug}>
                <Reveal delay={Math.min(i, 5) * 60} className="h-full">
                  <CatalogCard s={s} />
                </Reveal>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-4">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} rel="prev" className={cn(PAGER, "border-ink/15 bg-sheet text-ink hover:border-ink/30")}>
                  <ArrowLeft aria-hidden="true" className="size-4" /> Previous
                </Link>
              ) : (
                <span aria-disabled="true" className={cn(PAGER, "border-ink/10 text-slate/60")}>
                  <ArrowLeft aria-hidden="true" className="size-4" /> Previous
                </span>
              )}
              <span className="text-slate font-mono text-sm" aria-current="page">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} rel="next" className={cn(PAGER, "border-ink/15 bg-sheet text-ink hover:border-ink/30")}>
                  Next <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              ) : (
                <span aria-disabled="true" className={cn(PAGER, "border-ink/10 text-slate/60")}>
                  Next <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
