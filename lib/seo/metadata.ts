// lib/seo/metadata.ts
// One way to build a page's metadata (spec WP-101). In Next.js a page's
// `openGraph` or `twitter` object REPLACES the root layout's rather than
// merging with it — which is how the homepage lost its share image, site name,
// locale and large card. Every public page builds both objects here, whole:
// title, description, the canonical path, a 1200×630 share image with its own
// alt text, `summary_large_image`, the site name and locale. Words come from
// the page's data; this only shapes them.

import type { Metadata } from "next";
import { OG_SIZE } from "@/lib/og";
import { clip } from "@/lib/seo/clip";

/** The platform's name — its brand, like the logo (the person's name is data). */
export const SITE_NAME = "MALULEKE-KS";
export const SITE_LOCALE = "en_ZA";

export function pageMetadata({
  title,
  description,
  path,
  image = "/opengraph-image",
  imageAlt,
  type = "website",
  absoluteTitle = false,
}: {
  /** The page's own title; the root template adds the site name to the tab. */
  title?: string;
  description?: string | null;
  /** The canonical site path, e.g. "/about". */
  path: string;
  /** The share image route (file-based opengraph-image). */
  image?: string;
  imageAlt: string;
  type?: "website" | "article" | "profile";
  /** Use the title as-is in the tab (the homepage), not inside the template. */
  absoluteTitle?: boolean;
}): Metadata {
  const desc = description ? clip(description) : undefined;
  const shareTitle = title ?? SITE_NAME;
  const images = [{ url: image, width: OG_SIZE.width, height: OG_SIZE.height, alt: imageAlt }];
  return {
    ...(title && { title: absoluteTitle ? { absolute: title } : title }),
    ...(desc && { description: desc }),
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE_NAME, locale: SITE_LOCALE, url: path, title: shareTitle, ...(desc && { description: desc }), images },
    twitter: { card: "summary_large_image", title: shareTitle, ...(desc && { description: desc }), images: images.map((i) => ({ url: i.url, alt: i.alt })) },
  };
}
