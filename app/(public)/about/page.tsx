// app/(public)/about/page.tsx
// /about (DESIGN-SYSTEM.md v3, #99) — every word is the owner's data, not
// code: the headline and location from the profile, the first-person
// narrative from Profile.bio (admin-editable at /admin/profile; paragraphs
// split on blank lines), and the organizations from the owner's affiliations.
// Then pointers to /journey and /how-i-build for depth.
//
// The spec's lens-driven subtitle waits for VisitorLens (V1.1 scope); the
// subtitle here is the owner's own headline, not a faked lens.
// See docs/PAGE-SPECIFICATIONS.md ("/about").

import Link from "next/link";
import { ArrowRight, BookOpen, Building2, Compass, UserRound } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";
import { getAffiliations, getSiteProfile } from "@/lib/queries/site";
import { dbPublic } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "About", alternates: { canonical: "/about" } };

const POINTERS = [
  { href: "/journey", label: "The full journey", note: "Every milestone, dated.", Icon: BookOpen },
  { href: "/how-i-build", label: "How I build", note: "The rules behind the work.", Icon: Compass },
];

export default async function AboutPage() {
  const [profile, affiliations, bioRow] = await Promise.all([
    getSiteProfile(),
    getAffiliations(),
    dbPublic.publicProfile.findFirst({ select: { bio: true } }),
  ]);
  const paragraphs = (bioRow?.bio ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const subtitle = [profile.headline, profile.location && `based in ${profile.location}`]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHero
        icon={UserRound}
        eyebrow="About"
        title={profile.name}
        description={subtitle ? `${subtitle}.` : undefined}
      />

      <section className="bg-paper py-16 md:py-24">
        <Container className="grid gap-12 lg:grid-cols-12">
          <article className="lg:col-span-7">
            {paragraphs.length > 0 ? (
              <div className="text-ink max-w-prose space-y-6 font-serif text-lg leading-relaxed">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-slate">More about me is on the way.</p>
            )}
          </article>

          <aside className="space-y-5 lg:col-span-5">
            {affiliations.length > 0 && (
              <Reveal>
                <div className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-6">
                  <span className="text-slate inline-flex items-center gap-2 text-xs font-medium">
                    <Building2 aria-hidden="true" className="text-accent size-4" />
                    Organizations
                  </span>
                  <dl className="divide-ink/10 mt-5 divide-y">
                    {affiliations.map((a) => (
                      <div
                        key={a.slug}
                        className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <dt className="text-ink font-sans font-medium">{a.name}</dt>
                        <dd className="text-slate text-right text-sm">{a.role}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Reveal>
            )}

            {POINTERS.map(({ href, label, note, Icon }, i) => (
              <Reveal key={href} delay={(i + 1) * 80}>
                <Link
                  href={href}
                  className="group border-ink/10 bg-sheet shadow-soft hover:border-ink/20 hover:shadow-lift focus-visible:outline-ember flex items-center gap-4 rounded-2xl border p-5 transition-[box-shadow,border-color] focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="bg-ink text-paper grid size-10 shrink-0 place-items-center rounded-xl">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block font-medium">{label}</span>
                    <span className="text-slate block text-sm">{note}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-slate group-hover:text-ink size-5 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </Reveal>
            ))}
          </aside>
        </Container>
      </section>
    </>
  );
}
