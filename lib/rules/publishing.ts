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

import { Prisma, ContentStatus } from "@prisma/client";

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
    return system.domain ? `a ${system.domain.label.toLowerCase()} client` : "a client";
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

export function toPublicSystem(system: SystemWithPublicRelations) {
  return {
    id: system.id,
    name: system.name,
    slug: system.slug,
    organization: publicOrganizationName(system),
    status: system.status.label,
    domain: system.domain?.label ?? null,
    description: system.description,
    repoUrl: publicRepoUrl(system),
    liveUrl: publicLiveUrl(system),
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
