// lib/evidence/index.ts
// Reading the evidence block for a page (docs/EVIDENCE-SPEC.md): each claim's
// public status (EV-4 — "verified" lapses to "review due" on its own) and its
// links resolved to real URLs (EV-2 — pinned to the commit that is running).

import { cache } from "react";
import { getContentBlock } from "@/lib/content/blocks";
import { getSetting } from "@/lib/settings";
import type { EvidenceClaimT, EvidenceKind } from "@/lib/evidence/schema";

export type PublicStatus = "verified" | "partial" | "planned" | "review-due";

export interface ResolvedLink {
  label: string;
  kind: EvidenceKind;
  url: string;
  external: boolean;
}

export interface ResolvedClaim {
  id: string;
  claim: string;
  where: string;
  status: PublicStatus;
  proves: string;
  doesNotProve: string;
  reviewedAt: string;
  links: ResolvedLink[];
}

export interface EvidenceSource {
  repository: string;
  /** The running commit, or null when unknown (links then point at main and say so). */
  commit: string | null;
}

/** EV-4: a verified claim whose review has lapsed shows "review due"; the date is the only input. */
export function publicStatus(status: EvidenceClaimT["status"], reviewedAt: string, reviewDays: number, now = Date.now()): PublicStatus {
  if (status !== "verified") return status;
  const age = now - Date.parse(reviewedAt);
  return age > reviewDays * 24 * 3600 * 1000 ? "review-due" : "verified";
}

/** EV-2: repo links pinned to the running commit (main when unknown). */
export function resolveHref(href: string, source: EvidenceSource): { url: string; external: boolean } {
  const ref = source.commit ?? "main";
  if (href.startsWith("repo:")) {
    const path = href.slice(5).replace(/\/$/, "");
    return { url: `https://github.com/${source.repository}/blob/${ref}/${path.split("/").map(encodeURIComponent).join("/")}`, external: true };
  }
  if (href.startsWith("actions:")) {
    return { url: `https://github.com/${source.repository}/actions/workflows/${encodeURIComponent(href.slice(8))}`, external: true };
  }
  return { url: href, external: false };
}

export async function evidenceSource(): Promise<EvidenceSource> {
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;
  const repository = owner && slug ? `${owner}/${slug}` : await getSetting("evidence.repository");
  return { repository, commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null };
}

/** Every published claim, resolved — keyed by where it sits ("principle:<name>", "pulse:<key>", "system:<slug>"). */
export const getEvidence = cache(async (): Promise<{ claims: ResolvedClaim[]; source: EvidenceSource }> => {
  const [block, reviewDays, source] = await Promise.all([getContentBlock("evidence"), getSetting("evidence.reviewDays"), evidenceSource()]);
  const claims = (block?.claims ?? []).map((c) => ({
    id: c.id,
    claim: c.claim,
    where: c.where,
    status: publicStatus(c.status, c.reviewedAt, reviewDays),
    proves: c.proves,
    doesNotProve: c.doesNotProve,
    reviewedAt: c.reviewedAt,
    links: c.evidence.map((e) => ({ label: e.label, kind: e.kind, ...resolveHref(e.href, source) })),
  }));
  return { claims, source };
});

/** The claims sitting beside one thing on a page. EV-1: none → the page shows no evidence affordance. */
export function claimsFor(claims: ResolvedClaim[], where: string): ResolvedClaim[] {
  return claims.filter((c) => c.where.toLowerCase() === where.toLowerCase());
}
