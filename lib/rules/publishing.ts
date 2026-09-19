// lib/rules/publishing.ts
// BR-1.x as enforceable code, not just prose (docs/BUSINESS-RULES-v1.md §1).
//
// Two separate layers, both required:
//   1. PUBLISHED_WHERE — every public-facing query must filter on this, so a
//      route can never leak an unpublished System regardless of what other
//      query params it accepts (BR-1.1).
//   2. toPublicSystem/toPublicSystemDetailed — serialization-layer masking
//      for fields that stay hidden even on an already-published System
//      (BR-1.3 NDA_RESTRICTED, BR-1.4 ANONYMIZED_ONLY).
// Neither layer substitutes for the other: a query filter that's right but
// serialization that leaks repoUrl is still a BR-1.3 violation, and correct
// serialization applied to an unfiltered query still leaks drafts.

import { Prisma, ContentStatus, type ClientVisibility } from "@prisma/client";

export const PUBLISHED_WHERE = { contentStatus: ContentStatus.PUBLISHED } as const;

// Only testimonials with hasPermission=true are ever fetched for public
// serialization (BR-6.1) — filtered at the query layer, not after the fact.
export const PUBLIC_TESTIMONIALS_INCLUDE = {
  where: { hasPermission: true },
  orderBy: { createdAt: Prisma.SortOrder.desc },
} satisfies Prisma.System$testimonialsArgs;

const systemWithPublicRelations = Prisma.validator<Prisma.SystemDefaultArgs>()({
  include: {
    organization: true,
    status: true,
    domain: true,
  },
});

const systemWithPublicDetailRelations = Prisma.validator<Prisma.SystemDefaultArgs>()({
  include: {
    organization: true,
    status: true,
    domain: true,
    impacts: { orderBy: { sortOrder: "asc" } },
    testimonials: PUBLIC_TESTIMONIALS_INCLUDE,
  },
});

export type SystemWithPublicRelations = Prisma.SystemGetPayload<typeof systemWithPublicRelations>;
export type SystemWithPublicDetailRelations = Prisma.SystemGetPayload<
  typeof systemWithPublicDetailRelations
>;

// BR-1.4 — the linked Organization's real name never appears publicly for an
// ANONYMIZED_ONLY system unless nameDisclosureApproved specifically
// authorizes it. Deliberately NOT the same flag as clientApproved (BR-1.1's
// publish gate) — approving publication of an anonymized case study is not
// the same authorization as approving disclosure of the real name in it.
// The generic label leans on Domain when available ("a fintech client")
// rather than a bare "a client", per the business rule's own example.
function publicOrganizationName(system: SystemWithPublicRelations): string {
  if (system.clientVisibility === "ANONYMIZED_ONLY" && !system.nameDisclosureApproved) {
    if (!system.domain) return "a client";
    const label = system.domain.label.toLowerCase();
    const article = /^[aeiou]/.test(label) ? "an" : "a";
    return `${article} ${label} client`;
  }
  return system.organization.name;
}

// BR-1.3 — NDA_RESTRICTED systems never expose repoUrl/liveUrl publicly,
// regardless of contentStatus. Enforced here, at serialization, so a future
// new endpoint reusing this function can't accidentally leak it by skipping
// a check the route author didn't know to add.
function publicRepoUrl(system: SystemWithPublicRelations): string | null {
  return system.clientVisibility === "NDA_RESTRICTED" ? null : system.repoUrl;
}

function publicLiveUrl(system: SystemWithPublicRelations): string | null {
  return system.clientVisibility === "NDA_RESTRICTED" ? null : system.liveUrl;
}

// Extends BR-1.3's intent to a field that didn't exist when that rule was
// written: a homepage screenshot exposes an NDA_RESTRICTED client's actual
// product even more directly than the raw URL text would, so it gets the
// same treatment as repoUrl/liveUrl.
function publicScreenshotUrl(system: SystemWithPublicRelations): string | null {
  return system.clientVisibility === "NDA_RESTRICTED" ? null : system.screenshotUrl;
}

export function toPublicSystem(system: SystemWithPublicRelations) {
  return {
    id: system.id,
    name: system.name,
    slug: system.slug,
    organization: publicOrganizationName(system),
    status: system.status.label,
    // Status color is data, not code (EXT-1 — see Status.colorToken,
    // seeded per key). Exposed alongside the label so any renderer — this
    // app's own SystemCard, or a future external consumer of this same
    // public JSON — can render the status color without a hardcoded map.
    statusColorToken: system.status.colorToken,
    domain: system.domain?.label ?? null,
    description: system.description,
    repoUrl: publicRepoUrl(system),
    liveUrl: publicLiveUrl(system),
    screenshotUrl: publicScreenshotUrl(system),
    techStack: system.techStack,
    isFlagship: system.isFlagship,
  };
}

export function toPublicSystemDetailed(system: SystemWithPublicDetailRelations) {
  return {
    ...toPublicSystem(system),
    caseStudyBody: system.caseStudyBody ?? "",
    impacts: system.impacts.map((impact) => ({ label: impact.label, value: impact.value })),
    testimonials: system.testimonials.map((testimonial) => ({
      authorName: testimonial.authorName,
      authorRole: testimonial.authorRole,
      organization: testimonial.organization,
      quote: testimonial.quote,
    })),
  };
}

export { systemWithPublicRelations, systemWithPublicDetailRelations };

// ============================================================
// ADMIN-SIDE RULES (BR-1.1, BR-1.2, BR-1.10)
// ============================================================

const systemWithAdminRelations = Prisma.validator<Prisma.SystemDefaultArgs>()({
  include: {
    organization: true,
    status: true,
    domain: true,
    impacts: { orderBy: { sortOrder: "asc" } },
    testimonials: true, // admin sees all testimonials, not just hasPermission=true (BR-6.1 is a public-surface rule)
  },
});

export type SystemWithAdminRelations = Prisma.SystemGetPayload<typeof systemWithAdminRelations>;
export { systemWithAdminRelations };

// Admin sees everything, unmasked — no BR-1.3/1.4 filtering, since this is
// never served to a visitor.
export function toAdminSystem(system: SystemWithAdminRelations) {
  return {
    id: system.id,
    name: system.name,
    slug: system.slug,
    organization: system.organization.name,
    status: system.status.label,
    statusColorToken: system.status.colorToken,
    domain: system.domain?.label ?? null,
    description: system.description,
    repoUrl: system.repoUrl,
    liveUrl: system.liveUrl,
    screenshotUrl: system.screenshotUrl,
    techStack: system.techStack,
    isFlagship: system.isFlagship,
    sortOrder: system.sortOrder,
    featuredOnHome: system.featuredOnHome,
    homeOrder: system.homeOrder,
    caseStudyBody: system.caseStudyBody ?? "",
    impacts: system.impacts.map((i) => ({ label: i.label, value: i.value })),
    testimonials: system.testimonials.map((t) => ({
      id: t.id,
      authorName: t.authorName,
      authorRole: t.authorRole,
      organization: t.organization,
      quote: t.quote,
      hasPermission: t.hasPermission,
    })),
    contentStatus: system.contentStatus,
    clientVisibility: system.clientVisibility,
    clientApproved: system.clientApproved,
    nameDisclosureApproved: system.nameDisclosureApproved,
    needsCuration: system.needsCuration,
    createdAt: system.createdAt.toISOString(),
    updatedAt: system.updatedAt.toISOString(),
  };
}

// BR-1.2 — clientVisibility defaults to REQUIRES_APPROVAL at creation time
// for any System linked to an Organization where isClient=true. Client
// input is not trusted to set this correctly on its own — this function is
// the single place that decision gets made, called from the create route,
// never left to whatever the request body happened to send.
export function defaultClientVisibility(
  organizationIsClient: boolean,
  requested: ClientVisibility | undefined
): ClientVisibility {
  if (organizationIsClient) return "REQUIRES_APPROVAL";
  return requested ?? "PUBLIC";
}

// BR-1.1 — the actual publish gate. Takes the CURRENT database values (not
// the request body) so BR-1.10's transactional re-read is meaningful: this
// function must be called with state read inside the same transaction that
// performs the update, never with a value cached from earlier in the request.
export function canPublish(current: {
  clientVisibility: ClientVisibility;
  clientApproved: boolean;
}): boolean {
  return current.clientVisibility === "PUBLIC" || current.clientApproved;
}
