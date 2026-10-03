// app/(public)/about/page.tsx
// /about — the person, and how he builds. Built to the showcase level (owner,
// 2026-10-03: "never said remove the good cards, components, structure … at
// the highest level"), with a clear structure so it never gets noisy:
//   1. Hero — his portrait in a lit frame with a shine border; name, headline,
//      titles, the opening of his own introduction; Let's talk and his CV; four
//      live counters (years building, published systems, proven skills,
//      companies) — every number computed.
//   2. In my own words — a bento grid: his story, then a card per fact (based
//      in, building since, studying, each company), spotlight on hover.
//   3. Method (#method) — the mission as a pull quote, then the principles as
//      spotlight cards on graphite, the first carrying a border beam, each
//      opening its evidence.
//   4. Skills (#skills) — the skills published systems prove, orbiting the K-S
//      mark (Magic UI Orbiting Circles), beside a card per category: proven
//      skills with their mark and count (linked to the systems), the rest listed.
//   5. Close — his AI guide's invitation and the way to reach him.
// Every word is data (profile, page-copy, how-i-build, evidence); his
// organisations live in the footer, not repeated here.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, FileText, GraduationCap, MapPin, Rocket, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { Accent } from "@/components/shared/Accent";
import { Evidence } from "@/components/shared/Evidence";
import { JsonLd } from "@/components/shared/JsonLd";
import { MagicCard } from "@/components/ui/magic-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { ShineBorder } from "@/components/ui/shine-border";
import { NumberTicker } from "@/components/ui/number-ticker";
import { DotPattern } from "@/components/ui/dot-pattern";
import { GuideInvite } from "@/components/about/GuideInvite";
import { SkillOrbit } from "@/components/about/SkillOrbit";
import { SkillIcon } from "@/components/about/skill-icons";
import { getSiteProfile } from "@/lib/queries/site";
import { getPublicHomes, getPublicPhotos, getPublicTitles } from "@/lib/queries/profile";
import { getSkillEvidence } from "@/lib/queries/evidence";
import { countPublishedSystems } from "@/lib/queries/homepage";
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

const ACCENT = "type-accent text-ember-gradient pr-[0.06em]";

// The bento's column spans on a six-column grid: the first two facts sit beside
// the story; the rest fill whole rows — threes, then pairs for what is left —
// so however many facts the data holds, no row ends in a gap.
const SPAN = { 2: "md:col-span-2", 3: "md:col-span-3", 6: "md:col-span-6" } as const;
function factSpan(i: number, count: number, besideStory: boolean): string {
  const lead = besideStory ? Math.min(2, count) : 0;
  if (i < lead) return SPAN[2];
  const n = count - lead;
  const k = i - lead;
  if (n === 1) return SPAN[6];
  // Pairs cover the tail when threes would leave one or two over.
  const pairs = n % 3 === 0 ? 0 : n % 3 === 2 ? 2 : 4;
  return k >= n - pairs ? SPAN[3] : SPAN[2];
}

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
  const paragraphs = (row?.bio ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const [opening, ...story] = paragraphs;
  // The owner's uploaded About photo wins (BR-1.17); until there is one, the portrait he approved.
  const photo = photos.about ?? { url: "/character/about-portrait.webp", alt: `Portrait of ${profile.name}`, width: 900, height: 1207 };
  const companies = homes.filter((h) => h.kind !== "personal" && h.role);
  const study = titles.find((t) => t.kind === "qualification");
  // The headline already says the first title; the rest sit under the name.
  const otherTitles = titles.filter((t) => t.label !== profile.headline);

  // Bento facts — each from data; a missing fact is simply not shown.
  const facts = [
    profile.location && { icon: MapPin, label: "Based in", value: profile.location, note: null },
    row?.buildingSinceYear && { icon: CalendarDays, label: "Building since", value: String(row.buildingSinceYear), note: null },
    study && { icon: GraduationCap, label: "Studying", value: study.label, note: study.detail },
    ...companies.map((c) => ({ icon: Building2, label: c.role!, value: c.name, note: `${c.publishedSystems} published ${c.publishedSystems === 1 ? "system" : "systems"}` })),
  ].filter((f): f is { icon: LucideIcon; label: string; value: string; note: string | null } => Boolean(f));

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
    { value: provenSkills.length, label: "skills proven in code" },
    companies.length > 0 && { value: companies.length, label: companies.length === 1 ? "company" : "companies" },
  ].filter((c): c is { value: number; label: string } => Boolean(c));

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

      {/* ─── 1. Hero ─── */}
      <section aria-labelledby="about-title" className="hero-field text-paper relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-15%] size-[48rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.16),transparent)]" />
        <Container className="relative grid grid-cols-1 items-center gap-12 pt-28 pb-16 md:pt-32 lg:grid-cols-12 lg:gap-14 lg:pb-24">
          <div className="min-w-0 lg:col-span-7">
            <p className="text-mist rise-in inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="bg-ember size-1.5 rounded-full" /> About
            </p>
            <h1 id="about-title" className="type-display rise-in mt-6" style={{ "--rise-delay": "80ms" } as React.CSSProperties}>
              {profile.name}
            </h1>
            {profile.headline && (
              <p className="rise-in mt-3 font-serif text-2xl italic md:text-3xl" style={{ "--rise-delay": "140ms" } as React.CSSProperties}>
                <Accent text={`*${profile.headline}*`} className={ACCENT} />
              </p>
            )}
            {otherTitles.length > 0 && (
              <ul aria-label="Current titles" className="rise-in mt-6 flex flex-wrap gap-2" style={{ "--rise-delay": "200ms" } as React.CSSProperties}>
                {otherTitles.map((t) => (
                  <li key={`${t.kind}:${t.label}`} className="text-mist rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm">
                    <span className="text-paper">{t.label}</span>
                    {t.detail && <span> · {t.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
            {opening && (
              <p className="type-lede text-paper/85 rise-in mt-7 max-w-xl" style={{ "--rise-delay": "260ms" } as React.CSSProperties}>
                {opening}
              </p>
            )}
            <div className="rise-in mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--rise-delay": "320ms" } as React.CSSProperties}>
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

          <figure className="rise-in mx-auto w-full max-w-sm lg:col-span-5 lg:max-w-md" style={{ "--rise-delay": "120ms" } as React.CSSProperties}>
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-x-[6%] -bottom-6 top-[10%] rounded-[3rem] bg-[radial-gradient(closest-side,rgb(255_91_31/0.4),transparent)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-2 shadow-[0_50px_100px_-40px_rgb(0_0_0/0.9)] backdrop-blur">
                <ShineBorder borderWidth={1.5} duration={14} />
                <Image src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} unoptimized priority className="h-auto w-full rounded-[1.6rem]" />
              </div>
            </div>
          </figure>
        </Container>

        {counters.length > 0 && (
          <Container className="relative pb-16 md:pb-20">
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {counters.map((c, i) => (
                <div key={c.label} className="rise-in rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md" style={{ "--rise-delay": `${360 + i * 70}ms` } as React.CSSProperties}>
                  <dd className="type-data text-paper text-4xl font-semibold tracking-tight md:text-5xl">
                    <NumberTicker value={c.value} />
                  </dd>
                  <dt className="text-mist mt-1 text-sm">{c.label}</dt>
                </div>
              ))}
            </dl>
          </Container>
        )}
      </section>

      {/* ─── 2. In my own words — a bento ─── */}
      {(story.length > 0 || facts.length > 0) && (
        <section aria-labelledby="story-title" className="bg-paper relative py-20 md:py-28">
          <DotPattern width={22} height={22} cr={1} className="pointer-events-none absolute inset-x-0 top-0 h-72 fill-[rgb(11_12_14/0.07)] [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
          <Container className="relative">
            <p id="story-title" className="type-eyebrow text-slate">
              {storyCopy.eyebrow}
            </p>
            <div className="mt-8 grid auto-rows-auto grid-cols-1 gap-4 md:grid-cols-6">
              {story.length > 0 && (
                <Reveal className="md:col-span-4 md:row-span-2">
                  <MagicCard className="h-full rounded-3xl shadow-soft" surface="var(--color-sheet)" rest="rgb(11 12 14 / 0.1)" spotlight="rgb(255 91 31 / 0.06)" gradientSize={360}>
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
              {facts.map((f, i) => (
                <Reveal key={`${f.label}:${f.value}`} delay={i * 70} className={factSpan(i, facts.length, story.length > 0)}>
                  <MagicCard className="h-full rounded-3xl shadow-soft" surface="var(--color-sheet)" rest="rgb(11 12 14 / 0.1)" spotlight="rgb(255 91 31 / 0.06)" gradientSize={260}>
                    <div className="flex h-full items-start gap-4 p-6">
                      <span className="bg-ink text-paper grid size-11 shrink-0 place-items-center rounded-2xl">
                        <f.icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="text-slate block text-xs font-medium tracking-wide uppercase">{f.label}</span>
                        <span className="text-ink mt-1 block font-sans text-lg font-semibold leading-snug">{f.value}</span>
                        {f.note && <span className="text-slate mt-1 block text-sm">{f.note}</span>}
                      </span>
                    </div>
                  </MagicCard>
                </Reveal>
              ))}
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
                <p className="text-mist inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                  <Rocket aria-hidden="true" className="text-ember size-3.5" /> {methodCopy.eyebrow}
                </p>
                <h2 id="method-title" className="type-h2 mt-4">
                  <Accent text={methodCopy.title ?? ""} className={ACCENT} />
                </h2>
              </div>
              <blockquote className="border-ember min-w-0 border-l-2 pl-5 lg:col-span-7">
                <p className="text-paper/90 font-serif text-xl leading-snug italic md:text-2xl">&ldquo;{method.mission}&rdquo;</p>
              </blockquote>
            </div>
            <ol className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {method.principles.map((p, i) => {
                const claims = claimsFor(evidence.claims, `principle:${p.name}`);
                return (
                  <li key={p.name} className={i === 0 ? "md:col-span-2 lg:col-span-2" : undefined}>
                    <Reveal delay={i * 70} className="h-full">
                      <MagicCard className="relative h-full rounded-3xl" surface="rgb(16 18 22 / 0.94)" gradientSize={240}>
                        {i === 0 && <BorderBeam size={160} duration={10} colorFrom="#FF5B1F" colorTo="#FFB547" />}
                        <div className="flex h-full flex-col p-6 md:p-7">
                          <span className="text-ember font-mono text-sm">{String(i + 1).padStart(2, "0")}</span>
                          <h3 className="mt-3 font-sans text-xl font-semibold tracking-tight">{p.name}</h3>
                          <p className="text-ember/90 mt-1 font-serif italic">{p.summary}</p>
                          <p className="text-mist mt-3 leading-relaxed">{p.body}</p>
                          {claims.length > 0 && <Evidence claims={claims} label={p.name} commit={evidence.source.commit} className="mt-5 self-start" />}
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
                <p className="type-eyebrow text-slate">{skillsCopy.eyebrow}</p>
                <h2 id="skills-title" className="type-h2 text-ink mt-4">
                  <Accent text={skillsCopy.title ?? ""} className={ACCENT} />
                </h2>
                {skillsCopy.description && <p className="text-slate mt-5 max-w-md leading-relaxed">{skillsCopy.description}</p>}
              </div>
              <div className="min-w-0 lg:col-span-7">
                <SkillOrbit skills={provenSkills.map((s) => ({ name: s.name, count: s.systemCount }))} />
              </div>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((g, gi) => (
                <Reveal key={g.key} delay={gi * 60} className="h-full">
                  <MagicCard className="h-full rounded-3xl shadow-soft" surface="var(--color-sheet)" rest="rgb(11 12 14 / 0.1)" spotlight="rgb(255 91 31 / 0.06)" gradientSize={260}>
                    <div className="p-6">
                      <h3 className="text-ink flex items-baseline justify-between gap-3 font-sans text-base font-semibold">
                        {g.label}
                        <span className="text-slate font-mono text-xs font-normal">{g.skills.filter((s) => s.systemCount > 0).length}/{g.skills.length} proven</span>
                      </h3>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {g.skills.map((s) => (
                          <li key={s.skillId}>
                            {s.systemCount > 0 ? (
                              <Link
                                href={`/systems?tech=${encodeURIComponent(s.name)}`}
                                aria-label={`${s.name} — used in ${s.systemCount} published system${s.systemCount === 1 ? "" : "s"}`}
                                className="border-ink/15 bg-paper text-ink hover:border-ember/50 focus-visible:outline-ember inline-flex items-center gap-2 rounded-full border py-1 pr-1 pl-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                              >
                                <SkillIcon name={s.name} className="size-3.5" />
                                {s.name}
                                <span aria-hidden="true" className="bg-ember/15 text-accent rounded-full px-1.5 font-mono text-[11px]">
                                  {s.systemCount}
                                </span>
                              </Link>
                            ) : (
                              <span className="border-ink/10 text-slate inline-flex items-center rounded-full border border-dashed px-2.5 py-1 text-sm">{s.name}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </MagicCard>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ─── 5. Close ─── */}
      <section aria-labelledby="close-title" className="hero-field text-paper py-20 md:py-24">
        <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-6">
            <h2 id="close-title" className="type-h2">
              <Accent text={closeCopy.title ?? ""} className={ACCENT} />
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
