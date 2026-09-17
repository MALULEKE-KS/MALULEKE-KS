// app/(public)/systems/_components/SystemsGridSkeleton.tsx
// Skeleton cards with the corner-bracket frame already drawn, not a spinner
// (docs/PAGE-SPECIFICATIONS.md — "/systems — Catalog" behavior).
//
// Used as an explicit <Suspense> fallback in page.tsx, NOT a route-level
// loading.tsx file — a loading.tsx here would also wrap /systems/[slug]
// (no loading.tsx of its own means it inherits the parent segment's), which
// streams an early 200 response before that page's notFound() can fire,
// making the real generic-404 (BR-1.3/1.4 spirit) return the wrong HTTP
// status even though the rendered content is correct. Scoping the skeleton
// to only the catalog's own async section avoids that entirely.

const CORNER_BASE = "absolute w-3.5 h-3.5 border-ink/30";

function SkeletonCard() {
  return (
    <div className="relative border border-slate/20 px-6 py-5 animate-pulse">
      <span className={`${CORNER_BASE} top-0 left-0 border-t-2 border-l-2`} />
      <span className={`${CORNER_BASE} top-0 right-0 border-t-2 border-r-2`} />
      <span className={`${CORNER_BASE} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${CORNER_BASE} bottom-0 right-0 border-b-2 border-r-2`} />
      <div className="h-4 w-1/2 bg-slate/15 mb-3" />
      <div className="h-3 w-full bg-slate/10 mb-1.5" />
      <div className="h-3 w-2/3 bg-slate/10" />
    </div>
  );
}

export function SystemsGridSkeleton() {
  return (
    <>
      <div className="h-8 w-full bg-slate/10 mb-6 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </>
  );
}
