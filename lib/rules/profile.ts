// lib/rules/profile.ts
// The owner's profile and achievements as admin-editable data (#74) — the
// source of the CV header, links and certifications, and of the site's own
// owner details. Serializers for the admin API.

import { Prisma } from "@prisma/client";

const profileWithLinks = Prisma.validator<Prisma.ProfileDefaultArgs>()({
  include: { links: { orderBy: { sortOrder: "asc" } } },
});
export type ProfileWithLinks = Prisma.ProfileGetPayload<typeof profileWithLinks>;
export { profileWithLinks };

export function toProfile(profile: ProfileWithLinks) {
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
    links: profile.links.map(toProfileLink),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function toProfileLink(link: ProfileWithLinks["links"][number]) {
  return { id: link.id, kind: link.kind, label: link.label, url: link.url, sortOrder: link.sortOrder, onCv: link.onCv };
}

export function toAchievement(a: Prisma.AchievementGetPayload<object>) {
  return {
    id: a.id,
    title: a.title,
    issuer: a.issuer,
    achievedOn: a.achievedOn.toISOString().slice(0, 10),
    description: a.description,
    url: a.url,
    systemId: a.systemId,
    contentStatus: a.contentStatus.toLowerCase() as "draft" | "published" | "archived",
    sortOrder: a.sortOrder,
  };
}

/** A database CHECK refusal named after its constraint, as a readable 400 message. */
export function checkViolationMessage(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  const match = err.message.match(/violates check constraint "([^"]+)"/);
  if (!match) return null;
  const messages: Record<string, string> = {
    Profile_email_format: "That email address isn't valid.",
    Profile_phone_format: "A phone number is digits with an optional leading + and separators.",
    Profile_required_present: "Name and role can't be blank.",
    Profile_buildingSinceYear_range: "The building-since year must be between 1990 and 2100.",
    ProfileLink_kind_format: "A link kind is lowercase words joined by hyphens.",
    ProfileLink_url_format: "Links must start with https:// or mailto:.",
    Achievement_title_present: "An achievement needs a title.",
    Achievement_url_format: "An achievement link must start with https://.",
  };
  return messages[match[1]!] ?? `Refused by the database rule ${match[1]}.`;
}
