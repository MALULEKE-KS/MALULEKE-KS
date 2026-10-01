// components/systems/CatalogFilters.tsx
// The /systems filters (PAGE-SPECIFICATIONS: filters write to the URL — a
// filtered view is a shareable link). Chips with counts per facet — home,
// status, technology, domain — and a sort; each chip is a plain link, so it
// works without JavaScript and every combination is linkable. A facet with a
// single option (nothing to choose) isn't shown. Options come from the data
// (lib/queries/catalog.ts), never a list in code.

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Catalog } from "@/lib/queries/catalog";

type Params = Record<string, string | undefined>;

function href(params: Params, change: Params) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...change, page: undefined })) if (v) next.set(k, v);
  const q = next.toString();
  return q ? `/systems?${q}` : "/systems";
}

function Facet({ name, param, options, params }: { name: string; param: string; options: { key: string; label: string; count: number }[]; params: Params }) {
  if (options.length < 2 && !params[param]) return null;
  const current = params[param];
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <span className="text-slate w-24 shrink-0 font-mono text-[11px] tracking-wide uppercase">{name}</span>
      <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible md:pb-0">
        <li>
          <Link
            href={href(params, { [param]: undefined })}
            aria-current={!current ? "true" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-[13px] whitespace-nowrap transition-colors",
              !current ? "border-ink bg-ink text-paper" : "border-ink/12 bg-sheet text-slate hover:border-ink/30 hover:text-ink",
            )}
          >
            All
          </Link>
        </li>
        {options.map((o) => {
          const on = current?.toLowerCase() === o.key.toLowerCase();
          return (
            <li key={o.key}>
              <Link
                href={href(params, { [param]: on ? undefined : o.key })}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] whitespace-nowrap transition-colors",
                  on ? "border-ink bg-ink text-paper" : "border-ink/12 bg-sheet text-ink hover:border-ink/30",
                )}
              >
                {o.label}
                <span className={cn("type-data text-[11px]", on ? "text-mist" : "text-slate")}>{o.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CatalogFilters({ facets, params, total }: { facets: Catalog["facets"]; params: Params; total: number }) {
  const filtered = Boolean(params.home || params.status || params.tech || params.domain);
  const sort = params.sort === "active" ? "active" : "featured";
  return (
    <div className="border-ink/10 mb-10 space-y-3 border-b pb-8">
      <Facet name="Home" param="home" options={facets.homes} params={params} />
      <Facet name="Status" param="status" options={facets.statuses} params={params} />
      <Facet name="Built with" param="tech" options={facets.tech} params={params} />
      <Facet name="Domain" param="domain" options={facets.domains} params={params} />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
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
