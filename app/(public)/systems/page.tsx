// app/(public)/systems/page.tsx
// /systems — catalog. See docs/PAGE-SPECIFICATIONS.md ("/systems — Catalog").
//
// The actual data fetching lives in SystemsResults, inside an explicit
// <Suspense> here rather than a loading.tsx file — see
// SystemsGridSkeleton.tsx for why that distinction matters (a loading.tsx
// at this segment would also wrap /systems/[slug] and break its 404 status).

import { Suspense } from "react";
import { SystemsResults } from "./_components/SystemsResults";
import { SystemsGridSkeleton } from "./_components/SystemsGridSkeleton";

interface SystemsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SystemsPage({ searchParams }: SystemsPageProps) {
  const params = await searchParams;

  return (
    <section className="px-6 py-16 max-w-5xl mx-auto">
      <h1 className="font-sans text-2xl text-ink mb-6">Systems</h1>
      <Suspense fallback={<SystemsGridSkeleton />}>
        <SystemsResults searchParams={params} />
      </Suspense>
    </section>
  );
}
