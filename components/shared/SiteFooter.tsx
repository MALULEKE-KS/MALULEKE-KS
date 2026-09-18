// components/shared/SiteFooter.tsx
// Brand + mission, the page index, and direct contact with real brand icons.
// Every destination is real (lib/content/sheets.ts). Colophon names the
// platform's actual stack.

import Link from "next/link";
import { BrandMark } from "@/components/shared/BrandMark";
import { Container } from "@/components/shared/Container";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { OWNER, PLATFORM_STACK, SHEETS } from "@/lib/content/sheets";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-night-deep text-paper">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <Container className="grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link href="/" className="inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-ember">
            <BrandMark className="size-8 text-paper" />
            <span className="font-mono text-sm font-medium">MALULEKE-KS</span>
          </Link>
          <p className="mt-6 max-w-sm font-serif text-lg leading-relaxed text-mist">
            Systems disciplined enough to be trusted with real money, real institutions and real people&rsquo;s
            outcomes.
          </p>
          <SocialLinks className="mt-8" />
        </div>

        <nav aria-label="Footer" className="md:col-span-3">
          <h2 className="font-mono text-xs text-line">Pages</h2>
          <ul className="mt-4 space-y-2.5">
            {SHEETS.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="group inline-flex items-baseline gap-3 text-sm text-mist transition-colors hover:text-paper">
                  <span className="font-mono text-xs text-line transition-colors group-hover:text-ember">{s.number}</span>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-4">
          <h2 className="font-mono text-xs text-line">Write to me</h2>
          <a
            href={`mailto:${OWNER.email}`}
            className="mt-4 inline-block break-all font-sans text-lg text-paper underline decoration-white/20 underline-offset-8 transition-colors hover:decoration-ember"
          >
            {OWNER.email}
          </a>
          <p className="mt-3 text-sm text-mist">Every inquiry gets a reply within 48 hours.</p>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 font-mono text-xs text-line md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {OWNER.name}. Engineered in {OWNER.location}.
          </p>
          <p>Built on {PLATFORM_STACK.join(" / ")}</p>
        </Container>
      </div>
    </footer>
  );
}
