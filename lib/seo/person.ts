// lib/seo/person.ts
// Structured data (#101) for the owner — one builder, so the home page's
// Person and the About page's ProfilePage say the same thing, from the same
// data the pages show. Nothing here is typed in: it's the profile.

import type { getSiteProfile } from "@/lib/queries/site";

type Profile = Awaited<ReturnType<typeof getSiteProfile>>;

export function personLd(
  profile: Profile,
  base: string,
  extra: { organisations?: { name: string }[]; image?: string; knowsAbout?: string[] } = {},
) {
  return {
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.headline ?? profile.role,
    url: base,
    email: `mailto:${profile.email}`,
    // Public profiles only — not the WhatsApp link, which reaches a phone number.
    sameAs: profile.links.filter((l) => l.url.startsWith("https://") && !l.url.includes("wa.me")).map((l) => l.url),
    ...(profile.location && { address: { "@type": "PostalAddress", addressCountry: profile.location } }),
    ...(extra.organisations?.length && { worksFor: extra.organisations.map((o) => ({ "@type": "Organization", name: o.name })) }),
    ...(extra.image && { image: extra.image.startsWith("http") ? extra.image : `${base}${extra.image}` }),
    ...(extra.knowsAbout?.length && { knowsAbout: extra.knowsAbout }),
  };
}
