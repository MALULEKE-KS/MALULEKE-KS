// app/(public)/contact/page.tsx
// /contact — Let's Talk (docs/LETS-TALK-SPEC.md; PAGE-BUILD-PLAYBOOK "/contact").
// The header's Let's talk lands here. Graphite page hero; then on bone, the
// conversation in a card — "What brings you here?", a form shaped to the
// answer, a reference at the end — beside how it goes from here: four
// numbered steps, the review promise (BR-2.2, a setting), email as the other
// way in, and what happens to your details (BR-5.2, BR-5.5). Categories,
// kinds, limits and copy that changes are data; ?about=<category> opens a
// category directly (the home page's links use it).

import { Clock, Mail, MessageSquareText, ShieldCheck } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { getInquiryTypes, getRetentionMonths, getReviewSlaHours, getSiteProfile } from "@/lib/queries/site";
import { getSetting } from "@/lib/settings";
import { LetsTalk } from "./_components/LetsTalk";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Let's talk",
  description: "Hiring, a project, a collaboration or just a question — tell me what brings you here and the form asks only what that needs.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ about?: string }> }) {
  const [{ about }, profile, categories, reviewSlaHours, retentionMonths, maxFiles, maxMegabytes] = await Promise.all([
    searchParams,
    getSiteProfile(),
    getInquiryTypes(),
    getReviewSlaHours(),
    getRetentionMonths(),
    getSetting("inquiry.documents.maxFiles"),
    getSetting("inquiry.documents.maxMegabytes"),
  ]);
  const first = profile.name.split(" ")[0] ?? profile.name;

  const steps = [
    { title: "You choose", body: "What it's about — the form adapts." },
    { title: "You send", body: "And get a reference, right away." },
    { title: `Reviewed within ${reviewSlaHours} hours`, body: `${first} reads every message himself.` },
    { title: "You hear back", body: "The way you said you prefer." },
  ];

  return (
    <>
      <PageHero icon={MessageSquareText} eyebrow="Let's talk" title="Let's talk." description={`Hiring, a project, a collaboration, or a question — every message is read and reviewed within ${reviewSlaHours} hours.`} />

      <section className="bg-paper py-14 md:py-24">
        <Container className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="border-ink/10 bg-sheet shadow-soft min-w-0 rounded-3xl border p-5 sm:p-8 md:p-10 lg:col-span-8">
            <LetsTalk
              categories={categories}
              initialCategory={about ?? null}
              email={profile.email}
              reviewSlaHours={reviewSlaHours}
              retentionMonths={retentionMonths}
              documents={{ maxFiles, maxMegabytes }}
            />
          </div>

          <aside className="min-w-0 space-y-5 lg:col-span-4">
            <div className="bg-night text-paper shadow-lift rounded-2xl border border-white/10 p-6">
              <Clock aria-hidden="true" className="text-ember size-5" />
              <h2 className="mt-4 font-sans text-lg font-semibold">How it goes from here</h2>
              <ol className="mt-4 space-y-4">
                {steps.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="type-data text-ember mt-0.5 text-xs">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block text-sm font-medium">{s.title}</span>
                      <span className="text-mist block text-sm">{s.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-6">
              <Mail aria-hidden="true" className="text-accent size-5" />
              <h2 className="text-ink mt-4 font-sans text-lg font-semibold">Prefer email?</h2>
              <a href={`mailto:${profile.email}`} className="text-accent mt-2 inline-block text-sm font-medium break-all underline underline-offset-4">
                {profile.email}
              </a>
              <SocialLinks links={profile.links} tone="light" className="mt-5" />
            </div>

            <div className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-6">
              <ShieldCheck aria-hidden="true" className="text-signal-finished size-5" />
              <h2 className="text-ink mt-4 font-sans text-lg font-semibold">Your details</h2>
              <p className="text-slate mt-2 text-sm leading-relaxed">
                No account, no password. What you send is kept for {retentionMonths} months, then anonymised automatically — attachments deleted. To have it removed sooner, email{" "}
                <a className="text-accent font-medium underline underline-offset-4" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
                .
              </p>
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}
