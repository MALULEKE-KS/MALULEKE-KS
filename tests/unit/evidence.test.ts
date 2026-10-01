// docs/EVIDENCE-SPEC.md — the evidence schema's laws (EV-1, EV-4, EV-5, EV-6)
// and the status / link rules (EV-2, EV-4).

import { describe, expect, it } from "vitest";
import { EvidenceBlock, EvidenceHref } from "@/lib/evidence/schema";
import { publicStatus, resolveHref } from "@/lib/evidence";

const claim = (over: Record<string, unknown> = {}) => ({
  id: "a-claim",
  claim: "A claim",
  where: "principle:Smart Not Hard",
  status: "verified",
  proves: "What it proves.",
  doesNotProve: "What it doesn't.",
  evidence: [{ label: "Source", kind: "source", href: "repo:lib/evidence/index.ts" }],
  reviewedAt: "2026-10-01",
  ...over,
});

describe("EV-6 — links are public by construction", () => {
  it.each(["repo:lib/auth/with-admin.ts", "repo:app/api/v1/lookups", "/systems/maluleke-ks", "/method#principles", "actions:ci.yml"])("accepts %s", (href) => {
    expect(EvidenceHref.safeParse(href).success).toBe(true);
  });
  it.each([
    "repo:.env.local",
    "repo:config/.env",
    "repo:../secrets",
    "repo:/etc/passwd",
    "repo:.vercel/project.json",
    "/admin",
    "/admin/inquiries",
    "/api/v1/admin/content",
    "https://evil.example",
    "javascript:alert(1)",
    "actions:ci.sh",
    "/x/../admin",
  ])("refuses %s", (href) => {
    expect(EvidenceHref.safeParse(href).success).toBe(false);
  });
});

describe("EV-1 / EV-5 — every claim carries evidence and both scopes", () => {
  it("needs at least one link", () => {
    expect(EvidenceBlock.safeParse({ claims: [claim({ evidence: [] })] }).success).toBe(false);
  });
  it("needs what it doesn't prove", () => {
    expect(EvidenceBlock.safeParse({ claims: [claim({ doesNotProve: "" })] }).success).toBe(false);
  });
  it("refuses duplicate ids", () => {
    expect(EvidenceBlock.safeParse({ claims: [claim(), claim()] }).success).toBe(false);
  });
  it("refuses a review date in the future", () => {
    expect(EvidenceBlock.safeParse({ claims: [claim({ reviewedAt: "2999-01-01" })] }).success).toBe(false);
  });
  it("accepts a well-formed claim", () => {
    expect(EvidenceBlock.safeParse({ claims: [claim()] }).success).toBe(true);
  });
});

describe("EV-4 — verified lapses on its own", () => {
  const now = Date.parse("2026-10-02");
  it("stays verified inside the window", () => {
    expect(publicStatus("verified", "2026-09-01", 90, now)).toBe("verified");
  });
  it("becomes review due after it", () => {
    expect(publicStatus("verified", "2026-06-01", 90, now)).toBe("review-due");
  });
  it("never upgrades partial or planned", () => {
    expect(publicStatus("partial", "2026-10-01", 90, now)).toBe("partial");
    expect(publicStatus("planned", "2020-01-01", 90, now)).toBe("planned");
  });
});

describe("EV-2 — links point at the running commit", () => {
  it("pins repo links to the commit", () => {
    expect(resolveHref("repo:lib/a b.ts", { repository: "o/r", commit: "abc123" }).url).toBe("https://github.com/o/r/blob/abc123/lib/a%20b.ts");
  });
  it("falls back to main without a commit", () => {
    expect(resolveHref("repo:lib/x.ts", { repository: "o/r", commit: null }).url).toBe("https://github.com/o/r/blob/main/lib/x.ts");
  });
  it("keeps site routes on the site", () => {
    expect(resolveHref("/method#principles", { repository: "o/r", commit: null })).toEqual({ url: "/method#principles", external: false });
  });
});
