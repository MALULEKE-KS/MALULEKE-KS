// lib/queries/profile.ts
// The owner's public profile and links (#70, #82), read through the public
// role (F1.8) — only what the PublicProfile / PublicProfileLink views expose.

import { dbPublic } from "@/lib/db";

export async function getPublicProfile() {
  const [profile, links, affiliations] = await Promise.all([
    dbPublic.publicProfile.findFirst(),
    dbPublic.publicProfileLink.findMany({ orderBy: { sortOrder: "asc" } }),
    dbPublic.publicAffiliation.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!profile) return null;
  return {
    displayName: profile.displayName,
    initials: profile.initials,
    headline: profile.headline,
    role: profile.role,
    location: profile.location,
    email: profile.email,
    phone: profile.phone,
    summary: profile.summary,
    bio: profile.bio,
    availability: profile.availability,
    buildingSinceYear: profile.buildingSinceYear,
    links: links.map((l) => ({ kind: l.kind, label: l.label, url: l.url, onCv: l.onCv })),
    // Organizations the owner founded or co-founded (#99).
    affiliations: affiliations.map((a) => ({ name: a.name, slug: a.slug, role: a.role })),
  };
}

export async function getPublicAchievements() {
  const rows = await dbPublic.publicAchievement.findMany({ orderBy: [{ sortOrder: "asc" }, { achievedOn: "desc" }] });
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    issuer: a.issuer,
    achievedOn: a.achievedOn.toISOString().slice(0, 10),
    description: a.description,
    url: a.url,
    systemSlug: a.systemSlug,
  }));
}
