// app/(public)/systems/page.tsx
// /systems — the catalog (PAGE-BUILD-PLAYBOOK §9; PAGE-SPECIFICATIONS
// "/systems"). A graphite hero with the owner's "systems-page" copy and live
// counts, then the filters and results on bone. Since BR-1.6 was replaced
// (2026-10-01) the catalog is every repo in his own homes that he hasn't
// hidden, beside the written-up case studies.
//
// The data fetching lives in SystemsResults, inside an explicit <Suspense>
// rather than a loading.tsx — see SystemsGridSkeleton.tsx for why.

import { Suspense } from "react";
import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { Accent, plainAccent } from "@/components/shared/Accent";
import { getContentBlock } from "@/lib/content/blocks";
import { getCatalog } from "@/lib/queries/catalog";
import { SystemsResults } from "./_components/SystemsResults";
import { SystemsGridSkeleton } from "./_components/SystemsGridSkeleton";

export async function generateMetadata(): Promise<Metadata> {
  const intro = await getContentBlock("systems-page").catch(() => null);
  const description = intro ? plainAccent(intro.lede) : "Every system — case studies and the work in each GitHub home.";
  return { title: "Systems", description, alternates: { canonical: "/systems" }, openGraph: { description } };
}

interface SystemsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

async function HeroStats() {
  const { stats } = await getCatalog({ pageSize: 1 });
  const items = [
    { value: stats.systems, label: stats.systems === 1 ? "system" : "systems" },
    { value: stats.homes, label: stats.homes === 1 ? "GitHub home" : "GitHub homes" },
    { value: stats.caseStudies, label: stats.caseStudies === 1 ? "case study" : "case studies" },
    { value: stats.activeThisMonth, label: "active this month" },
  ];
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3">
      {items.map((i) => (
        <div key={i.label} className="flex items-baseline gap-2">
          <dd className="type-data text-paper text-2xl font-semibold">{i.value}</dd>
          <dt className="text-mist text-sm">{i.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export default async function SystemsPage({ searchParams }: SystemsPageProps) {
  const [params, intro] = await Promise.all([searchParams, getContentBlock("systems-page")]);

  return (
    <>
      <PageHero
        icon={Boxes}
        eyebrow="Systems"
        wide
        title={<Accent text={intro?.heading ?? "The systems."} className="type-accent text-ember-gradient pr-[0.06em]" />}
        description={intro?.lede}
      >
        <Suspense fallback={null}>
          <HeroStats />
        </Suspense>
      </PageHero>
      <section className="bg-paper py-12 md:py-16">
        <Container>
          <Suspense fallback={<SystemsGridSkeleton />}>
            <SystemsResults searchParams={params} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
