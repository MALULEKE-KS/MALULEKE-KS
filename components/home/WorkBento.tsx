// components/home/WorkBento.tsx
// Home, section 2 (DESIGN-SYSTEM.md v3 §7.2): a bento grid.
//   - The flagship, as the large card (the full catalog stays on /systems —
//     home features one and links through).
//   - Pipeline: real counts by status, counting up once in view.
//   - Stack: the platform's own stack, with the real product marks.
// Cards use the card anatomy from the UI guide: icon + badge header, title,
// muted description, specs, one action.

import Link from "next/link";
import { ArrowRight, CheckCircle2, Cpu, GitBranch, Layers, Star } from "lucide-react";
import { SiNextdotjs, SiPostgresql, SiPrisma, SiTailwindcss, SiTypescript, SiVercel } from "react-icons/si";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Spotlight } from "@/components/shared/Spotlight";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SystemPreviewFrame } from "@/components/shared/SystemPreviewFrame";

interface WorkBentoProps {
  featured: {
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
  totalPublished: number;
  shipped: number;
  queued: number;
}

// How this platform ships — true of its own pipeline (.github/workflows/ci.yml,
// docs/DEPLOYMENT.md), not a general claim.
const SHIPPING = ["Type-checked end to end", "Tested in CI on every change", "Deployed on Vercel from main"];

// The stack this platform runs on (CLAUDE.md "Stack"), with real brand marks.
const STACK = [
  { name: "Next.js", Icon: SiNextdotjs },
  { name: "TypeScript", Icon: SiTypescript },
  { name: "PostgreSQL", Icon: SiPostgresql },
  { name: "Prisma", Icon: SiPrisma },
  { name: "Tailwind CSS", Icon: SiTailwindcss },
  { name: "Vercel", Icon: SiVercel },
];

const CARD = "h-full rounded-2xl border border-ink/10 bg-sheet shadow-soft transition-[box-shadow,transform,border-color] duration-300 hover:border-ink/20 hover:shadow-lift";

export function WorkBento({ featured, totalPublished, shipped, queued }: WorkBentoProps) {
  const meta = [featured.organization, featured.domain].filter(Boolean).join(" / ");
  const pipeline = shipped + queued;

  return (
    <section aria-labelledby="work-title" className="bg-paper py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeader
            icon={Layers}
            eyebrow="Selected work"
            id="work-title"
            title="Systems built for real stakes."
            description="Each one is governed by the same written rules as this platform."
            action={{ href: "/systems", label: `All systems (${totalPublished})` }}
          />
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-3 lg:grid-rows-2">
          {/* Flagship — large */}
          <Reveal className="lg:col-span-2 lg:row-span-2">
            <Spotlight className={`${CARD} group flex flex-col p-5 md:p-7`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-slate">
                  <span className="grid size-8 place-items-center rounded-lg bg-ink text-paper">
                    <Cpu aria-hidden="true" className="size-4" />
                  </span>
                  {meta}
                </span>
                <span className="flex items-center gap-2">
                  {featured.isFlagship && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ember/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                      <Star aria-hidden="true" className="size-3 fill-current" />
                      Flagship
                    </span>
                  )}
                  <StatusBadge label={featured.status} colorToken={featured.statusColorToken} />
                </span>
              </div>

              <Link href={`/systems/${featured.slug}`} tabIndex={-1} aria-hidden="true" className="mt-6 block">
                <SystemPreviewFrame screenshotUrl={featured.screenshotUrl} liveUrl={featured.liveUrl} name={featured.name} />
              </Link>

              <div className="mt-6 flex flex-1 flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="max-w-xl">
                  <h3 className="font-sans text-2xl font-semibold tracking-tight text-ink md:text-3xl">{featured.name}</h3>
                  <p className="mt-2 font-serif text-lg leading-relaxed text-slate">{featured.description}</p>
                  {featured.techStack.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Stack">
                      {featured.techStack.map((tech) => (
                        <li key={tech} className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-xs text-slate">
                          {tech}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link
                  href={`/systems/${featured.slug}`}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-[transform,box-shadow] duration-200 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember motion-safe:hover:-translate-y-0.5 md:self-end"
                >
                  Read the case study
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Spotlight>
          </Reveal>

          {/* Pipeline — real counts */}
          <Reveal delay={100}>
            <Spotlight
              color="rgb(255 91 31 / 0.16)"
              className="h-full rounded-2xl border border-white/10 bg-night p-6 text-paper shadow-lift md:p-7"
            >
              <span className="inline-flex items-center gap-2 text-xs font-medium text-mist">
                <GitBranch aria-hidden="true" className="size-4 text-ember" />
                Pipeline
              </span>
              <p className="mt-6 flex items-baseline gap-2">
                <NumberTicker value={shipped} className="font-sans text-6xl font-semibold tracking-tight text-paper" />
                <span className="text-mist">shipped</span>
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <NumberTicker value={queued} delay={0.2} className="font-sans text-3xl font-semibold text-ember" />
                <span className="text-sm text-mist">in the queue</span>
              </p>
              {pipeline > 0 && (
                <div className="mt-6" aria-hidden="true">
                  <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                    <span className="bg-[var(--color-signal-finished-on-dark)]" style={{ width: `${(shipped / pipeline) * 100}%` }} />
                    <span className="bg-ember" style={{ width: `${(queued / pipeline) * 100}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-xs text-line">
                    <span>Finished</span>
                    <span>Queued</span>
                  </div>
                </div>
              )}
            </Spotlight>
          </Reveal>

          {/* Stack — real product marks */}
          <Reveal delay={200}>
            <Spotlight className={`${CARD} flex flex-col p-6 md:p-7`}>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate">
                <Layers aria-hidden="true" className="size-4 text-accent" />
                This platform runs on
              </span>
              <ul className="mb-6 mt-5 grid grid-cols-3 gap-2.5">
                {STACK.map(({ name, Icon }) => (
                  <li
                    key={name}
                    className="group/tech flex flex-col items-center gap-2 rounded-xl border border-ink/5 bg-paper px-2 py-3 text-center transition-colors hover:border-ink/15"
                  >
                    <Icon aria-hidden="true" className="size-6 text-slate transition-colors group-hover/tech:text-ink" />
                    <span className="text-[0.6875rem] leading-tight text-slate">{name}</span>
                  </li>
                ))}
              </ul>
              <ul className="mt-auto space-y-2 border-t border-ink/10 pt-5">
                {SHIPPING.map((line) => (
                  <li key={line} className="flex items-center gap-2 text-sm text-slate">
                    <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-signal-finished" />
                    {line}
                  </li>
                ))}
              </ul>
            </Spotlight>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
