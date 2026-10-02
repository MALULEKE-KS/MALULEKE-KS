// app/(public)/page.tsx
// / — lens-aware home. See docs/PAGE-SPECIFICATIONS.md ("/ — Home").
//
// The lens picker itself is deferred — VisitorLens isn't built yet
// (Constitution §4 is real V1.1-adjacent scope). Priority ordering falls
// back to isFlagship + sortOrder, which is a reasonable default until the
// lens system exists, not a placeholder pretending to be the real thing.

import { Suspense } from "react";
import { pageMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { getSiteProfile } from "@/lib/queries/site";
import type { Metadata } from "next";
import { getContentBlock } from "@/lib/content/blocks";
import { plainAccent } from "@/components/shared/Accent";
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

// The description search results and link previews show: the owner's own
// introduction (the "home-intro" block), not a generic line — capped for search.
export async function generateMetadata(): Promise<Metadata> {
  const [intro, profile] = await Promise.all([getContentBlock("home-intro").catch(() => null), getSiteProfile().catch(() => null)]);
  const title = profile ? `${profile.name} — ${SITE_NAME}` : SITE_NAME;
  return pageMetadata({
    title,
    absoluteTitle: true,
    description: intro ? plainAccent(intro.lede) : null,
    path: "/",
    imageAlt: profile?.headline ? `${profile.name} — ${profile.headline}` : title,
  });
}

// Loading state: the hero's graphite field, already laid down, so the page
// doesn't flash from vellum to blue when the data arrives.
function HomeSkeleton() {
  return <section aria-busy="true" className="hero-field min-h-[640px]" />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
