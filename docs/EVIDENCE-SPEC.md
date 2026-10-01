# Evidence Density & Proof Architecture — strengthened spec

The owner's feature spec (2026-10-01), audited against the repository and tightened: what already exists, the rules that close its loopholes, what was cut as noise, the first slice, and the decisions left to the owner. **This document is the source of truth for the feature**; the owner's original text is the brief it answers.

> Every meaningful claim leads to honest, inspectable evidence — and the platform itself keeps the claim honest, not a person remembering to.

## 1. Audit — what already exists (reuse, don't rebuild)

| Already built | What it gives the feature |
|---|---|
| `docs/ENFORCEMENT-REGISTER.md` (115 rows) | A claim → where it's enforced → its test map. The private master list the public evidence is drawn from. |
| `PublicPlatformPulse` + the home **Control room** | Live, database-computed facts (rules enforced by the database, audit entries, last sync) with no typed-in numbers. |
| `PrinciplesBand` + `SiteContent` "how-i-build" | The principles — the site's biggest claims — already admin-edited data. |
| Case studies (`/systems/[slug]`), auto write-ups (BR-4.5), screenshots (BR-1.18), activity, status history | Per-system evidence; MALULEKE-KS is itself a system with a case study. |
| `openapi-contract.yaml`, `lib/capabilities/map.ts` + generated guides | The API and every database capability, documented and test-enforced (`capability-coverage.test.ts`). |
| The repository is **public**; CI (`ci.yml`): lint, unit + integration + e2e (phones), build, migration guard, AI eval | Evidence a visitor can open and read: the actual source, tests and pipeline. |
| Vercel exposes the deployed commit (`/api/v1/platform/pulse` reports it) | Links can point at **the exact commit that is running**. |

**Conclusion:** no new table, route or job is needed for the first slice. The gap is presentation and honesty rules, not data.

## 2. Rules (each one is enforced, not hoped for)

- **EV-1 — A claim shows evidence or shows nothing.** A claim with no published evidence entry renders without an evidence affordance — never a "proof" button that leads nowhere.
- **EV-2 — Evidence points at the running code.** Repository links are built from the deployed commit SHA (never `main`), so a visitor reads the code that is actually serving them. Locally/without a SHA, links fall back to `main` and say so.
- **EV-3 — No broken evidence ships.** A CI test resolves every evidence link: repository paths must exist at that commit, site routes must exist, `#anchors` must exist in their page. A dead link fails the build.
- **EV-4 — Status is computed, then capped by review.** Four public states only: **Verified**, **Partial**, **Planned**, **Review due**. *Verified* requires at least one inspectable link and a `reviewedAt` within `evidence.reviewDays` (admin setting, default 90); past that it is shown **Review due** automatically — the site never presents an unreviewed claim as verified. A `reviewedAt` in the future is invalid.
- **EV-5 — The claim is never wider than the evidence.** Every entry states **what it proves** and **what it does not prove** (both required fields). Test counts are never shown as proof of correctness; GitHub activity never as proof of quality.
- **EV-6 — Public-safe by construction.** Evidence may link only to: public repo paths, public site routes, the public API contract. Admin routes (`/admin`, `/api/v1/admin`), `.env*`, `prisma/seed*` data and private repos are rejected by the schema, not by review.
- **EV-7 — Not by colour alone, not by hover alone.** Status is a word plus an icon; evidence opens on click/tap/Enter with the same content on phones.
- **EV-8 — The source of truth is the code.** When docs and code disagree, the evidence follows the code and the doc is corrected in the same PR (and its ENFORCEMENT-REGISTER row).

## 3. The model — a content block, not a schema

One admin-editable `SiteContent` block, `evidence`, validated by Zod in `lib/content/blocks.ts` (EXT-1: a new claim is data):

```
claims: [{
  id:        kebab-case, unique            // stable anchor: /#evidence-<id>
  claim:     ≤ 120 chars                   // "Business rules are enforced by the database, not the UI"
  where:     "principle:<name>" | "pulse:<key>" | "system:<slug>"   // the claim it sits beside
  status:    "verified" | "partial" | "planned"   // "review due" is computed (EV-4)
  proves:    ≤ 300 chars
  doesNotProve: ≤ 300 chars
  evidence:  1–6 × { label ≤ 80, kind: "source"|"test"|"route"|"contract"|"pipeline"|"case-study", href }
  reviewedAt: ISO date
}]  // ≤ 24 claims
```

Rendered by one reusable component, **`EvidenceDrawer`**: a quiet "Evidence · 3" chip beside the claim → a drawer (sheet on phones) with the claim, status, what it proves / doesn't, and the links grouped by kind. Progressive disclosure: overview on the page, detail in the drawer, the code one click further.

## 4. Where it appears (first slice)

1. **Home → Principles band:** each principle gets its evidence (EXT-1 → lookup tables + capability test; Permission Boundaries → BR-4.x guide tests; Controlled Imperfection → audit triggers + ActivityLog test; Make It Exist First → the release history).
2. **Home → Control room:** each live tile links to how that number is computed (the view, its test).
3. **MALULEKE-KS case study:** an "Evidence" section listing the platform's claims in one place — the portfolio as its own case study.

Not in the first slice: per-skill evidence (skills already link to systems/roles — enough until a visitor need is shown).

## 5. Edge cases and loopholes closed

| Case | Behaviour |
|---|---|
| Claim has no evidence yet | No chip (EV-1). |
| Evidence link dies (file moved/renamed) | Build fails before it ships (EV-3). |
| Review lapses | Auto-downgrade to *Review due* (EV-4); admin overview lists due claims. |
| Deployed SHA unknown | Links to `main`, labelled "latest source" (EV-2). |
| GitHub down | Links still render (they're plain links); nothing on the page fetches GitHub at view time. |
| Partial implementation | Status *Partial* + the doesNotProve line says what's missing. |
| Someone pastes an admin/secret path into the block | Rejected by the schema (EV-6). |
| Doc claims something not built | Flagged in §7 and fixed in docs, never shown as evidence. |
| AI guide quotes a claim | The guide reads the same block; it may cite evidence, never upgrade a status. |

## 6. Cut as noise

The 7-state vocabulary (Implemented / Experimental / Needs review / Unavailable folded into 4 — visitors can't tell "Implemented" from "Verified"); a separate claims/evidence table; a skills-evidence page; charts and badges; analytics on evidence clicks; automated "freshness" crawlers (EV-3 checks at build, EV-4 by date — enough).

## 7. Claims found that the code does not support (fix in docs, not on the site)

- **Constitution §1, Controlled Imperfection:** "the concierge's most-asked-unanswered questions feed directly into what content gets prioritized next" — **not implemented** (no unanswered-question capture exists). Either build it (V2 candidate) or reword to what exists (audit log → fixes).
- To be completed during the slice: every principle body and Control-room line is checked against the register before its evidence entry is written.

## 8. Owner decisions (decided 2026-10-02 — "use the best recommended way")

1. `evidence.reviewDays` defaults to **90** (admin setting).
2. *Planned* claims appear **only on the MALULEKE-KS case study**, never on the home page.

## 9. Related home change (owner, 2026-10-02)

The home page's AI guide section becomes an **inviting collapsed bar** — the guide's portrait, "Ask my AI guide", three question chips; the bar or a chip opens it (animated height, the chosen question ready). Closed by default; the chat's code loads only when opened; keyboard and screen-reader operable (`aria-expanded`); reduced motion opens instantly.
