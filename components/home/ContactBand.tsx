// components/home/ContactBand.tsx
// Home, section 4 (DESIGN-SYSTEM.md v3 §7.4): the final call to action — one
// large dark card on the light page with an ember glow. States the real
// BR-2.2 review window, lists the inquiry types the form accepts (the
// InquiryType lookup, #99), and offers the owner's real links. Nothing invented.

import Link from "next/link";
import { Accent } from "@/components/shared/Accent";
import { sectionCopy } from "@/lib/content/copy";
import { ArrowRight, Clock, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import type { InquiryTypeOption } from "@/lib/queries/site";

interface ContactBandProps {
  inquiryTypes: InquiryTypeOption[];
  reviewSlaHours: number;
}

export async function ContactBand({ inquiryTypes, reviewSlaHours }: ContactBandProps) {
  // Words are data (the page-copy block); these are the fallbacks the seed matches.
  const copy = await sectionCopy("home.contact", {
    eyebrow: "Contact",
    title: "Have something to *build*?",
    description: "Tell me what it is. Every inquiry goes through one form, and I review each one.",
  });
  return (
    <section aria-labelledby="contact-title" className="bg-paper overflow-x-clip py-20 md:py-28">
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
                  {copy.eyebrow}
                </span>
                <h2 id="contact-title" className="type-display mt-6">
                  <Accent text={copy.title ?? ""} className="type-accent text-ember-gradient pr-[0.06em]" />
                </h2>
                {copy.description && <p className="type-lede text-mist mt-6 max-w-xl">{copy.description}</p>}
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
                </div>
              </div>

              <div className="lg:col-span-5">
                <p className="text-mist text-sm">What you can reach out about</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {/* Each one opens Let's Talk already on that category (?about=). */}
                  {inquiryTypes.map((t) => (
                    <li key={t.value}>
                      <Link
                        href={`/contact?about=${t.value}`}
                        className="text-paper hover:border-ember/50 focus-visible:outline-ember inline-flex rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        {t.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                {/* The social links live in the footer, one screen below — not repeated here (no duplicates). */}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
