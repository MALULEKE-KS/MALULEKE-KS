// app/(public)/systems/_components/SystemsResults.tsx
// The async data-fetching + rendering for /systems, factored out of page.tsx
// so it can sit inside an explicit <Suspense> boundary scoped to just this
// page (see SystemsGridSkeleton.tsx for why not a loading.tsx file).

import Link from "next/link";
import { ArrowLeft, ArrowRight, SearchX } from "lucide-react";
import { SystemCard } from "@/components/shared/SystemCard";
import { Reveal } from "@/components/shared/Reveal";
import { SystemsFilterBar } from "./SystemsFilterBar";
import { getPublicSystems, getFilterOrganizations } from "@/lib/queries/systems";
import { listLookupValues } from "@/lib/rules/lookups";
import { PaginationQuerySchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface SystemsResultsProps {
  searchParams: Record<string, string | undefined>;
}

const PAGER =
  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

export async function SystemsResults({ searchParams: params }: SystemsResultsProps) {
  const { page, pageSize } = PaginationQuerySchema.parse({
    page: params.page,
    pageSize: params.pageSize,
  });

  const [{ data: systems, meta }, organizations, domains, statuses] = await Promise.all([
    getPublicSystems({
      organizationSlug: params.organization ?? null,
      domainKey: params.domain ?? null,
      statusKey: params.status ?? null,
      page,
      pageSize,
    }),
    getFilterOrganizations(),
    listLookupValues("domain", false),
    listLookupValues("status", false),
  ]);

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const hasFilters = Boolean(params.organization || params.domain || params.status);

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => Boolean(e[1]))
    );
    next.set("page", String(targetPage));
    return `/systems?${next.toString()}`;
  }

  return (
    <>
      <SystemsFilterBar
        organizations={organizations}
        domains={domains.map((d) => ({ key: d.key, label: d.label }))}
        statuses={statuses.map((s) => ({ key: s.key, label: s.label }))}
        total={meta.total}
      />

      {systems.length === 0 ? (
        // Plainly stated, never a dead end (Design System §4; PAGE-SPECIFICATIONS
        // /systems: one-click clear-filters).
        <div className="border-ink/15 bg-sheet grid place-items-center rounded-3xl border border-dashed px-6 py-20 text-center">
          <SearchX aria-hidden="true" className="text-slate size-8" />
          <p className="text-ink mt-4 font-sans text-lg font-medium">
            {hasFilters ? "No systems match these filters." : "No systems published yet."}
          </p>
          {hasFilters && (
            <Link
              href="/systems"
              className="bg-ink text-paper focus-visible:outline-ember mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {systems.map((system, i) => (
              <li key={system.id}>
                <Reveal delay={Math.min(i, 5) * 60} className="h-full">
                  <SystemCard
                    slug={system.slug}
                    name={system.name}
                    description={system.description}
                    status={{ label: system.status, colorToken: system.statusColorToken }}
                    isFlagship={system.isFlagship}
                    organization={system.organization}
                    domain={system.domain}
                    techStack={system.techStack}
                  />
                </Reveal>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-4">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  rel="prev"
                  className={cn(PAGER, "border-ink/15 bg-sheet text-ink hover:border-ink/30")}
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Previous
                </Link>
              ) : (
                <span aria-disabled="true" className={cn(PAGER, "border-ink/10 text-slate/60")}>
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Previous
                </span>
              )}
              <span className="text-slate font-mono text-sm" aria-current="page">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  rel="next"
                  className={cn(PAGER, "border-ink/15 bg-sheet text-ink hover:border-ink/30")}
                >
                  Next
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              ) : (
                <span aria-disabled="true" className={cn(PAGER, "border-ink/10 text-slate/60")}>
                  Next
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
