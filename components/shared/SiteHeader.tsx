// components/shared/SiteHeader.tsx
// The persistent site frame every page was missing — see DESIGN-SYSTEM.md
// §3's own mockup ("MALULEKE-KS   Systems  Journey…"), which described this
// but it was never actually built. Wordmark in mono (matching the ledger
// hero's "MALULEKE-KS — SYSTEM LOG" treatment), nav in sans, hairline
// bottom border — no shadow, no rounded pill nav, consistent with the rest
// of the drafting-table language.

import Link from "next/link";

const NAV_LINKS = [
  { href: "/systems", label: "Systems" },
  { href: "/journey", label: "Journey" },
  { href: "/cv", label: "CV" },
  { href: "/how-i-build", label: "How I build" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-slate/20 bg-paper">
      <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="font-mono font-medium text-sm text-ink tracking-tight">
          MALULEKE-KS
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-sans text-sm text-slate hover:text-ink transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
