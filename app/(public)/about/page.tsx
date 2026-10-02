// app/(public)/about/page.tsx
// /about — the person behind the work (PAGE-SPECIFICATIONS "/about";
// PAGE-BUILD-PLAYBOOK §9). Its own idea, in the site's family: a portrait
// page. The hero carries the name, headline and every current title
// (ProfileTitle, in the owner's order). Then a frame — the owner's uploaded
// About photo (BR-1.17), otherwise the portrait he approved for this page
// (design/character/about-portrait-graphite.png), never a stock image — with
// a few plain facts from the profile; beside it the
// first-person story (Profile.bio, paragraphs on blank lines, the first one
// set larger), and the organisations, each with his role and the systems it
// holds. Every word is data; nothing about the owner lives in this file.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Building2, Compass, UserRound } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";
import { getSiteProfile } from "@/lib/queries/site";
import { getPublicHomes, getPublicPhotos, getPublicTitles } from "@/lib/queries/profile";
import { dbPublic } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "About", description: "The person behind the work — in his own words.", alternates: { canonical: "/about" } };

const POINTERS = [
  { href: "/journey", label: "The journey", note: "Every role, course and system, dated.", Icon: BookOpen },
  { href: "/method", label: "The method", note: "The principles — and their proof.", Icon: Compass },
];

export default async function AboutPage() {
  const [profile, titles, photos, homes, row] = await Promise.all([
    getSiteProfile(),
    getPublicTitles(),
    getPublicPhotos(),
    getPublicHomes(),
    dbPublic.publicProfile.findFirst({ select: { bio: true, buildingSinceYear: true } }),
  ]);
  const paragraphs = (row?.bio ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  // The owner's uploaded About photo wins (BR-1.17); until there is one, the
  // portrait he approved for this page (design/character/, 2026-09-30).
  const photo = photos.about ?? { url: "/character/about-portrait.webp", alt: `Portrait of ${profile.name}`, width: 900, height: 1207 };
  const subtitle = [profile.headline, profile.location && `based in ${profile.location}`].filter(Boolean).join(", ");
  const facts = [
    profile.location && { label: "Based in", value: profile.location },
    row?.buildingSinceYear && { label: "Building since", value: String(row.buildingSinceYear) },
    ...titles.filter((t) => t.kind === "qualification").map((t) => ({ label: "Studying", value: t.detail ? `${t.label}, ${t.detail}` : t.label })),
  ].filter((f): f is { label: string; value: string } => Boolean(f));
  const organisations = homes.filter((h) => h.kind !== "personal");

  return (
    <>
      <PageHero icon={UserRound} eyebrow="About" title={profile.name} description={subtitle ? `${subtitle}.` : undefined}>
        {titles.length > 0 && (
          <ul aria-label="Current titles" className="flex flex-wrap gap-2">
            {titles.map((t) => (
              <li key={`${t.kind}:${t.label}`} className="text-mist rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm">
                <span className="text-paper">{t.label}</span>
                {t.detail && <span> · {t.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </PageHero>

      <section className="bg-paper py-16 md:py-24">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* The frame: the owner's photo, or the mark standing in — and the plain facts. */}
          <div className="min-w-0 lg:col-span-5">
            <Reveal className="lg:sticky lg:top-28">
              <figure className="bg-night shadow-lift relative overflow-hidden rounded-3xl border border-white/10">
                <Image src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} unoptimized className="h-auto w-full" priority />
              </figure>
              {facts.length > 0 && (
                <dl className="border-ink/10 bg-sheet shadow-soft mt-5 divide-y divide-[var(--color-ink)]/10 rounded-2xl border px-5">
                  {facts.map((f) => (
                    <div key={f.label} className="flex items-baseline justify-between gap-4 py-3.5">
                      <dt className="text-slate shrink-0 text-sm">{f.label}</dt>
                      <dd className="text-ink text-right text-sm font-medium">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Reveal>
          </div>

          <div className="min-w-0 lg:col-span-7">
            {paragraphs.length > 0 ? (
              <article className="text-ink max-w-prose space-y-6 font-serif text-lg leading-relaxed">
                {paragraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? "text-ink text-xl leading-relaxed md:text-2xl md:leading-snug" : undefined}>
                    {p}
                  </p>
                ))}
              </article>
            ) : (
              <p className="text-slate">The story is being written.</p>
            )}

            {organisations.length > 0 && (
              <Reveal className="mt-14">
                <h2 className="text-slate inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                  <Building2 aria-hidden="true" className="text-accent size-4" /> Organisations
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {organisations.map((o) => (
                    <li key={o.slug} className="border-ink/10 bg-sheet shadow-soft flex flex-col rounded-2xl border p-5">
                      <span className="text-ink font-sans text-lg font-semibold">{o.name}</span>
                      {o.role && <span className="text-slate text-sm">{o.role}</span>}
                      <span className="text-slate mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {o.publishedSystems > 0 && (
                          <Link href="/systems" className="text-accent underline-offset-4 hover:underline">
                            {o.publishedSystems} {o.publishedSystems === 1 ? "system" : "systems"}
                          </Link>
                        )}
                        {o.github.slice(0, 1).map((g) => (
                          <a key={g.login} href={g.url} target="_blank" rel="noopener noreferrer" className="hover:text-ink inline-flex items-center gap-1 underline-offset-4 hover:underline">
                            GitHub <ArrowUpRight aria-hidden="true" className="size-3.5" />
                          </a>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            <div className="mt-14 grid gap-3 sm:grid-cols-2">
              {POINTERS.map(({ href, label, note, Icon }, i) => (
                <Reveal key={href} delay={(i + 1) * 80}>
                  <Link
                    href={href}
                    className="group border-ink/10 bg-sheet shadow-soft hover:border-ink/20 hover:shadow-lift focus-visible:outline-ember flex h-full items-center gap-4 rounded-2xl border p-5 transition-[box-shadow,border-color] focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <span className="bg-ink text-paper grid size-10 shrink-0 place-items-center rounded-xl">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block font-medium">{label}</span>
                      <span className="text-slate block text-sm">{note}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="text-slate group-hover:text-ink size-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
