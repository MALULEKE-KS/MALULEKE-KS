// components/home/PrinciplesBand.tsx
// Sheet 01, section 3 (DESIGN-SYSTEM.md v2 §7.3): how the work is governed,
// as a numbered spec sheet on the deep band. The mission leads; the four
// principles follow as summaries, with the full text on /how-i-build.
// Each cell takes the corner-bracket selection motif on hover.

import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MISSION, PRINCIPLES } from "@/lib/content/principles";

const CORNER =
  "pointer-events-none absolute size-4 border-amber opacity-0 transition-opacity duration-200 group-hover:opacity-100";

export function PrinciplesBand() {
  return (
    <section aria-labelledby="principles-title" className="bg-blueprint-deep text-paper relative py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeader
            tone="dark"
            index="01.3"
            eyebrow="How I build"
            id="principles-title"
            title={
              <span className="text-paper font-serif text-2xl leading-snug font-normal italic md:text-4xl">
                {MISSION}
              </span>
            }
            action={{ href: "/how-i-build", label: "The full method" }}
          />
        </Reveal>

        <ol className="border-line/20 grid border-t border-l md:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => (
            <li key={p.name} className="border-line/20 border-r border-b">
              <Reveal delay={i * 90} className="group hover:bg-blueprint relative h-full p-6 transition-colors md:p-8">
                <span aria-hidden="true" className={`${CORNER} top-2 left-2 border-t-2 border-l-2`} />
                <span aria-hidden="true" className={`${CORNER} top-2 right-2 border-t-2 border-r-2`} />
                <span aria-hidden="true" className={`${CORNER} bottom-2 left-2 border-b-2 border-l-2`} />
                <span aria-hidden="true" className={`${CORNER} right-2 bottom-2 border-r-2 border-b-2`} />
                <p className="text-amber font-mono text-xs">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="text-paper mt-6 font-sans text-xl leading-snug font-semibold">{p.name}</h3>
                <p className="text-mist mt-3 text-sm leading-relaxed">{p.summary}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
