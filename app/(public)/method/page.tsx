// app/(public)/method/page.tsx
// /method — formerly /how-i-build, which redirects here (F5c, D10).
// PAGE-SPECIFICATIONS "/method"; PAGE-BUILD-PLAYBOOK §9. Its own idea, in the
// site's family: the method read as chapters. Each principle is a chapter —
// a large numeral, the principle, what it means in practice, and then its
// proof laid open (docs/EVIDENCE-SPEC.md): what it proves, what it doesn't,
// and links into the code that's running. Nothing here is a claim typed into
// the page: the words are the owner's content block, the proof is the
// evidence block, and the live line under the title is counted from the
// database when the page loads.

import Link from "next/link";
import { Activity, ArrowUpRight, Blocks, Compass, Rocket, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";
import { EvidenceList } from "@/components/shared/Evidence";
import { AskGuideButton } from "@/components/guide/AskGuideButton";
import { getContentBlock } from "@/lib/content/blocks";
import { claimsFor, getEvidence } from "@/lib/evidence";
import { getPlatformPulse } from "@/lib/queries/profile";

export const metadata = {
  title: "How I build",
  description: "The principles the work follows — each one opened to the code and tests that prove it.",
  alternates: { canonical: "/method" },
};

export const dynamic = "force-dynamic";

// Same icons, same order, as the home page's principles band.
const ICONS: LucideIcon[] = [Rocket, Blocks, Zap, Activity, ShieldCheck];

export default async function MethodPage() {
  const [content, evidence, pulse] = await Promise.all([getContentBlock("how-i-build"), getEvidence(), getPlatformPulse()]);
  const mission = content?.mission;
  const principles = content?.principles ?? [];
  const verified = evidence.claims.filter((c) => c.status === "verified").length;
  const facts = [
    { value: principles.length, label: principles.length === 1 ? "principle" : "principles" },
    { value: pulse.rulesEnforcedByDatabase, label: "rules the database enforces" },
    { value: verified, label: verified === 1 ? "claim verified in code" : "claims verified in code" },
  ].filter((f) => f.value > 0);

  return (
    <>
      <PageHero
        icon={Compass}
        eyebrow="How I build"
        title="The method."
        description={mission ? <span className="text-paper/90 font-serif text-xl italic">&ldquo;{mission}&rdquo;</span> : undefined}
      >
        {facts.length > 0 && (
          <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6">
            {facts.map((f) => (
              <div key={f.label}>
                <dd className="type-data text-paper text-3xl font-semibold">{f.value}</dd>
                <dt className="text-mist mt-1 text-sm">{f.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </PageHero>

      <section aria-label="The principles" className="bg-paper py-16 md:py-24">
        <Container>
          <ol className="space-y-16 md:space-y-24">
            {principles.map((p, i) => {
              const Icon = ICONS[i] ?? Blocks;
              const claims = claimsFor(evidence.claims, `principle:${p.name}`);
              const n = String(i + 1).padStart(2, "0");
              return (
                <li key={p.name} id={`principle-${i + 1}`} className="grid scroll-mt-28 grid-cols-1 gap-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-12">
                  {/* The chapter's numeral — sticky beside its text on wide screens. */}
                  <div className="flex items-center gap-4 lg:sticky lg:top-28 lg:block lg:self-start">
                    <span aria-hidden="true" className="type-data text-ink/15 text-6xl leading-none font-semibold tracking-tighter lg:text-8xl">
                      {n}
                    </span>
                    <span className="bg-ink text-paper grid size-11 place-items-center rounded-xl lg:mt-5">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                  </div>

                  <Reveal className="min-w-0">
                    <h2 className="text-ink font-sans text-2xl font-semibold tracking-tight md:text-3xl">{p.name}</h2>
                    <p className="text-accent mt-2 font-serif text-lg italic md:text-xl">{p.summary}</p>
                    <p className="text-slate mt-5 max-w-3xl font-serif text-lg leading-relaxed">{p.body}</p>

                    {claims.length > 0 && (
                      <div className="bg-night-deep text-paper mt-8 rounded-3xl p-4 sm:p-6">
                        <p className="text-mist mb-4 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                          <ShieldCheck aria-hidden="true" className="text-ember size-3.5" />
                          The proof{evidence.source.commit ? ` — in the code running build ${evidence.source.commit.slice(0, 7)}` : ""}
                        </p>
                        <EvidenceList claims={claims} />
                      </div>
                    )}
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="deeper-title" className="hero-field text-paper py-16 md:py-20">
        <Container className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 id="deeper-title" className="type-h2">
              Every claim, <span className="type-accent text-ember-gradient pr-[0.06em]">in one place.</span>
            </h2>
            <p className="type-lede text-mist mt-4">The platform is its own case study: its claims, what each proves and what it doesn&rsquo;t — and the ones still planned, labelled as planned.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/systems/maluleke-ks#evidence"
              className="bg-ember text-ink shadow-glow-ember focus-visible:outline-paper inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              The platform&rsquo;s evidence
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <AskGuideButton question="How does this platform enforce its own rules?">Ask the AI guide how</AskGuideButton>
          </div>
        </Container>
      </section>
    </>
  );
}
