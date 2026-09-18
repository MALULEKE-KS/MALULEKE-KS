// components/home/ContactBand.tsx
// Sheet 01, section 4 (DESIGN-SYSTEM.md v2 §7.4): the one full amber band on
// the site — the accent as a fill with ink on it (9.69:1), spent on the one
// thing to do next. States the real BR-2.2 reply window, not a vague "soon".

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { OWNER } from "@/lib/content/sheets";

export function ContactBand() {
  return (
    <section aria-labelledby="contact-title" className="bg-amber text-ink relative overflow-hidden py-20 md:py-24">
      {/* Registration marks — the crop corners of a print sheet */}
      <span aria-hidden="true" className="border-ink/40 absolute top-4 left-4 size-6 border-t-2 border-l-2" />
      <span aria-hidden="true" className="border-ink/40 absolute top-4 right-4 size-6 border-t-2 border-r-2" />
      <span aria-hidden="true" className="border-ink/40 absolute bottom-4 left-4 size-6 border-b-2 border-l-2" />
      <span aria-hidden="true" className="border-ink/40 absolute right-4 bottom-4 size-6 border-r-2 border-b-2" />

      <Container className="grid items-end gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-8">
          <p className="font-mono text-xs">01.4 / Contact</p>
          <h2
            id="contact-title"
            className="mt-5 font-sans text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl"
          >
            Have something to build?
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed">
            Hiring, partnering, or a system that needs designing properly — tell me what it is. I reply within 48 hours.
          </p>
        </Reveal>

        <Reveal delay={120} className="flex flex-col items-start gap-4 lg:col-span-4 lg:items-end">
          <Button asChild size="lg">
            <Link href="/contact">Start a conversation</Link>
          </Button>
          <a
            href={`mailto:${OWNER.email}`}
            className="decoration-ink/40 hover:decoration-ink font-mono text-sm underline underline-offset-4"
          >
            {OWNER.email}
          </a>
        </Reveal>
      </Container>
    </section>
  );
}
