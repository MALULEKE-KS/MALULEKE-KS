// app/(public)/contact/page.tsx
// /contact — Let's Talk (docs/LETS-TALK-SPEC.md; PAGE-BUILD-PLAYBOOK "/contact").
// The header's Let's talk lands here. Rebuilt 2026-10-02 (owner: "poor"):
//   1. Hero — "Let's talk." beside a person, not a mailbox: his face, that he
//      reads every message himself, the review promise (BR-2.2, a setting);
//      and how it goes from here as four connected steps.
//   2. The conversation (LetsTalk) — choose, a form shaped to the answer with
//      a progress rail, the reference — beside the other way in (email, his
//      links) and what happens to your details (BR-5.2, BR-5.5).
// Categories, kinds, limits and copy that changes are data; ?about=<category>
// opens a category directly (the home page's links use it).

import Image from "next/image";
import { PageHeroBackdrop } from "@/components/shared/PageHeroBackdrop";
import { Mail, ShieldCheck } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { getInquiryTypes, getRetentionMonths, getReviewSlaHours, getSiteProfile } from "@/lib/queries/site";
import { getPublicPhotos } from "@/lib/queries/profile";
import { getSetting } from "@/lib/settings";
import { Accent } from "@/components/shared/Accent";
import { sectionCopy } from "@/lib/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { HeroLabel } from "@/components/shared/HeroKit";
import { LetsTalk } from "./_components/LetsTalk";

// Rendered ahead and refreshed by the (public) layout's cache (D-062).
// Words are data (the page-copy block); these are the fallbacks the seed matches.
const HERO = {
  eyebrow: "Let's talk",
  title: "Let's *talk.*",
  description: "Hiring, a project, a collaboration, or a question — tell me what brings you here, and the form asks only what that needs.",
};
const STEPS = {
  items: [
    { title: "You choose", body: "What it's about — the form adapts." },
    { title: "You send", body: "And get a reference, right away." },
    { title: "Reviewed within {reviewSlaHours} h", body: "{owner} reads it himself." },
    { title: "You hear back", body: "The way you said you prefer." },
  ],
};

export async function generateMetadata() {
  const hero = await sectionCopy("contact.hero", HERO);
  return pageMetadata({ title: "Let's talk", description: hero.description, path: "/contact", imageAlt: "Let's talk — MALULEKE-KS" });
}

export default async function ContactPage() {
  const [profile, photos, categories, reviewSlaHours, retentionMonths, maxFiles, maxMegabytes] = await Promise.all([
    getSiteProfile(),
    getPublicPhotos(),
    getInquiryTypes(),
    getReviewSlaHours(),
    getRetentionMonths(),
    getSetting("inquiry.documents.maxFiles"),
    getSetting("inquiry.documents.maxMegabytes"),
  ]);
  const first = profile.name.split(" ")[0] ?? profile.name;
  const vars = { reviewSlaHours, owner: first };
  const [hero, stepsCopy, picker, emailCard, detailsCard] = await Promise.all([
    sectionCopy("contact.hero", HERO, vars),
    sectionCopy("contact.steps", STEPS, vars),
    sectionCopy("contact.picker", { title: "What brings you here?", description: "Pick the closest — the form asks only what that needs." }, vars),
    sectionCopy("contact.email", { title: "Prefer email?" }, vars),
    sectionCopy("contact.details", {
      title: "Your details",
      description: "No account, no password. What you send is kept for {retentionMonths} months, then anonymised automatically — attachments deleted.",
    }, { ...vars, retentionMonths }),
  ]);
  // His uploaded About photo (BR-1.17), else the portrait he approved.
  const face = photos.about ?? { url: "/character/about-portrait.webp", alt: `Portrait of ${profile.name}` };

  const steps = stepsCopy.items ?? [];

  return (
    <>
      {/* The hero — the shape every inner page shares (D-046): label, headline, one line, then how it goes as a hairline row. */}
      <section aria-labelledby="talk-title" className="hero-field text-paper relative isolate overflow-hidden">
        <PageHeroBackdrop purpose="hero-contact" />
        <Container className="relative pt-28 pb-14 md:pt-32 md:pb-20">
          <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 lg:col-span-7">
              <HeroLabel>{hero.eyebrow}</HeroLabel>
              <h1 id="talk-title" className="type-display mt-6">
                <Accent text={hero.title ?? ""} className="type-accent text-ember-gradient pr-[0.06em]" />
              </h1>
              {hero.description && <p className="type-lede text-mist mt-5 max-w-xl">{hero.description}</p>}
            </div>
            <div className="min-w-0 lg:col-span-5">
              <div className="flex items-center gap-4 rounded-2xl border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
                <span className="relative shrink-0">
                  <Image src={face.url} alt={face.alt} width={56} height={56} unoptimized className="size-14 rounded-xl object-cover object-top" />
                  <span aria-hidden="true" className="bg-signal-finished ring-night absolute -right-1 -bottom-1 size-3 rounded-full ring-2" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{profile.name}</span>
                  <span className="text-mist block text-sm">Reads every message himself — reviewed within {reviewSlaHours} hours.</span>
                </span>
              </div>
            </div>
          </div>

          {/* How it goes: four steps under one hairline, numbered in order — from you to him. */}
          <ol className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/15 pt-7 md:mt-14 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="min-w-0">
                <span className={`block font-mono text-xs font-semibold ${i === 0 ? "text-ember" : "text-mist"}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-2 block text-sm font-semibold">{s.title}</span>
                {s.body && <span className="text-mist mt-0.5 hidden text-sm sm:block">{s.body}</span>}
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-paper py-14 md:py-20">
        <Container>
          <LetsTalk
            categories={categories}
            email={profile.email}
            ownerFirstName={first}
            reviewSlaHours={reviewSlaHours}
            retentionMonths={retentionMonths}
            documents={{ maxFiles, maxMegabytes }}
            picker={{ title: picker.title ?? "", description: picker.description ?? null }}
            steps={steps}
            aside={
              // One side sheet (D-052): the other way in, then what happens to what you send.
              <div className="border-ink/10 bg-sheet shadow-soft divide-ink/10 divide-y rounded-2xl border">
                <div className="p-6">
                  <p className="flex items-center gap-2">
                    <Mail aria-hidden="true" className="text-accent size-5" />
                    <span className="text-ink font-sans text-base font-semibold">{emailCard.title}</span>
                  </p>
                  <a href={`mailto:${profile.email}`} className="tap-target text-accent mt-3 inline-block text-sm font-medium break-all underline underline-offset-4">
                    {profile.email}
                  </a>
                  <SocialLinks links={profile.links} tone="light" className="mt-5" />
                </div>
                <div className="p-6">
                  <p className="flex items-center gap-2">
                    <ShieldCheck aria-hidden="true" className="text-signal-finished size-5" />
                    <span className="text-ink font-sans text-base font-semibold">{detailsCard.title}</span>
                  </p>
                  {detailsCard.description && <p className="text-slate mt-3 text-sm leading-relaxed">{detailsCard.description}</p>}
                </div>
              </div>
            }
          />
        </Container>
      </section>
    </>
  );
}
