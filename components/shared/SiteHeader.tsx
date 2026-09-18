// components/shared/SiteHeader.tsx
// The persistent site frame every page was missing — see DESIGN-SYSTEM.md
// §3's own mockup ("MALULEKE-KS   Systems  Journey…"), which described this
// but it was never actually built. Wordmark in mono (the platform's own
// identifier, like the ledger hero's mono log header), nav in sans, hairline
// bottom border — no shadow, no rounded pill nav, consistent with the rest
// of the drafting-table language.
//
// Vertical padding is on the links themselves (NavLinks) so each tap target
// is ~36px tall without making the desktop header any taller than before.

import Link from "next/link";
import { Container } from "@/components/shared/Container";
import { NavLinks } from "@/components/shared/NavLinks";

export function SiteHeader() {
  return (
    <header className="border-b border-slate/20 bg-paper">
      <Container className="py-2 flex flex-wrap items-center justify-between gap-x-4">
        <Link href="/" className="py-2 font-mono font-medium text-sm text-ink tracking-tight">
          MALULEKE-KS
        </Link>
        <NavLinks />
      </Container>
    </header>
  );
}
