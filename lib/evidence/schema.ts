// lib/evidence/schema.ts
// The "evidence" content block's shape (docs/EVIDENCE-SPEC.md §3): claims the
// site makes, each with the evidence a visitor can open. The schema carries
// the spec's laws so a bad entry can't be saved, not just shouldn't be:
//   EV-1  a published claim has 1–6 evidence links
//   EV-4  "verified" needs an inspectable link; reviewedAt is a real, past date
//   EV-5  what it proves AND what it doesn't prove are both required
//   EV-6  links are public by construction — repo paths, public site routes,
//         the CI pipeline; never admin routes or secrets

import { z } from "zod";

const Text = (max: number) => z.string().trim().min(1).max(max);

export const EVIDENCE_KINDS = ["source", "test", "route", "contract", "pipeline", "case-study"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/** Where a claim sits: beside a principle, a Control-room line, or a system. */
const Where = z.string().trim().regex(/^(principle|pulse|system):[A-Za-z0-9 ._'&()-]{1,80}$/, "where must be principle:<name>, pulse:<key> or system:<slug>");

const REPO_PATH = /^[A-Za-z0-9_.()\[\]@+-]+(\/[A-Za-z0-9_.()\[\]@+-]+)*\/?$/;
// Never link to secrets or local-only files, even though the repo is public (EV-6).
const FORBIDDEN_REPO = /(^|\/)\.env|(^|\/)\.vercel(\/|$)|(^|\/)node_modules(\/|$)|\.(pem|key)$/i;
const ROUTE = /^\/[A-Za-z0-9_\-/.]*(#[A-Za-z0-9_-]+)?$/;
const PRIVATE_ROUTE = /^\/(admin|api\/v1\/admin)(\/|$|#)/;

/**
 * An evidence link, written as one of:
 *   repo:<path>           a file or folder in the public repository (EV-2: pinned to the running commit)
 *   /route[#anchor]       a public page on this site
 *   actions:<workflow>    a CI workflow's runs, e.g. actions:ci.yml
 */
export const EvidenceHref = z
  .string()
  .trim()
  .max(240)
  .refine((h) => {
    if (h.startsWith("repo:")) {
      const p = h.slice(5);
      return !p.includes("..") && REPO_PATH.test(p) && !FORBIDDEN_REPO.test(p);
    }
    if (h.startsWith("actions:")) return /^[A-Za-z0-9_.-]+\.ya?ml$/.test(h.slice(8));
    if (h.startsWith("/")) return ROUTE.test(h) && !h.includes("..") && !PRIVATE_ROUTE.test(h);
    return false;
  }, "a link must be repo:<path>, /public-route or actions:<workflow>.yml — never an admin route or a secret");

export const EvidenceLink = z.object({
  label: Text(80),
  kind: z.enum(EVIDENCE_KINDS),
  href: EvidenceHref,
});

export const CLAIM_STATUSES = ["verified", "partial", "planned"] as const;

export const EvidenceClaim = z
  .object({
    id: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60),
    claim: Text(120),
    where: Where,
    status: z.enum(CLAIM_STATUSES),
    proves: Text(300),
    doesNotProve: Text(300),
    evidence: z.array(EvidenceLink).min(1).max(6),
    reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "reviewedAt is a date, YYYY-MM-DD"),
  })
  .refine((c) => !Number.isNaN(Date.parse(c.reviewedAt)) && Date.parse(c.reviewedAt) <= Date.now() + 24 * 3600 * 1000, {
    message: "reviewedAt must be a real date, not in the future",
    path: ["reviewedAt"],
  });

export const EvidenceBlock = z
  .object({ claims: z.array(EvidenceClaim).max(24) })
  .refine((b) => new Set(b.claims.map((c) => c.id)).size === b.claims.length, { message: "claim ids must be unique", path: ["claims"] });

export type EvidenceClaimT = z.infer<typeof EvidenceClaim>;
export type EvidenceLinkT = z.infer<typeof EvidenceLink>;
