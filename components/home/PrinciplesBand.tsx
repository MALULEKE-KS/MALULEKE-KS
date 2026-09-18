// components/home/PrinciplesBand.tsx
// Home, section 3 (DESIGN-SYSTEM.md v3 §7.3): how the work is governed. The
// mission leads as a large serif quote; the four principles follow as
// spotlight cards with an icon each. Full text lives on /how-i-build.

import { Activity, Blocks, Compass, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Spotlight } from "@/components/shared/Spotlight";
import { MISSION, PRINCIPLES } from "@/lib/content/principles";

// Same order as PRINCIPLES (lib/content/principles.ts).
const ICONS: LucideIcon[] = [Blocks, Zap, Activity, ShieldCheck];

export function PrinciplesBand() {
  return (
    <section aria-labelledby="principles-title" className="relative overflow-hidden bg-night-deep py-20 text-paper md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-ember/10 blur-3xl"
      />
      <Container className="relative">
        <Reveal>
          <SectionHeader
            tone="dark"
            icon={Compass}
            eyebrow="How I build"
            id="principles-title"
            title={<span className="block font-serif text-2xl font-normal italic leading-snug tracking-normal md:text-4xl">&ldquo;{MISSION}&rdquo;</span>}
            action={{ href: "/how-i-build", label: "The full method" }}
            wide
          />
        </Reveal>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => {
            const Icon = ICONS[i] ?? Blocks;
            return (
              <li key={p.name}>
                <Reveal delay={i * 90} className="h-full">
                  <Spotlight
                    color="rgb(255 91 31 / 0.14)"
                    className="group h-full rounded-2xl border border-white/10 bg-night p-6 shadow-inset-hair transition-[border-color,transform] duration-300 hover:border-white/20 motion-safe:hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-ember transition-colors group-hover:bg-ember group-hover:text-ink">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="font-mono text-xs text-line">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-8 font-sans text-lg font-semibold leading-snug text-paper">{p.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-mist">{p.summary}</p>
                  </Spotlight>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
