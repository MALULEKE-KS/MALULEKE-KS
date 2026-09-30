// app/(public)/systems/_components/SystemsFilterBar.tsx
// Colocated — only used on /systems. Writes filters to URL query params
// (docs/PAGE-SPECIFICATIONS.md: "filters write to URL query params — the
// filtered view is a shareable link, not throwaway client state"). Each filter
// is a pill (DESIGN-SYSTEM.md v3 §3) around a real <select> — keyboard and
// screen-reader native — with the mono label the spec asks for. Options come
// live from the lookup tables (EXT-1).

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  key: string;
  label: string;
}

interface SystemsFilterBarProps {
  organizations: { slug: string; name: string }[];
  domains: FilterOption[];
  statuses: FilterOption[];
  total: number;
}

function FilterPill({
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
  const active = value !== "";
  return (
    <label
      className={cn(
        "shadow-soft focus-within:outline-ember relative inline-flex items-center gap-2 rounded-full border py-2 pr-9 pl-4 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/15 bg-sheet text-ink hover:border-ink/30"
      )}
    >
      <span className={cn("font-mono text-xs", active ? "text-mist" : "text-slate")}>{label}</span>
      <select
        aria-label={`Filter by ${label}`}
        className="[&>option]:bg-sheet [&>option]:text-ink cursor-pointer appearance-none bg-transparent font-medium outline-none"
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
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 size-4 opacity-70"
      />
    </label>
  );
}

export function SystemsFilterBar({
  organizations,
  domains,
  statuses,
  total,
}: SystemsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // any filter change resets pagination
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const hasFilters = Boolean(
    searchParams.get("organization") || searchParams.get("domain") || searchParams.get("status")
  );

  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Filters">
        <FilterPill
          label="organization"
          value={searchParams.get("organization") ?? ""}
          onChange={(v) => setFilter("organization", v)}
          options={organizations.map((org) => ({ value: org.slug, label: org.name }))}
        />
        <FilterPill
          label="domain"
          value={searchParams.get("domain") ?? ""}
          onChange={(v) => setFilter("domain", v)}
          options={domains.map((d) => ({ value: d.key, label: d.label }))}
        />
        <FilterPill
          label="status"
          value={searchParams.get("status") ?? ""}
          onChange={(v) => setFilter("status", v)}
          options={statuses.map((s) => ({ value: s.key, label: s.label }))}
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(pathname, { scroll: false })}
            className="text-slate hover:text-ink focus-visible:outline-ember inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <X aria-hidden="true" className="size-4" />
            Clear
          </button>
        )}
      </div>
      <p className="text-slate font-mono text-sm" aria-live="polite">
        {total} {total === 1 ? "system" : "systems"}
      </p>
    </div>
  );
}
