// components/shared/HeroImage.tsx
// The hero photograph (docs/improvements/HOME-HERO-PLAN.md §7) — part of the
// kit other pages inherit. A framed panel, a crop for phones (4:5) and a wide
// one (21:9) for larger screens, each its own uploaded image (the photo slots
// "hero-desktop" and "hero-mobile"), a credit on the image, and a warm light
// along its lower edge. It is mood and place, not evidence — decorative, so an
// empty alt (the credit stays readable and focusable) — and it sits below the type, so nothing depends
// on it: with no image uploaded it renders nothing at all (no broken box).
//
// Every number here is data: the photos' sizes come from their rows, the credit
// and the focal point from the "home-hero" block, the glow from a setting.

import type { CSSProperties } from "react";

export interface HeroImageSource {
  url: string;
  width: number;
  height: number;
}

interface HeroImageProps {
  desktop: HeroImageSource | null;
  mobile: HeroImageSource | null;
  credit?: { text: string; url?: string | null } | null;
  /** CSS object-position for each crop, like "50% 60%". */
  positionDesktop?: string | null;
  positionMobile?: string | null;
  /** Strength of the warm light along the lower edge, 0–100 (0 = none). */
  glow: number;
}

export function HeroImage({ desktop, mobile, credit, positionDesktop, positionMobile, glow }: HeroImageProps) {
  // One image serves both crops when only one has been uploaded.
  const wide = desktop ?? mobile;
  const tall = mobile ?? desktop;
  if (!wide || !tall) return null;

  const style = {
    "--pos-d": positionDesktop ?? "50% 50%",
    "--pos-m": positionMobile ?? "50% 50%",
  } as CSSProperties;

  return (
    <figure className="relative isolate aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/10 bg-night-soft md:aspect-[21/9]" style={style}>
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
      {glow > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-[radial-gradient(ellipse_75%_100%_at_50%_100%,var(--color-ember),transparent_72%)] mix-blend-screen"
          style={{ opacity: Math.min(glow, 100) / 100 }}
        />
      )}
      {credit?.text && (
        <figcaption className="text-mist bg-night-deep/70 absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full px-3 py-1 font-mono text-[11px] backdrop-blur">
          {credit.url ? (
            <a href={credit.url} target="_blank" rel="noopener noreferrer" className="hover:text-paper underline-offset-2 hover:underline">
              {credit.text}
            </a>
          ) : (
            credit.text
          )}
        </figcaption>
      )}
    </figure>
  );
}
