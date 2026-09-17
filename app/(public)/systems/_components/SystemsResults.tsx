// app/(public)/systems/_components/SystemsResults.tsx
// The actual async data-fetching + rendering for /systems, factored out of
// page.tsx so it can sit inside an explicit <Suspense> boundary scoped to
// just this page (see SystemsGridSkeleton.tsx for why not a loading.tsx file).

import Link from "next/link";
import { SystemCard } from "@/components/shared/SystemCard";
import { SystemsFilterBar } from "./SystemsFilterBar";
import { getPublicSystems, getFilterOrganizations } from "@/lib/queries/systems";
import { listLookupValues } from "@/lib/rules/lookups";
import { PaginationQuerySchema } from "@/lib/schemas";

interface SystemsResultsProps {
  searchParams: Record<string, string | undefined>;
}

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
    const next = new URLSearchParams(params as Record<string, string>);
    next.set("page", String(targetPage));
    return `/systems?${next.toString()}`;
  }

  return (
    <>
      <SystemsFilterBar
        organizations={organizations}
        domains={domains.map((d) => ({ key: d.key, label: d.label }))}
        statuses={statuses.map((s) => ({ key: s.key, label: s.label }))}
      />

      {systems.length === 0 ? (
        <div className="py-16 text-center">
          {/* Voice consistent with the ledger/audit-log metaphor established
              on the homepage ("SYSTEM LOG") — plainly stated, not apologetic
              (Design System §4: "errors and empty states speak plainly"). */}
          <p className="font-mono text-sm text-slate mb-1">SYSTEM LOG</p>
          <p className="font-sans text-ink mb-4">
            {hasFilters ? "No entries logged for this query." : "No systems logged yet."}
          </p>
          {hasFilters && (
            <Link href="/systems" className="rule-citation text-sm">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systems.map((system) => (
              <SystemCard
                key={system.id}
                slug={system.slug}
                name={system.name}
                description={system.description}
                status={{ label: system.status, colorToken: system.statusColorToken }}
                isFlagship={system.isFlagship}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-4 mt-8 font-mono text-sm text-slate">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="text-ink underline underline-offset-2">
                  Prev
                </Link>
              ) : (
                <span className="opacity-40">Prev</span>
              )}
              <span>
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="text-ink underline underline-offset-2">
                  Next
                </Link>
              ) : (
                <span className="opacity-40">Next</span>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
