// app/(public)/systems/_components/SystemsFilterBar.tsx
// Colocated — only used on /systems. Writes filters to URL query params
// (docs/PAGE-SPECIFICATIONS.md: "filters write to URL query params — the
// filtered view is a shareable link, not throwaway client state").
// Mono labels per Design System §2, not icons standing in for text.

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface FilterOption {
  key: string;
  label: string;
}

interface SystemsFilterBarProps {
  organizations: { slug: string; name: string }[];
  domains: FilterOption[];
  statuses: FilterOption[];
}

export function SystemsFilterBar({ organizations, domains, statuses }: SystemsFilterBarProps) {
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

  const selectClassName =
    "font-mono text-sm border border-slate/30 bg-paper px-2 py-1 text-ink outline-none focus:border-ink";

  return (
    <div className="flex flex-wrap gap-3 border-b border-slate/20 pb-4 mb-6">
      <select
        aria-label="Filter by organization"
        className={selectClassName}
        value={searchParams.get("organization") ?? ""}
        onChange={(e) => setFilter("organization", e.target.value)}
      >
        <option value="">All organizations</option>
        {organizations.map((org) => (
          <option key={org.slug} value={org.slug}>
            {org.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by domain"
        className={selectClassName}
        value={searchParams.get("domain") ?? ""}
        onChange={(e) => setFilter("domain", e.target.value)}
      >
        <option value="">All domains</option>
        {domains.map((domain) => (
          <option key={domain.key} value={domain.key}>
            {domain.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by status"
        className={selectClassName}
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setFilter("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {statuses.map((status) => (
          <option key={status.key} value={status.key}>
            {status.label}
          </option>
        ))}
      </select>

      {(searchParams.get("organization") || searchParams.get("domain") || searchParams.get("status")) && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="font-mono text-sm text-slate underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
