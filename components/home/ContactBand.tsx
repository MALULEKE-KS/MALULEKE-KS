// components/home/ContactBand.tsx
// Home, the last section (DESIGN-SYSTEM.md v3 §7.4): the call to action. Since
// the premium pass (D-047, owner-approved 2026-10-23 — his choice D4) an open
// bone band, so the page ends light before the graphite footer — no card, no
// glow. The plain label, his heading, one line, the real BR-2.2 review window
// (a setting), one action; beside it the inquiry types the form accepts (the
// InquiryType lookup, #99) as a ruled list of links, each opening Let's talk
// with that topic already chosen (?about=). Nothing invented.

import Link from "next/link";
import { Accent } from "@/components/shared/Accent";
import { HeroLabel } from "@/components/shared/HeroKit";
import { sectionCopy } from "@/lib/content/copy";
import { ArrowRight } from "lucide-react";
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
    <section aria-labelledby="contact-title" className="bg-paper text-ink border-ink/[0.07] border-t py-20 md:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-16">
          <Reveal className="lg:col-span-6">
            <HeroLabel tone="light">{copy.eyebrow}</HeroLabel>
            <h2 id="contact-title" className="type-display mt-6 text-balance">
              <Accent text={copy.title ?? ""} className="type-accent text-ember-gradient pr-[0.06em]" />
            </h2>
            {copy.description && <p className="type-lede text-slate mt-6 max-w-xl">{copy.description}</p>}
            <p className="text-ink mt-5 inline-flex items-center gap-2.5 text-sm font-medium">
              <span aria-hidden="true" className="size-2 rounded-full bg-[var(--color-signal-finished)] shadow-[0_0_0_4px_rgb(15_122_75/0.12)]" />
              Reviewed within {reviewSlaHours} hours
            </p>
            <div className="mt-9">
              <Button asChild variant="accent" size="lg">
                <Link href="/contact">
                  Start a conversation
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </Reveal>

          {inquiryTypes.length > 0 && (
            <Reveal className="lg:col-span-6" delay={100}>
              <p className="text-slate mb-3 text-sm">What you can reach out about</p>
              <ul className="border-ink/12 border-t">
                {/* Each one opens Let's Talk already on that category (?about=). */}
                {inquiryTypes.map((t) => (
                  <li key={t.value} className="border-ink/12 border-b">
                    <Link
                      href={`/contact?about=${t.value}`}
                      className="group/t focus-visible:outline-ember relative flex items-center justify-between gap-4 py-4 text-[17px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <span className="relative">
                        {t.label}
                        <span aria-hidden="true" className="bg-ember absolute -bottom-1 left-0 h-px w-0 transition-[width] duration-300 ease-out group-hover/t:w-full motion-reduce:transition-none" />
                      </span>
                      <ArrowRight aria-hidden="true" className="text-slate group-hover/t:text-ember size-4 shrink-0 transition-[transform,color] duration-300 group-hover/t:translate-x-1 motion-reduce:transition-none" />
                    </Link>
                  </li>
                ))}
              </ul>
              {/* The social links live in the footer, just below — not repeated here (no duplicates). */}
            </Reveal>
          )}
        </div>
      </Container>
    </section>
  );
}
