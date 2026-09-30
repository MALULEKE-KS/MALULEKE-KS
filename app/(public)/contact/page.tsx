// app/(public)/contact/page.tsx
// /contact — the one inquiry form (DESIGN-SYSTEM.md v3, #99). Graphite page
// hero, then on bone: the form in a card, beside what happens next — the
// admin-set review window (BR-2.2), the owner's email and links, and the
// removal route (BR-5.5). Inquiry types, email and links are data, not code.
// See docs/PAGE-SPECIFICATIONS.md ("/contact").

import { Clock, Mail, MessageSquareText, ShieldCheck } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { SocialLinks } from "@/components/shared/SocialLinks";
import {
  getInquiryTypes,
  getRetentionMonths,
  getReviewSlaHours,
  getSiteProfile,
} from "@/lib/queries/site";
import { InquiryForm } from "./_components/InquiryForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Contact",
  description: "One form for every kind of inquiry — each one is reviewed.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [profile, inquiryTypes, reviewSlaHours, retentionMonths] = await Promise.all([
    getSiteProfile(),
    getInquiryTypes(),
    getReviewSlaHours(),
    getRetentionMonths(),
  ]);

  return (
    <>
      <PageHero
        icon={MessageSquareText}
        eyebrow="Contact"
        title="Start a conversation."
        description={`One form for every kind of inquiry. Each one is reviewed within ${reviewSlaHours} hours.`}
      />

      <section className="bg-paper py-16 md:py-24">
        <Container className="grid gap-8 lg:grid-cols-12">
          <div className="border-ink/10 bg-sheet shadow-soft rounded-3xl border p-6 md:p-10 lg:col-span-8">
            <InquiryForm
              inquiryTypes={inquiryTypes}
              email={profile.email}
              reviewSlaHours={reviewSlaHours}
            />
          </div>

          <aside className="space-y-5 lg:col-span-4">
            <div className="bg-night text-paper shadow-lift rounded-2xl border border-white/10 p-6">
              <Clock aria-hidden="true" className="text-ember size-5" />
              <h2 className="mt-4 font-sans text-lg font-semibold">What happens next</h2>
              <p className="text-mist mt-2 text-sm leading-relaxed">
                Your inquiry lands in one inbox. Each one is reviewed within {reviewSlaHours} hours.
              </p>
            </div>

            <div className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-6">
              <Mail aria-hidden="true" className="text-accent size-5" />
              <h2 className="text-ink mt-4 font-sans text-lg font-semibold">Prefer email?</h2>
              <a
                href={`mailto:${profile.email}`}
                className="text-accent mt-2 inline-block text-sm font-medium break-all underline underline-offset-4"
              >
                {profile.email}
              </a>
              <SocialLinks links={profile.links} tone="light" className="mt-5" />
            </div>

            <div className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-6">
              <ShieldCheck aria-hidden="true" className="text-signal-finished size-5" />
              <h2 className="text-ink mt-4 font-sans text-lg font-semibold">Your details</h2>
              <p className="text-slate mt-2 text-sm leading-relaxed">
                Kept for {retentionMonths} months, then anonymised automatically (BR-5.2). To have a
                submission removed sooner, email{" "}
                <a
                  className="text-accent font-medium underline underline-offset-4"
                  href={`mailto:${profile.email}`}
                >
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
