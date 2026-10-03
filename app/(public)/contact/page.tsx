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
import { Mail, MessageSquareText, ShieldCheck } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { getInquiryTypes, getRetentionMonths, getReviewSlaHours, getSiteProfile } from "@/lib/queries/site";
import { getPublicPhotos } from "@/lib/queries/profile";
import { getSetting } from "@/lib/settings";
import { Accent } from "@/components/shared/Accent";
import { sectionCopy } from "@/lib/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { ShineBorder } from "@/components/ui/shine-border";
import { LetsTalk } from "./_components/LetsTalk";

export const dynamic = "force-dynamic";
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

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ about?: string }> }) {
  const [{ about }, profile, photos, categories, reviewSlaHours, retentionMonths, maxFiles, maxMegabytes] = await Promise.all([
    searchParams,
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
      <section aria-labelledby="talk-title" className="hero-field text-paper relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.14),transparent)]" />
        <Container className="relative pt-28 pb-14 md:pt-32 md:pb-20">
          <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-7">
              <span className="text-mist inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
                <MessageSquareText aria-hidden="true" className="text-ember size-3.5" />
                {hero.eyebrow}
              </span>
              <h1 id="talk-title" className="type-display mt-6">
                <Accent text={hero.title ?? ""} className="type-accent text-ember-gradient pr-[0.06em]" />
              </h1>
              {hero.description && <p className="type-lede text-mist mt-5 max-w-xl">{hero.description}</p>}
            </div>
            <div className="min-w-0 lg:col-span-5">
              <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-md">
                <ShineBorder borderWidth={1.5} duration={14} />
                <span className="relative shrink-0">
                  <Image src={face.url} alt={face.alt} width={64} height={64} unoptimized className="size-16 rounded-2xl object-cover object-top" />
                  <span aria-hidden="true" className="ring-night absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full ring-2">
                    <span className="bg-signal-finished/50 absolute inset-0 rounded-full motion-safe:animate-ping" />
                    <span className="bg-signal-finished relative size-3 rounded-full" />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{profile.name}</span>
                  <span className="text-mist block text-sm">Reads every message himself — reviewed within {reviewSlaHours} hours.</span>
                </span>
              </div>
            </div>
          </div>

          {/* How it goes: four steps on one line, a light travelling through them from you to him. */}
          <ol className="relative mt-8 grid grid-cols-2 gap-x-4 gap-y-4 sm:mt-12 sm:gap-y-6 md:grid-cols-4">
            <span aria-hidden="true" className="from-ember/70 absolute top-4 right-[12.5%] left-[12.5%] hidden h-px overflow-hidden bg-gradient-to-r via-white/20 to-white/10 md:block">
              <span className="absolute inset-y-0 left-0 w-1/4 bg-[linear-gradient(90deg,transparent,#ff5b1f,#ffb547,transparent)] motion-safe:animate-[flow-light_3.2s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:hidden" />
            </span>
            {steps.map((s, i) => (
              <li key={s.title} className="relative md:text-center">
                <span className={`relative mx-0 grid size-8 place-items-center rounded-full font-mono text-xs font-semibold md:mx-auto ${i === 0 ? "bg-ember text-ink shadow-glow-ember" : "bg-night border border-white/20 text-paper"}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-3 block text-sm font-semibold">{s.title}</span>
                {s.body && <span className="text-mist mt-0.5 hidden text-sm sm:block">{s.body}</span>}
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-paper py-12 md:py-20">
        <Container>
          <LetsTalk
            categories={categories}
            initialCategory={about ?? null}
            email={profile.email}
            ownerFirstName={first}
            reviewSlaHours={reviewSlaHours}
            retentionMonths={retentionMonths}
            documents={{ maxFiles, maxMegabytes }}
            picker={{ title: picker.title ?? "", description: picker.description ?? null }}
            steps={steps}
            aside={
              <>
                <div className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-6">
                  <p className="flex items-center gap-2">
                    <Mail aria-hidden="true" className="text-accent size-5" />
                    <span className="text-ink font-sans text-base font-semibold">{emailCard.title}</span>
                  </p>
                  <a href={`mailto:${profile.email}`} className="text-accent mt-3 inline-block text-sm font-medium break-all underline underline-offset-4">
                    {profile.email}
                  </a>
                  <SocialLinks links={profile.links} tone="light" className="mt-5" />
                </div>
                <div className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-6">
                  <p className="flex items-center gap-2">
                    <ShieldCheck aria-hidden="true" className="text-signal-finished size-5" />
                    <span className="text-ink font-sans text-base font-semibold">{detailsCard.title}</span>
                  </p>
                  {detailsCard.description && <p className="text-slate mt-3 text-sm leading-relaxed">{detailsCard.description}</p>}
                </div>
              </>
            }
          />
        </Container>
      </section>
    </>
  );
}
