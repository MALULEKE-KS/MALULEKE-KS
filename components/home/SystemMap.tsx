// components/home/SystemMap.tsx
// Home — the system map (PUBLIC-REDESIGN-PLAN §3.4), on graphite after the
// selected work: the owner's three GitHub homes → the work in each → what
// it's built with, drawn live from the data (lib/queries/map.ts) and traced
// by hover (SystemMapGraph). Replaces the old stick-figure blueprint.

import { Network } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SystemMapGraph } from "@/components/home/SystemMapGraph";
import type { SystemMapData } from "@/lib/queries/map";
import { Accent } from "@/components/shared/Accent";

export function SystemMap({ data }: { data: SystemMapData | null }) {
  if (!data) return null;
  return (
    <section aria-labelledby="map-title" className="bg-night-deep text-paper relative overflow-hidden py-20 md:py-28">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.12),transparent)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_24rem_at_50%_0%,rgb(255_91_31/0.08),transparent_70%)]"
      />
      <Container className="relative">
        <Reveal>
          <SectionHeader
            copyKey="home.map"
            tone="dark"
            icon={Network}
            eyebrow="The map"
            id="map-title"
            title={<Accent text="How it all *connects.*" className="type-accent text-ember-gradient pr-[0.06em]" />}
            description="The GitHub homes, the work in each, and what it's built with — drawn live from GitHub and this site's data."
          />
        </Reveal>
        <Reveal delay={100}>
          <SystemMapGraph data={data} />
        </Reveal>
      </Container>
    </section>
  );
}
