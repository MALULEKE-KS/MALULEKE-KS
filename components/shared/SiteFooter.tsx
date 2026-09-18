// components/shared/SiteFooter.tsx
// The back cover of the drawing set: who, the sheet index, direct contact,
// and a colophon naming the platform's real stack (DESIGN-SYSTEM.md v2 §3).
// Real destinations only — never placeholder links.

import Link from "next/link";
import { BrandMark } from "@/components/shared/BrandMark";
import { Container } from "@/components/shared/Container";
import { OWNER, PLATFORM_STACK, SHEETS } from "@/lib/content/sheets";

const CONTACT = [
  { label: "Email", value: OWNER.email, href: `mailto:${OWNER.email}` },
  { label: "LinkedIn", value: "kurhula-success-maluleke", href: OWNER.linkedin },
  { label: "WhatsApp", value: "+27 64 070 8649", href: OWNER.whatsapp },
  { label: "GitHub", value: "MALULEKE-KS", href: OWNER.github },
];

export function SiteFooter() {
  const external = (href: string) => !href.startsWith("mailto:");

  return (
    <footer className="bg-blueprint-deep text-paper">
      <Container className="grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link href="/" className="focus-visible:outline-amber inline-flex items-center gap-3 focus-visible:outline-2">
            <BrandMark className="text-paper size-8" />
            <span className="font-mono text-sm font-medium">MALULEKE-KS</span>
          </Link>
          <p className="text-mist mt-6 max-w-sm font-serif text-lg leading-relaxed">
            Systems disciplined enough to be trusted with real money, real institutions and real people&rsquo;s
            outcomes.
          </p>
        </div>

        <div className="md:col-span-3">
          <h2 className="text-line font-mono text-xs">Sheets</h2>
          <ul className="mt-4 space-y-2">
            {SHEETS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group text-mist hover:text-paper inline-flex items-baseline gap-3 text-sm"
                >
                  <span className="text-line group-hover:text-amber font-mono text-xs">{s.number}</span>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <h2 className="text-line font-mono text-xs">Direct</h2>
          <dl className="mt-4 space-y-3">
            {CONTACT.map((c) => (
              <div key={c.label} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-2">
                <dt className="text-line font-mono text-xs">{c.label}</dt>
                <dd className="min-w-0">
                  <a
                    href={c.href}
                    target={external(c.href) ? "_blank" : undefined}
                    rel={external(c.href) ? "noopener noreferrer" : undefined}
                    className="text-paper decoration-line/40 hover:text-amber hover:decoration-amber text-sm break-words underline underline-offset-4"
                  >
                    {c.value}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>

      <div className="border-line/15 border-t">
        <Container className="text-line flex flex-col gap-2 py-5 font-mono text-xs md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {OWNER.name}. Engineered in {OWNER.location}.
          </p>
          <p>Rev 2.0 / {PLATFORM_STACK.join(" / ")}</p>
        </Container>
      </div>
    </footer>
  );
}
