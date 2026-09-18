// app/(public)/_components/HomeContent.tsx
// The actual async data-fetching for / — factored out so it can sit inside
// an explicit <Suspense> boundary in page.tsx (same pattern as the Systems
// catalog — see SystemsGridSkeleton.tsx for why a route-level loading.tsx
// would be the wrong tool here).

import Link from "next/link";
import { LedgerHero } from "@/components/home/LedgerHero";
import { SystemCard } from "@/components/shared/SystemCard";
import { TextLink } from "@/components/shared/TextLink";
import { Button } from "@/components/ui/button";
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
          <TextLink href="/systems" className="inline-block mt-6">
            View all systems
          </TextLink>
        </section>
      )}

      <section className="py-12 border-t border-slate/20">
        <p className="font-serif text-ink max-w-prose leading-relaxed mb-3">
          I build systems disciplined enough to be trusted with real money, real institutions, and real
          people&rsquo;s outcomes — engineered in South Africa, held to a global standard.
        </p>
        <TextLink href="/how-i-build">How I build</TextLink>
      </section>

      <section className="pt-12 pb-16 border-t border-slate/20">
        <p className="font-sans text-ink mb-3">Have something to build, or something to say?</p>
        <Button asChild>
          <Link href="/contact">Get in touch</Link>
        </Button>
      </section>
    </>
  );
}
