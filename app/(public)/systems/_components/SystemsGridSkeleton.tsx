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

// The new card's anatomy (D-049): status, name, two lines, marks, and the footer every card keeps.
function SkeletonCard() {
  return (
    <div className="border-ink/10 bg-sheet shadow-soft flex h-full flex-col rounded-[1.5rem] border">
      <div className="flex-1 p-5 md:p-6">
        <div className="bg-ink/10 h-5 w-24 rounded-full" />
        <div className="bg-ink/15 mt-5 h-5 w-2/3 rounded-full" />
        <div className="bg-ink/10 mt-3 h-3 w-full rounded-full" />
        <div className="bg-ink/10 mt-2 h-3 w-4/5 rounded-full" />
        <div className="mt-5 flex gap-3">
          <div className="bg-ink/10 h-3.5 w-14 rounded-full" />
          <div className="bg-ink/10 h-3.5 w-16 rounded-full" />
          <div className="bg-ink/10 h-3.5 w-12 rounded-full" />
        </div>
      </div>
      <div className="border-ink/10 mx-5 flex min-h-14 items-center justify-between border-t md:mx-6">
        <div className="bg-ink/10 h-5 w-20 rounded-full" />
        <div className="bg-ink/10 h-3.5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SystemsGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading systems" className="motion-safe:animate-pulse">
      {/* The toolbar's place, so nothing moves when it arrives. */}
      <div className="border-ink/10 bg-sheet/85 mb-10 flex h-[3.75rem] items-center gap-2 rounded-2xl border p-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-ink/10 hidden h-10 w-32 rounded-full md:block" />
        ))}
        <div className="bg-ink/10 h-11 w-28 rounded-full md:hidden" />
        <div className="flex-1" />
        <div className="bg-ink/10 h-9 w-44 rounded-full" />
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
