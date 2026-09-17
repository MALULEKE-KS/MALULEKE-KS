// app/(public)/page.tsx
// / — lens-aware home. See docs/PAGE-SPECIFICATIONS.md ("/ — Home").
//
// The lens picker itself is deferred — VisitorLens isn't built yet
// (Constitution §4 is real V1.1-adjacent scope). Priority ordering falls
// back to isFlagship + sortOrder, which is a reasonable default until the
// lens system exists, not a placeholder pretending to be the real thing.

import { Suspense } from "react";
import { HomeContent } from "./_components/HomeContent";

// The ledger hero's whole point is a live, current count — Next.js's
// automatic static-optimization heuristic doesn't know that and would
// otherwise try to prerender this page once at build time (no request-
// specific API used here forces it to dynamic on its own, unlike /systems'
// searchParams). That would both fail wherever the build environment has
// no DATABASE_URL (as CI's build job doesn't) and, worse, would bake in
// stale counts from whenever the last deploy happened instead of showing
// the real current numbers on every visit.
export const dynamic = "force-dynamic";

function HomeSkeleton() {
  return (
    <section className="px-6 py-24 md:py-32 bg-paper">
      <div className="max-w-prose h-24 bg-slate/10 animate-pulse" />
    </section>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
