// lib/rules/publishing.ts
// BR-1.x as enforceable code (docs/BUSINESS-RULES-v1.md §1).
//
// PUBLIC side (F1.7): every visibility and masking rule — BR-1.1 published
// only, BR-1.3 NDA links, BR-1.4 anonymized names, BR-1.7 private repos — is
// applied by the database, in the PublicSystem view. Public code reads that
// view and maps its rows to the wire shape; it holds no masking logic of its
// own, so there is nothing to forget or to drift from the SQL.
//
// ADMIN side (below): the unmasked shape and the publish gate.

import { Prisma, type ClientVisibility, type PublicSystem } from "@prisma/client";

/** The public wire shape (openapi SystemPublic) from a PublicSystem view row. */
export function toPublicSystem(row: PublicSystem) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    organization: row.organization,
    status: row.status,
    // Status colour is data, not code (EXT-1).
    statusColorToken: row.statusColorToken,
    domain: row.domain,
    description: row.description,
    repoUrl: row.repoUrl,
    liveUrl: row.liveUrl,
    screenshotUrl: row.screenshotUrl,
    techStack: row.techStack,
    isFlagship: row.isFlagship,
    repoPrivate: row.repoPrivate,
  };
}

// ============================================================
// ADMIN-SIDE RULES (BR-1.1, BR-1.2, BR-1.10)
// ============================================================

const systemWithAdminRelations = Prisma.validator<Prisma.SystemDefaultArgs>()({
  include: {
    organization: true,
    status: true,
    domain: true,
    impacts: { orderBy: { sortOrder: "asc" } },
    repoRelationship: true,
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
    onCv: system.onCv,
    cvOrder: system.cvOrder,
    repoRelationship: system.repoRelationship?.key ?? null,
    ownerPermission: system.ownerPermission.toLowerCase(),
    ownerPermissionFrom: system.ownerPermissionFrom,
    ownerPermissionAt: system.ownerPermissionAt?.toISOString() ?? null,
    ownerPermissionNote: system.ownerPermissionNote,
    github: {
      fullName: system.githubFullName,
      ownerLogin: system.githubOwnerLogin,
      pushedAt: system.githubPushedAt?.toISOString() ?? null,
      languages: (system.githubLanguages as Record<string, number> | null) ?? null,
      topics: system.githubTopics,
      stars: system.githubStars,
      syncedAt: system.githubSyncedAt?.toISOString() ?? null,
    },
    repoPrivate: system.repoPrivate,
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
