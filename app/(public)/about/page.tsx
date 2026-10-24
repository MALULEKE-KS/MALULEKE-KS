// app/(public)/about/page.tsx
// /about — the person, and how he builds. Built to the showcase level (owner,
// 2026-10-03: "never said remove the good cards, components, structure … at
// the highest level"), with a clear structure so it never gets noisy:
//   1. Hero — the shape every inner page shares (D-046): a plain label, his
//      name and headline, his titles, the first sentence of his own
//      introduction; Let's talk and his CV; his portrait beside it from a laptop
//      up; then the record as one hairline row of live figures (years building,
//      published systems, proven skills, companies) — every number computed.
//   2. In my own words (premium pass, D-051) — on a phone his portrait first;
//      the rest of his introduction, word for word, on a Magic Card, beside one
//      fact sheet of ruled rows (based in, building since, studying, each
//      company with its published systems) — no icon tiles.
//   3. Method (#method) — the mission as a pull quote, then each principle a
//      full-width row-card on graphite (number, name and its line; the full
//      text and its evidence), the first carrying a border beam.
//   4. Skills (#skills) — the skills published systems prove, orbiting the K-S
//      mark (Magic UI Orbiting Circles), beside a card per category: proven
//      skills as rows with their mark and count (linked to the systems), the
//      rest one quiet line; on a phone each category opens in place.
//   5. Close — his AI guide's invitation and the way to reach him.
// Every word is data (profile, page-copy, how-i-build, evidence); his
// organisations live in the footer, not repeated here.

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeroBackdrop } from "@/components/shared/PageHeroBackdrop";
import { ArrowRight, ChevronDown, FileText } from "lucide-react";
import { HeroFigures, HeroLabel, type HeroFigure } from "@/components/shared/HeroKit";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { Accent } from "@/components/shared/Accent";
import { Evidence } from "@/components/shared/Evidence";
import { JsonLd } from "@/components/shared/JsonLd";
import { MagicCard } from "@/components/ui/magic-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { GuideInvite } from "@/components/about/GuideInvite";
import { SkillOrbit } from "@/components/about/SkillOrbit";
import { SkillIcon } from "@/components/about/skill-icons";
import { SkillCategory } from "@/components/about/SkillCategory";
import { getSiteProfile } from "@/lib/queries/site";
import { getPublicHomes, getPublicPhotos, getPublicTitles } from "@/lib/queries/profile";
import { getSkillEvidence } from "@/lib/queries/evidence";
import { countPublishedSystems } from "@/lib/queries/homepage";
import { getContentBlock } from "@/lib/content/blocks";
import { claimsFor, getEvidence } from "@/lib/evidence";
import { getUploadedCvLink } from "@/lib/cv/options";
import { splitBio } from "@/lib/profile/bio";
import { dbPublic } from "@/lib/db";
import { personLd } from "@/lib/seo/person";
import { siteUrl } from "@/lib/site-url";
import { sectionCopy } from "@/lib/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";

// Rendered ahead and refreshed by the (public) layout's cache (D-062).
// The description is the opening of his own introduction (data), never typed here.
export async function generateMetadata() {
  const row = await dbPublic.publicProfile.findFirst({ select: { bio: true, summary: true } });
  const opening = (row?.summary ?? row?.bio ?? "").split(/\n\s*\n/)[0]?.trim();
  return pageMetadata({ title: "About", description: opening ?? null, path: "/about", imageAlt: "About — MALULEKE-KS", type: "profile" });
}

const ACCENT = "type-accent text-ember-gradient pr-[0.06em]";

export default async function AboutPage() {
  const [profile, titles, photos, homes, row, method, evidence, skills, categories, guide, cv, published] = await Promise.all([
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
    countPublishedSystems(),
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
  // The hero keeps his first sentence; the rest of his words open the story below (D-046).
  const { lead, story } = splitBio(row?.bio);
  // The owner's uploaded About photo wins (BR-1.17); until there is one, the portrait he approved.
  const photo = photos.about ?? { url: "/character/about-portrait.webp", alt: `Portrait of ${profile.name}`, width: 900, height: 1207 };
  const companies = homes.filter((h) => h.kind !== "personal" && h.role);
  const study = titles.find((t) => t.kind === "qualification");
  // The headline already says the first title; the rest sit under the name.
  const otherTitles = titles.filter((t) => t.label !== profile.headline);

  // Bento facts — each from data; a missing fact is simply not shown.
  const facts = [
    profile.location && { label: "Based in", value: profile.location, note: null },
    row?.buildingSinceYear && { label: "Building since", value: String(row.buildingSinceYear), note: null },
    study && { label: "Studying", value: study.label, note: study.detail },
    ...companies.map((c) => ({ label: c.role!, value: c.name, note: `${c.publishedSystems} published ${c.publishedSystems === 1 ? "system" : "systems"}` })),
  ].filter((f): f is { label: string; value: string; note: string | null } => Boolean(f));

  // Skills by category, the strongest evidence first — no typed-in order (D-012).
  const provenSkills = skills.filter((s) => s.systemCount > 0).sort((a, b) => b.systemCount - a.systemCount || a.name.localeCompare(b.name));
  const total = (list: typeof skills) => list.reduce((n, s) => n + s.systemCount, 0);
  const groups = categories
    .map((c) => ({
      key: c.key,
      label: c.label,
      skills: skills.filter((s) => s.categoryKey === c.key).sort((a, b) => b.systemCount - a.systemCount || a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.skills.length > 0)
    .sort((a, b) => total(b.skills) - total(a.skills) || a.label.localeCompare(b.label));

  // Live counters — computed, never typed.
  const thisYear = new Date().getUTCFullYear();
  const counters = [
    row?.buildingSinceYear && { value: Math.max(1, thisYear - row.buildingSinceYear), label: "years building" },
    { value: published, label: "published systems" },
    { value: provenSkills.length, label: "technologies used in published work" },
    { value: companies.length, label: companies.length === 1 ? "company" : "companies" },
  ].filter((c): c is HeroFigure => Boolean(c) && (c as HeroFigure).value > 0); // a zero is an absence, not a figure

  // Structured data: this page is his profile (#101) — the same facts it shows.
  const profileLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteUrl()}/about`,
    mainEntity: personLd(profile, siteUrl(), { organisations: companies, image: photo.url, knowsAbout: provenSkills.map((s) => s.name) }),
  };

  return (
    <>
      <JsonLd data={profileLd} />

      {/* ─── 1. Hero — the shared shape (D-046): label, name, his headline, his first sentence, the record ─── */}
      <section aria-labelledby="about-title" className="hero-field text-paper relative isolate overflow-hidden">
        <PageHeroBackdrop purpose="hero-about" mobilePurpose="hero-about-mobile" />
        <Container className="relative pt-28 pb-14 md:pt-32 md:pb-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="min-w-0 lg:col-span-7">
              <HeroLabel className="rise-in">About</HeroLabel>
              <h1 id="about-title" className="type-display rise-in mt-6" style={{ "--rise-delay": "80ms" } as React.CSSProperties}>
                {profile.name}
              </h1>
              {profile.headline && (
                <p className="rise-in mt-3 font-serif text-2xl italic md:text-3xl" style={{ "--rise-delay": "140ms" } as React.CSSProperties}>
                  <Accent text={`*${profile.headline}*`} className={ACCENT} />
                </p>
              )}
              {otherTitles.length > 0 && (
                <ul aria-label="Current titles" className="text-mist rise-in mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm" style={{ "--rise-delay": "200ms" } as React.CSSProperties}>
                  {otherTitles.map((t) => (
                    <li key={`${t.kind}:${t.label}`}>
                      <span aria-hidden="true" className="bg-ember mr-2 inline-block size-1 -translate-y-0.5 rounded-full" />
                      <span className="text-paper">{t.label}</span>
                      {t.detail && <span> · {t.detail}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {lead && (
                <p className="type-lede text-paper/85 rise-in mt-6 max-w-xl" style={{ "--rise-delay": "260ms" } as React.CSSProperties}>
                  {lead}
                </p>
              )}
              <div className="rise-in mt-8 flex flex-col gap-3 sm:flex-row" style={{ "--rise-delay": "320ms" } as React.CSSProperties}>
                <Link href="/contact" className={buttonVariants({ variant: "accent", size: "lg" })}>
                  Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                {cv && (
                  <a href={cv.url} className={buttonVariants({ variant: "glass", size: "lg" })}>
                    <FileText aria-hidden="true" className="size-4" /> Get my CV
                  </a>
                )}
              </div>
            </div>

            {/* The portrait sits beside the words from a laptop up; on a phone it opens the story instead, so the hero stays one screen.
                Lazy, not preloaded (D-062): hidden on a phone, so a phone never fetches it; on a laptop it is on screen and loads at once. */}
            <figure className="rise-in hidden w-full max-w-md justify-self-end lg:col-span-5 lg:block" style={{ "--rise-delay": "120ms" } as React.CSSProperties}>
              <Image src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} unoptimized loading="lazy" className="h-auto w-full rounded-3xl border border-white/10 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.9)]" />
            </figure>
          </div>

          <HeroFigures figures={counters} className="rise-in mt-12 md:mt-16" style={{ "--rise-delay": "360ms" } as React.CSSProperties} />
        </Container>
      </section>

      {/* ─── 2. In my own words — the story beside one fact sheet (D-051) ─── */}
      {(story.length > 0 || facts.length > 0) && (
        <section aria-labelledby="story-title" className="bg-paper relative py-20 md:py-28">
          <Container className="relative">
            <HeroLabel tone="light">
              <span id="story-title">{storyCopy.eyebrow}</span>
            </HeroLabel>
            <Image src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} unoptimized className="shadow-soft mt-6 h-auto w-full max-w-xs rounded-3xl border border-black/10 lg:hidden" />
            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
              {story.length > 0 && (
                <Reveal className="lg:col-span-7">
                  <MagicCard className="shadow-soft h-full rounded-3xl" surface="var(--color-sheet)" rest="rgb(11 12 14 / 0.1)" spotlight="rgb(255 91 31 / 0.06)" gradientSize={360}>
                    <article className="space-y-5 p-7 md:p-10">
                      {story.map((p, i) => (
                        <p key={i} className={i === 0 ? "text-ink font-serif text-xl leading-snug md:text-2xl md:leading-snug" : "text-ink/80 font-serif text-lg leading-relaxed"}>
                          {p}
                        </p>
                      ))}
                    </article>
                  </MagicCard>
                </Reveal>
              )}
              {facts.length > 0 && (
                <Reveal delay={80} className={story.length > 0 ? "lg:col-span-5" : "lg:col-span-12"}>
                  <MagicCard className="shadow-soft h-full rounded-3xl" surface="var(--color-sheet)" rest="rgb(11 12 14 / 0.1)" spotlight="rgb(255 91 31 / 0.06)" gradientSize={300}>
                    <dl className="divide-ink/10 flex h-full flex-col justify-center divide-y px-7 py-3 md:px-8">
                      {facts.map((f) => (
                        <div key={`${f.label}:${f.value}`} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
                          <dt className="text-slate pt-0.5 font-mono text-xs">{f.label}</dt>
                          <dd className="min-w-0">
                            <span className="text-ink block font-sans text-[17px] leading-snug font-semibold">{f.value}</span>
                            {f.note && <span className="text-slate mt-0.5 block text-sm">{f.note}</span>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </MagicCard>
                </Reveal>
              )}
            </div>
          </Container>
        </section>
      )}

      {/* ─── 3. Method ─── */}
      {method && (
        <section id="method" aria-labelledby="method-title" className="bg-night-deep text-paper relative scroll-mt-20 overflow-hidden py-20 md:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_24rem_at_15%_0%,rgb(255_91_31/0.14),transparent_70%)]" />
          <Container className="relative">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
              <div className="min-w-0 lg:col-span-5">
                <HeroLabel>{methodCopy.eyebrow}</HeroLabel>
                <h2 id="method-title" className="type-h2 mt-5">
                  <Accent text={methodCopy.title ?? ""} className={ACCENT} />
                </h2>
              </div>
              <blockquote className="border-ember min-w-0 border-l-2 pl-5 lg:col-span-7">
                <p className="text-paper/90 font-serif text-xl leading-snug italic md:text-2xl">&ldquo;{method.mission}&rdquo;</p>
              </blockquote>
            </div>
            {/* Each principle a full row, so the grid never leaves a hole (D-051). */}
            <ol className="mt-12 grid grid-cols-1 gap-4">
              {method.principles.map((p, i) => {
                const claims = claimsFor(evidence.claims, `principle:${p.name}`);
                return (
                  <li key={p.name}>
                    <Reveal delay={i * 70} className="h-full">
                      <MagicCard className="relative h-full rounded-3xl" surface="rgb(16 18 22 / 0.94)" gradientSize={300}>
                        {i === 0 && <BorderBeam size={180} duration={10} colorFrom="#FF5B1F" colorTo="#FFB547" />}
                        <div className="grid grid-cols-1 gap-x-10 gap-y-3 p-6 md:p-8 lg:grid-cols-12">
                          <div className="min-w-0 lg:col-span-5">
                            <span className="text-ember font-mono text-sm">{String(i + 1).padStart(2, "0")}</span>
                            <h3 className="mt-2 font-sans text-xl font-semibold tracking-tight md:text-2xl">{p.name}</h3>
                            <p className="text-ember/90 mt-1.5 font-serif text-[17px] italic">{p.summary}</p>
                          </div>
                          <div className="min-w-0 lg:col-span-7 lg:pt-7">
                            <p className="text-mist leading-relaxed md:text-[17px]">{p.body}</p>
                            {claims.length > 0 && <Evidence claims={claims} label={p.name} commit={evidence.source.commit} className="mt-5" />}
                          </div>
                        </div>
                      </MagicCard>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </Container>
        </section>
      )}

      {/* ─── 4. Skills — the orbit and the proof ─── */}
      {groups.length > 0 && (
        <section id="skills" aria-labelledby="skills-title" className="bg-paper scroll-mt-20 overflow-hidden py-20 md:py-28">
          <Container>
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-5">
                <HeroLabel tone="light">{skillsCopy.eyebrow}</HeroLabel>
                <h2 id="skills-title" className="type-h2 text-ink mt-5">
                  <Accent text={skillsCopy.title ?? ""} className={ACCENT} />
                </h2>
                {skillsCopy.description && <p className="text-slate mt-5 max-w-md leading-relaxed">{skillsCopy.description}</p>}
              </div>
              <div className="min-w-0 lg:col-span-7">
                <SkillOrbit skills={provenSkills.map((s) => ({ name: s.name, count: s.systemCount }))} />
              </div>
            </div>
            {/* Masonry columns: each category at its own height, so a long list never leaves its neighbours with empty cards (D-051). */}
            <div className="mt-12 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
              {groups.map((g, gi) => {
                const proven = g.skills.filter((s) => s.systemCount > 0);
                const rest = g.skills.filter((s) => s.systemCount === 0);
                return (
                  <Reveal key={g.key} delay={gi * 60}>
                    <MagicCard className="shadow-soft rounded-3xl" surface="var(--color-sheet)" rest="rgb(11 12 14 / 0.1)" spotlight="rgb(255 91 31 / 0.06)" gradientSize={260}>
                      {/* A phone: each category opens in place, the two strongest open (D-051). Wider: always open. */}
                      <SkillCategory
                        openOnPhone={gi < 2}
                        summary={
                          <summary className="press flex min-h-14 cursor-pointer list-none items-baseline justify-between gap-3 px-6 pt-5 pb-4 md:pointer-events-none md:cursor-default [&::-webkit-details-marker]:hidden">
                            <h3 className="text-ink font-sans text-base font-semibold">{g.label}</h3>
                            <span className="text-slate flex items-center gap-2 font-mono text-xs">
                              {proven.length}/{g.skills.length} proven
                              <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-300 group-open/s:rotate-180 md:hidden" />
                            </span>
                          </summary>
                        }
                      >
                        <div className="px-6 pb-6">
                          {proven.length > 0 && (
                            <ul className="border-ink/10 divide-ink/10 divide-y border-t">
                              {proven.map((s) => (
                                <li key={s.skillId}>
                                  <Link
                                    href={`/systems?tech=${encodeURIComponent(s.name)}`}
                                    aria-label={`${s.name} — used in ${s.systemCount} published system${s.systemCount === 1 ? "" : "s"}`}
                                    className="group/k press text-ink focus-visible:outline-ember flex min-h-11 items-center gap-3 py-2 text-[15px] focus-visible:outline-2 focus-visible:-outline-offset-2"
                                  >
                                    <SkillIcon name={s.name} className="size-4 shrink-0" />
                                    <span className="group-hover/k:text-accent min-w-0 flex-1 transition-colors">{s.name}</span>
                                    <span className="text-slate font-mono text-xs tabular-nums">
                                      {s.systemCount} {s.systemCount === 1 ? "system" : "systems"}
                                    </span>
                                    <ArrowRight aria-hidden="true" className="text-slate group-hover/k:text-accent size-3.5 shrink-0 transition-[transform,color] group-hover/k:translate-x-0.5" />
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                          {rest.length > 0 && (
                            <p className="text-slate mt-3 text-sm leading-relaxed">
                              <span className="text-ink/70 font-medium">Also: </span>
                              {rest.map((s) => s.name).join(", ")}
                            </p>
                          )}
                        </div>
                      </SkillCategory>
                    </MagicCard>
                  </Reveal>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {/* ─── 5. Close ─── */}
      <section aria-labelledby="close-title" className="hero-field text-paper py-20 md:py-28">
        <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-6">
            <h2 id="close-title" className="type-h2">
              <Accent text={closeCopy.title ?? ""} className={ACCENT} />
            </h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className={buttonVariants({ variant: "accent", size: "lg" })}>
                Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/journey" className={buttonVariants({ variant: "glass", size: "lg" })}>
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
