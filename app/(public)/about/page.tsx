// app/(public)/about/page.tsx
// /about — the person, and how he builds (owner, 2026-10-02: rebuilt at the
// home page's level; Method lives here now). Every word is data; nothing
// about the owner lives in this file.
//   1. Hero — his portrait large, lit, with glass badges from his titles and
//      organisations on its edges; name, headline, titles, CV and Let's talk.
//   2. In his words — the bio set like a feature, beside the AI guide (the
//      anime character, poses changing) inviting a question about him.
//   3. At a glance — plain facts from the profile.
//   4. Method (#method) — the mission and principles, each opening its proof.
//   5. Skills (#skills) — grouped as on his CV, each with the systems that use it.
//   6. Organisations — role, systems, GitHub.
// The portrait is his uploaded About photo (BR-1.17), else the one he approved.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Blocks, Building2, Compass, FileText, GraduationCap, MapPin, Rocket, Sparkles, Zap, Activity, ShieldCheck, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { Accent } from "@/components/shared/Accent";
import { Evidence } from "@/components/shared/Evidence";
import { MagicCard } from "@/components/ui/magic-card";
import { GuideInvite } from "@/components/about/GuideInvite";
import { getSiteProfile } from "@/lib/queries/site";
import { getPublicHomes, getPublicPhotos, getPublicTitles } from "@/lib/queries/profile";
import { getSkillEvidence } from "@/lib/queries/evidence";
import { getContentBlock } from "@/lib/content/blocks";
import { claimsFor, getEvidence } from "@/lib/evidence";
import { getUploadedCvLink } from "@/lib/cv/options";
import { dbPublic } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "About", description: "The person behind the work — in his own words, how he builds, and what he works with.", alternates: { canonical: "/about" } };

const PRINCIPLE_ICONS: LucideIcon[] = [Rocket, Blocks, Zap, Activity, ShieldCheck];

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
  const paragraphs = (row?.bio ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // The owner's uploaded About photo wins (BR-1.17); until there is one, the portrait he approved.
  const photo = photos.about ?? { url: "/character/about-portrait.webp", alt: `Portrait of ${profile.name}`, width: 900, height: 1207 };
  const organisations = homes.filter((h) => h.kind !== "personal");
  const study = titles.find((t) => t.kind === "qualification");
  // The headline already says the first title; the chips add the rest.
  const chips = titles.filter((t) => t.label !== profile.headline);
  const companies = organisations.filter((o) => o.role);
  const facts = [
    profile.location && { icon: MapPin, label: "Based in", value: profile.location },
    row?.buildingSinceYear && { icon: Rocket, label: "Building since", value: String(row.buildingSinceYear) },
    study && { icon: GraduationCap, label: "Studying", value: study.detail ? `${study.label} · ${study.detail}` : study.label },
    companies.length > 0 && { icon: Building2, label: companies.length === 1 ? "Company" : "Companies", value: companies.map((c) => `${c.name} (${c.role})`).join(" · ") },
  ].filter((f): f is { icon: LucideIcon; label: string; value: string } => Boolean(f));

  // Skills grouped as on his CV, in category order; each group strongest-evidenced first.
  const catLabel = new Map(categories.map((c) => [c.key, c.label]));
  const ORDER = ["languages", "frontend", "backend", "database", "ai-ml", "infra", "testing"];
  const groups = [...new Set(skills.map((s) => s.categoryKey))]
    .sort((a, b) => (ORDER.indexOf(a) + 99) % 99 - (ORDER.indexOf(b) + 99) % 99)
    .map((key) => ({ key, label: catLabel.get(key) ?? key, skills: skills.filter((s) => s.categoryKey === key) }));

  return (
    <>
      {/* ─── 1. Hero ─── */}
      <section aria-labelledby="about-title" className="hero-field text-paper relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 right-[-10%] size-[42rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.16),transparent)]" />
        <Container className="relative grid grid-cols-1 items-center gap-12 pt-28 pb-16 md:pt-32 lg:grid-cols-12 lg:gap-10 lg:pb-24">
          <div className="min-w-0 lg:col-span-7">
            <p className="type-eyebrow text-mist">About</p>
            <h1 id="about-title" className="type-display mt-5">
              {profile.name}
            </h1>
            {profile.headline && (
              <p className="mt-4 font-serif text-2xl italic md:text-3xl">
                <Accent text={`*${profile.headline}*`} className="type-accent text-ember-gradient pr-[0.06em]" />
              </p>
            )}
            {chips.length > 0 && (
              <ul aria-label="Current titles" className="mt-7 flex flex-wrap gap-2">
                {chips.map((t) => (
                  <li key={`${t.kind}:${t.label}`} className="text-mist rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm">
                    <span className="text-paper">{t.label}</span>
                    {t.detail && <span> · {t.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="bg-ember text-ink shadow-glow-ember focus-visible:outline-paper inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
                Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              {cv && (
                <a href={cv.url} className="text-paper inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 font-medium hover:bg-white/10">
                  <FileText aria-hidden="true" className="size-4" /> Get my CV
                </a>
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:col-span-5 lg:max-w-none">
            <div aria-hidden="true" className="absolute inset-x-[8%] -bottom-6 top-[12%] rounded-[3rem] bg-[radial-gradient(closest-side,rgb(255_91_31/0.35),transparent)] blur-2xl" />
            <figure className="relative overflow-hidden rounded-[2rem] border border-white/12 shadow-[0_60px_120px_-40px_rgb(0_0_0/0.9)]">
              <Image src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} unoptimized priority className="h-auto w-full" />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--color-night-deep)]/80 to-transparent" />
            </figure>
            {/* Glass badges from his own titles and organisations — on the frame's edges. */}
            {companies[0]?.role && (
              <p className="text-paper absolute top-[14%] -left-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs shadow-lg backdrop-blur-md sm:-left-6">
                <span className="text-mist block">{companies[0].role}</span>
                <span className="font-semibold">{companies[0].name}</span>
              </p>
            )}
            {study && (
              <p className="text-paper absolute -right-3 bottom-[12%] max-w-[13rem] rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs shadow-lg backdrop-blur-md sm:-right-6">
                <span className="text-mist block">{study.detail ?? "Studying"}</span>
                <span className="font-semibold">{study.label}</span>
              </p>
            )}
          </div>
        </Container>
      </section>

      {/* ─── 2. In his words, beside the guide ─── */}
      <section aria-labelledby="words-title" className="bg-paper py-16 md:py-24">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <h2 id="words-title" className="type-eyebrow text-slate">
              In my own words
            </h2>
            {paragraphs.length > 0 ? (
              <article className="mt-6 space-y-6">
                {paragraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? "text-ink font-serif text-xl leading-snug sm:text-2xl md:text-[1.75rem] md:leading-snug" : "text-ink/80 font-serif text-lg leading-relaxed"}>
                    {p}
                  </p>
                ))}
              </article>
            ) : (
              <p className="text-slate mt-6">The story is being written.</p>
            )}
          </div>
          <div className="min-w-0 space-y-5 lg:col-span-5">
            <Reveal>
              <GuideInvite questions={guide?.suggestions ?? []} />
            </Reveal>
            {facts.length > 0 && (
              <Reveal delay={80}>
                <dl className="grid gap-3">
                  {facts.map((f) => (
                    <div key={f.label} className="border-ink/10 bg-sheet shadow-soft flex items-start gap-3 rounded-2xl border p-4">
                      <span className="bg-ink text-paper grid size-9 shrink-0 place-items-center rounded-xl">
                        <f.icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <dt className="text-slate text-xs">{f.label}</dt>
                        <dd className="text-ink text-sm font-medium">{f.value}</dd>
                      </span>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>
        </Container>
      </section>

      {/* ─── 3. Method ─── */}
      {method && (
        <section id="method" aria-labelledby="method-title" className="bg-night-deep text-paper scroll-mt-20 py-16 md:py-24">
          <Container>
            <p className="text-mist inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
              <Compass aria-hidden="true" className="text-ember size-3.5" /> How I build
            </p>
            <h2 id="method-title" className="type-h2 mt-4 max-w-3xl">
              The <span className="type-accent text-ember-gradient pr-[0.06em]">method.</span>
            </h2>
            <blockquote className="border-ember/60 mt-6 max-w-3xl border-l-2 pl-5">
              <p className="text-paper/90 font-serif text-xl leading-snug italic md:text-2xl">&ldquo;{method.mission}&rdquo;</p>
            </blockquote>
            <ol className="mt-12 grid gap-4 md:grid-cols-2">
              {method.principles.map((p, i) => {
                const Icon = PRINCIPLE_ICONS[i] ?? Blocks;
                const claims = claimsFor(evidence.claims, `principle:${p.name}`);
                return (
                  <li key={p.name} className={i === 0 ? "md:col-span-2" : undefined}>
                    <MagicCard className="h-full rounded-3xl" surface="rgb(16 18 22 / 0.94)" gradientSize={220}>
                      <div className="flex h-full flex-col p-6 md:p-7">
                        <div className="flex items-center gap-3">
                          <span className="bg-ember/12 text-ember grid size-10 place-items-center rounded-xl border border-ember/25">
                            <Icon aria-hidden="true" className="size-5" />
                          </span>
                          <span className="text-line font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                        </div>
                        <h3 className="mt-5 font-sans text-xl font-semibold tracking-tight">{p.name}</h3>
                        <p className="text-ember mt-1 font-serif italic">{p.summary}</p>
                        <p className="text-mist mt-3 leading-relaxed">{p.body}</p>
                        {claims.length > 0 && <Evidence claims={claims} label={p.name} commit={evidence.source.commit} className="mt-5 self-start" />}
                      </div>
                    </MagicCard>
                  </li>
                );
              })}
            </ol>
          </Container>
        </section>
      )}

      {/* ─── 4. Skills ─── */}
      {groups.length > 0 && (
        <section id="skills" aria-labelledby="skills-title" className="bg-paper scroll-mt-20 py-16 md:py-24">
          <Container>
            <p className="type-eyebrow text-slate inline-flex items-center gap-2">
              <Sparkles aria-hidden="true" className="text-accent size-3.5" /> What I work with
            </p>
            <h2 id="skills-title" className="type-h2 text-ink mt-4 max-w-3xl">
              Skills, with <span className="type-accent text-ember-gradient pr-[0.06em]">the work that proves them.</span>
            </h2>
            <p className="text-slate mt-4 max-w-2xl">The number beside a skill counts the published systems built with it.</p>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((g) => (
                <Reveal key={g.key} className="h-full">
                  <div className="border-ink/10 bg-sheet shadow-soft h-full rounded-3xl border p-6">
                    <h3 className="text-ink font-sans text-base font-semibold">{g.label}</h3>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {g.skills.map((s) => (
                        <li
                          key={s.skillId}
                          className={s.systemCount > 0 ? "border-ink/15 bg-paper text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm" : "border-ink/10 text-slate inline-flex items-center rounded-full border px-3 py-1 text-sm"}
                        >
                          {s.name}
                          {s.systemCount > 0 && (
                            <span className="bg-ember/15 text-accent rounded-full px-1.5 font-mono text-[11px]" title={`Used in ${s.systemCount} published system${s.systemCount === 1 ? "" : "s"}`}>
                              {s.systemCount}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ─── 5. Organisations, and the way in ─── */}
      <section aria-labelledby="orgs-title" className="hero-field text-paper py-16 md:py-24">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end">
          <div className="min-w-0 lg:col-span-7">
            {organisations.length > 0 && (
              <>
                <h2 id="orgs-title" className="type-eyebrow text-mist inline-flex items-center gap-2">
                  <Building2 aria-hidden="true" className="text-ember size-3.5" /> Organisations
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {organisations.map((o) => (
                    <li key={o.slug} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                      <p className="flex items-center gap-3">
                        {o.github[0] && (
                          // eslint-disable-next-line @next/next/no-img-element -- a GitHub avatar, already sized by GitHub
                          <img src={`https://avatars.githubusercontent.com/${o.github[0].login}?s=80`} alt="" width={36} height={36} className="size-9 rounded-xl" />
                        )}
                        <span>
                          <span className="block font-semibold">{o.name}</span>
                          {o.role && <span className="text-mist block text-sm">{o.role}</span>}
                        </span>
                      </p>
                      <p className="text-mist mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {o.publishedSystems > 0 && (
                          <Link href="/systems" className="text-ember underline-offset-4 hover:underline">
                            {o.publishedSystems} {o.publishedSystems === 1 ? "system" : "systems"}
                          </Link>
                        )}
                        {o.github[0] && (
                          <a href={o.github[0].url} target="_blank" rel="noopener noreferrer" className="hover:text-paper underline-offset-4 hover:underline">
                            GitHub
                          </a>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="min-w-0 lg:col-span-5">
            <p className="type-h2">
              Let&rsquo;s build <span className="type-accent text-ember-gradient pr-[0.06em]">something real.</span>
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="bg-ember text-ink shadow-glow-ember inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium">
                Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/journey" className="text-paper inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 font-medium hover:bg-white/10">
                The journey
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
