// POST /api/v1/inquiries — Let's Talk, the single visitor write path
// (BR-2.x; docs/LETS-TALK-SPEC.md LT-1…LT-14). Used identically by the
// human form and the AI guide's draft (BR-4.2): no caller gets a privileged
// bypass. JSON, or multipart/form-data when PDFs are attached (a "payload"
// JSON field plus "documents" files). See openapi-contract.yaml.
//
// Order matters: the cheap bot checks first (honeypot, form token), then the
// rate limits, then validation, then one transaction that writes the inquiry,
// its meeting, its documents and its queued emails together. Emails go out
// after the response; a failed send never undoes the inquiry (LT-10).

import { createHash } from "node:crypto";
import { after, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { InquiryCreateInputSchema } from "@/lib/schemas";
import { isHoneypotFilled, sourceFromReferer } from "@/lib/rules/inquiries";
import { hitRateLimit, hitRateLimitKey } from "@/lib/auth/rate-limit";
import { getSetting } from "@/lib/settings";
import { withActor } from "@/lib/audit";
import { isFlagOn, FLAGS } from "@/lib/flags";
import { Contact, DOCUMENTS_ALLOWED, formFor, parseDetails, zonedToUtc, type MeetingT } from "@/lib/inquiries/forms";
import { checkFormToken } from "@/lib/inquiries/form-token";
import { checkDocuments } from "@/lib/inquiries/documents";
import { enqueue, ownerAddress, recipientUnderCap, sendDue } from "@/lib/notifications";
import { ownerAlertEmail, receivedEmail } from "@/lib/inquiries/emails";

const MAX_REQUEST_BYTES = 4_400_000; // under the platform's 4.5 MB request ceiling
const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000; // BR-2.6

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

/** BR-2.7 — a caught bot gets the same 201 a person gets: a plausible reference, nothing stored. */
function decoy() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const pick = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * 32)]).join("");
  const yy = String(new Date().getUTCFullYear()).slice(2);
  return NextResponse.json({ id: "ok", reference: `KS-${yy}-${pick(4)}-${pick(2)}`, status: "new", submittedAt: new Date().toISOString() }, { status: 201 });
}

async function readBody(request: Request): Promise<{ body: unknown; files: File[] } | { tooLarge: true } | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_REQUEST_BYTES) return { tooLarge: true };
  const type = request.headers.get("content-type") ?? "";
  if (type.startsWith("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return null;
    const raw = form.get("payload");
    let body: unknown = null;
    try {
      body = typeof raw === "string" ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
    const files = form.getAll("documents").filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f);
    return { body, files };
  }
  const body = await request.json().catch(() => null);
  return { body, files: [] };
}

/** BR-2.6 hardened: the same key may only ever mean the same submission. */
function payloadHash(body: Record<string, unknown>, documentHashes: string[]): string {
  const { idempotencyKey: _k, formToken: _t, website: _w, ...rest } = body;
  const canonical = JSON.stringify(rest, Object.keys(rest).sort()) + "|" + [...documentHashes].sort().join(",");
  return createHash("sha256").update(canonical).digest("hex");
}

const confirmation = (i: { id: string; reference: string; createdAt: Date }) =>
  NextResponse.json({ id: i.id, reference: i.reference, status: "new", submittedAt: i.createdAt.toISOString() }, { status: 201 });

export async function POST(request: Request) {
  const read = await readBody(request);
  if (read && "tooLarge" in read) return errorResponse("PAYLOAD_TOO_LARGE", "Attachments can total at most 4 MB.", 413);
  if (!read || !read.body || typeof read.body !== "object") return errorResponse("VALIDATION_ERROR", "Invalid request body", 400);
  const raw = read.body as Record<string, unknown>;

  // BR-2.7 — the honeypot, before anything else.
  if (isHoneypotFilled(raw.website)) return decoy();

  // The fill-time check: a form must have been shown, and read, before it's sent.
  const minFill = await getSetting("inquiry.minFillSeconds");
  const token = checkFormToken(raw.formToken, minFill);
  if (!token.ok) {
    if (token.reason === "expired") return errorResponse("FORM_EXPIRED", "This form has been open a long time — refresh the page and send it again.", 400);
    return decoy();
  }

  const parsed = InquiryCreateInputSchema.safeParse(raw);
  if (!parsed.success) return errorResponse("VALIDATION_ERROR", "Invalid inquiry submission", 400, { issues: parsed.error.issues });
  const input = parsed.data;

  // BR-2.4 — per connection (identical for the form and the AI guide's draft)…
  const [maxPerWindow, windowHours, perEmail] = await Promise.all([
    getSetting("inquiry.rateLimit.maxPerWindow"),
    getSetting("inquiry.rateLimit.windowHours"),
    getSetting("inquiry.rateLimit.perEmailPerDay"),
  ]);
  const byIp = await hitRateLimit("inquiry", request, maxPerWindow, windowHours * 60 * 60 * 1000);
  if (!byIp.allowed) return errorResponse("RATE_LIMITED", "Too many requests from this connection — try again later.", 429, { retryAfterMs: byIp.retryAfterMs });
  // …and per address, so rotating connections doesn't help (LT spec §2).
  const emailKey = `inquiry-email:${createHash("sha256").update(input.email.trim().toLowerCase()).digest("hex")}`;
  const byEmail = await hitRateLimitKey(emailKey, perEmail, 24 * 60 * 60 * 1000);
  if (!byEmail.allowed) return errorResponse("RATE_LIMITED", "This address has sent several messages today — try again tomorrow.", 429, { retryAfterMs: byEmail.retryAfterMs });

  // The lookup decides (EXT-1): unknown or retired categories are refused (BR-8.2).
  const inquiryType = await db.inquiryType.findUnique({ where: { key: input.inquiryType }, include: { subtypes: { where: { active: true } } } });
  if (!inquiryType || !inquiryType.active) return errorResponse("VALIDATION_ERROR", `Unknown inquiry type "${input.inquiryType}"`, 400);
  const subtype = input.subtype ? inquiryType.subtypes.find((s) => s.key === input.subtype) : undefined;
  if (input.subtype && !subtype) return errorResponse("VALIDATION_ERROR", "Choose one of the listed kinds", 400, { issues: [{ path: ["subtype"], message: "Choose one of the listed kinds" }] });
  if (subtype?.key === "other" && !input.subtypeOther?.trim()) {
    return errorResponse("VALIDATION_ERROR", "Describe what it is", 400, { issues: [{ path: ["subtypeOther"], message: "Describe what it is" }] });
  }

  const contact = Contact.safeParse(raw);
  if (!contact.success) return errorResponse("VALIDATION_ERROR", "Check your contact details", 400, { issues: contact.error.issues });

  // LT-1/LT-2: the category's own fields, by its own form — fields from another form are refused.
  const form = formFor(inquiryType.key);
  const details = parseDetails(inquiryType.key, input.details);
  if (!details.success) return errorResponse("VALIDATION_ERROR", "Check the details", 400, { issues: details.error.issues.map((i) => ({ ...i, path: ["details", ...i.path] })) });

  // LT-8: documents, checked by their bytes.
  const [maxFiles, maxMb] = await Promise.all([getSetting("inquiry.documents.maxFiles"), getSetting("inquiry.documents.maxMegabytes")]);
  if (read.files.length > 0 && (!DOCUMENTS_ALLOWED[form] || maxFiles === 0)) return errorResponse("VALIDATION_ERROR", "Attachments aren't accepted here.", 400);
  const docs = await checkDocuments(read.files, { maxFiles, maxTotalBytes: maxMb * 1024 * 1024 });
  if (!docs.ok) return errorResponse("VALIDATION_ERROR", docs.message, 400, { issues: [{ path: ["documents"], message: docs.message }] });

  const hash = payloadHash(raw, docs.documents.map((d) => d.sha256));

  // BR-2.6 — a retry returns the original; a reused key for something else is refused.
  if (input.idempotencyKey) {
    const existing = await db.inquiry.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.payloadHash === hash && Date.now() - existing.createdAt.getTime() <= IDEMPOTENCY_WINDOW_MS) return confirmation(existing);
      return errorResponse("CONFLICT", "This submission key was already used for a different message.", 409);
    }
  }

  // LT-12: a possible duplicate is flagged for review, never refused or removed.
  const windowDays = await getSetting("inquiry.duplicateWindowDays");
  const earlier = await db.inquiry.findFirst({
    where: { email: { equals: contact.data.email, mode: "insensitive" }, inquiryTypeId: inquiryType.id, createdAt: { gte: new Date(Date.now() - windowDays * 86400_000) }, anonymizedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const { meeting, ...categoryFields } = details.data as Record<string, unknown> & { meeting?: MeetingT };
  const scheduled = meeting && meeting.status === "scheduled" ? meeting : null;
  const startsAt = scheduled ? zonedToUtc(scheduled.startsAtLocal, scheduled.timeZone) : null;
  const applicantEmails = await isFlagOn(FLAGS.applicantEmails);
  const owner = await ownerAddress();

  try {
    // Audited by the database as an ANONYMOUS visitor; every personal column is redacted from the log.
    const inquiry = await withActor({ kind: "anonymous", request }, async (tx) => {
      const created = await tx.inquiry.create({
        data: {
          inquiryTypeId: inquiryType.id,
          subtypeId: subtype?.id,
          subtypeOther: subtype?.key === "other" ? input.subtypeOther?.trim() : undefined,
          name: contact.data.name,
          email: contact.data.email,
          phone: contact.data.phone,
          organization: contact.data.organization,
          role: contact.data.role,
          website: contact.data.website,
          profileUrl: contact.data.profileUrl,
          preferredChannel: contact.data.preferredChannel,
          preferredChannelOther: contact.data.preferredChannel === "other" ? contact.data.preferredChannelOther : undefined,
          message: input.message,
          details: { ...categoryFields, ...(meeting && { meeting: { status: meeting.status } }) } as Prisma.InputJsonValue,
          source: sourceFromReferer(request.headers.get("referer")),
          idempotencyKey: input.idempotencyKey,
          payloadHash: hash,
          possibleDuplicateOfId: earlier?.id,
        },
      });
      if (scheduled && startsAt) {
        await tx.inquiryMeeting.create({
          data: {
            inquiryId: created.id,
            kind: scheduled.kind,
            startsAt,
            endsAt: scheduled.durationMinutes ? new Date(startsAt.getTime() + scheduled.durationMinutes * 60_000) : null,
            timeZone: scheduled.timeZone,
            location: scheduled.location,
            link: scheduled.link,
            contactPerson: scheduled.contactPerson,
            instructions: scheduled.instructions,
          },
        });
      }
      for (const d of docs.documents) await tx.inquiryDocument.create({ data: { inquiryId: created.id, ...d } });
      if (owner) await enqueue(tx, { ...ownerAlertEmail(created, inquiryType.label, subtype?.label ?? null, docs.documents.length), recipient: owner, inquiryId: created.id });
      if (applicantEmails && (await recipientUnderCap(tx, created.email))) {
        await enqueue(tx, { ...(await receivedEmail(created.reference, inquiryType.label)), recipient: created.email, inquiryId: created.id });
      }
      return created;
    });

    after(() => sendDue().catch(() => undefined)); // the daily job and the admin's retry cover anything left
    return confirmation(inquiry);
  } catch (err) {
    // Two identical retries racing: the second hits the unique key — answer with the first.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && input.idempotencyKey) {
      const existing = await db.inquiry.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing && existing.payloadHash === hash) return confirmation(existing);
      if (existing) return errorResponse("CONFLICT", "This submission key was already used for a different message.", 409);
    }
    throw err;
  }
}
