// app/(public)/systems/[slug]/page.tsx
// /systems/[slug] — case study. Unknown/unpublished slug renders the same
// generic 404 as a real not-found (never a distinct "private" message —
// BR-1.3/1.4). See docs/PAGE-SPECIFICATIONS.md, docs/DESIGN-SYSTEM.md §2a/§3a.

import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SystemCard } from "@/components/shared/SystemCard";
import { MarginAnnotations } from "@/components/shared/MarginAnnotations";
import { getPublicSystemBySlug, getRelatedSystems } from "@/lib/queries/systems";
import { db } from "@/lib/db";

interface SystemDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SystemDetailPage({ params }: SystemDetailPageProps) {
  const { slug } = await params;
  const system = await getPublicSystemBySlug(slug);

  if (!system) notFound();

  // Domain key is needed for "related systems" but the public shape only
  // exposes the domain's label — a small direct lookup, not worth adding a
  // whole extra field to the public wire shape for one internal use.
  const domainRow = system.domain
    ? await db.domain.findFirst({ where: { label: system.domain }, select: { key: true } })
    : null;
  const relatedSystems = await getRelatedSystems(domainRow?.key ?? null, slug);

  const annotations = [
    { label: "Organization", value: system.organization },
    ...(system.domain ? [{ label: "Domain", value: system.domain }] : []),
  ];

  return (
    <article className="px-6 py-16 max-w-5xl mx-auto">
      <MarginAnnotations items={annotations}>
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="font-sans font-semibold text-3xl text-ink">{system.name}</h1>
          <StatusBadge label={system.status} colorToken={system.statusColorToken} />
        </div>

        {system.isFlagship && (
          <p className="font-mono text-xs text-accent mb-4 flex items-center gap-1">
            <span aria-hidden="true">■</span> Flagship
          </p>
        )}

        {system.techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {system.techStack.map((tech) => (
              <span key={tech} className="font-mono text-xs border border-slate/30 text-slate px-2 py-0.5">
                {tech}
              </span>
            ))}
          </div>
        )}

        {system.caseStudyBody ? (
          <div className="font-serif text-ink max-w-prose mb-8 whitespace-pre-wrap leading-relaxed">
            {system.caseStudyBody}
          </div>
        ) : (
          <p className="font-serif text-slate max-w-prose mb-8 leading-relaxed">{system.description}</p>
        )}

        {system.impacts.length > 0 && (
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 border-t border-slate/20 pt-6">
            {system.impacts.map((impact) => (
              <div key={impact.label}>
                <dt className="font-mono text-xs text-slate">{impact.label}</dt>
                <dd className="font-sans font-semibold text-2xl text-accent">{impact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {system.testimonials.length > 0 && (
          <div className="space-y-6 mb-8 border-t border-slate/20 pt-6">
            {system.testimonials.map((testimonial, i) => (
              <blockquote key={i} className="font-serif text-ink">
                <p className="mb-2 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                <cite className="font-mono text-xs text-slate not-italic">
                  {testimonial.authorName}
                  {testimonial.authorRole && `, ${testimonial.authorRole}`}
                  {testimonial.organization && ` — ${testimonial.organization}`}
                </cite>
              </blockquote>
            ))}
          </div>
        )}

        {(system.repoUrl || system.liveUrl) && (
          <div className="flex gap-4 mb-8 font-mono text-sm">
            {system.repoUrl && (
              <a href={system.repoUrl} className="text-accent underline underline-offset-2">
                Repository
              </a>
            )}
            {system.liveUrl && (
              <a href={system.liveUrl} className="text-accent underline underline-offset-2">
                Live
              </a>
            )}
          </div>
        )}
      </MarginAnnotations>

      {relatedSystems.length > 0 && (
        <div className="border-t border-slate/20 pt-6 mt-8">
          <h2 className="font-mono text-xs text-slate mb-4">More systems</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedSystems.map((related) => (
              <SystemCard
                key={related.id}
                slug={related.slug}
                name={related.name}
                description={related.description}
                status={{ label: related.status, colorToken: related.statusColorToken }}
                isFlagship={related.isFlagship}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
