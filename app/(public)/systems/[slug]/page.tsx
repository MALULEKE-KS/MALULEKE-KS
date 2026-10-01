// app/(public)/systems/[slug]/page.tsx
// /systems/[slug] — the case study as an engineering dossier (PAGE-BUILD-PLAYBOOK
// §9; PUBLIC-REDESIGN-PLAN §2; PAGE-SPECIFICATIONS "/systems/[slug]"). One
// story: one system, from what it is to what proves it.
//
//   hero      graphite — status, home, name, what it is, stack, actions, and
//             a proof strip of dated facts (started, last push, commits, shipped)
//   dossier   bone — the preview and the write-up (the case study, or the start
//             of its README, labelled as such), beside a sticky "at a glance"
//   activity  graphite — 26 weeks of commits and the latest ones (public repos)
//   proves    the skills it's evidence for (SkillEvidence)
//   impact, in their words, related work — each only when there is something
//
// Everything comes from the masked public views (lib/queries/case-study.ts): an
// NDA system has no links (BR-1.3), a private repo is never linked or read
// (BR-1.7), an anonymised client stays anonymised (BR-1.4). An unknown or
// unpublished slug renders the same generic 404 as a real not-found; a slug
// used before a rename redirects permanently (#87, BR-1.14).

import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Activity, ArrowLeft, ArrowUpRight, Award, Boxes, Building2, GitCommitHorizontal, Globe, Lock, Quote, Sparkles, Star, Tag } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { AskGuideButton } from "@/components/guide/AskGuideButton";
import { Container } from "@/components/shared/Container";
import { JsonLd } from "@/components/shared/JsonLd";
import { markdownSections, Prose } from "@/components/shared/Prose";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SystemPreviewFrame } from "@/components/shared/SystemPreviewFrame";
import { TechChip } from "@/components/shared/TechChip";
import { CatalogCard } from "@/components/systems/CatalogCard";
import { ActivityBars, LanguageBar } from "@/components/systems/DossierParts";
import { getCaseStudy } from "@/lib/queries/case-study";
import { describe } from "@/lib/queries/catalog";
import { publicSlugRedirect } from "@/lib/queries/systems";
import { getSiteProfile } from "@/lib/queries/site";
import { siteUrl } from "@/lib/site-url";

/** The write-up's sections, numbered — in the side panel on desktop, above the article on a phone. */
function SectionIndex({ sections, className }: { sections: { id: string; title: string }[]; className?: string }) {
  if (sections.length < 2) return null;
  return (
    <nav aria-label="On this page" className={className}>
      <p className="text-slate font-mono text-xs">On this page</p>
      <ol className="mt-3 space-y-1">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-ink hover:text-accent group flex min-h-9 items-center gap-2.5 text-sm transition-colors lg:min-h-0">
              <span className="type-data text-slate group-hover:text-accent text-[11px]">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface SystemDetailPageProps {
  params: Promise<{ slug: string }>;
}

// Memoised per request so generateMetadata and the page share one read.
const load = cache(getCaseStudy);

/** What the system is, in a sentence: its description, or the README's opening when the description only repeats the name. */
function summary(cs: NonNullable<Awaited<ReturnType<typeof getCaseStudy>>>) {
  const readme = cs.writeUp?.source === "readme" ? cs.writeUp.text : null;
  return describe(cs.system.description, cs.system.name, cs.system.slug, readme);
}

// An unknown or unpublished slug gets no title of its own — the page then
// calls notFound() and both fall through to the same generic 404 (BR-1.3/1.4).
export async function generateMetadata({ params }: SystemDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cs = await load(slug);
  if (!cs) return {};
  const description = (summary(cs) ?? `${cs.system.name} — a system by the site's owner.`).slice(0, 160);
  return {
    title: cs.system.name,
    description,
    alternates: { canonical: `/systems/${cs.system.slug}` },
    openGraph: { title: cs.system.name, description, type: "article", url: `/systems/${cs.system.slug}` },
    twitter: { title: cs.system.name, description },
  };
}

export default async function SystemDetailPage({ params }: SystemDetailPageProps) {
  const { slug } = await params;
  const cs = await load(slug);

  if (!cs) {
    // A slug the system used before its rename keeps working (#87, BR-1.14).
    const current = await publicSlugRedirect(slug);
    if (current) permanentRedirect(`/systems/${current}`);
    notFound();
  }

  const { system, repo, home } = cs;
  const profile = await getSiteProfile();
  const firstName = profile.name.split(" ")[0] ?? profile.name;
  const sections = cs.writeUp?.source === "case-study" ? markdownSections(cs.writeUp.markdown) : [];
  const what = summary(cs);
  // The README stands in as the write-up; if it already is the summary above, it isn't said twice.
  const readmeBody = cs.writeUp?.source === "readme" && cs.writeUp.text.trim() !== what?.trim() ? cs.writeUp.text : null;

  const workLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: system.name,
    ...(what && { description: what }),
    url: `${siteUrl()}/systems/${system.slug}`,
    author: { "@type": "Person", name: profile.name },
    ...(cs.tech.length > 0 && { keywords: cs.tech.join(", ") }),
    ...(system.liveUrl && { sameAs: system.liveUrl }),
    ...(repo?.createdAt && { dateCreated: repo.createdAt.toISOString().slice(0, 10) }),
  };

  // The proof strip: dated facts only, each shown when it exists.
  const proof = [
    repo?.started && { label: "Started", value: repo.started },
    cs.shipped && { label: "Shipped", value: cs.shipped.on },
    repo?.lastPush && { label: "Last push", value: repo.lastPush },
    repo && repo.commitsLastYear > 0 && { label: "Commits this year", value: String(repo.commitsLastYear) },
    repo && repo.stars > 0 && { label: repo.stars === 1 ? "Star" : "Stars", value: String(repo.stars) },
  ].filter((p): p is { label: string; value: string } => Boolean(p));

  const moving = cs.weeks.some((n) => n > 0);
  const commitsIn26 = cs.weeks.reduce((a, b) => a + b, 0);

  return (
    <>
      <JsonLd data={workLd} />
      <section aria-labelledby="system-title" className="hero-field text-paper overflow-hidden">
        <Container className="pt-28 pb-14 md:pt-32 md:pb-20">
          <Link
            href="/systems"
            className="text-mist hover:text-paper focus-visible:outline-ember inline-flex items-center gap-2 rounded-full text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            All systems
          </Link>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StatusBadge label={system.status} colorToken={system.statusColorToken} onDark />
            {system.isFlagship && (
              <span className="bg-ember/15 text-ember inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <Star aria-hidden="true" className="size-3 fill-current" />
                Flagship
              </span>
            )}
            <span className="text-mist font-mono text-xs">
              {[home ? (home.role ? `${home.name} · ${home.role}` : home.name) : system.organization, system.domain].filter(Boolean).join(" / ")}
            </span>
          </div>

          <h1 id="system-title" className="type-display mt-5 max-w-4xl">
            {system.name}
          </h1>
          {what && <p className="type-lede text-mist mt-5 max-w-2xl">{what}</p>}

          {cs.tech.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Built with">
              {cs.tech.map((t) => (
                <li key={t}>
                  <TechChip name={t} tone="dark" />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {system.liveUrl && (
              <Button asChild variant="accent" size="lg">
                <a href={system.liveUrl} target="_blank" rel="noopener noreferrer">
                  <Globe />
                  View it live
                  <ArrowUpRight />
                </a>
              </Button>
            )}
            {system.repoUrl && (
              <Button asChild variant="glass" size="lg">
                <a href={system.repoUrl} target="_blank" rel="noopener noreferrer">
                  <FaGithub />
                  View the source
                </a>
              </Button>
            )}
            <AskGuideButton question={`Tell me about ${system.name} — what is it, how is it built, and what does it show about ${firstName}'s work?`}>
              Ask the AI guide about it
            </AskGuideButton>
          </div>

          {proof.length > 0 && (
            <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-8 sm:grid-cols-4">
              {proof.map((p) => (
                <div key={p.label}>
                  <dt className="type-eyebrow text-mist">{p.label}</dt>
                  <dd className="type-data text-paper mt-1.5 text-lg font-semibold">{p.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Container>
      </section>

      <section aria-label="The system" className="bg-paper py-16 md:py-24">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            {(system.screenshotUrl || system.liveUrl) && (
              <SystemPreviewFrame screenshotUrl={system.screenshotUrl} liveUrl={system.liveUrl} name={system.name} />
            )}
            {cs.writeUp?.source === "case-study" && (
              <div className={system.screenshotUrl || system.liveUrl ? "mt-12" : undefined}>
                <SectionIndex sections={sections} className="border-ink/10 bg-sheet mb-8 rounded-2xl border p-5 lg:hidden" />
                {cs.writeUp.byAi && (
                  // BR-4.5 — AI-written words are always labelled, with where they came from.
                  <p className="border-ink/10 bg-sheet text-slate mb-8 flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs sm:inline-flex sm:items-center sm:rounded-full sm:py-1.5">
                    <Sparkles aria-hidden="true" className="text-accent mt-px size-3.5 shrink-0 sm:mt-0" />
                    <span>
                      Written by AI from {repo ? <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-ink underline-offset-2 hover:underline">the repository</a> : "the repository"}
                      {cs.writeUp.writtenAgo && ` · updated ${cs.writeUp.writtenAgo}`}
                    </span>
                    <span className="border-ember/30 bg-ember/10 text-accent shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
                  </p>
                )}
                <Prose markdown={cs.writeUp.markdown} />
              </div>
            )}
            {readmeBody && repo && (
              // Honestly labelled: these are the repo's own words, not a written case study.
              <div className={system.screenshotUrl || system.liveUrl ? "mt-12" : undefined}>
                <p className="type-eyebrow text-slate inline-flex items-center gap-2">
                  <FaGithub aria-hidden="true" className="size-3.5" /> From its README
                </p>
                <div className="text-ink mt-4 max-w-prose font-serif text-lg leading-relaxed whitespace-pre-line">{readmeBody}</div>
                <a
                  href={`${repo.url}#readme`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent mt-6 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                >
                  Read the whole README on GitHub <ArrowUpRight aria-hidden="true" className="size-4" />
                </a>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4" aria-labelledby="glance-title">
            <div className="border-ink/10 bg-sheet shadow-soft rounded-3xl border p-6 lg:sticky lg:top-24">
              <SectionIndex sections={sections} className="border-ink/10 mb-6 hidden border-b pb-5 lg:block" />
              <h2 id="glance-title" className="text-slate inline-flex items-center gap-2 text-xs font-medium">
                <Boxes aria-hidden="true" className="text-accent size-4" />
                At a glance
              </h2>
              <dl className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 aria-hidden="true" className="text-slate mt-0.5 size-4 shrink-0" />
                  <div>
                    <dt className="text-slate font-mono text-xs">{home ? "Home" : "Organization"}</dt>
                    <dd className="text-ink font-medium">
                      {home ? home.name : system.organization}
                      {home?.role && <span className="text-slate block text-sm font-normal">{home.role}</span>}
                    </dd>
                  </div>
                </div>
                {system.domain && (
                  <div className="flex items-start gap-3">
                    <Tag aria-hidden="true" className="text-slate mt-0.5 size-4 shrink-0" />
                    <div>
                      <dt className="text-slate font-mono text-xs">Domain</dt>
                      <dd className="text-ink font-medium">{system.domain}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-${system.statusColorToken})` }} />
                  <div>
                    <dt className="text-slate font-mono text-xs">Status</dt>
                    <dd className="text-ink font-medium">{system.status}</dd>
                  </div>
                </div>
              </dl>

              {repo && repo.languages.length > 0 && (
                <div className="border-ink/10 mt-6 border-t pt-5">
                  <p className="text-slate font-mono text-xs">Languages</p>
                  <div className="mt-3">
                    <LanguageBar languages={repo.languages} />
                  </div>
                </div>
              )}

              {repo && repo.topics.length > 0 && (
                <div className="border-ink/10 mt-6 border-t pt-5">
                  <p className="text-slate font-mono text-xs">Topics</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {repo.topics.map((t) => (
                      <li key={t} className="border-ink/10 bg-paper text-ink rounded-full border px-2.5 py-0.5 font-mono text-[11px]">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {system.repoPrivate && (
                // BR-1.7 — a private repository is never linked; access is by request.
                <div className="border-ink/10 bg-paper mt-6 rounded-2xl border p-4">
                  <p className="text-ink inline-flex items-center gap-2 text-sm font-medium">
                    <Lock aria-hidden="true" className="text-slate size-4" />
                    Private repository
                  </p>
                  <Link href="/contact" className="text-accent mt-1 block text-sm font-medium underline underline-offset-4">
                    Ask for access
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </Container>
      </section>

      {(moving || cs.commits.length > 0) && (
        <section aria-labelledby="activity-title" className="bg-night-deep text-paper py-16 md:py-24">
          <Container>
            <SectionHeader icon={Activity} eyebrow="Activity" id="activity-title" title="How it's moving." tone="dark" />
            <div className="grid gap-10 lg:grid-cols-12">
              {moving && (
                <div className="lg:col-span-7">
                  <ActivityBars weeks={cs.weeks} />
                  <div className="text-mist mt-3 flex justify-between font-mono text-[11px]">
                    <span>26 weeks ago</span>
                    <span>this week</span>
                  </div>
                  <p className="text-mist mt-6 text-sm">
                    <span className="type-data text-paper font-semibold">{commitsIn26}</span> commits in the last 26 weeks
                    {cs.commitsLast4Weeks > 0 && (
                      <>
                        {" · "}
                        <span className="type-data text-paper font-semibold">{cs.commitsLast4Weeks}</span> in the last 4
                      </>
                    )}
                  </p>
                </div>
              )}
              {cs.commits.length > 0 && (
                <div className={moving ? "lg:col-span-5" : "lg:col-span-12"}>
                  <h3 className="type-eyebrow text-mist">Latest commits</h3>
                  <ol className="mt-4 space-y-3">
                    {cs.commits.map((c) => (
                      <li key={c.at + c.title} className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                        <GitCommitHorizontal aria-hidden="true" className="text-ember mt-0.5 size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="text-paper block truncate text-sm">{c.title}</span>
                          <time dateTime={c.at} className="text-mist font-mono text-[11px]">
                            {c.when}
                          </time>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </Container>
        </section>
      )}

      {cs.skills.length > 0 && (
        <section aria-labelledby="proves-title" className="bg-paper py-16 md:py-24">
          <Container>
            <SectionHeader icon={Award} eyebrow="Skills" id="proves-title" title="What it proves." />
            {/* Evidence, not self-rating (FRONTEND-DATA-GUIDE "/systems/[slug]"). */}
            <ul className="flex flex-wrap gap-3">
              {cs.skills.map((s) => (
                <li key={s.name} className="border-ink/10 bg-sheet shadow-soft rounded-2xl border px-4 py-3">
                  <span className="text-ink font-medium">{s.name}</span>
                  <span className="text-slate mt-0.5 block text-xs">
                    used in {s.systems} {s.systems === 1 ? "system" : "systems"}
                    {s.roles > 0 && `, ${s.roles} ${s.roles === 1 ? "role" : "roles"}`}
                  </span>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {system.impacts.length > 0 && (
        // Only rendered when there are impacts — never an empty placeholder (spec).
        <section aria-labelledby="impact-title" className="border-ink/10 bg-paper border-t py-16 md:py-24">
          <Container>
            <SectionHeader icon={Star} eyebrow="Impact" id="impact-title" title="What it changed." />
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {system.impacts.map((impact, i) => (
                <Reveal key={impact.label} delay={i * 80}>
                  <div className="border-ink/10 bg-sheet shadow-soft h-full rounded-3xl border p-6">
                    <dd className="type-data text-ink text-4xl font-semibold tracking-tight">{impact.value}</dd>
                    <dt className="text-slate mt-2 text-sm">{impact.label}</dt>
                  </div>
                </Reveal>
              ))}
            </dl>
          </Container>
        </section>
      )}

      {system.testimonials.length > 0 && (
        // Only testimonials with permission are ever queried (BR-6.1).
        <section aria-labelledby="words-title" className="hero-field text-paper py-16 md:py-24">
          <Container>
            <SectionHeader icon={Quote} eyebrow="In their words" id="words-title" title="From the people it was built for." tone="dark" />
            <div className="grid gap-5 md:grid-cols-2">
              {system.testimonials.map((t, i) => (
                <Reveal key={i} delay={i * 80}>
                  <figure className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                    <Quote aria-hidden="true" className="text-ember size-6" />
                    <blockquote className="text-paper mt-4 font-serif text-lg leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="text-mist mt-5 text-sm">
                      <span className="text-paper font-medium">{t.authorName}</span>
                      {t.authorRole && `, ${t.authorRole}`}
                      {t.organization && ` — ${t.organization}`}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {cs.related.length > 0 && (
        <section aria-labelledby="more-title" className="border-ink/10 bg-paper border-t py-16 md:py-24">
          <Container>
            {/* No "All systems" action here — the hero's back link already is one (no duplicates). */}
            <SectionHeader icon={Boxes} eyebrow="More systems" id="more-title" title="Related work." />
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {cs.related.map((r, i) => (
                <li key={r.slug}>
                  <Reveal delay={i * 60} className="h-full">
                    <CatalogCard s={r} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
