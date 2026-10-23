// components/systems/CatalogFilters.tsx
// The /systems toolbar (PAGE-SPECIFICATIONS: filters write to the URL — a
// filtered view is a shareable link), rebuilt in the premium pass (D-049,
// owner-approved 2026-10-23) to stay in reach:
//   - one glass bar that sticks under the header while you scroll the catalogue
//     (it rises to the top when the header slips away — HeaderFrame's
//     data-header on <html>), with how many systems match and the sort;
//   - on a laptop the four facets as dropdowns in it (home, status, technology,
//     domain), with counts; on a phone one "Filter" button with the number of
//     active filters, opening a sheet from the bottom (FilterSheet, the owner's
//     choice D3) — without JavaScript the dropdowns stay, as before;
//   - the active filters under it as chips, each a tap to remove, and Clear all.
// Every option is a plain link, so it works without JavaScript and every
// combination is linkable. A facet with a single option (nothing to choose)
// isn't shown. Options come from the data (lib/queries/catalog.ts), never a
// list in code.

import Link from "next/link";
import { X } from "lucide-react";
import { FilterDropdown } from "@/components/systems/FilterDropdown";
import { FilterSheet, type SheetGroup } from "@/components/systems/FilterSheet";
import { cn } from "@/lib/utils";
import type { Catalog } from "@/lib/queries/catalog";

type Params = Record<string, string | undefined>;
type Facets = Catalog["facets"];

function href(params: Params, change: Params) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...change, page: undefined })) if (v) next.set(k, v);
  const q = next.toString();
  return q ? `/systems?${q}` : "/systems";
}

const FACETS = [
  { name: "Home", param: "home", pick: (f: Facets) => f.homes },
  { name: "Status", param: "status", pick: (f: Facets) => f.statuses },
  { name: "Built with", param: "tech", pick: (f: Facets) => f.tech, hint: "Most used first", marks: true },
  { name: "Domain", param: "domain", pick: (f: Facets) => f.domains },
] as const;

/** The filters in force, each with its words and the link that removes it. */
export function activeFilters(params: Params, facets: Facets) {
  return FACETS.flatMap((f) => {
    const value = params[f.param];
    if (!value) return [];
    const option = f.pick(facets).find((o) => o.key.toLowerCase() === value.toLowerCase());
    return [{ param: f.param, name: f.name, label: option?.label ?? value, removeHref: href(params, { [f.param]: undefined }) }];
  });
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

export function CatalogFilters({ facets, params, total, systemsTotal }: { facets: Facets; params: Params; total: number; /** Every published system — "3 of 11". */ systemsTotal: number }) {
  const active = activeFilters(params, facets);
  const sort = params.sort === "active" ? "active" : "featured";
  const groups: SheetGroup[] = FACETS.map((f) => ({
    name: f.name,
    param: f.param,
    options: f.pick(facets).map((o) => {
      const on = params[f.param]?.toLowerCase() === o.key.toLowerCase();
      return { key: o.key, label: o.label, count: o.count, on, href: href(params, { [f.param]: on ? undefined : o.key }) };
    }),
  })).filter((g) => g.options.length > 1 || g.options.some((o) => o.on));

  return (
    <div className="catalog-toolbar sticky z-30 mb-10">
      <div className="bg-sheet/85 border-ink/10 flex flex-wrap items-center gap-2 rounded-2xl border p-2 shadow-[0_18px_40px_-28px_rgb(18_20_23/0.55)] backdrop-blur-xl">
        {/* A laptop: the four dropdowns. A phone with script: the sheet's button instead; without script, the dropdowns. */}
        <div className="hidden flex-wrap gap-2 md:flex [html:not(.js)_&]:flex">
          {FACETS.map((f) => (
            <Facet key={f.param} name={f.name} hint={"hint" in f ? f.hint : undefined} param={f.param} options={f.pick(facets)} params={params} marks={"marks" in f && f.marks} />
          ))}
        </div>
        <FilterSheet groups={groups} active={active.length} total={total} clearHref="/systems" className="md:hidden [html:not(.js)_&]:hidden" />

        <span className="flex-1" />
        <p className="text-slate hidden px-1 text-sm sm:block" aria-live="polite">
          <span className="type-data text-ink font-semibold">{total}</span>
          {active.length > 0 ? ` of ${systemsTotal}` : ""} {total === 1 ? "system" : "systems"}
        </p>
        <div className="border-ink/10 bg-paper flex items-center gap-1 rounded-full border p-1 text-[13px]" role="group" aria-label="Sort">
          {(
            [
              ["featured", "Featured"],
              ["active", "Recently active"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={href(params, { sort: key === "featured" ? undefined : key })}
              scroll={false}
              aria-current={sort === key ? "true" : undefined}
              className={cn("press inline-flex min-h-9 items-center rounded-full px-3 transition-colors", sort === key ? "bg-ink text-paper" : "text-slate hover:text-ink")}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {active.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {active.map((f) => (
            <Link
              key={f.param}
              href={f.removeHref}
              scroll={false}
              className="press bg-ink text-paper hover:bg-ink/85 focus-visible:outline-ember inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="text-paper/60">{f.name}:</span> {f.label}
              <X aria-hidden="true" className="size-3.5" />
              <span className="sr-only">(remove this filter)</span>
            </Link>
          ))}
          <Link href="/systems" scroll={false} className="tap-target text-accent ml-1 text-[13px] font-medium underline-offset-4 hover:underline">
            Clear all
          </Link>
          <span className="text-slate ml-auto text-sm sm:hidden" aria-live="polite">
            <span className="type-data text-ink font-semibold">{total}</span> of {systemsTotal}
          </span>
        </div>
      )}
    </div>
  );
}
