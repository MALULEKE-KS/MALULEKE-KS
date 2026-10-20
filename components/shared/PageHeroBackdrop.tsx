// components/shared/PageHeroBackdrop.tsx
// The image behind the top of an inner page (Systems, Journey, About, Let's talk),
// the same kit as the home hero (HeroBackdrop) with one image per page: a landscape
// photograph in the page's own slot (Admin → Photos), used for phones and desktops
// alike — the bands are short, so one image crops well for both. Each page's image
// is its own (docs/improvements/HOME-HERO-PLAN.md §20, D-041).
//
// With no image uploaded it renders nothing and the page keeps its graphite field,
// so a page never waits on an image. The section that holds it must be
// `relative isolate`. Darkness is the setting site.pageHero.scrim.

import { HeroBackdrop } from "@/components/shared/HeroBackdrop";
import { getPublicPhotos } from "@/lib/queries/profile";
import type { PhotoPurpose } from "@/lib/profile/photos";
import { getSetting } from "@/lib/settings";

export async function PageHeroBackdrop({ purpose }: { purpose: PhotoPurpose }) {
  const [photos, scrim] = await Promise.all([getPublicPhotos(), getSetting("site.pageHero.scrim")]);
  const photo = photos[purpose];
  if (!photo) return null;
  const source = { url: photo.url, width: photo.width, height: photo.height };
  return <HeroBackdrop desktop={source} mobile={source} scrim={scrim} glow={0} />;
}
