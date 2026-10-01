// app/(public)/systems/[slug]/page.tsx
// /systems/[slug] — case study (DESIGN-SYSTEM.md v3, #99). Graphite hero with
// the system's facts and actions; on bone the preview, the long-form body
// (Markdown, safely rendered) and a facts panel; then impacts, permitted
// testimonials and related systems. Everything comes from the masked public
// views: an NDA system has no links (BR-1.3), a private repo is never linked
// (BR-1.7), an anonymised client stays anonymised (BR-1.4).
//
// An unknown or unpublished slug renders the same generic 404 as a real
// not-found (never a distinct "private" message). A slug the system used
// before a rename redirects permanently (#87, BR-1.14).
// See docs/PAGE-SPECIFICATIONS.md ("/systems/[slug]").

import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Building2,
  Globe,
  Lock,
  Quote,
  Star,
  Tag,
} from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { Prose } from "@/components/shared/Prose";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SystemCard } from "@/components/shared/SystemCard";
import { SystemPreviewFrame } from "@/components/shared/SystemPreviewFrame";
import {
  getPublicSystemBySlug,
  getRelatedSystems,
  publicSlugRedirect,
} from "@/lib/queries/systems";
import { getSiteProfile } from "@/lib/queries/site";
import { JsonLd } from "@/components/shared/JsonLd";
import { siteUrl } from "@/lib/site-url";

interface SystemDetailPageProps {
  params: Promise<{ slug: string }>;
}

// Memoised per request so generateMetadata and the page share one query.
const getSystem = cache(getPublicSystemBySlug);

// An unknown or unpublished slug gets no title of its own — the page then
// calls notFound() and both fall through to the same generic 404 (BR-1.3/1.4).
export async function generateMetadata({ params }: SystemDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const system = await getSystem(slug);
  if (!system) return {};
  return {
    title: system.name,
    description: system.description,
    alternates: { canonical: `/systems/${system.slug}` },
    openGraph: {
      title: system.name,
      description: system.description,
      type: "article",
      url: `/systems/${system.slug}`,
    },
  };
}

export default async function SystemDetailPage({ params }: SystemDetailPageProps) {
  const { slug } = await params;
  const system = await getSystem(slug);

  if (!system) {
    // A slug the system used before its rename keeps working (#87, BR-1.14).
    const current = await publicSlugRedirect(slug);
    if (current) permanentRedirect(`/systems/${current}`);
    notFound();
  }

  const [relatedSystems, profile] = await Promise.all([getRelatedSystems(slug), getSiteProfile()]);
  const workLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: system.name,
    description: system.description,
    url: `${siteUrl()}/systems/${system.slug}`,
    author: { "@type": "Person", name: profile.name },
    ...(system.techStack.length > 0 && { keywords: system.techStack.join(", ") }),
    ...(system.liveUrl && { sameAs: system.liveUrl }),
  };
  const meta = [system.organization, system.domain].filter(Boolean).join(" / ");

  const facts = [
    { label: "Organization", value: system.organization, Icon: Building2 },
    ...(system.domain ? [{ label: "Domain", value: system.domain, Icon: Tag }] : []),
  ];

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
            {meta && <span className="text-mist font-mono text-xs">{meta}</span>}
            <StatusBadge label={system.status} colorToken={system.statusColorToken} onDark />
            {system.isFlagship && (
              <span className="bg-ember/15 text-ember inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <Star aria-hidden="true" className="size-3 fill-current" />
                Flagship
              </span>
            )}
          </div>

          <h1
            id="system-title"
            className="mt-5 max-w-4xl font-sans text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl"
          >
            {system.name}
          </h1>
          <p className="text-mist mt-5 max-w-2xl font-serif text-xl leading-relaxed">
            {system.description}
          </p>

          {system.techStack.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Stack">
              {system.techStack.map((tech) => (
                <li
                  key={tech}
                  className="text-paper rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs"
                >
                  {tech}
                </li>
              ))}
            </ul>
          )}

          {(system.liveUrl || system.repoUrl) && (
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
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
            </div>
          )}
        </Container>
      </section>

      <section className="bg-paper py-16 md:py-24">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <SystemPreviewFrame
              screenshotUrl={system.screenshotUrl}
              liveUrl={system.liveUrl}
              name={system.name}
            />
            <div className="mt-12">
              {system.caseStudyBody.trim() ? (
                <Prose markdown={system.caseStudyBody} />
              ) : (
                <p className="text-slate max-w-prose font-serif text-lg leading-relaxed">
                  No long-form write-up yet.
                </p>
              )}
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-6 lg:sticky lg:top-24">
              <span className="text-slate inline-flex items-center gap-2 text-xs font-medium">
                <Boxes aria-hidden="true" className="text-accent size-4" />
                At a glance
              </span>
              <dl className="mt-5 space-y-4">
                {facts.map(({ label, value, Icon }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon aria-hidden="true" className="text-slate mt-0.5 size-4 shrink-0" />
                    <div>
                      <dt className="text-slate font-mono text-xs">{label}</dt>
                      <dd className="text-ink font-medium">{value}</dd>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--color-${system.statusColorToken})` }}
                  />
                  <div>
                    <dt className="text-slate font-mono text-xs">Status</dt>
                    <dd className="text-ink font-medium">{system.status}</dd>
                  </div>
                </div>
              </dl>
              {system.repoPrivate && (
                // BR-1.7 — a private repository is never linked; access is by request.
                <div className="border-ink/10 bg-paper mt-6 rounded-xl border p-4">
                  <p className="text-ink inline-flex items-center gap-2 text-sm font-medium">
                    <Lock aria-hidden="true" className="text-slate size-4" />
                    Private repository
                  </p>
                  <Link
                    href="/contact"
                    className="text-accent mt-1 inline-block text-sm font-medium underline underline-offset-4"
                  >
                    Ask for access
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </Container>
      </section>

      {system.impacts.length > 0 && (
        // Only rendered when there are impacts — never an empty placeholder (spec).
        <section
          aria-labelledby="impact-title"
          className="border-ink/10 bg-paper border-t pb-16 md:pb-24"
        >
          <Container className="pt-16">
            <SectionHeader
              icon={Star}
              eyebrow="Impact"
              id="impact-title"
              title="What it changed."
            />
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {system.impacts.map((impact, i) => (
                <Reveal key={impact.label} delay={i * 80}>
                  <div className="border-ink/10 bg-sheet shadow-soft h-full rounded-2xl border p-6">
                    <dd className="text-ink font-sans text-4xl font-semibold tracking-tight">
                      {impact.value}
                    </dd>
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
            <SectionHeader
              icon={Quote}
              eyebrow="In their words"
              id="words-title"
              title="From the people it was built for."
              tone="dark"
            />
            <div className="grid gap-5 md:grid-cols-2">
              {system.testimonials.map((t, i) => (
                <Reveal key={i} delay={i * 80}>
                  <figure className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur">
                    <Quote aria-hidden="true" className="text-ember size-6" />
                    <blockquote className="text-paper mt-4 font-serif text-lg leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
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

      {relatedSystems.length > 0 && (
        <section
          aria-labelledby="more-title"
          className="border-ink/10 bg-paper border-t py-16 md:py-24"
        >
          <Container>
            <SectionHeader
              icon={Boxes}
              eyebrow="More systems"
              id="more-title"
              title="Related work."
              action={{ href: "/systems", label: "All systems" }}
            />
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {relatedSystems.map((related) => (
                <li key={related.id}>
                  <SystemCard
                    slug={related.slug}
                    name={related.name}
                    description={related.description}
                    status={{ label: related.status, colorToken: related.statusColorToken }}
                    isFlagship={related.isFlagship}
                    organization={related.organization}
                    domain={related.domain}
                    techStack={related.techStack}
                  />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
