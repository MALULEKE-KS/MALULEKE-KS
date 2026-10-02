# Let's Talk — Opportunity Intake & Management — strengthened spec

The owner's feature spec (2026-10-01, "approved; V1 + V2 accountless tracking"), audited against the repository and tightened: what exists, the rules that close its loopholes, what was cut, the data model, and the decisions left to the owner. **This document is the source of truth for the feature**; the owner's original text is the brief. The person is always **Kurhula Success Maluleke** in copy, never "the system" or "KSDRILL".

## 1. Audit — what exists today

| Built | State |
|---|---|
| Header **Let's talk** → `/contact` | One form: type, name, email, message (20–5,000 chars). |
| `POST /api/v1/inquiries` | Honeypot (BR-2.7), IP rate limit from settings (BR-2.4), type from the `InquiryType` lookup (EXT-1), `source` from Referer (BR-2.5), idempotency key (BR-2.6), audited as an anonymous actor with no PII in the log. |
| `Inquiry` | Fixed status enum NEW → REVIEWED → RESPONDED/CLOSED (BR-2.1), 24-month anonymisation job (BR-5.2), manual deletion right (BR-5.5). |
| Admin → Inquiries | List + status change, 2FA-gated, every change in `ActivityLog`. |
| AI guide | May **draft** an inquiry for the visitor to send through the same form (BR-4.1/4.2). |
| File storage | Admin uploads only (CV, photos, screenshots), bytes in Postgres. **No public upload path exists.** |
| Email | **None.** No provider is wired — BR-5.5's "confirmation email" was never built. |

**Conclusion:** extend `Inquiry` — don't add a parallel "Application" system. The two real gaps are **outbound email** and **public documents**; both are new attack surface and are specified tightly below.

## 2. Loopholes found in what exists (fixed in V1)

1. **Idempotency key isn't bound to its payload or window.** Reusing a key returns the original row's confirmation forever, even for a different submission. → Store a payload hash; same key + same hash within 10 min = original confirmation; same key + different hash = `409`.
2. **The confirmation returns the database id.** → Return the public reference only (LT-3).
3. **Rate limit is per IP only.** → Add a per-email-address limit (setting) so one sender rotating IPs can't flood, and so confirmation email can't be weaponised (LT-9).
4. **No time-to-fill check.** → The form carries a signed render timestamp; a submit faster than `inquiry.minFillSeconds` (setting, default 3) gets the honeypot treatment.

## 3. Rules (LT-x — replace BR-2.1/2.3 in BUSINESS-RULES when built)

- **LT-1 One intake, many shapes.** "What brings you here?" picks a **category** (lookup `InquiryType`: hiring, project, collaboration, consulting, growth, general) and a **subtype** (new lookup `InquirySubtype`, each with an "Other — describe" escape). Each category has its own field set, validated **on the server** by a per-category Zod schema stored in `Inquiry.details` (jsonb) with a `detailsVersion`. The client only mirrors it.
- **LT-2 Ask only what's needed.** General contact stays four fields. A field appears only for the category that uses it; hidden fields sent anyway are rejected, not stored.
- **LT-3 Reference ≠ credential.** Every inquiry gets a reference like **`KS-26-7QM4-K2`** — year + random Crockford base-32 (non-sequential, so it doesn't reveal volume), unique, generated in the database. It identifies; it never authorises anything.
- **LT-4 Compensation is explicit, never assumed.** Where a category is paid, the applicant must choose: a structure (annual / monthly / hourly / daily / project fee / commission / equity / revenue share / unpaid / other) with currency (ISO 4217) and min–max, **or** "Prefer to discuss" — recorded as that choice. `min ≤ max`, amounts ≥ 0 and bounded, enforced by a database check, not just the form.
- **LT-5 Meetings are events, not statuses.** `InquiryMeeting`: type, starts/ends (timestamptz), **IANA timezone validated against the runtime list**, platform/location, link, contact, state (scheduled / rescheduled / completed / cancelled / no-show). Never defaulted to Africa/Johannesburg.
- **LT-6 Status is a guarded state machine with history.** Statuses: **NEW → REVIEWING → NEEDS_INFO ⇄ REVIEWING → DISCUSSING → ACCEPTED | DECLINED | ON_HOLD → CLOSED**, plus **WITHDRAWN** (applicant asked) and **reopen** (DECLINED/ON_HOLD/CLOSED → REVIEWING). Allowed transitions are a **database trigger**; every change appends to `InquiryStatusChange` (from, to, at, internal reason, applicant message) — append-only, like `SystemStatusChange`. A change must name the status it expected (`WHERE status = $expected`), so two admin tabs can't silently overwrite each other.
- **LT-7 Private and applicant-facing never share a column.** `InquiryNote` (internal, never leaves the admin) and `InquiryMessage` (applicant-facing: kind, body, channel, delivery state) are separate tables. Rejection has an internal reason (note) and an optional applicant message (message). Anything an applicant could ever see — email now, V2 portal later — reads **only** `InquiryMessage`.
- **LT-8 Documents are untrusted.** Optional, category-dependent. **PDF only** (owner decision, §6), magic-byte check (not the extension or the browser's MIME), max 3 files and **4 MB combined** (Vercel's request limit is 4.5 MB — larger would fail mid-upload), stored as bytes in Postgres with a sha256, a sanitised display name, never a path. Served **only** through an admin route as `attachment` with `nosniff`. Never public. Purged with the inquiry's retention (BR-5.2), not kept forever. Links (Drive, LinkedIn) are accepted as text, never fetched by the server.
- **LT-9 Email cannot be weaponised.** The applicant confirmation contains only the reference, the category and fixed copy — **never the submitted text or links** — so a stranger can't use the form to send phishing to someone else's address. Per-recipient daily cap (setting).
- **LT-10 Notifications never decide state.** Outbound mail goes through an outbox table `Notification` (kind, recipient, attempts, last error, state). The inquiry saves first; a failed send is visible in the admin and retried by the existing scheduler. Delivery failure never rolls back an inquiry.
- **LT-11 Humans decide.** Nothing scores, ranks, accepts or declines automatically. "Complete" (all required fields) never means "good". The AI guide still only drafts (BR-4.1/4.2) — now into the right category.
- **LT-12 Possible duplicates are flagged, never removed.** Same email + same category within 30 days → shown in the admin as "possible duplicate of KS-…".
- **LT-13 Safe display.** Bidi/zero-width control characters stripped from names and titles; every applicant URL rendered as text with an explicit open action — never auto-linked or fetched.
- **LT-14 Privacy.** A short notice on the form: what's collected, why, how long (BR-5.2), how to request removal (BR-5.5). POPIA-aware, not legal advice.

## 4. Data model (extend, smallest change)

`Inquiry` gains: `reference` (unique), `subtypeId`, `details` jsonb + `detailsVersion`, `preferredChannel` + contact fields, `priority` (LOW/NORMAL/HIGH/URGENT, admin-only), `version` (optimistic lock), `payloadHash`. Status enum extended additively. New tables: `InquirySubtype` (lookup), `InquiryStatusChange`, `InquiryNote`, `InquiryMessage`, `InquiryMeeting`, `InquiryDocument`, `Notification`. All admin writes audited by the existing triggers + `withAdmin`.

## 5. Cut as noise (and why)

| From the brief | Decision |
|---|---|
| SUBMITTED + RECEIVED, SHORTLISTED, DECISION, INTERVIEW statuses | Cut — NEW covers submitted/received; shortlisting is meaningless for one person; DECISION is a moment, not a state; interviews are LT-5 events. |
| Sending SMS / WhatsApp from the system | Cut — the preference tells *Kurhula* how to reach them; he contacts them directly. Email is the only system channel. |
| Separate Applicant / Organization / Opportunity tables | Cut — fields on `Inquiry` (+ `details`); there's one owner and no cross-application reuse. |
| Tags | Cut from V1 — category + subtype + priority cover filtering. |
| Action requests with 5 states | V2 — in V1 an information request is an `InquiryMessage` of kind `info-request` with items and a due date; the applicant replies by email. |
| Dashboard widgets | Reuse Admin → Overview counts. |

## 6. Owner decisions (decided 2026-10-02)

1. **Email provider: Resend via the Vercel Marketplace** (free tier: 3,000 emails/month, 100/day). The owner approves the install in Vercel; keys arrive as Vercel env vars — never typed by the agent.
2. **Documents: PDF only.**
3. **Compensation: "Prefer to discuss" is allowed as an explicit, recorded choice** — never assumed from a blank.
4. **Owner alert:** an email to the owner on every new inquiry (default; a digest can be a setting later).

## 6a. Built (2026-10-02) — and where the build differs from the plan

- **Categories reuse the existing lookup keys:** recruitment, service, collaboration, growth, general; hire, partnership and contribution retired (BR-8.2), their old inquiries untouched. Statuses were *added*, not renamed: `REVIEWED` reads "Reviewing", `RESPONDED` "In discussion".
- **`id` is still returned** beside `reference` — removing it would break the v1 contract (additive only); it authorises nothing.
- **The visitor's site is `organizationWebsite`** — `website` is the honeypot's name (BR-2.7) and a shared name would have dropped real visitors as bots.
- **Information requests are messages** (kind `info-request`); the applicant replies by email. The 5-state action requests wait for V2.
- **Email:** sent after the response, by the daily job (Hobby crons run daily) and by the admin's retry. Applicant confirmations need a verified domain (DEPLOYMENT.md) and stay behind the flag `notifications.applicant_emails`.
- Tests: `tests/integration/inquiries-api.test.ts` (intake), `admin-inquiries-api.test.ts`, `db-enforced-rules.test.ts`, `audit-trail.test.ts`; register rows in ENFORCEMENT-REGISTER §2.

## 7. V2 (ROADMAP-V2 #15)

Accountless tracking: a separate 256-bit random token per inquiry, stored hashed, emailed as a link; states active / expired / revoked / replaced; one token unlocks one inquiry's **applicant-facing** data only (LT-7 makes leakage structurally impossible); rate-limited; never logged. V1 builds nothing for it beyond keeping LT-7's separation.

## 8. Test plan (each is a test, not a checkbox)

Unit: every category schema (required/conditional fields, Other-escape, compensation rules, timezone validity, transitions). Integration: idempotency (same/different payload), honeypot + fill-time, per-email limit, transition trigger and stale-version refusal, note/message separation, document magic bytes/size/count, outbox retry on provider failure. e2e (phones first): each category submits and shows its reference; general contact stays four fields. Security: no admin document route without a 2FA session; no applicant-facing query can select `InquiryNote`.
