// components/shared/SiteHeader.tsx
// Sticky glass bar (DESIGN-SYSTEM.md v3 §6): translucent graphite with
// backdrop blur and a hairline edge, so the hero glows through as you scroll.
// Brand on the left, pill nav in the middle-right, one ember CTA.

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/shared/BrandMark";
import { Container } from "@/components/shared/Container";
import { NavLinks } from "@/components/shared/NavLinks";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night-deep/95 text-paper backdrop-blur-xl supports-[backdrop-filter]:bg-night-deep/90">
      <Container className="relative flex h-16 items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-ember">
          <BrandMark className="size-7 text-paper transition-transform duration-500 group-hover:rotate-90" />
          <span className="font-mono text-sm font-medium tracking-tight">MALULEKE-KS</span>
        </Link>
        <div className="flex items-center gap-3">
          <NavLinks />
          <Button asChild variant="accent" size="sm" className="hidden lg:inline-flex">
            <Link href="/contact">
              Let&rsquo;s talk
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
