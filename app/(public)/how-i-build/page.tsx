// app/(public)/how-i-build/page.tsx
// /how-i-build (DESIGN-SYSTEM.md v3, #99): the mission, the four governing
// principles in plain language, and real rules this platform enforces —
// each citation links to the rule itself, and each claim here is enforced
// somewhere real (docs/ENFORCEMENT-REGISTER.md).
// See docs/PAGE-SPECIFICATIONS.md ("/how-i-build"), docs/PLATFORM-CONSTITUTION-v1.md §1.

import { Activity, Blocks, Compass, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";
import { RuleCitation } from "@/components/shared/RuleCitation";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Spotlight } from "@/components/shared/Spotlight";
import { MISSION, PRINCIPLES } from "@/lib/content/principles";

export const metadata = {
  title: "How I build",
  description: "The principles and the rules this platform enforces on itself.",
  alternates: { canonical: "/how-i-build" },
};

// Same icons, same order, as the home page's principles band.
const ICONS: LucideIcon[] = [Blocks, Zap, Activity, ShieldCheck];

// Rules this platform enforces on itself, each with where it's enforced.
const RULES = [
  {
    rule: "BR-1.1",
    text: "A client's case study never publishes without the client's approval — refused by the database itself, whatever the path.",
  },
  {
    rule: "BR-3.4",
    text: "Every change in the admin is written to an append-only audit log by the database — no route can skip it.",
  },
  {
    rule: "BR-1.13",
    text: "Scheduled content goes live exactly at its time, and every publishing rule is checked when it's scheduled.",
  },
  {
    rule: "BR-4.1",
    text: "An automated agent gets no privileged write path beyond what a human visitor already has.",
  },
];

export default function HowIBuildPage() {
  return (
    <>
      <PageHero
        icon={Compass}
        eyebrow="How I build"
        title="The method."
        description={
          <span className="text-paper/90 font-serif text-xl italic">&ldquo;{MISSION}&rdquo;</span>
        }
      />

      <section aria-labelledby="principles-title" className="bg-paper py-16 md:py-24">
        <Container>
          <SectionHeader
            icon={Blocks}
            eyebrow="Principles"
            id="principles-title"
            title="Four rules the work follows."
          />
          <div className="grid gap-5 md:grid-cols-2">
            {PRINCIPLES.map((p, i) => {
              const Icon = ICONS[i] ?? Blocks;
              return (
                <Reveal key={p.name} delay={i * 80} className="h-full">
                  <Spotlight className="border-ink/10 bg-sheet shadow-soft h-full rounded-2xl border p-7">
                    <div className="flex items-center justify-between">
                      <span className="bg-ink text-paper grid size-11 place-items-center rounded-xl">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="text-slate font-mono text-xs">0{i + 1}</span>
                    </div>
                    <h3 className="text-ink mt-6 font-sans text-xl font-semibold tracking-tight">
                      {p.name}
                    </h3>
                    <p className="text-slate mt-3 font-serif leading-relaxed">{p.body}</p>
                  </Spotlight>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      <section aria-labelledby="rules-title" className="hero-field text-paper py-16 md:py-24">
        <Container>
          <SectionHeader
            icon={ShieldCheck}
            eyebrow="Enforced, not asserted"
            id="rules-title"
            title="Rules this platform keeps on itself."
            description="Every one is written down, numbered, and enforced in code or in the database — follow a citation to read the rule."
            tone="dark"
          />
          <ul className="grid gap-4 md:grid-cols-2">
            {RULES.map(({ rule, text }, i) => (
              <Reveal key={rule} delay={i * 80}>
                <li className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                  <RuleCitation rule={rule} tone="dark" />
                  <p className="text-mist mt-4 leading-relaxed">{text}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
