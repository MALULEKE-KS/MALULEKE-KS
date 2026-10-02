// app/(public)/about/page.tsx
// /about — the person, and how he builds. Redesigned 2026-10-02 (owner: the
// first version was "overcrowded … noisy … not professional"): an editorial
// page with five calm sections, hairlines instead of boxes, one accent, and
// nothing that repeats another place on the site:
//   1. Hero — his portrait in a plain frame; name, headline, his titles, the
//      opening of his own introduction; Let's talk and his CV.
//   2. Story — the rest of his introduction as a reading column, with one
//      slim row of facts (based in, building since, studying, companies).
//   3. Method (#method) — the mission as a pull quote beside the principles,
//      numbered, each opening its evidence.
//   4. Skills (#skills) — one list per category; a skill proven by published
//      systems links to them with its count, the rest are listed plainly.
//   5. Close — his AI guide's invitation and the way to reach him.
// His organisations live in the footer ("Where the code lives") and his
// company roles in the facts row — not repeated here. Every word is data.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { Accent } from "@/components/shared/Accent";
import { Evidence } from "@/components/shared/Evidence";
import { JsonLd } from "@/components/shared/JsonLd";
import { GuideInvite } from "@/components/about/GuideInvite";
import { getSiteProfile } from "@/lib/queries/site";
import { getPublicHomes, getPublicPhotos, getPublicTitles } from "@/lib/queries/profile";
import { getSkillEvidence } from "@/lib/queries/evidence";
import { getContentBlock } from "@/lib/content/blocks";
import { claimsFor, getEvidence } from "@/lib/evidence";
import { getUploadedCvLink } from "@/lib/cv/options";
import { dbPublic } from "@/lib/db";
import { personLd } from "@/lib/seo/person";
import { siteUrl } from "@/lib/site-url";
import { sectionCopy } from "@/lib/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
// The description is the opening of his own introduction (data), never typed here.
export async function generateMetadata() {
  const row = await dbPublic.publicProfile.findFirst({ select: { bio: true, summary: true } });
  const opening = (row?.summary ?? row?.bio ?? "").split(/\n\s*\n/)[0]?.trim();
  return pageMetadata({ title: "About", description: opening ?? null, path: "/about", imageAlt: "About — MALULEKE-KS", type: "profile" });
}

export default async function AboutPage() {
  const [profile, titles, photos, homes, row, method, evidence, skills, categories, guide, cv] = await Promise.all([
    getSiteProfile(),
    getPublicTitles(),
    getPublicPhotos(),
    getPublicHomes(),
    dbPublic.publicProfile.findFirst({ select: { bio: true, buildingSinceYear: true } }),
    getContentBlock("how-i-build"),
    getEvidence(),
    getSkillEvidence(),
    dbPublic.skillCategory.findMany({ where: { active: true }, select: { key: true, label: true } }),
    getContentBlock("ai-guide"),
    getUploadedCvLink(),
  ]);
  // Section headings are data (the page-copy block); these are the fallbacks.
  const [storyCopy, methodCopy, skillsCopy, closeCopy] = await Promise.all([
    sectionCopy("about.story", { eyebrow: "In my own words" }),
    sectionCopy("about.method", { eyebrow: "How I build", title: "The *method.*" }),
    sectionCopy("about.skills", {
      eyebrow: "What I work with",
      title: "Skills, *with proof.*",
      description: "A number shows how many published systems use a skill — open it to see them. The rest are part of his toolkit, not yet in a published system.",
    }),
    sectionCopy("about.close", { title: "Let's build *something real.*" }),
  ]);
  const paragraphs = (row?.bio ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const [opening, ...story] = paragraphs;
  // The owner's uploaded About photo wins (BR-1.17); until there is one, the portrait he approved.
  const photo = photos.about ?? { url: "/character/about-portrait.webp", alt: `Portrait of ${profile.name}`, width: 900, height: 1207 };
  const companies = homes.filter((h) => h.kind !== "personal" && h.role);
  const study = titles.find((t) => t.kind === "qualification");
  // The headline already says the first title; the rest sit under the name.
  const otherTitles = titles.filter((t) => t.label !== profile.headline);
  const facts = [
    profile.location && { label: "Based in", value: profile.location },
    row?.buildingSinceYear && { label: "Building since", value: String(row.buildingSinceYear) },
    study && { label: "Studying", value: study.detail ? `${study.label}, ${study.detail}` : study.label },
    companies.length > 0 && { label: companies.length === 1 ? "Company" : "Companies", value: companies.map((c) => `${c.name} — ${c.role}`).join("\n") },
  ].filter((f): f is { label: string; value: string } => Boolean(f));

  // Skills by category, the strongest evidence first — categories by how many of their
  // skills published systems prove, skills by how many systems use them. No typed-in order.
  const proven = (list: typeof skills) => list.reduce((n, s) => n + s.systemCount, 0);
  const groups = categories
    .map((c) => ({
      key: c.key,
      label: c.label,
      skills: skills.filter((s) => s.categoryKey === c.key).sort((a, b) => b.systemCount - a.systemCount || a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.skills.length > 0)
    .sort((a, b) => proven(b.skills) - proven(a.skills) || a.label.localeCompare(b.label));

  // Structured data: this page is his profile (#101) — the same facts it shows.
  const profileLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteUrl()}/about`,
    mainEntity: personLd(profile, siteUrl(), { organisations: companies, image: photo.url, knowsAbout: skills.filter((s) => s.systemCount > 0).map((s) => s.name) }),
  };

  return (
    <>
      <JsonLd data={profileLd} />

      {/* ─── 1. Hero ─── */}
      <section aria-labelledby="about-title" className="hero-field text-paper">
        <Container className="grid grid-cols-1 items-center gap-10 pt-28 pb-16 md:pt-32 lg:grid-cols-12 lg:gap-16 lg:pb-24">
          <div className="min-w-0 lg:col-span-7">
            <p className="type-eyebrow text-mist">About</p>
            <h1 id="about-title" className="type-display mt-5">
              {profile.name}
            </h1>
            {profile.headline && (
              <p className="mt-3 font-serif text-2xl italic md:text-3xl">
                <Accent text={`*${profile.headline}*`} className="type-accent text-ember-gradient pr-[0.06em]" />
              </p>
            )}
            {otherTitles.length > 0 && (
              <p className="text-mist mt-5 text-sm">
                {otherTitles.map((t, i) => (
                  <span key={`${t.kind}:${t.label}`}>
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    {t.label}
                    {t.detail && `, ${t.detail}`}
                  </span>
                ))}
              </p>
            )}
            {opening && <p className="type-lede text-paper/85 mt-8 max-w-xl">{opening}</p>}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="bg-ember text-ink shadow-glow-ember focus-visible:outline-paper inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
                Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              {cv && (
                <a href={cv.url} className="text-paper inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 font-medium transition-colors hover:bg-white/10">
                  <FileText aria-hidden="true" className="size-4" /> Get my CV
                </a>
              )}
            </div>
          </div>
          <figure className="mx-auto w-full max-w-sm lg:col-span-5 lg:max-w-md">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.9)]">
              <Image src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} unoptimized priority className="h-auto w-full" />
            </div>
          </figure>
        </Container>
      </section>

      {/* ─── 2. Story and facts ─── */}
      {(story.length > 0 || facts.length > 0) && (
        <section aria-labelledby="story-title" className="bg-paper py-20 md:py-28">
          <Container>
            <h2 id="story-title" className="type-eyebrow text-slate">
              {storyCopy.eyebrow}
            </h2>
            {story.length > 0 && (
              <div className="mt-8 max-w-3xl space-y-6">
                {story.map((p, i) => (
                  <p key={i} className="text-ink/85 font-serif text-xl leading-relaxed md:text-[1.375rem] md:leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            )}
            {facts.length > 0 && (
              <dl className="border-ink/10 mt-14 grid grid-cols-1 gap-y-6 border-t pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
                {facts.map((f) => (
                  <div key={f.label} className="min-w-0">
                    <dt className="text-slate text-xs font-medium tracking-wide uppercase">{f.label}</dt>
                    <dd className="text-ink mt-2 text-sm leading-relaxed whitespace-pre-line">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Container>
        </section>
      )}

      {/* ─── 3. Method ─── */}
      {method && (
        <section id="method" aria-labelledby="method-title" className="border-ink/10 bg-paper scroll-mt-20 border-t py-20 md:py-28">
          <Container className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <p className="type-eyebrow text-slate">{methodCopy.eyebrow}</p>
                <h2 id="method-title" className="type-h2 text-ink mt-4">
                  <Accent text={methodCopy.title ?? ""} className="type-accent text-ember-gradient pr-[0.06em]" />
                </h2>
                <blockquote className="border-ember mt-8 border-l-2 pl-5">
                  <p className="text-ink/80 font-serif text-lg leading-snug italic">&ldquo;{method.mission}&rdquo;</p>
                </blockquote>
              </div>
            </div>
            <ol className="divide-ink/10 border-ink/10 min-w-0 divide-y border-y lg:col-span-8">
              {method.principles.map((p, i) => {
                const claims = claimsFor(evidence.claims, `principle:${p.name}`);
                return (
                  <li key={p.name} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 py-8 sm:grid-cols-[4rem_minmax(0,1fr)]">
                    <span className="text-accent font-mono text-sm">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <h3 className="text-ink font-sans text-xl font-semibold tracking-tight">{p.name}</h3>
                      <p className="text-accent mt-1 font-serif italic">{p.summary}</p>
                      <p className="text-slate mt-3 max-w-2xl leading-relaxed">{p.body}</p>
                      {claims.length > 0 && <Evidence claims={claims} label={p.name} commit={evidence.source.commit} tone="light" className="mt-4" />}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Container>
        </section>
      )}

      {/* ─── 4. Skills ─── */}
      {groups.length > 0 && (
        <section id="skills" aria-labelledby="skills-title" className="bg-sheet scroll-mt-20 py-20 md:py-28">
          <Container className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-4">
              <p className="type-eyebrow text-slate">{skillsCopy.eyebrow}</p>
              <h2 id="skills-title" className="type-h2 text-ink mt-4">
                <Accent text={skillsCopy.title ?? ""} className="type-accent text-ember-gradient pr-[0.06em]" />
              </h2>
              {skillsCopy.description && <p className="text-slate mt-5 max-w-sm leading-relaxed">{skillsCopy.description}</p>}
            </div>
            <dl className="divide-ink/10 border-ink/10 min-w-0 divide-y border-y lg:col-span-8">
              {groups.map((g) => (
                <div key={g.key} className="grid grid-cols-1 gap-3 py-6 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="text-ink text-sm font-semibold">{g.label}</dt>
                  <dd className="flex flex-wrap gap-x-5 gap-y-2.5 text-sm">
                    {g.skills.map((s) =>
                      s.systemCount > 0 ? (
                        <Link
                          key={s.skillId}
                          href={`/systems?tech=${encodeURIComponent(s.name)}`}
                          aria-label={`${s.name} — used in ${s.systemCount} published system${s.systemCount === 1 ? "" : "s"}`}
                          className="text-ink decoration-ember/40 hover:decoration-ember inline-flex items-baseline gap-1 underline underline-offset-4"
                        >
                          {s.name}
                          <sup aria-hidden="true" className="text-accent font-mono text-[10px] no-underline">
                            {s.systemCount}
                          </sup>
                        </Link>
                      ) : (
                        <span key={s.skillId} className="text-slate">
                          {s.name}
                        </span>
                      ),
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Container>
        </section>
      )}

      {/* ─── 5. Close ─── */}
      <section aria-labelledby="close-title" className="hero-field text-paper py-20 md:py-24">
        <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-6">
            <h2 id="close-title" className="type-h2">
              <Accent text={closeCopy.title ?? ""} className="type-accent text-ember-gradient pr-[0.06em]" />
            </h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="bg-ember text-ink shadow-glow-ember inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium">
                Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/journey" className="text-paper inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 font-medium transition-colors hover:bg-white/10">
                The journey
              </Link>
            </div>
          </div>
          <Reveal className="min-w-0 lg:col-span-6">
            <GuideInvite questions={guide?.suggestions ?? []} />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
