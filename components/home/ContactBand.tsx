// components/home/ContactBand.tsx
// Home, section 4 (DESIGN-SYSTEM.md v3 §7.4): the final call to action — one
// large dark card on the light page with an ember glow. States the real
// BR-2.2 review window, lists the inquiry types the form accepts (the
// InquiryType lookup, #99), and offers the owner's real links. Nothing invented.

import Link from "next/link";
import { ArrowRight, Clock, Mail, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SocialLinks } from "@/components/shared/SocialLinks";
import type { InquiryTypeOption, SiteProfile } from "@/lib/queries/site";

interface ContactBandProps {
  profile: SiteProfile;
  inquiryTypes: InquiryTypeOption[];
  reviewSlaHours: number;
}

export function ContactBand({ profile, inquiryTypes, reviewSlaHours }: ContactBandProps) {
  return (
    <section aria-labelledby="contact-title" className="bg-paper py-20 md:py-28">
      <Container>
        <Reveal>
          <div className="border-ink/10 bg-night-deep text-paper shadow-lift relative isolate overflow-hidden rounded-3xl border px-6 py-14 md:px-14 md:py-20">
            <div
              aria-hidden="true"
              className="bg-ember/25 absolute -top-24 -right-24 -z-10 size-[28rem] rounded-full blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-32 -left-20 -z-10 size-[24rem] rounded-full bg-[rgb(96_130_170/0.18)] blur-3xl"
            />

            <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <span className="text-mist inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium">
                  <MessageSquareText aria-hidden="true" className="text-ember size-3.5" />
                  Contact
                </span>
                <h2
                  id="contact-title"
                  className="mt-6 font-sans text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl"
                >
                  Have something to <span className="text-ember-gradient">build</span>?
                </h2>
                <p className="text-mist mt-6 max-w-xl text-lg leading-relaxed">
                  Tell me what it is. Every inquiry goes through one form, and I review each one.
                </p>
                <p className="text-paper mt-4 inline-flex items-center gap-2 text-sm">
                  <Clock aria-hidden="true" className="text-ember size-4" />
                  Reviewed within {reviewSlaHours} hours
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="accent" size="lg">
                    <Link href="/contact">
                      Start a conversation
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild variant="glass" size="lg">
                    <a href={`mailto:${profile.email}`}>
                      <Mail />
                      Email instead
                    </a>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <p className="text-mist text-sm">What you can reach out about</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {inquiryTypes.map((t) => (
                    <li
                      key={t.value}
                      className="text-paper rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm"
                    >
                      {t.label}
                    </li>
                  ))}
                </ul>
                <p className="text-mist mt-10 text-sm">Or find me on</p>
                <SocialLinks links={profile.links} email={profile.email} className="mt-4" />
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
