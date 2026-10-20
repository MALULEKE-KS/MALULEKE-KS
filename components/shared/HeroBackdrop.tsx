// components/shared/HeroBackdrop.tsx
// The hero's cover image (docs/improvements/HOME-HERO-PLAN.md §7, redesigned on
// the owner's direction 2026-10-20): one image behind the *whole* hero, the
// content sitting on it. Part of the kit other pages inherit. A crop for phones
// (portrait) and one for larger screens (wide), each its own uploaded image (the
// photo slots "hero-desktop" and "hero-mobile"); a dark overlay so the type is
// always readable; an optional warm light; a credit on the image.
//
// It is mood and place, not evidence — decorative, so an empty alt — and the
// type is on top of it, so the overlay's strength is a setting (home.hero.scrim)
// the owner can tune by eye. With no image uploaded it renders nothing: the
// hero is a graphite field. The section that holds it must be `relative isolate`.
//
// Every number is data: the sizes come from the photos' rows, the credit and the
// focal points from the "home-hero" block, the overlay and the glow from settings.

import type { CSSProperties } from "react";

export interface HeroImageSource {
  url: string;
  width: number;
  height: number;
}

interface HeroBackdropProps {
  desktop: HeroImageSource | null;
  mobile: HeroImageSource | null;
  credit?: { text: string; url?: string | null } | null;
  /** CSS object-position for each crop, like "50% 60%". */
  positionDesktop?: string | null;
  positionMobile?: string | null;
  /** Strength of the dark overlay that keeps the type readable, 0–100. */
  scrim: number;
  /** Strength of the warm light along the lower edge, 0–100 (0 = none). */
  glow: number;
}

const clamp = (n: number) => Math.min(Math.max(n, 0), 100) / 100;

export function HeroBackdrop({ desktop, mobile, credit, positionDesktop, positionMobile, scrim, glow }: HeroBackdropProps) {
  // One image serves both crops when only one has been uploaded.
  const wide = desktop ?? mobile;
  const tall = mobile ?? desktop;
  if (!wide || !tall) return null;

  const style = {
    "--pos-d": positionDesktop ?? "50% 50%",
    "--pos-m": positionMobile ?? "50% 50%",
  } as CSSProperties;

  return (
    <>
      <div className="absolute inset-0 -z-10 overflow-hidden" style={style}>
        <picture>
          <source media="(max-width: 767px)" srcSet={tall.url} width={tall.width} height={tall.height} />
          <img
            src={wide.url}
            width={wide.width}
            height={wide.height}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="size-full object-cover [object-position:var(--pos-m)] md:[object-position:var(--pos-d)]"
          />
        </picture>
        {/* The overlay: graphite from the top and bottom, and a soft pool behind the type, so the words always read. */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(11_12_14/0.78),rgb(11_12_14/0.42)_38%,rgb(11_12_14/0.5)_68%,rgb(11_12_14/0.96))]"
          style={{ opacity: clamp(scrim) }}
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,rgb(11_12_14/0.6),transparent_75%)]"
          style={{ opacity: clamp(scrim) }}
        />
        {glow > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-[radial-gradient(ellipse_75%_100%_at_50%_100%,var(--color-ember),transparent_72%)] mix-blend-screen"
            style={{ opacity: clamp(glow) }}
          />
        )}
      </div>
      {credit?.text && (
        <p className="text-mist bg-night-deep/70 absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] truncate rounded-full px-3 py-1 font-mono text-[11px] backdrop-blur">
          {credit.url ? (
            <a href={credit.url} target="_blank" rel="noopener noreferrer" className="hover:text-paper underline-offset-2 hover:underline">
              {credit.text}
            </a>
          ) : (
            credit.text
          )}
        </p>
      )}
    </>
  );
}
