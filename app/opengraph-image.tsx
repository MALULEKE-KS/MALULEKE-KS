// app/opengraph-image.tsx — the site's default Open Graph image (#101): the
// owner's name and headline from the admin-editable profile.

import { renderOgCard, OG_SIZE } from "@/lib/og";
import { getSiteProfile } from "@/lib/queries/site";

export const alt = "MALULEKE-KS";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image() {
  const profile = await getSiteProfile().catch(() => null);
  return renderOgCard({
    eyebrow: "Systems · Journey · CV",
    title: profile?.name ?? "MALULEKE-KS",
    subtitle: profile ? [profile.headline, profile.location].filter(Boolean).join(" — ") : null,
  });
}
