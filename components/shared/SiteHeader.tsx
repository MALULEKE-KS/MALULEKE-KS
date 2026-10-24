// components/shared/SiteHeader.tsx
// The public header (F5c, D10): one bar — the mark alone on the left (the
// owner's call, 2026-10-01: no name beside it, on every screen size), the
// nav in the middle, instant search (⌘K) and the one contact entry, Let's
// talk, on the right; beside the mark, the live chip — the build that is
// running and the platform's vital signs (D-058). HeaderFrame turns it from a full-width bar at the top
// of the page into a single glass capsule once you scroll. Contact is not a
// nav item: Let's talk is the way in. Below lg the nav moves to the foot of the screen,
// where a thumb rests — the bottom dock (D-056), whose last cell opens the
// full menu; the bar keeps the mark, search, the CV and Let's talk.

import Link from "@/components/shared/IntentLink";
import { ArrowRight, FileDown } from "lucide-react";
import { CubeMark } from "@/components/shared/BrandMark";
import { NavLinks } from "@/components/shared/NavLinks";
import { SearchPalette } from "@/components/shared/SearchPalette";
import { HeaderFrame } from "@/components/shared/HeaderFrame";
import { MobileMenu } from "@/components/shared/MobileMenu";
import { BottomDock } from "@/components/shared/BottomDock";
import { LiveChip, type HeaderPulse } from "@/components/shared/LiveChip";
import type { HeaderSystems } from "@/lib/queries/header";
import type { SiteLink } from "@/lib/queries/site";

/** The header's own wording — the "site-header" content block (owner-edited). A label that is empty hides its part. */
export interface HeaderLabels {
  contactLabel?: string;
  cvLabel?: string;
  homeLabel?: string;
  skipLabel?: string;
  menuLabel?: string;
  menuCloseLabel?: string;
  cvMenuLabel?: string;
  reviewPromise?: string;
  pageHints?: Record<string, string>;
  systemsPreviewLabel?: string;
  systemsAllLabel?: string;
  askLabel?: string;
  liveLabel?: string;
  previewLabel?: string;
  vitalsTitle?: string;
  vitalsBuild?: string;
  vitalsSync?: string;
  vitalsRules?: string;
  vitalsAudited?: string;
  vitalsLink?: string;
  askHint?: string;
  dockLabel?: string;
}

export function SiteHeader({
  links,
  reviewSlaHours,
  cvUrl,
  ownerName,
  labels,
  systems,
  pulse = null,
  liveLink = null,
}: {
  links: SiteLink[];
  reviewSlaHours: number;
  cvUrl: string | null;
  /** The owner's name — names the logo link when no home label is written. */
  ownerName: string;
  labels: HeaderLabels | null;
  systems: HeaderSystems | null;
  /** The build that is running and the platform's vital signs — the live chip (D-058). */
  pulse?: HeaderPulse | null;
  /** Where the chip's card links: the "release" block's link. */
  liveLink?: string | null;
}) {
  return (
    <>
    <HeaderFrame>
      <Link
        href="/"
        aria-label={labels?.homeLabel?.trim() || ownerName}
        className="group tap-target flex h-10 shrink-0 items-center gap-2.5 rounded-full pe-2 ps-1.5 focus-visible:outline-2 focus-visible:outline-ember"
      >
        <CubeMark className="size-9" />
      </Link>
      <LiveChip pulse={pulse} labels={labels} link={liveLink} />

      <NavLinks preview={systems} previewLabel={labels?.systemsPreviewLabel?.trim() || null} allLabel={labels?.systemsAllLabel?.trim() || null} />

      <div className="ms-auto flex shrink-0 items-center gap-1.5 lg:ms-0">
        <SearchPalette />
        {/* The owner's uploaded CV — only while he has it switched on (no CV page; owner, 2026-10-02). */}
        {cvUrl && labels?.cvLabel?.trim() && (
          <a
            href={cvUrl}
            className="text-paper hover:border-ember/50 focus-visible:outline-ember hidden h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 text-sm font-medium transition-colors hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex sm:group-data-[scrolled]/header:hidden"
          >
            <FileDown aria-hidden="true" className="size-4" />
            {labels.cvLabel}
          </a>
        )}
        {labels?.contactLabel?.trim() && (
          <Link
            href="/contact"
            className="tap-target inline-flex h-9 items-center gap-1.5 rounded-full bg-ember px-4 text-sm font-medium text-ink transition-[filter,transform,box-shadow] hover:brightness-105 hover:shadow-glow-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember active:scale-[0.98] motion-reduce:transition-none"
          >
            {labels.contactLabel}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>
    </HeaderFrame>
    <BottomDock labels={labels} menu={<MobileMenu links={links} reviewSlaHours={reviewSlaHours} cvUrl={cvUrl} labels={labels} ownerName={ownerName} variant="dock" />} />
    </>
  );
}
