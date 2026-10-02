// @vitest-environment node
// (Server code only — and Node’s own FormData/File, which jsdom’s are not.)
// tests/integration/inquiries-api.test.ts
// Let's Talk intake (BR-2.x; docs/LETS-TALK-SPEC.md) against the real
// database and the real rate-limit table. Every case checks what was stored,
// never just the status code — a caught bot gets a 201 too (BR-2.7).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as postInquiry } from "@/app/api/v1/inquiries/route";
import { db } from "@/lib/db";
import { issueFormToken } from "@/lib/inquiries/form-token";

// Rate-limit state persists across runs; buckets are cleared by scope first.
// Every inquiry this file creates carries this run's marker, and cleanup
// deletes only those (files run in parallel against one database).
const RUN = `inq-${Date.now().toString(36)}`;
let n = 0;
const email = () => `t${n++}-${RUN}@example.com`;
const freshToken = () => issueFormToken(Date.now() - 10_000); // shown 10 s ago — past the fill-time minimum

beforeAll(async () => {
  await db.rateLimitEntry.deleteMany({ where: { OR: [{ bucketKey: { startsWith: "inquiry:ip:" } }, { bucketKey: { startsWith: "inquiry-email:" } }] } });
});

afterAll(async () => {
  await db.inquiry.deleteMany({ where: { email: { contains: RUN } } });
});

let ipSeq = 1;
const nextIp = () => `10.0.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;

function makeRequest(body: Record<string, unknown>, ip = nextIp()) {
  return new Request("http://localhost/api/v1/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ formToken: freshToken(), ...body }),
  });
}

const general = (over: Record<string, unknown> = {}) => ({
  name: "Test Person",
  email: email(),
  message: "This is a genuinely long enough test message for validation.",
  inquiryType: "general",
  ...over,
});

const REF = /^KS-\d{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/;
const stored = (address: string) => db.inquiry.findFirst({ where: { email: address } });

describe("POST /api/v1/inquiries — the basics", () => {
  it("stores a valid message and answers with its reference", async () => {
    const body = general();
    const res = await postInquiry(makeRequest(body));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe("new");
    expect(json.reference).toMatch(REF);
    const row = await stored(body.email);
    expect(row?.reference).toBe(json.reference);
    // LT-6: the database wrote the opening history entry itself.
    const history = await db.inquiryStatusChange.findMany({ where: { inquiryId: row!.id } });
    expect(history.map((h) => h.toStatus)).toEqual(["NEW"]);
  });

  it("rejects a message under 20 characters (BR-2.3)", async () => {
    const body = general({ message: "too short" });
    expect((await postInquiry(makeRequest(body))).status).toBe(400);
    expect(await stored(body.email)).toBeNull();
  });

  it("rejects an unknown or retired category (BR-8.2)", async () => {
    expect((await postInquiry(makeRequest(general({ inquiryType: "not-a-real-type" })))).status).toBe(400);
    expect((await postInquiry(makeRequest(general({ inquiryType: "hire" })))).status).toBe(400); // retired by the Let's Talk migration
  });

  it('captures source as "direct" when no Referer header is present (BR-2.5)', async () => {
    const body = general();
    expect((await postInquiry(makeRequest(body))).status).toBe(201);
    expect((await stored(body.email))?.source).toBe("direct");
  });
});

describe("bots get a thank-you and nothing is stored (BR-2.7, the fill-time check)", () => {
  // Tokens are made when each case runs — a table evaluated at load time would age past the minimum.
  it.each([
    ["the honeypot", () => ({ website: "http://spam.example" })],
    ["no form token", () => ({ formToken: undefined })],
    ["a forged token", () => ({ formToken: `${Date.now() - 60_000}.forged` })],
    ["a form sent too fast", () => ({ formToken: issueFormToken(Date.now()) })],
  ])("%s", async (_label, over) => {
    const body = general(over());
    const res = await postInquiry(makeRequest(body));
    expect(res.status).toBe(201);
    expect((await res.json()).reference).toMatch(REF);
    expect(await stored(body.email as string)).toBeNull();
  });

  it("a form left open past its life asks for a refresh instead", async () => {
    const res = await postInquiry(makeRequest(general({ formToken: issueFormToken(Date.now() - 13 * 3600_000) })));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("FORM_EXPIRED");
  });
});

describe("idempotency is bound to the message (BR-2.6)", () => {
  it("a retry of the same message returns the original", async () => {
    const key = crypto.randomUUID();
    const body = general({ idempotencyKey: key });
    const first = await (await postInquiry(makeRequest(body))).json();
    const again = await (await postInquiry(makeRequest(body))).json();
    expect(again.reference).toBe(first.reference);
    expect(await db.inquiry.count({ where: { email: body.email } })).toBe(1);
  });

  it("the same key for a different message is refused", async () => {
    const key = crypto.randomUUID();
    await postInquiry(makeRequest(general({ idempotencyKey: key })));
    const res = await postInquiry(makeRequest(general({ idempotencyKey: key, message: "A completely different message, long enough." })));
    expect(res.status).toBe(409);
  });
});

describe("rate limits (BR-2.4 and per address)", () => {
  it("limits one connection, whatever names and addresses it sends", async () => {
    const ip = "10.9.0.7";
    for (let i = 0; i < 5; i++) expect((await postInquiry(makeRequest(general(), ip))).status).toBe(201);
    expect((await postInquiry(makeRequest(general(), ip))).status).toBe(429);
  });

  it("limits one address, whatever connections it uses", async () => {
    const address = email();
    for (let i = 0; i < 3; i++) expect((await postInquiry(makeRequest(general({ email: address, message: `Message number ${i}, long enough to pass.` })))).status).toBe(201);
    expect((await postInquiry(makeRequest(general({ email: address, message: "A fourth message from the same address today." })))).status).toBe(429);
  });
});

describe("each category asks its own questions (LT-1, LT-2, LT-4, LT-5)", () => {
  const recruitment = (details: Record<string, unknown>, over: Record<string, unknown> = {}) =>
    general({
      inquiryType: "recruitment",
      subtype: "full-time",
      organization: "Acme",
      details: { jobTitle: "Software Engineer", representation: "own", workArrangement: "hybrid", compensation: { mode: "discuss" }, meeting: { status: "none" }, ...details },
      ...over,
    });

  it("a complete recruitment message is stored with its fields", async () => {
    const body = recruitment({});
    expect((await postInquiry(makeRequest(body))).status).toBe(201);
    const row = await stored(body.email);
    expect(row?.organization).toBe("Acme");
    expect((row?.details as Record<string, unknown>).jobTitle).toBe("Software Engineer");
  });

  it("refuses a field another category uses", async () => {
    expect((await postInquiry(makeRequest(recruitment({ desiredOutcome: "from the project form" })))).status).toBe(400);
  });

  it("refuses an unknown kind, and 'other' without a description", async () => {
    expect((await postInquiry(makeRequest(recruitment({}, { subtype: "astronaut" })))).status).toBe(400);
    expect((await postInquiry(makeRequest(recruitment({}, { subtype: "other" })))).status).toBe(400);
    expect((await postInquiry(makeRequest(recruitment({}, { subtype: "other", subtypeOther: "Fractional CTO" })))).status).toBe(201);
  });

  it("compensation is a choice, and a range can't run backwards", async () => {
    expect((await postInquiry(makeRequest(recruitment({ compensation: {} })))).status).toBe(400);
    expect((await postInquiry(makeRequest(recruitment({ compensation: { mode: "range", structure: "annual", currency: "ZAR", min: 500000, max: 300000 } })))).status).toBe(400);
    expect((await postInquiry(makeRequest(recruitment({ compensation: { mode: "range", structure: "annual", min: 300000 } })))).status).toBe(400); // no currency
    expect((await postInquiry(makeRequest(recruitment({ compensation: { mode: "not-applicable" } })))).status).toBe(400); // a role is paid, unpaid or discussed
    expect((await postInquiry(makeRequest(recruitment({ compensation: { mode: "range", structure: "annual", currency: "ZAR", min: 300000, max: 500000 } })))).status).toBe(201);
  });

  it("the database itself refuses a backwards range, whatever the app sends", async () => {
    const type = await db.inquiryType.findUniqueOrThrow({ where: { key: "general" } });
    await expect(
      db.inquiry.create({ data: { inquiryTypeId: type.id, name: "X", email: email(), message: "Direct write to the database, long enough.", details: { compensation: { min: 10, max: 5 } } } }),
    ).rejects.toThrow(/Inquiry_lt_4_compensation/);
  });

  it("an arranged interview keeps its own time zone", async () => {
    const at = new Date(Date.now() + 7 * 86400_000);
    const local = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}-${String(at.getUTCDate()).padStart(2, "0")}T10:00`;
    const body = recruitment({ meeting: { status: "scheduled", kind: "technical", startsAtLocal: local, timeZone: "Europe/London", durationMinutes: 45 } });
    expect((await postInquiry(makeRequest(body))).status).toBe(201);
    const row = await stored(body.email);
    const meeting = await db.inquiryMeeting.findFirstOrThrow({ where: { inquiryId: row!.id } });
    expect(meeting.timeZone).toBe("Europe/London");
    expect(meeting.endsAt!.getTime() - meeting.startsAt.getTime()).toBe(45 * 60_000);
    // Status ≠ event (LT-5): the inquiry is still NEW.
    expect(row!.status).toBe("NEW");
  });

  it("refuses a time zone that doesn't exist", async () => {
    const body = recruitment({ meeting: { status: "scheduled", kind: "hr", startsAtLocal: "2030-01-01T10:00", timeZone: "Mars/Olympus" } });
    expect((await postInquiry(makeRequest(body))).status).toBe(400);
  });

  it("WhatsApp as the channel needs a number", async () => {
    expect((await postInquiry(makeRequest(general({ preferredChannel: "whatsapp" })))).status).toBe(400);
    expect((await postInquiry(makeRequest(general({ preferredChannel: "whatsapp", phone: "+27 82 123 4567" })))).status).toBe(201);
  });

  it("a visitor's own website never trips the honeypot", async () => {
    const body = general({ organizationWebsite: "https://acme.example" });
    expect((await postInquiry(makeRequest(body))).status).toBe(201);
    expect((await stored(body.email))?.website).toBe("https://acme.example");
  });
});

describe("documents are PDFs, checked by their bytes (LT-8)", () => {
  const pdf = (text: string) => new File([`%PDF-1.4\n${text}\n%%EOF`], "Job spec.pdf", { type: "application/pdf" });
  function multipart(body: Record<string, unknown>, files: File[]) {
    const fd = new FormData();
    fd.set("payload", JSON.stringify({ formToken: freshToken(), ...body }));
    for (const f of files) fd.append("documents", f);
    return new Request("http://localhost/api/v1/inquiries", { method: "POST", headers: { "x-forwarded-for": nextIp() }, body: fd });
  }

  it("stores a PDF once, under a safe name", async () => {
    const body = general();
    const doc = pdf("one");
    expect((await postInquiry(multipart(body, [doc, doc]))).status).toBe(201);
    const row = await stored(body.email);
    const docs = await db.inquiryDocument.findMany({ where: { inquiryId: row!.id } });
    expect(docs).toHaveLength(1);
    expect(docs[0]!.fileName).toBe("Job spec.pdf");
  });

  it("refuses a file that only claims to be a PDF", async () => {
    const fake = new File(["MZ this is an executable"], "cv.pdf", { type: "application/pdf" });
    const body = general();
    expect((await postInquiry(multipart(body, [fake]))).status).toBe(400);
    expect(await stored(body.email)).toBeNull();
  });

  it("refuses more files than allowed", async () => {
    expect((await postInquiry(multipart(general(), [pdf("a"), pdf("b"), pdf("c"), pdf("d")]))).status).toBe(400);
  });

  it("the database refuses a non-PDF written past the app", async () => {
    const row = await db.inquiry.findFirstOrThrow({ where: { email: { contains: RUN } } });
    await expect(
      db.inquiryDocument.create({ data: { inquiryId: row.id, fileName: "x.pdf", byteSize: 5, sha256: "a".repeat(64), fileData: Buffer.from("MZ123") } }),
    ).rejects.toThrow(/InquiryDocument_lt_8/);
  });
});

describe("after it's stored", () => {
  it("flags a second message from the same address in the same category — never removes it (LT-12)", async () => {
    const address = email();
    await postInquiry(makeRequest(general({ email: address })));
    await postInquiry(makeRequest(general({ email: address, message: "And a follow-up message that is long enough." })));
    const rows = await db.inquiry.findMany({ where: { email: address }, orderBy: { createdAt: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[1]!.possibleDuplicateOfId).toBe(rows[0]!.id);
  });

  it("queues an alert for the owner in the same transaction (LT-10)", async () => {
    const body = general();
    await postInquiry(makeRequest(body));
    const row = await stored(body.email);
    const queued = await db.notification.findMany({ where: { inquiryId: row!.id } });
    expect(queued.some((q) => q.kind === "owner-alert")).toBe(true);
    // LT-9: no applicant email while the flag is off.
    expect(queued.some((q) => q.kind === "inquiry-received")).toBe(false);
  });

  it("keeps personal fields out of the audit log", async () => {
    const body = general({ phone: "+27 82 555 0101", organization: "Secret Org", preferredChannel: "phone" });
    await postInquiry(makeRequest(body));
    const row = await stored(body.email);
    const log = await db.activityLog.findFirstOrThrow({ where: { entityType: "Inquiry", entityId: row!.id, action: "inquiry.create" } });
    const text = JSON.stringify(log.after);
    expect(text).not.toContain("+27 82 555 0101");
    expect(text).not.toContain("Secret Org");
    expect(text).not.toContain(body.email);
  });
});
