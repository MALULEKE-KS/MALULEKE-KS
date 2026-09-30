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
import {
  SiNextdotjs,
  SiPostgresql,
  SiPrisma,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
} from "react-icons/si";
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
  building: number;
  queued: number;
}

// How this platform ships — true of its own pipeline (.github/workflows/ci.yml,
// docs/DEPLOYMENT.md), not a general claim.
const SHIPPING = [
  "Type-checked end to end",
  "Tested in CI on every change",
  "Deployed on Vercel from main",
];

// The stack this platform runs on (CLAUDE.md "Stack"), with real brand marks.
const STACK = [
  { name: "Next.js", Icon: SiNextdotjs },
  { name: "TypeScript", Icon: SiTypescript },
  { name: "PostgreSQL", Icon: SiPostgresql },
  { name: "Prisma", Icon: SiPrisma },
  { name: "Tailwind CSS", Icon: SiTailwindcss },
  { name: "Vercel", Icon: SiVercel },
];

const CARD =
  "h-full rounded-2xl border border-ink/10 bg-sheet shadow-soft transition-[box-shadow,transform,border-color] duration-300 hover:border-ink/20 hover:shadow-lift";

// The pipeline's three stages, each its own colour — the same three facts the
// hero's ledger states, so the two can never disagree (#100).
const STAGE_COLOURS = {
  shipped: "var(--color-signal-finished-on-dark)",
  building: "var(--color-ember)",
  queued: "var(--color-signal-planned-on-dark)",
};

export function WorkBento({ featured, totalPublished, shipped, building, queued }: WorkBentoProps) {
  const meta = [featured.organization, featured.domain].filter(Boolean).join(" / ");
  const pipeline = shipped + building + queued;
  const stages = [
    { key: "shipped", label: "Shipped", value: shipped },
    { key: "building", label: "In progress", value: building },
    { key: "queued", label: "Queued", value: queued },
  ] as const;

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
                <span className="text-slate inline-flex items-center gap-2 text-xs font-medium">
                  <span className="bg-ink text-paper grid size-8 place-items-center rounded-lg">
                    <Cpu aria-hidden="true" className="size-4" />
                  </span>
                  {meta}
                </span>
                <span className="flex items-center gap-2">
                  {featured.isFlagship && (
                    <span className="bg-ember/10 text-accent inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      <Star aria-hidden="true" className="size-3 fill-current" />
                      Flagship
                    </span>
                  )}
                  <StatusBadge label={featured.status} colorToken={featured.statusColorToken} />
                </span>
              </div>

              <Link
                href={`/systems/${featured.slug}`}
                tabIndex={-1}
                aria-hidden="true"
                className="mt-6 block"
              >
                <SystemPreviewFrame
                  screenshotUrl={featured.screenshotUrl}
                  liveUrl={featured.liveUrl}
                  name={featured.name}
                />
              </Link>

              <div className="mt-6 flex flex-1 flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="max-w-xl">
                  <h3 className="text-ink font-sans text-2xl font-semibold tracking-tight md:text-3xl">
                    {featured.name}
                  </h3>
                  <p className="text-slate mt-2 font-serif text-lg leading-relaxed">
                    {featured.description}
                  </p>
                  {featured.techStack.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Stack">
                      {featured.techStack.map((tech) => (
                        <li
                          key={tech}
                          className="border-ink/10 bg-paper text-slate rounded-full border px-3 py-1 text-xs"
                        >
                          {tech}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link
                  href={`/systems/${featured.slug}`}
                  className="bg-ink text-paper hover:shadow-lift focus-visible:outline-ember inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-medium transition-[transform,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5 md:self-end"
                >
                  Read the case study
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </Spotlight>
          </Reveal>

          {/* Pipeline — real counts */}
          <Reveal delay={100}>
            <Spotlight
              color="rgb(255 91 31 / 0.16)"
              className="bg-night text-paper shadow-lift h-full rounded-2xl border border-white/10 p-6 md:p-7"
            >
              <span className="text-mist inline-flex items-center gap-2 text-xs font-medium">
                <GitBranch aria-hidden="true" className="text-ember size-4" />
                Pipeline
              </span>
              <p className="mt-6 flex items-baseline gap-2">
                <NumberTicker
                  value={shipped}
                  className="text-paper font-sans text-6xl font-semibold tracking-tight"
                />
                <span className="text-mist">shipped</span>
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <NumberTicker
                  value={building}
                  delay={0.2}
                  className="text-ember font-sans text-3xl font-semibold"
                />
                <span className="text-mist text-sm">in progress</span>
                <span aria-hidden="true" className="text-line">
                  ·
                </span>
                <NumberTicker
                  value={queued}
                  delay={0.3}
                  className="text-mist font-sans text-3xl font-semibold"
                />
                <span className="text-mist text-sm">queued</span>
              </p>
              {pipeline > 0 && (
                <div className="mt-6" aria-hidden="true">
                  <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/10">
                    {stages.map((s) =>
                      s.value > 0 ? (
                        <span
                          key={s.key}
                          style={{
                            width: `${(s.value / pipeline) * 100}%`,
                            backgroundColor: STAGE_COLOURS[s.key],
                          }}
                        />
                      ) : null
                    )}
                  </div>
                  <ul className="text-line mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                    {stages.map((s) => (
                      <li key={s.key} className="inline-flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: STAGE_COLOURS[s.key] }}
                        />
                        {s.label} {s.value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Spotlight>
          </Reveal>

          {/* Stack — real product marks */}
          <Reveal delay={200}>
            <Spotlight className={`${CARD} flex flex-col p-6 md:p-7`}>
              <span className="text-slate inline-flex items-center gap-2 text-xs font-medium">
                <Layers aria-hidden="true" className="text-accent size-4" />
                This platform runs on
              </span>
              <ul className="mt-5 mb-6 grid grid-cols-3 gap-2.5">
                {STACK.map(({ name, Icon }) => (
                  <li
                    key={name}
                    className="group/tech border-ink/5 bg-paper hover:border-ink/15 flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-colors"
                  >
                    <Icon
                      aria-hidden="true"
                      className="text-slate group-hover/tech:text-ink size-6 transition-colors"
                    />
                    <span className="text-slate text-[0.6875rem] leading-tight">{name}</span>
                  </li>
                ))}
              </ul>
              <ul className="border-ink/10 mt-auto space-y-2 border-t pt-5">
                {SHIPPING.map((line) => (
                  <li key={line} className="text-slate flex items-center gap-2 text-sm">
                    <CheckCircle2
                      aria-hidden="true"
                      className="text-signal-finished size-4 shrink-0"
                    />
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
