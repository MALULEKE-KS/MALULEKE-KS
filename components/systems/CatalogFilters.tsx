// components/systems/CatalogFilters.tsx
// The /systems filters (PAGE-SPECIFICATIONS: filters write to the URL — a
// filtered view is a shareable link). A dropdown per facet — home, status,
// technology, domain — with counts, and a sort; every option is a plain link
// inside a <details>, so it works without JavaScript and every combination is
// linkable. A facet with a
// single option (nothing to choose) isn't shown. Options come from the data
// (lib/queries/catalog.ts), never a list in code.

import Link from "next/link";
import { X } from "lucide-react";
import { FilterDropdown } from "@/components/systems/FilterDropdown";
import { cn } from "@/lib/utils";
import type { Catalog } from "@/lib/queries/catalog";

type Params = Record<string, string | undefined>;

function href(params: Params, change: Params) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...change, page: undefined })) if (v) next.set(k, v);
  const q = next.toString();
  return q ? `/systems?${q}` : "/systems";
}

/** One facet as a dropdown; nothing to choose (a single option) → not shown. */
function Facet({ name, hint, param, options, params, marks = false }: { name: string; hint?: string; param: string; options: { key: string; label: string; count: number }[]; params: Params; marks?: boolean }) {
  if (options.length < 2 && !params[param]) return null;
  return (
    <FilterDropdown
      name={name}
      hint={hint}
      marks={marks}
      current={params[param] ?? null}
      allHref={href(params, { [param]: undefined })}
      options={options.map((o) => {
        const on = params[param]?.toLowerCase() === o.key.toLowerCase();
        return { ...o, href: href(params, { [param]: on ? undefined : o.key }) };
      })}
    />
  );
}

export function CatalogFilters({ facets, params, total }: { facets: Catalog["facets"]; params: Params; total: number }) {
  const filtered = Boolean(params.home || params.status || params.tech || params.domain);
  const sort = params.sort === "active" ? "active" : "featured";
  return (
    <div className="border-ink/10 mb-10 border-b pb-8">
      {/* Every facet a dropdown (owner, 2026-10-03): the rows of chips were the page's noise. */}
      <div className="flex flex-wrap gap-2">
        <Facet name="Home" param="home" options={facets.homes} params={params} />
        <Facet name="Status" param="status" options={facets.statuses} params={params} />
        <Facet name="Built with" hint="Most used first" param="tech" options={facets.tech} params={params} marks />
        <Facet name="Domain" param="domain" options={facets.domains} params={params} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
        <p className="text-slate text-sm" aria-live="polite">
          <span className="type-data text-ink font-semibold">{total}</span> {total === 1 ? "system" : "systems"}
          {filtered && (
            <Link href="/systems" className="text-accent ml-3 inline-flex items-center gap-1 underline-offset-2 hover:underline">
              <X aria-hidden="true" className="size-3.5" /> Clear filters
            </Link>
          )}
        </p>
        <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-sheet p-1 text-[13px]" role="group" aria-label="Sort">
          {(
            [
              ["featured", "Featured"],
              ["active", "Recently active"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={href(params, { sort: key === "featured" ? undefined : key })}
              aria-current={sort === key ? "true" : undefined}
              className={cn("rounded-full px-3 py-1 transition-colors", sort === key ? "bg-ink text-paper" : "text-slate hover:text-ink")}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
