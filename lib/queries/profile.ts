// lib/queries/profile.ts
// The owner's public profile and links (#70, #82), read through the public
// role (F1.8) — only what the PublicProfile / PublicProfileLink views expose.

import { dbPublic } from "@/lib/db";

export async function getPublicProfile() {
  const [profile, links, affiliations, titles, photos] = await Promise.all([
    dbPublic.publicProfile.findFirst(),
    dbPublic.publicProfileLink.findMany({ orderBy: { sortOrder: "asc" } }),
    dbPublic.publicAffiliation.findMany({ orderBy: { name: "asc" } }),
    getPublicTitles(),
    getPublicPhotos(),
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
    // Current titles and qualifications, in the owner's order (F5c, D13).
    titles,
    // The owner's photos by purpose — about, … (F5c, D6).
    photos,
    links: links.map((l) => ({ kind: l.kind, label: l.label, url: l.url, onCv: l.onCv })),
    // Organizations the owner founded or co-founded (#99).
    affiliations: affiliations.map((a) => ({ name: a.name, slug: a.slug, role: a.role })),
  };
}

/** The owner's current titles and qualifications (PublicProfileTitle — F5c, D13). */
export async function getPublicTitles() {
  const rows = await dbPublic.publicProfileTitle.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  return rows.map((t) => ({ kind: t.kind, kindLabel: t.kindLabel, label: t.label, detail: t.detail }));
}

/** The owner's current photos by purpose, without the bytes: a cache-safe URL, alt text and size (F5c, D6). */
export async function getPublicPhotos() {
  const rows = await dbPublic.publicProfilePhoto.findMany({ select: { purpose: true, altText: true, width: true, height: true, sha256: true } });
  return Object.fromEntries(
    rows.map((p) => [
      p.purpose,
      { url: `/api/v1/profile/photo/${p.purpose}?v=${p.sha256.slice(0, 12)}`, alt: p.altText, width: p.width, height: p.height },
    ]),
  ) as Record<string, { url: string; alt: string; width: number; height: number }>;
}

/** The GitHub homes — the owner's account and ventures — with their published system counts (PublicHome, D12). */
export async function getPublicHomes() {
  const [rows, links] = await Promise.all([dbPublic.publicHome.findMany(), dbPublic.publicSystemHome.findMany()]);
  const order = (k: string | null) => (k === "personal" ? 0 : k === "venture" ? 1 : 2);
  return rows
    .sort((a, b) => order(a.kind) - order(b.kind) || a.name.localeCompare(b.name))
    .map((h) => ({
      name: h.name,
      slug: h.slug,
      role: h.role,
      kind: h.kind,
      publishedSystems: h.publishedSystems,
      // The published systems this home holds (PublicSystemHome).
      systems: links.filter((l) => l.homeSlug === h.slug).map((l) => l.slug),
      github: h.githubLogins.map((login) => ({ login, url: `https://github.com/${login}` })),
    }));
}

/** The platform reporting on itself — aggregates only (PublicPlatformPulse, §3.2). */
export async function getPlatformPulse() {
  const p = await dbPublic.publicPlatformPulse.findFirst();
  return {
    rulesEnforcedByDatabase: p?.rulesEnforcedByDatabase ?? 0,
    auditEventsLast7Days: p?.auditEventsLast7Days ?? 0,
    auditEventsTotal: p?.auditEventsTotal ?? 0,
    lastSuccessfulJobAt: p?.lastSuccessfulJobAt?.toISOString() ?? null,
    lastGithubSyncAt: p?.lastGithubSyncAt?.toISOString() ?? null,
    // Where this build came from (Vercel system variables; null locally).
    deployment: process.env.VERCEL_GIT_COMMIT_SHA
      ? { commit: process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7), environment: process.env.VERCEL_ENV ?? null }
      : null,
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
