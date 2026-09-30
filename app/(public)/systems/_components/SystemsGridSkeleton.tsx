// app/(public)/systems/_components/SystemsGridSkeleton.tsx
// Skeleton cards in the real card's shape, not a spinner
// (docs/PAGE-SPECIFICATIONS.md — "/systems — Catalog" behavior).
//
// Used as an explicit <Suspense> fallback in page.tsx, NOT a route-level
// loading.tsx file — a loading.tsx here would also wrap /systems/[slug]
// (no loading.tsx of its own means it inherits the parent segment's), which
// streams an early 200 response before that page's notFound() can fire,
// making the real generic-404 (BR-1.3/1.4 spirit) return the wrong HTTP
// status even though the rendered content is correct. Scoping the skeleton
// to only the catalog's own async section avoids that entirely.

function SkeletonCard() {
  return (
    <div className="border-ink/10 bg-sheet shadow-soft h-full rounded-2xl border p-6">
      <div className="flex justify-between">
        <div className="bg-ink/10 h-3 w-28 rounded-full" />
        <div className="bg-ink/10 h-5 w-16 rounded-full" />
      </div>
      <div className="bg-ink/15 mt-6 h-5 w-2/3 rounded-full" />
      <div className="bg-ink/10 mt-4 h-3 w-full rounded-full" />
      <div className="bg-ink/10 mt-2 h-3 w-4/5 rounded-full" />
      <div className="mt-8 flex gap-1.5">
        <div className="bg-ink/10 h-5 w-16 rounded-full" />
        <div className="bg-ink/10 h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function SystemsGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading systems" className="motion-safe:animate-pulse">
      <div className="mb-10 flex gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-ink/10 h-10 w-40 rounded-full" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
