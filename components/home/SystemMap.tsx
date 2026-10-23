// components/home/SystemMap.tsx
// Home — how it all connects (PUBLIC-REDESIGN-PLAN §3.4). Since the premium pass
// (D-047, owner-approved 2026-10-23) it is the one section about how the platform
// holds together: the control room merged in as a live status line above the
// map — read from the database the moment the page was loaded
// (PublicPlatformPulse), set as the terminal's one command and its checks —
// and, when the owner has approved any, his curated
// figures (PublicMetric, BR-5.3 — none approved, none shown). Then the map
// itself: the owner's GitHub homes → the work in each → what it's built with,
// drawn live from the data (lib/queries/map.ts) and traced by a click or tap
// (SystemMapGraph). The hero's record already carries the rules and audited
// changes with their evidence, so nothing appears twice (HOME-HERO-PLAN §16).

import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SystemMapGraph } from "@/components/home/SystemMapGraph";
import { AskGuideButton } from "@/components/guide/AskGuideButton";
import type { SystemMapData } from "@/lib/queries/map";
import { ago } from "@/lib/queries/work";
import { Accent } from "@/components/shared/Accent";

/** An owner-approved figure (PublicMetric — BR-5.3). */
export interface CuratedNumber {
  key: string;
  label: string;
  description: string | null;
  unit: string | null;
  value: number;
}

export interface MapPulse {
  lastSuccessfulJobAt: string | null;
  lastGithubSyncAt: string | null;
  deployment: { commit: string; environment: string | null } | null;
}

/** The live status line: each part only when the database has the fact behind it. */
export function statusLine(pulse: MapPulse): string[] {
  const synced = ago(pulse.lastGithubSyncAt ? new Date(pulse.lastGithubSyncAt) : null);
  const job = ago(pulse.lastSuccessfulJobAt ? new Date(pulse.lastSuccessfulJobAt) : null);
  return [
    "every public page reads through a read-only database role",
    synced && `GitHub synced ${synced}`,
    job && `scheduled jobs healthy · last run ${job}`,
    pulse.deployment ? `build ${pulse.deployment.commit}${pulse.deployment.environment ? ` · ${pulse.deployment.environment}` : ""}` : "a local development build",
  ].filter((p): p is string => Boolean(p));
}

export function SystemMap({ data, pulse, numbers }: { data: SystemMapData | null; pulse: MapPulse; numbers: CuratedNumber[] }) {
  if (!data) return null;
  const status = statusLine(pulse);
  return (
    <section aria-labelledby="map-title" className="bg-night-deep text-paper relative overflow-hidden py-20 md:py-28">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.12),transparent)]" />
      <Container className="relative">
        <Reveal>
          <SectionHeader
            copyKey="home.map"
            tone="dark"
            eyebrow="How it all connects"
            id="map-title"
            title={<Accent text="How it all *connects.*" className="type-accent text-ember-gradient pr-[0.06em]" />}
            description="The GitHub homes, the work in each, and what it's built with — drawn live from GitHub and this site's data."
            className="mb-8 md:mb-10"
          />
        </Reveal>

        {/* The platform reporting on itself, in one line (the control room, merged in). */}
        <Reveal delay={60}>
          <div className="flex flex-col gap-4 border-y border-white/10 py-4 md:flex-row md:items-center md:justify-between">
            <ul aria-label="Live status" className="text-mist flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs">
              <li aria-hidden="true" className="text-paper">
                <span className="text-ember">$</span> platform status --live
              </li>
              {status.map((s) => (
                <li key={s} className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="text-[var(--color-signal-finished-on-dark)]">✓</span>
                  {s}
                </li>
              ))}
            </ul>
            <AskGuideButton question="How does this platform enforce its business rules?" variant="glass" size="sm" className="tap-target shrink-0 self-start md:self-auto">
              Ask the AI guide how
            </AskGuideButton>
          </div>
        </Reveal>

        {numbers.length > 0 && (
          <Reveal delay={80}>
            <dl aria-label="Figures, each one approved" className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
              {numbers.slice(0, 5).map((n) => (
                <div key={n.key} className="flex flex-col-reverse gap-1">
                  <dt className="text-mist text-sm">
                    {n.label}
                    {n.description && <span className="text-line mt-1 block text-xs leading-relaxed">{n.description}</span>}
                  </dt>
                  <dd className="text-paper text-3xl font-medium tracking-tight tabular-nums">
                    {n.value}
                    {n.unit && <span className="text-mist ml-1 text-base">{n.unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        )}

        <Reveal delay={100} className="mt-10 md:mt-12">
          <SystemMapGraph data={data} />
        </Reveal>
      </Container>
    </section>
  );
}
