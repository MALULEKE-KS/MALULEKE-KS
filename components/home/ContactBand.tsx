// components/home/ContactBand.tsx
// Home, section 4 (DESIGN-SYSTEM.md v3 §7.4): the final call to action — one
// large dark card on the light page with an ember glow. States the real
// BR-2.2 reply window, lists the real inquiry types the form accepts, and
// offers the real brand links. Nothing invented.

import Link from "next/link";
import { ArrowRight, Clock, Mail, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { INQUIRY_TYPES } from "@/lib/content/inquiry";
import { OWNER } from "@/lib/content/sheets";

export function ContactBand() {
  return (
    <section aria-labelledby="contact-title" className="bg-paper py-20 md:py-28">
      <Container>
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-3xl border border-ink/10 bg-night-deep px-6 py-14 text-paper shadow-lift md:px-14 md:py-20">
            <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 size-[28rem] rounded-full bg-ember/25 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-32 -left-20 -z-10 size-[24rem] rounded-full bg-[rgb(96_130_170/0.18)] blur-3xl" />

            <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-mist">
                  <MessageSquareText aria-hidden="true" className="size-3.5 text-ember" />
                  Contact
                </span>
                <h2 id="contact-title" className="mt-6 font-sans text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                  Have something to <span className="text-ember-gradient">build</span>?
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist">
                  Tell me what it is. Every inquiry goes through one form and gets a reply.
                </p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-paper">
                  <Clock aria-hidden="true" className="size-4 text-ember" />
                  Reply within 48 hours
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="accent" size="lg">
                    <Link href="/contact">
                      Start a conversation
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild variant="glass" size="lg">
                    <a href={`mailto:${OWNER.email}`}>
                      <Mail />
                      Email instead
                    </a>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <p className="text-sm text-mist">What you can reach out about</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {INQUIRY_TYPES.map((t) => (
                    <li key={t.value} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-paper">
                      {t.label}
                    </li>
                  ))}
                </ul>
                <p className="mt-10 text-sm text-mist">Or find me on</p>
                <SocialLinks className="mt-4" />
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
