// app/(public)/systems/_components/SystemsResults.tsx
// The catalog's filters and results (PAGE-BUILD-PLAYBOOK §9), inside the
// page's <Suspense> (see SystemsGridSkeleton.tsx for why not a loading.tsx).
// Data: lib/queries/catalog.ts — filters, counts and pages from one read.

import Link from "next/link";
import { ArrowLeft, ArrowRight, SearchX, X } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";
import { CatalogCard } from "@/components/systems/CatalogCard";
import { CatalogFilters, activeFilters } from "@/components/systems/CatalogFilters";
import { getCatalog, type Catalog, type CatalogSystem } from "@/lib/queries/catalog";
import { sectionCopy } from "@/lib/content/copy";
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

/**
 * The cards. A home with one system shows it wide (picture beside story) and two share
 * the row in halves, so a small home never leaves an empty row (D-049, the owner's
 * choice D2); three or more use the three-column grid.
 */
function Grid({ systems, showHome = true, fit = false }: { systems: CatalogSystem[]; showHome?: boolean; /** Size the row to how many there are (a home's group). */ fit?: boolean }) {
  const n = systems.length;
  const cols = fit && n === 1 ? "grid-cols-1" : fit && n === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3";
  return (
    <ul className={cn("grid gap-5", cols)}>
      {systems.map((s, i) => (
        <li key={s.slug}>
          <Reveal delay={Math.min(i, 5) * 60} className="h-full">
            <CatalogCard s={s} showHome={showHome} layout={fit && n === 1 ? "wide" : "grid"} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/** The three groups, in order (D-061): the owner's best work first, so the rest never dilutes it. */
type GroupKey = "flagships" | "ventures" | "coursework";
const GROUP_FALLBACK: Record<GroupKey, { title: string; description: string }> = {
  flagships: { title: "Flagships", description: "My best work, live in production." },
  ventures: { title: "Ventures & clients", description: "Built for my own ventures and for clients." },
  coursework: { title: "Coursework & experiments", description: "University coursework and experiments." },
};

/** Flagships by the owner's flagship choice; then what lives under a venture or a client home; then the rest. */
function groupOf(s: CatalogSystem, homes: Catalog["homes"]): GroupKey {
  if (s.isFlagship) return "flagships";
  const kind = homes.find((h) => h.slug === s.homeSlug)?.kind;
  return kind === "venture" || kind === "client" ? "ventures" : "coursework";
}

/**
 * The unfiltered catalog in three groups (D-061, the owner's choice 2026-10-24): Flagships,
 * Ventures & clients, Coursework & experiments — each a heading, a line and its count, then its
 * systems (each card still names its home). The groups follow data the owner manages — the
 * flagship toggle and each organisation's kind — and their words are the "page-copy" block's
 * systems.flagships / systems.ventures / systems.coursework. Only when the whole catalog fits on
 * one page — a group split across pages would say less than the flat grid.
 */
async function ByGroup({ systems, homes }: { systems: CatalogSystem[]; homes: Catalog["homes"] }) {
  const keys: GroupKey[] = ["flagships", "ventures", "coursework"];
  const groups = await Promise.all(
    keys.map(async (key) => ({ key, copy: await sectionCopy(`systems.${key}`, GROUP_FALLBACK[key]), systems: systems.filter((s) => groupOf(s, homes) === key) })),
  );
  return (
    <div className="space-y-16">
      {groups
        .filter((g) => g.systems.length > 0)
        .map((g) => (
          <section key={g.key} aria-labelledby={`group-${g.key}`}>
            <div className="border-ink/10 mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b pb-3">
              <div className="min-w-0">
                <h2 id={`group-${g.key}`} className="text-ink text-xl font-semibold tracking-tight md:text-2xl">
                  {g.copy.title}
                </h2>
                {g.copy.description && <p className="text-slate mt-1 max-w-2xl text-sm">{g.copy.description}</p>}
              </div>
              <p className="text-slate text-sm">
                <span className="type-data">{g.systems.length}</span> {g.systems.length === 1 ? "system" : "systems"}
              </p>
            </div>
            <Grid systems={g.systems} fit />
          </section>
        ))}
    </div>
  );
}

export async function SystemsResults({ searchParams: params }: { searchParams: Params }) {
  const catalog = await loadCatalog(params);
  const { systems, total, page, totalPages, facets, homes } = catalog;
  const filtered = Boolean(params.home || params.status || params.tech || params.domain);
  const grouped = !filtered && params.sort !== "active" && totalPages === 1;

  const pageHref = (target: number) => {
    const next = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    next.set("page", String(target));
    return `/systems?${next.toString()}`;
  };

  return (
    <>
      <CatalogFilters facets={facets} params={params} total={total} systemsTotal={catalog.stats.systems} />

      {systems.length === 0 ? (
        // Plainly stated, never a dead end (PAGE-SPECIFICATIONS /systems: one-click clear-filters): it says which
        // filters matched nothing, each one a tap to remove.
        <div className="border-ink/15 bg-sheet grid place-items-center rounded-3xl border border-dashed px-6 py-20 text-center">
          <SearchX aria-hidden="true" className="text-slate size-8" />
          <p className="text-ink mt-4 text-lg font-medium">{filtered ? "No systems match these filters." : "No systems published yet."}</p>
          {filtered && (
            <>
              <ul className="mt-4 flex flex-wrap justify-center gap-2">
                {activeFilters(params, facets).map((f) => (
                  <li key={f.param}>
                    <Link href={f.removeHref} scroll={false} className="press bg-ink text-paper inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px]">
                      {f.label} <X aria-hidden="true" className="size-3.5" />
                      <span className="sr-only">(remove this filter)</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/systems" className="press bg-ink text-paper focus-visible:outline-ember mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
                Clear all filters
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {grouped ? <ByGroup systems={systems} homes={homes} /> : <Grid systems={systems} />}

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
