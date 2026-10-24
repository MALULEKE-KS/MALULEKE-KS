// components/shared/HeroBackdrop.tsx
// The hero's cover image (docs/improvements/HOME-HERO-PLAN.md §7, redesigned on
// the owner's direction 2026-10-20): one image behind the *whole* hero, the
// content sitting on it — and the two giving each other room. Part of the kit
// other pages inherit.
//
// A crop for phones (portrait) and one for larger screens (wide), each its own
// uploaded image (the photo slots "hero-desktop" and "hero-mobile"). The overlay
// is shaped to the composition, not laid evenly over the picture: on larger
// screens the type sits on the left in the image's quiet zone, so the overlay is
// dark at the left and clears towards the right, where the image shows at full
// strength; on phones the image shows behind the whole hero, top to bottom, under
// an even, lighter veil (the image is dark by nature, so the type stays
// readable), deepening only at the very bottom to meet the record's bar. Its
// overall strength is the setting home.hero.scrim.
//
// It is mood and place, not evidence — decorative, so an empty alt. With no image
// uploaded it renders nothing: the hero is a graphite field. The section that
// holds it must be `relative isolate`.
//
// Every number is data: the sizes come from the photos' rows, the credit and the
// focal points from the "home-hero" block, the overlay and the glow from settings.

import type { CSSProperties } from "react";
import { photoSrcSet } from "@/lib/media/photo-src";

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
  /** Strength of the overlay that keeps the type readable, 0–100. */
  scrim: number;
  /** Strength of an extra warm light along the lower edge, 0–100 (0 = none). */
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
  const strength = { opacity: clamp(scrim) };

  return (
    <>
      <div className="absolute inset-0 -z-10 overflow-hidden" style={style}>
        <picture>
          {/* Each crop at the size it's drawn: the route serves narrower versions (lib/media/photo-src.ts), so a phone loads a phone-sized photo.
              On a phone the photo sits dimmed under a veil behind the words, so it's asked for at about half the screen's
              pixels (sizes 55vw): a 3× screen takes the 768 px version — half the bytes, no visible loss behind the veil. */}
          <source media="(max-width: 767px)" srcSet={photoSrcSet(tall.url, tall.width) ?? tall.url} sizes="55vw" width={tall.width} height={tall.height} />
          <img
            src={wide.url}
            srcSet={photoSrcSet(wide.url, wide.width)}
            sizes="100vw"
            width={wide.width}
            height={wide.height}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="size-full object-cover [object-position:var(--pos-m)] md:[object-position:var(--pos-d)]"
          />
        </picture>
        {/* Phones: the image behind the whole hero under an even veil, deepening only at the bottom into the record's bar. */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(11_12_14/0.56),rgb(11_12_14/0.44)_30%,rgb(11_12_14/0.3)_62%,rgb(11_12_14/0.46)_84%,rgb(11_12_14/0.88))] md:hidden"
          style={strength}
        />
        {/* Larger screens: dark at the left where the type sits, clearing to the right where the image shows at full strength. */}
        <div
          className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgb(11_12_14/0.92),rgb(11_12_14/0.78)_30%,rgb(11_12_14/0.32)_56%,rgb(11_12_14/0.04)_82%)] md:block"
          style={strength}
        />
        {/* Larger screens: a soft fade at the top (under the header) and the bottom (into the record's bar). */}
        <div
          className="absolute inset-0 hidden bg-[linear-gradient(to_bottom,rgb(11_12_14/0.55),transparent_22%,transparent_70%,rgb(11_12_14/0.85))] md:block"
          style={strength}
        />
        {glow > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-[radial-gradient(ellipse_75%_100%_at_50%_100%,var(--color-ember),transparent_72%)] mix-blend-screen"
            style={{ opacity: clamp(glow) }}
          />
        )}
      </div>
      {credit?.text && (
        <p className="text-mist absolute top-[4.75rem] right-4 z-10 max-w-[calc(100%-2rem)] truncate font-mono text-[11px] md:top-[5.25rem]">
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
