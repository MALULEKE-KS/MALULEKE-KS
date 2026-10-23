// components/home/PrinciplesBand.tsx
// Home — the method (DESIGN-SYSTEM.md v3 §7.3): how the work is governed. Since
// the premium pass (D-047, owner-approved 2026-10-23) it is set like an argument,
// not a feature grid, on bone so the page alternates graphite and bone: the
// section header, the owner's mission as a large serif pull quote, then the
// principles as a ruled list — each its name and one line, opening in place to
// its full text (a native <details>, so it works without script), with its
// evidence beside it (docs/EVIDENCE-SPEC.md; shown only when the principle has
// published evidence, EV-1). No icons, no numbers — they are principles, not
// steps. The words are the owner's content block (#106).

import { Plus } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import type { ContentBody } from "@/lib/content/blocks";
import { Accent } from "@/components/shared/Accent";
import { Evidence } from "@/components/shared/Evidence";
import { claimsFor, type ResolvedClaim } from "@/lib/evidence";

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
    <section
      aria-labelledby="principles-title"
      className="bg-paper text-ink relative py-20 md:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeader
            copyKey="home.method"
            eyebrow="The method"
            id="principles-title"
            title={
              <Accent
                text="How I *build.*"
                className="type-accent text-ember-gradient pr-[0.06em]"
              />
            }
            action={{ href: "/about#method", label: "The full method" }}
            className="mb-8 md:mb-10"
          />
        </Reveal>
        <Reveal delay={60}>
          <blockquote className="max-w-4xl">
            <p className="text-ink font-serif text-2xl leading-snug text-balance italic md:text-[2.25rem] md:leading-[1.25]">
              &ldquo;{mission}&rdquo;
            </p>
          </blockquote>
        </Reveal>

        <ul className="border-ink/12 mt-12 border-t md:mt-16">
          {principles.map((p, i) => {
            const claims = claimsFor(evidence.claims, `principle:${p.name}`);
            return (
              <li key={p.name} className="border-ink/12 border-b">
                <Reveal
                  delay={i * 60}
                  className="grid grid-cols-1 gap-x-8 gap-y-3 py-5 md:grid-cols-12 md:items-start md:py-6"
                >
                  <details className="group/p md:col-span-10">
                    <summary className="focus-visible:outline-ember grid min-h-11 cursor-pointer transition-opacity active:opacity-70 list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 gap-y-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_auto] [&::-webkit-details-marker]:hidden">
                      <h3 className="text-ink group-hover/p:text-accent text-lg font-semibold tracking-tight transition-colors md:text-xl">
                        {p.name}
                      </h3>
                      <Plus
                        aria-hidden="true"
                        className="text-slate col-start-2 row-start-1 mt-1 size-4 transition-transform duration-300 group-open/p:rotate-45 motion-reduce:transition-none md:col-start-3"
                      />
                      <p className="text-slate col-span-1 leading-relaxed md:col-start-2 md:row-start-1">
                        {p.summary}
                      </p>
                    </summary>
                    {p.body && (
                      <p className="text-ink/80 principle-open mt-4 max-w-[68ch] leading-relaxed md:ml-[calc(5/11*100%)]">
                        {p.body}
                      </p>
                    )}
                  </details>
                  {claims.length > 0 && (
                    <div className="md:col-span-2 md:justify-self-end md:pt-1">
                      <Evidence
                        claims={claims}
                        label={p.name}
                        commit={evidence.source.commit}
                        tone="light"
                      />
                    </div>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
