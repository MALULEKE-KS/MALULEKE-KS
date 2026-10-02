// lib/queries/site.ts
// The site-wide facts every public page shows — the owner's name, role,
// location, email and links, and the inquiry types the contact form offers —
// read from the admin-editable data (Profile, ProfileLink, InquiryType; #99),
// never from constants in code: an admin edit reaches the whole site, and an
// inquiry type added as a lookup value (EXT-1) appears on the form with no
// deploy. Memoised per request (React cache), so the header, footer and page
// share one read. Public views and public lookups only (platform_public).

import { formFor, type CategoryKey } from "@/lib/inquiries/forms";
import { cache } from "react";
import { dbPublic as db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export interface SiteLink {
  kind: string;
  label: string;
  url: string;
}

export interface SiteProfile {
  name: string;
  initials: string | null;
  role: string;
  headline: string | null;
  location: string | null;
  email: string;
  links: SiteLink[];
}

export const getSiteProfile = cache(async (): Promise<SiteProfile> => {
  const [profile, links] = await Promise.all([
    db.publicProfile.findFirst(),
    db.publicProfileLink.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!profile) throw new Error("The public profile is missing — run the seed (prisma/seed.ts).");
  return {
    name: profile.displayName,
    initials: profile.initials,
    role: profile.role,
    headline: profile.headline,
    location: profile.location,
    email: profile.email,
    links: links.map((l) => ({ kind: l.kind, label: l.label, url: l.url })),
  };
});

export interface InquiryTypeOption {
  value: string;
  label: string;
  description?: string | null;
  /** Which form the category uses (lib/inquiries/forms.ts). */
  form?: CategoryKey;
  subtypes?: { value: string; label: string }[];
}

/** Active inquiry types, in the order they were added (EXT-1 lookup). */
export const getInquiryTypes = cache(async (): Promise<InquiryTypeOption[]> => {
  // The admin's order first; label breaks ties (the seed created every type in the same instant).
  const types = await db.inquiryType.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { label: "asc" }],
    include: { subtypes: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } },
  });
  // Let's Talk (LT-1): each category carries its subtypes and the form it uses.
  return types.map((t) => ({
    value: t.key,
    label: t.label,
    description: t.description,
    form: formFor(t.key),
    subtypes: t.subtypes.map((s) => ({ value: s.key, label: s.label })),
  }));
});

export interface Affiliation {
  name: string;
  slug: string;
  role: string;
}

/** Organizations the owner founded or co-founded (PublicAffiliation view). */
export const getAffiliations = cache(async (): Promise<Affiliation[]> => {
  const rows = await db.publicAffiliation.findMany({ orderBy: { name: "asc" } });
  return rows.map((r) => ({ name: r.name, slug: r.slug, role: r.role }));
});

/**
 * The review promise every public page states (BR-2.2) — the admin setting
 * inquiry.reviewSlaHours, never a number typed into copy (#99).
 */
export const getReviewSlaHours = cache((): Promise<number> => getSetting("inquiry.reviewSlaHours"));

/** How long an inquiry keeps its personal data before anonymisation (BR-5.2). */
export const getRetentionMonths = cache((): Promise<number> => getSetting("data.retentionMonths"));
