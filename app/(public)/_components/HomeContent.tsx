// app/(public)/_components/HomeContent.tsx
// The actual async data-fetching for / — factored out so it can sit inside
// an explicit <Suspense> boundary in page.tsx (same pattern as the Systems
// catalog — see SystemsGridSkeleton.tsx for why a route-level loading.tsx
// would be the wrong tool here).

import Link from "next/link";
import { LedgerHero } from "@/components/home/LedgerHero";
import { SystemCard } from "@/components/shared/SystemCard";
import { getHomepageStats, getPrioritySystems } from "@/lib/queries/homepage";

export async function HomeContent() {
  const [stats, prioritySystems] = await Promise.all([getHomepageStats(), getPrioritySystems(4)]);

  return (
    <>
      <LedgerHero {...stats} />

      {prioritySystems.length > 0 && (
        <section className="pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prioritySystems.map((system) => (
              <SystemCard
                key={system.id}
                slug={system.slug}
                name={system.name}
                description={system.description}
                status={{ label: system.status, colorToken: system.statusColorToken }}
                isFlagship={system.isFlagship}
              />
            ))}
          </div>
          <Link href="/systems" className="rule-citation text-sm inline-block mt-6">
            View all systems
          </Link>
        </section>
      )}

      <section className="py-12 border-t border-slate/20">
        <p className="font-serif text-ink max-w-prose leading-relaxed mb-3">
          I build systems disciplined enough to be trusted with real money, real institutions, and real
          people&rsquo;s outcomes — engineered in South Africa, held to a global standard.
        </p>
        <Link href="/how-i-build" className="rule-citation text-sm">
          How I build
        </Link>
      </section>

      <section className="pt-12 pb-16 border-t border-slate/20">
        <p className="font-sans text-ink mb-3">Have something to build, or something to say?</p>
        <Link
          href="/contact"
          className="font-sans text-sm font-medium bg-ink text-paper px-6 py-2.5 inline-block transition-colors hover:bg-ink/85"
        >
          Get in touch
        </Link>
      </section>
    </>
  );
}
