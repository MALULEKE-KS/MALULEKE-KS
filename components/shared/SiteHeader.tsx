// components/shared/SiteHeader.tsx
// Sticky blueprint-deep bar — the binding edge of the drawing set. Brand
// mark + mono wordmark on the left, numbered sheets on the right
// (DESIGN-SYSTEM.md v2 §3/§6). `relative` so the mobile menu panel can hang
// directly beneath it.

import Link from "next/link";
import { BrandMark } from "@/components/shared/BrandMark";
import { Container } from "@/components/shared/Container";
import { NavLinks } from "@/components/shared/NavLinks";

export function SiteHeader() {
  return (
    <header className="border-line/20 bg-blueprint-deep text-paper sticky top-0 z-40 border-b">
      <Container className="relative flex h-16 items-center justify-between gap-6 md:h-auto">
        <Link
          href="/"
          className="group focus-visible:outline-amber flex items-center gap-3 py-3 focus-visible:outline-2"
        >
          <BrandMark className="text-paper size-7 transition-transform duration-300 group-hover:rotate-90" />
          <span className="font-mono text-sm font-medium tracking-tight">MALULEKE-KS</span>
        </Link>
        <NavLinks />
      </Container>
    </header>
  );
}
