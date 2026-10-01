// components/shared/SiteHeader.tsx
// The public header (F5c, D10): one bar — the mark and name on the left, the
// nav in the middle, instant search (⌘K) and the one contact entry, Let's
// talk, on the right. HeaderFrame turns it from a full-width bar at the top
// of the page into a single glass capsule once you scroll. Contact is not a
// nav item: Let's talk is the way in. Below lg the nav becomes MobileMenu, at
// the far right where a thumb expects it.

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/shared/BrandMark";
import { NavLinks } from "@/components/shared/NavLinks";
import { SearchPalette } from "@/components/shared/SearchPalette";
import { HeaderFrame } from "@/components/shared/HeaderFrame";
import { MobileMenu } from "@/components/shared/MobileMenu";
import type { SiteLink } from "@/lib/queries/site";

export function SiteHeader({ links, email, reviewSlaHours }: { links: SiteLink[]; email: string | null; reviewSlaHours: number }) {
  return (
    <HeaderFrame>
      <Link
        href="/"
        aria-label="MALULEKE-KS — home"
        className="group flex h-10 shrink-0 items-center gap-2.5 rounded-full pe-2 ps-1.5 focus-visible:outline-2 focus-visible:outline-ember"
      >
        <BrandMark className="size-6 text-paper transition-transform duration-500 group-hover:rotate-90 motion-reduce:transition-none" />
        <span className="hidden font-mono text-sm font-medium tracking-tight text-paper sm:inline">MALULEKE-KS</span>
      </Link>

      <NavLinks />

      <div className="ms-auto flex shrink-0 items-center gap-1.5 lg:ms-0">
        <SearchPalette />
        <Link
          href="/contact"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ember px-4 text-sm font-medium text-ink shadow-glow-ember transition-[filter,transform] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember active:scale-[0.98] motion-reduce:transition-none"
        >
          Let&rsquo;s talk
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
        <MobileMenu links={links} email={email} reviewSlaHours={reviewSlaHours} />
      </div>
    </HeaderFrame>
  );
}
