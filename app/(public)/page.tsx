// app/(public)/page.tsx
// / — lens-aware home. See docs/PAGE-SPECIFICATIONS.md ("/ — Home").
//
// The lens picker itself is deferred — VisitorLens isn't built yet
// (Constitution §4 is real V1.1-adjacent scope). Priority ordering falls
// back to isFlagship + sortOrder, which is a reasonable default until the
// lens system exists, not a placeholder pretending to be the real thing.

import { Suspense } from "react";
import { HomeContent } from "./_components/HomeContent";

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
