// app/(public)/systems/_components/SystemsFilterBar.tsx
// Colocated — only used on /systems. Writes filters to URL query params
// (docs/PAGE-SPECIFICATIONS.md: "filters write to URL query params — the
// filtered view is a shareable link, not throwaway client state").
//
// Deliberately not a row of boxed generic-SaaS <select> elements — each
// filter is a mono label + an underline-only control, reusing the same
// dashed-underline-to-accent interaction language already established for
// rule citations (globals.css .rule-citation), rather than inventing a
// third, unrelated interaction style. Reads as a query line on a spec
// sheet, not a form.

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface FilterOption {
  key: string;
  label: string;
}

interface SystemsFilterBarProps {
  organizations: { slug: string; name: string }[];
  domains: FilterOption[];
  statuses: FilterOption[];
  // The empty state carries its own clear-filters action (PAGE-SPECIFICATIONS
  // /systems), so the bar hides its copy when there are no results — two
  // identical links on one screen is clutter, not affordance.
  showClear?: boolean;
}

function FilterField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 border-b border-slate/30 focus-within:border-accent pb-1 min-w-0">
      <span className="font-mono text-xs text-slate shrink-0">{label}</span>
      <select
        aria-label={`Filter by ${label}`}
        className="font-mono text-sm bg-transparent text-ink outline-none min-w-0 py-1.5 flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SystemsFilterBar({ organizations, domains, statuses, showClear = true }: SystemsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // any filter change resets pagination
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = Boolean(
    searchParams.get("organization") || searchParams.get("domain") || searchParams.get("status")
  );

  return (
    <div className="border-t border-b border-slate/20 py-4 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
        <FilterField
          label="organization"
          value={searchParams.get("organization") ?? ""}
          onChange={(v) => setFilter("organization", v)}
          options={organizations.map((org) => ({ value: org.slug, label: org.name }))}
        />
        <FilterField
          label="domain"
          value={searchParams.get("domain") ?? ""}
          onChange={(v) => setFilter("domain", v)}
          options={domains.map((d) => ({ value: d.key, label: d.label }))}
        />
        <FilterField
          label="status"
          value={searchParams.get("status") ?? ""}
          onChange={(v) => setFilter("status", v)}
          options={statuses.map((s) => ({ value: s.key, label: s.label }))}
        />
      </div>

      {hasFilters && showClear && (
        <Button
          type="button"
          variant="link"
          onClick={() => router.push(pathname)}
          className="mt-4 h-auto px-0 font-normal"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
