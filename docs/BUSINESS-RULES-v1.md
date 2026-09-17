# MALULEKE-KS — BUSINESS RULES DOCUMENT v1.0

**Derives from:** PLATFORM-CONSTITUTION-v1.md (structure) and PLATFORM-OVERVIEW-AND-RATIONALE.md (rationale)
**Status:** Locked
**Scope:** This document is behavior. The constitution defines what entities and routes exist; this defines what happens — the explicit policy every implementation must enforce, not just describe.

---

## 1. Content Publishing Rules

| Rule | Statement |
|---|---|
| BR-1.1 | `contentStatus` transitions `draft → published` are blocked at the API layer — not just discouraged in the admin UI — whenever `clientVisibility != PUBLIC` and `clientApproved = false`. This is a server-side constraint, never a client-side checkbox someone forgets |
| BR-1.2 | `clientVisibility` defaults to `REQUIRES_APPROVAL` at creation time for any `System` linked to an `Organization` where `isClient = true`. The default is restrictive; opening it up is a deliberate admin action, never the starting state |
| BR-1.3 | `NDA_RESTRICTED` systems never expose `repoUrl` or `liveUrl` in any public API response, regardless of `contentStatus`. This is enforced at the serialization layer, so a future new endpoint can't accidentally leak it |
| BR-1.4 | `ANONYMIZED_ONLY` systems never expose the linked `Organization` name publicly. Case study text must refer to it generically ("a fintech client") unless `clientApproved` specifically authorizes the real name |
| BR-1.5 | `contentStatus` stays a fixed three-value state machine — `draft` / `published` / `archived` — not a lookup table. Per the EXT-1 exception already established for `ClientVisibility`: this is a control state, not a growing content dimension |
| BR-1.6 | Systems created by the GitHub sync job always land as `contentStatus = draft` with a `needsCuration` flag. Nothing is ever auto-published from a sync |
| BR-1.7 | The GitHub sync job only ever ingests public repositories. Private/internal repos are never auto-synced, regardless of PAT scope — private and confidential work is added to the platform only via a deliberate `POST /admin/systems` action, never picked up automatically |
| BR-1.8 | `needsCuration` is cleared (`false`) the moment an admin opens and saves that system's detail view in `/admin/systems/[id]` — whether or not they choose to publish it. A system an admin has actually looked at no longer belongs in the curation queue, even if it stays in draft |
| BR-1.9 | `System` rows are never hard-deleted. Retirement is expressed as `contentStatus = archived`. There is no `DELETE /admin/systems/{id}` endpoint |
| BR-1.10 | A request that would set `contentStatus = published` is evaluated and committed inside a single database transaction that re-reads `clientVisibility` and `clientApproved` at commit time — never against a value read earlier in the request — so two concurrent edits can't race past the BR-1.1 check |

## 2. Inquiry Handling Rules

| Rule | Statement |
|---|---|
| BR-2.1 | Every `Inquiry` starts at `status = new`. `new → reviewed` is always mandatory — triage happens before anything else. From `reviewed`, an admin may move to either `responded` (a real reply was sent) or directly to `closed` (spam, irrelevant, or otherwise not requiring a reply). `new → responded` and `new → closed` are never valid — every inquiry is reviewed at least once before it's resolved |
| BR-2.2 | Triage SLA: every `new` inquiry gets reviewed within 48 hours. This is the one part of the platform where the solo-maintainer cadence (Constitution §11) is deliberately tighter than the monthly content pass — a job or client opportunity doesn't wait a month |
| BR-2.3 | Required fields: name, valid email format, message (minimum 20 characters — long enough to filter empty/spam submissions; maximum 5,000 characters — long enough for any legitimate detailed request, short enough to close off an unbounded-payload submission vector), `inquiryType` |
| BR-2.4 | Rate limit: maximum 5 inquiry submissions per IP per 24 hours. Applies identically whether the submission came through the human form or the agent's `submit_inquiry` tool — no privileged path around the limit. The IP address used for this check is retained only as long as needed to enforce the 24-hour window — it is not part of the 24-month `Inquiry`/`Event` retention policy (BR-5.2) and is purged on its own short rolling schedule |
| BR-2.5 | `source` is captured automatically from the referring page/system at submission time — never a field the visitor fills in — so attribution (Constitution §8) is always accurate. When no `Referer` header is present (direct navigation, privacy-conscious browsers), `source` is recorded as `"direct"` rather than left to fail or crash the submission |
| BR-2.6 | `POST /inquiries` accepts an optional client-generated idempotency key. A resubmission with the same key within a short window (10 minutes) returns the original confirmation rather than creating a second `Inquiry` row — protects against double-click and retry-on-flaky-network duplicate submissions |
| BR-2.7 | The contact form's honeypot field, if filled, returns the same `201` confirmation shape as a real success — never a `400` or any response distinguishable from a genuine submission — so an automated filler gets no signal that it was caught. No `Inquiry` row is created |

## 3. Admin Access & Security Rules

| Rule | Statement |
|---|---|
| BR-3.1 | Two-factor authentication is mandatory before any write action succeeds. There is no "remind me later" or degraded-but-functional state — a session without verified 2FA cannot mutate data |
| BR-3.2 | Five consecutive failed logins trigger progressive delay (reusing the existing bcrypt-cost-12 + progressive-delay pattern), escalating to a temporary lockout on continued failures |
| BR-3.3 | Admin sessions expire after 30 minutes of inactivity, full stop |
| BR-3.4 | Every admin mutation — and every login attempt, success or failure — writes to `ActivityLog` automatically at the middleware layer. No code path is permitted to bypass this; it is not something a route handler opts into |
| BR-3.5 | A login `challengeToken` (issued after step-1 credentials succeed) expires after 5 minutes and is single-use — consumed on the first `verify-2fa` attempt, success or failure. An expired or already-consumed token returns the same generic `401` as a wrong code, and the admin must restart from credentials |
| BR-3.6 | The 6-digit TOTP code is rate-limited independently of BR-3.2: 5 consecutive failed verification attempts against the same `challengeToken` invalidate that token immediately (BR-3.5) rather than allowing continued guessing — a stolen or guessed `challengeToken` cannot be brute-forced into a session |
| BR-3.7 | In addition to the 30-minute idle timeout (BR-3.3), every admin session has a hard maximum lifetime of 12 hours from issuance, regardless of activity. A session that hits either limit is ended identically — redirect to `/admin/login`, neutral "Session ended" copy, no distinction shown between idle-expiry and absolute-expiry |
| BR-3.8 | The session identifier issued after step-1 credentials (if any pre-2FA state is tracked) is never the same identifier promoted to an authenticated session after step-2 succeeds. A new session ID is always minted at the moment 2FA verification succeeds, preventing session-fixation across the two-step flow |
| BR-3.9 | Every state-changing admin request (`POST`/`PATCH`/`DELETE` under `/admin`) is protected against cross-site request forgery — the session cookie is `SameSite=Strict` at minimum, and mutating routes verify a CSRF token or an equivalent double-submit / origin check before executing |
| BR-3.10 | `AdminUser.email` is normalized to lowercase on write and on every lookup (login, password reset). Uniqueness and authentication can never be bypassed or fail solely due to letter-casing differences |

## 3a. Account Recovery

| Rule | Statement |
|---|---|
| BR-3.11 | At 2FA setup, exactly 10 recovery codes are generated, shown once, and stored hashed. Each is single-use, consumed on successful use (already reflected in `AdminUser.recoveryCodes` being an array of one-time codes) |
| BR-3.12 | When fewer than 3 unused recovery codes remain, the admin dashboard surfaces a persistent (non-blocking) notice to regenerate a fresh batch. Regenerating invalidates all previously issued codes immediately |
| BR-3.13 | Because `AdminUser` is single-owner (Constitution §1), there is no self-serve "forgot password" email flow in V1 — that would require a second communication channel the platform can't yet verify safely. Recovery from total lockout (password and all recovery codes lost) is a documented manual operator procedure (direct database credential reset by whoever holds infrastructure access), not an application feature. This is a deliberate, accepted V1 limitation, not an oversight |

## 4. AI and Agent Boundaries

| Rule | Statement |
|---|---|
| BR-4.1 | Tier 2 agent tools are read-only with exactly one exception: `submit_inquiry`. No other tool may ever mutate `System`, `Timeline`, `Skill`, `Testimonial`, or any other entity |
| BR-4.2 | `submit_inquiry` invoked by the agent passes through the identical validation and rate-limiting as the human form (BR-2.3, BR-2.4). The agent gets no privileged bypass |
| BR-4.3 | The concierge must not state a fact about Kurhula that isn't grounded in `ContentChunk` retrieval. When asked something ungrounded, the correct behavior is to say it doesn't know — never to infer or fabricate a plausible-sounding answer |
| BR-4.4 | New agent tools ship disabled via `Flag` by default. Enabling a tool is an explicit admin action — opt-in, never opt-out |
| BR-4.5 | The admin copilot drafts; it never publishes. A copilot-generated case study, reply, or flagged discrepancy requires explicit human approval before it changes anything live |

## 5. Analytics and Privacy Rules

| Rule | Statement |
|---|---|
| BR-5.1 | No `Event` is recorded before consent is given via the cookie/consent banner. Consent gates collection, not just display |
| BR-5.2 | `Inquiry` and `Event` records are retained for 24 months from creation, then anonymized (PII stripped, aggregate data retained) or purged. One retention policy governs both, per the Constitution's stated requirement that they share a policy. This runs as a scheduled job (same scheduler adapter as the GitHub sync — `lib/adapters/scheduler/`), not a manual process |
| BR-5.3 | Public-facing statistics are always admin-curated, point-in-time figures ("By the numbers" — Constitution §8). Raw, live, or per-visitor data is never exposed publicly, under any view |
| BR-5.4 | BR-5.1's consent gate applies equally to the first-party `Event` table and to any third-party analytics provider (Vercel Analytics) — a visitor declining consent is excluded from both, not just the first-party one |
| BR-5.5 | A visitor may request deletion of a specific `Inquiry` they submitted. In V1 this is handled manually — the confirmation screen and email (BR-2.6-adjacent) states "To request removal of this submission, contact [email]" — and the admin actions it by hand via `/admin/inquiries`. A self-serve deletion endpoint is deferred to V1.1 (Constitution §13); this rule exists so the right itself is honored from launch, even before the automated path exists |

## 6. Testimonial Rules

| Rule | Statement |
|---|---|
| BR-6.1 | A `Testimonial` with `hasPermission = false` is never displayed publicly. There is no draft-preview exception for this specific field — permission is binary and absolute |
| BR-6.2 | A `Testimonial` linked to a `System` can only be displayed if that `System.contentStatus = published`. No showcasing praise for a project the visitor can't actually see |

## 7. CV and Document Generation Rules

| Rule | Statement |
|---|---|
| BR-7.1 | Every `DocumentGen` output reflects the live database state at generation time — never a manually maintained static file drifting out of sync |
| BR-7.2 | Prior generated documents are superseded, not deleted, when a new one is generated for the same `type`/`targetRole` pair — consistent with the platform's additive-only philosophy (EXT-1) |

## 8. Extension Governance

| Rule | Statement |
|---|---|
| BR-8.1 | New values may be added to any lookup table (`Status`, `Domain`, `InquiryType`, `MilestoneType`, `SkillCategory`) by the admin at any time, without a deployment |
| BR-8.2 | An existing lookup value that's in use is never hard-deleted — it's soft-deprecated (marked inactive, hidden from new-entry pickers) so historical records referencing it stay accurate. Hard deletion is reserved for values that were never actually used. This is enforced in code (`lib/rules/lookups.ts` checks for referencing rows before allowing a delete), not left to admin discipline alone |
| BR-8.3 | A lookup value's `key` stays unique (including deprecated ones) — an admin cannot create a new value with the same `key` as a soft-deprecated one. The correct action is reactivating the deprecated value, and the API returns a specific, actionable error (`LOOKUP_KEY_DEPRECATED`) rather than a raw uniqueness-constraint failure |

---

*Every rule above is enforceable at the API or middleware layer — none of them depend on an admin remembering to follow a convention. That's the difference between a business rule and a suggestion.*
