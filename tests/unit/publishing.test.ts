// tests/unit/publishing.test.ts
// Covers BR-1.3 (NDA_RESTRICTED hides repoUrl/liveUrl) and BR-1.4
// (ANONYMIZED_ONLY masks organization name unless nameDisclosureApproved) —
// pure unit tests, no database, since these are serialization-layer rules.
//
// nameDisclosureApproved is deliberately a separate field from
// clientApproved: clientApproved authorizes publishing (BR-1.1),
// nameDisclosureApproved authorizes revealing the real org name (BR-1.4).
// Reusing one flag for both would make masking unreachable for any actually
// published system, since BR-1.1 requires clientApproved=true to publish
// anything non-PUBLIC.

import { describe, expect, it } from "vitest";
import { toPublicSystem, type SystemWithPublicRelations } from "@/lib/rules/publishing";

function makeSystem(overrides: Partial<SystemWithPublicRelations> = {}): SystemWithPublicRelations {
  return {
    id: "sys_1",
    name: "Test System",
    slug: "test-system",
    githubRepoId: null,
    organizationId: "org_1",
    organization: { id: "org_1", name: "Real Client Name", slug: "real-client", role: null, isClient: true, githubLogins: [], createdAt: new Date() },
    statusId: "status_1",
    status: { id: "status_1", key: "finished", label: "Finished", colorToken: "signal-finished", active: true },
    domainId: "domain_1",
    domain: { id: "domain_1", key: "fintech", label: "Fintech", active: true },
    description: "A description.",
    repoUrl: "https://github.com/example/repo",
    liveUrl: "https://example.com",
    screenshotUrl: "https://example.com/screenshot.png",
    techStack: ["TypeScript"],
    isFlagship: false,
    sortOrder: 0,
    clientVisibility: "PUBLIC",
    clientApproved: false,
    nameDisclosureApproved: false,
    contentStatus: "PUBLISHED",
    needsCuration: false,
    caseStudyBody: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SystemWithPublicRelations;
}

describe("toPublicSystem", () => {
  it("exposes repoUrl/liveUrl for a PUBLIC system", () => {
    const result = toPublicSystem(makeSystem({ clientVisibility: "PUBLIC" }));
    expect(result.repoUrl).toBe("https://github.com/example/repo");
    expect(result.liveUrl).toBe("https://example.com");
  });

  it("hides repoUrl/liveUrl/screenshotUrl for an NDA_RESTRICTED system (BR-1.3)", () => {
    const result = toPublicSystem(makeSystem({ clientVisibility: "NDA_RESTRICTED" }));
    expect(result.repoUrl).toBeNull();
    expect(result.liveUrl).toBeNull();
    expect(result.screenshotUrl).toBeNull();
  });

  it("hides repoUrl/liveUrl/screenshotUrl for NDA_RESTRICTED even if clientApproved is true", () => {
    const result = toPublicSystem(
      makeSystem({ clientVisibility: "NDA_RESTRICTED", clientApproved: true })
    );
    expect(result.repoUrl).toBeNull();
    expect(result.liveUrl).toBeNull();
    expect(result.screenshotUrl).toBeNull();
  });

  it("exposes screenshotUrl for a PUBLIC system", () => {
    const result = toPublicSystem(makeSystem({ clientVisibility: "PUBLIC" }));
    expect(result.screenshotUrl).toBe("https://example.com/screenshot.png");
  });

  it("masks the organization name for ANONYMIZED_ONLY by default (BR-1.4)", () => {
    const result = toPublicSystem(makeSystem({ clientVisibility: "ANONYMIZED_ONLY" }));
    expect(result.organization).toBe("a fintech client");
  });

  it("uses \"an\" instead of \"a\" for a vowel-starting domain label", () => {
    const result = toPublicSystem(
      makeSystem({
        clientVisibility: "ANONYMIZED_ONLY",
        domain: {
          id: "domain_2",
          key: "architecture",
          label: "Architecture & Construction",
          active: true,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        },
      })
    );
    expect(result.organization).toBe("an architecture & construction client");
  });

  it("keeps the organization name masked even when clientApproved=true (the publish-gate flag)", () => {
    const result = toPublicSystem(
      makeSystem({ clientVisibility: "ANONYMIZED_ONLY", clientApproved: true, nameDisclosureApproved: false })
    );
    expect(result.organization).toBe("a fintech client");
  });

  it("falls back to a generic label when ANONYMIZED_ONLY has no domain", () => {
    const result = toPublicSystem(
      makeSystem({ clientVisibility: "ANONYMIZED_ONLY", domain: null, domainId: null })
    );
    expect(result.organization).toBe("a client");
  });

  it("reveals the real organization name once nameDisclosureApproved authorizes it", () => {
    const result = toPublicSystem(
      makeSystem({ clientVisibility: "ANONYMIZED_ONLY", nameDisclosureApproved: true })
    );
    expect(result.organization).toBe("Real Client Name");
  });

  it("never masks the organization name for non-ANONYMIZED_ONLY systems", () => {
    const result = toPublicSystem(makeSystem({ clientVisibility: "REQUIRES_APPROVAL" }));
    expect(result.organization).toBe("Real Client Name");
  });
});
