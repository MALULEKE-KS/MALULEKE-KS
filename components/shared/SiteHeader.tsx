// components/shared/SiteHeader.tsx
// The public header (F5c, D10): one bar — the mark alone on the left (the
// owner's call, 2026-10-01: no name beside it, on every screen size), the
// nav in the middle, instant search (⌘K) and the one contact entry, Let's
// talk, on the right. HeaderFrame turns it from a full-width bar at the top
// of the page into a single glass capsule once you scroll. Contact is not a
// nav item: Let's talk is the way in. Below lg the nav becomes MobileMenu, at
// the far right where a thumb expects it.

import Link from "next/link";
import { ArrowUpRight, FileDown } from "lucide-react";
import { CubeMark } from "@/components/shared/BrandMark";
import { NavLinks } from "@/components/shared/NavLinks";
import { SearchPalette } from "@/components/shared/SearchPalette";
import { HeaderFrame } from "@/components/shared/HeaderFrame";
import { MobileMenu } from "@/components/shared/MobileMenu";
import type { SiteLink } from "@/lib/queries/site";

export function SiteHeader({ links, reviewSlaHours, cvUrl }: { links: SiteLink[]; reviewSlaHours: number; cvUrl: string | null }) {
  return (
    <HeaderFrame>
      <Link
        href="/"
        aria-label="MALULEKE-KS — home"
        className="group flex h-10 shrink-0 items-center gap-2.5 rounded-full pe-2 ps-1.5 focus-visible:outline-2 focus-visible:outline-ember"
      >
        <CubeMark className="size-9" />
      </Link>

      <NavLinks />

      <div className="ms-auto flex shrink-0 items-center gap-1.5 lg:ms-0">
        <SearchPalette />
        {/* The owner's uploaded CV — only while he has it switched on (no CV page; owner, 2026-10-02). */}
        {cvUrl && (
          <a
            href={cvUrl}
            className="text-paper hover:border-ember/50 focus-visible:outline-ember hidden h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 text-sm font-medium transition-colors hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex"
          >
            <FileDown aria-hidden="true" className="size-4" />
            CV
          </a>
        )}
        <Link
          href="/contact"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ember px-4 text-sm font-medium text-ink shadow-glow-ember transition-[filter,transform] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember active:scale-[0.98] motion-reduce:transition-none"
        >
          Let&rsquo;s talk
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
        <MobileMenu links={links} reviewSlaHours={reviewSlaHours} cvUrl={cvUrl} />
      </div>
    </HeaderFrame>
  );
}
