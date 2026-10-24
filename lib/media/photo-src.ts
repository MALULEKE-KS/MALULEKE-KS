// lib/media/photo-src.ts
// The owner's photos at the size they are drawn (the speed pass, 2026-10-25): the photo route
// resizes a versioned link to one of a few widths (?w=) as WebP and the CDN keeps each for good, so a
// phone downloads a phone-sized hero, not the 1280 px original. An address that isn't the platform's
// own versioned photo route is used as it is.

/** The widths the photo route serves — the route refuses any other (so a link can't ask for a thousand sizes). */
export const PHOTO_WIDTHS = [480, 768, 1080, 1440, 1920] as const;
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];

const OURS = /^\/api\/v1\/profile\/photo\/[a-z0-9-]+\?v=[0-9a-f]{12}$/;

/** A srcset for one photo, its widths capped at the original's own (never enlarged). */
export function photoSrcSet(url: string, naturalWidth: number): string | undefined {
  if (!OURS.test(url)) return undefined;
  const widths = PHOTO_WIDTHS.filter((w) => w < naturalWidth);
  return [...widths.map((w) => `${url}&w=${w} ${w}w`), `${url} ${naturalWidth}w`].join(", ");
}
