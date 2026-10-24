// lib/media/screenshot-src.ts
// A system's screenshot at the size it is drawn (D-062; the owner's plan, Phase 3: "serve
// project screenshots at their displayed size"). The screenshot route resizes a versioned
// link to one of a few widths (?w=) and the CDN keeps each for good; this builds the srcset
// so the browser picks the smallest that is sharp at the visitor's screen. An address that
// isn't the platform's own versioned route (an admin-typed URL) is used as it is.

/** The widths the screenshot route serves — the route refuses any other (so a link can't ask for a thousand sizes). */
export const SCREENSHOT_WIDTHS = [480, 800, 1200] as const;
export type ScreenshotWidth = (typeof SCREENSHOT_WIDTHS)[number];

const OURS = /^\/api\/v1\/systems\/[^/?#]+\/screenshot\?v=[0-9a-f]{12}$/;

export function screenshotSrc(url: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  if (!OURS.test(url)) return { src: url };
  return {
    src: `${url}&w=800`,
    srcSet: SCREENSHOT_WIDTHS.map((w) => `${url}&w=${w} ${w}w`).join(", "),
    sizes,
  };
}
