// app/(public)/systems/page.tsx
// /systems — catalog (DESIGN-SYSTEM.md v3, #99). Graphite page hero, then the
// filters and results on bone. See docs/PAGE-SPECIFICATIONS.md ("/systems").
//
// The actual data fetching lives in SystemsResults, inside an explicit
// <Suspense> here rather than a loading.tsx file — see
// SystemsGridSkeleton.tsx for why that distinction matters (a loading.tsx
// at this segment would also wrap /systems/[slug] and break its 404 status).

import { Suspense } from "react";
import { Boxes } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { SystemsResults } from "./_components/SystemsResults";
import { SystemsGridSkeleton } from "./_components/SystemsGridSkeleton";

export const metadata = {
  title: "Systems",
  description:
    "Every published system — client and personal work, governed by the same written rules.",
  alternates: { canonical: "/systems" },
};

interface SystemsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SystemsPage({ searchParams }: SystemsPageProps) {
  const params = await searchParams;

  return (
    <>
      <PageHero
        icon={Boxes}
        eyebrow="Systems"
        title="The systems."
        description="Client and personal work, each one governed by the same written rules as this platform."
      />
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
