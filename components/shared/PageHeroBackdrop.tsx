// components/shared/PageHeroBackdrop.tsx
// The image behind the top of an inner page (Systems, Journey, About, Let's talk),
// the same kit as the home hero (HeroBackdrop) with one image per page: a landscape
// photograph in the page's own slot (Admin → Photos), used for phones and desktops
// alike — the bands are short, so one image crops well for both. Each page's image
// is its own (docs/improvements/HOME-HERO-PLAN.md §20, D-041).
//
// A page whose wide image does not crop well to a tall phone screen can also give a
// portrait image for phones (`mobilePurpose`, its own slot). With no image uploaded it
// renders nothing and the page keeps its graphite field, so a page never waits on an image. The section that holds it must be
// `relative isolate`. Darkness is the setting site.pageHero.scrim.

import { HeroBackdrop } from "@/components/shared/HeroBackdrop";
import { getPublicPhotos } from "@/lib/queries/profile";
import type { PhotoPurpose } from "@/lib/profile/photos";
import { getSetting } from "@/lib/settings";

export async function PageHeroBackdrop({ purpose, mobilePurpose }: { purpose: PhotoPurpose; mobilePurpose?: PhotoPurpose }) {
  const [photos, scrim] = await Promise.all([getPublicPhotos(), getSetting("site.pageHero.scrim")]);
  const wide = photos[purpose];
  const tall = (mobilePurpose && photos[mobilePurpose]) || wide;
  if (!wide && !tall) return null;
  const source = (p: NonNullable<typeof wide>) => ({ url: p.url, width: p.width, height: p.height });
  // One image serves both when only one exists (HeroBackdrop falls back the same way).
  return <HeroBackdrop desktop={wide ? source(wide) : null} mobile={tall ? source(tall) : null} scrim={scrim} glow={0} />;
}
