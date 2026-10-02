// components/home/PrinciplesBand.tsx
// Home — the method (DESIGN-SYSTEM.md v3 §7.3): how the work is governed. A
// titled section ("How I build."), the mission as a large serif blockquote,
// then the principles as spotlight cards with an icon each — a bento where the
// first (Make It Exist First, the one before all others) leads as a tall card.
// Each card carries its evidence (docs/EVIDENCE-SPEC.md): a chip that opens
// the proof, shown only when the principle has published evidence (EV-1).
// Full text lives on /method. The words are the owner's content block (#106).

import { Activity, Blocks, Compass, Rocket, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Spotlight } from "@/components/shared/Spotlight";
import type { ContentBody } from "@/lib/content/blocks";
import { Accent } from "@/components/shared/Accent";
import { Evidence } from "@/components/shared/Evidence";
import { claimsFor, type ResolvedClaim } from "@/lib/evidence";
import { cn } from "@/lib/utils";

// One icon per principle, in order; a sixth or later principle reuses Blocks.
const ICONS: LucideIcon[] = [Rocket, Blocks, Zap, Activity, ShieldCheck];

export function PrinciplesBand({
  content,
  evidence,
}: {
  content: ContentBody<"how-i-build"> | null;
  evidence: { claims: ResolvedClaim[]; source: { commit: string | null } };
}) {
  if (!content) return null;
  const { mission, principles } = content;
  return (
    <section aria-labelledby="principles-title" className="relative overflow-hidden bg-night-deep py-20 text-paper md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-ember/10 blur-3xl"
      />
      <Container className="relative">
        <Reveal>
          <SectionHeader
            copyKey="home.method"
            tone="dark"
            icon={Compass}
            eyebrow="The method"
            id="principles-title"
            title={<Accent text="How I *build.*" className="type-accent text-ember-gradient pr-[0.06em]" />}
            action={{ href: "/about#method", label: "The full method" }}
            className="mb-8 md:mb-10"
          />
        </Reveal>
        <Reveal delay={60}>
          <blockquote className="mb-12 max-w-4xl border-l-2 border-ember/60 pl-6 md:mb-14">
            <p className="font-serif text-2xl leading-snug text-paper/90 italic md:text-[2rem]">&ldquo;{mission}&rdquo;</p>
          </blockquote>
        </Reveal>

        <ol className={cn("grid gap-4 sm:grid-cols-2", principles.length === 5 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
          {principles.map((p, i) => {
            const Icon = ICONS[i] ?? Blocks;
            // Five principles: the first leads, tall, beside a 2×2 of the rest.
            const lead = principles.length === 5 && i === 0;
            const claims = claimsFor(evidence.claims, `principle:${p.name}`);
            return (
              <li key={p.name} className={cn(lead && "sm:col-span-2 lg:col-span-1 lg:row-span-2")}>
                <Reveal delay={i * 90} className="h-full">
                  <Spotlight
                    color="rgb(255 91 31 / 0.14)"
                    className={cn(
                      "group flex h-full flex-col rounded-2xl border border-white/10 bg-night p-6 shadow-inset-hair transition-[border-color,transform] duration-300 hover:border-white/20 motion-safe:hover:-translate-y-1",
                      lead && "border-ember/25 bg-[linear-gradient(160deg,rgb(255_91_31/0.10),transparent_55%),var(--color-night)] lg:p-8",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-ember transition-colors group-hover:bg-ember group-hover:text-ink">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="font-mono text-xs text-line">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className={cn("mt-8 font-sans font-semibold leading-snug text-paper", lead ? "text-2xl lg:mt-auto lg:pt-16 lg:text-[1.75rem]" : "text-lg")}>{p.name}</h3>
                    <p className={cn("mt-2 leading-relaxed text-mist", lead ? "text-base" : "text-sm")}>{p.summary}</p>
                    {claims.length > 0 && <Evidence claims={claims} label={p.name} commit={evidence.source.commit} className="mt-5 self-start" />}
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
