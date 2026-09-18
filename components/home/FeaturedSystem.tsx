// components/home/FeaturedSystem.tsx
// Sheet 01, section 2 (DESIGN-SYSTEM.md v2 §7.2): the flagship as a spread —
// preview on the left, the story on the right. The home page features one
// system and hands off to /systems for the rest; the full catalog is not
// repeated here.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SystemPreviewFrame } from "@/components/shared/SystemPreviewFrame";

interface FeaturedSystemProps {
  system: {
    slug: string;
    name: string;
    description: string;
    organization: string;
    domain: string | null;
    status: string;
    statusColorToken: string;
    isFlagship: boolean;
    techStack: string[];
    screenshotUrl: string | null;
    liveUrl: string | null;
  };
  totalSystems: number;
}

export function FeaturedSystem({ system, totalSystems }: FeaturedSystemProps) {
  const meta = [system.organization, system.domain].filter(Boolean).join(" / ");

  return (
    <section aria-labelledby="featured-title" className="paper-grid py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeader
            index="01.2"
            eyebrow={system.isFlagship ? "Flagship system" : "Featured system"}
            title="Built for real stakes, held to the same rules as everything else."
            action={{ href: "/systems", label: `All systems (${totalSystems})` }}
          />
        </Reveal>

        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7" delay={80}>
            <Link
              href={`/systems/${system.slug}`}
              aria-hidden="true"
              tabIndex={-1}
              className="hover:shadow-print-amber block transition-[transform,box-shadow] duration-200 hover:-translate-x-1 hover:-translate-y-1 motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0"
            >
              <SystemPreviewFrame screenshotUrl={system.screenshotUrl} liveUrl={system.liveUrl} name={system.name} />
            </Link>
          </Reveal>

          <Reveal className="lg:col-span-5" delay={160}>
            <p className="text-slate font-mono text-xs">{meta}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h3 id="featured-title" className="text-ink font-sans text-3xl font-semibold tracking-tight md:text-4xl">
                {system.name}
              </h3>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusBadge label={system.status} colorToken={system.statusColorToken} />
              {system.isFlagship && (
                <span className="text-accent inline-flex items-center gap-1.5 font-mono text-xs">
                  <span aria-hidden="true" className="bg-amber ring-accent size-2 ring-1" />
                  Flagship
                </span>
              )}
            </div>

            <p className="text-ink mt-6 font-serif text-xl leading-relaxed">{system.description}</p>

            {system.techStack.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Stack">
                {system.techStack.map((tech) => (
                  <li key={tech} className="border-ink/20 bg-sheet text-slate border px-2 py-1 font-mono text-xs">
                    {tech}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/systems/${system.slug}`}>Read the case study</Link>
              </Button>
              {system.liveUrl && (
                <Button asChild variant="outline">
                  <a href={system.liveUrl} target="_blank" rel="noopener noreferrer">
                    Visit live
                  </a>
                </Button>
              )}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
