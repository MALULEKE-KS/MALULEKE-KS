// tests/integration/inquiries-api.test.ts
// Hits the real database and the real rate-limit table.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as postInquiry } from "@/app/api/v1/inquiries/route";
import { db } from "@/lib/db";

// Rate-limit state persists in the real DB across test runs (unlike the
// other integration tests, which only read seeded data) — without cleanup,
// re-running this suite against the same local/CI database reuses these
// exact IPs and the leftover RateLimitEntry rows from the previous run
// count against this one, causing flaky "expected 201, got 429" failures
// that have nothing to do with the code under test.
const TEST_IP_PREFIX = "10.0.0.";

// Rate-limit keys hold keyed hashes of the IP, never the IP itself (F1.5),
// so buckets are cleared by scope, before the run.
beforeAll(async () => {
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "inquiry:ip:" } } });
});

afterAll(async () => {
  await db.inquiry.deleteMany({ where: { email: { contains: "@example.com" } } });
});

function makeRequest(body: object, ip: string) {
  return new Request("http://localhost/api/v1/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Test Person",
  email: "test@example.com",
  message: "This is a genuinely long enough test message for validation.",
  inquiryType: "hire",
};

describe("POST /api/v1/inquiries", () => {
  it("creates an inquiry on a valid submission", async () => {
    const res = await postInquiry(makeRequest(validBody, "10.0.0.1"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("new");
    expect(body.id).toBeDefined();
  });

  it("rejects a message under 20 characters (BR-2.3)", async () => {
    const res = await postInquiry(makeRequest({ ...validBody, message: "too short" }, "10.0.0.2"));
    expect(res.status).toBe(400);
  });

  it("rejects an unknown inquiryType", async () => {
    const res = await postInquiry(
      makeRequest({ ...validBody, inquiryType: "not-a-real-type" }, "10.0.0.3")
    );
    expect(res.status).toBe(400);
  });

  it("captures source as \"direct\" when no Referer header is present (BR-2.5)", async () => {
    const res = await postInquiry(makeRequest(validBody, "10.0.0.4"));
    const body = await res.json();
    const created = await db.inquiry.findUnique({ where: { id: body.id } });
    expect(created?.source).toBe("direct");
  });

  it("returns a look-alike 201 without creating a row when the honeypot is filled (BR-2.7)", async () => {
    const before = await db.inquiry.count();
    const res = await postInquiry(makeRequest({ ...validBody, website: "spam" }, "10.0.0.5"));
    const after = await db.inquiry.count();

    expect(res.status).toBe(201);
    expect(after).toBe(before);
  });

  it("dedupes a resubmission with the same idempotencyKey instead of creating a duplicate (BR-2.6)", async () => {
    const idempotencyKey = crypto.randomUUID();
    const body = { ...validBody, idempotencyKey };

    const first = await postInquiry(makeRequest(body, "10.0.0.6"));
    const firstJson = await first.json();

    const second = await postInquiry(makeRequest(body, "10.0.0.6"));
    const secondJson = await second.json();

    expect(secondJson.id).toBe(firstJson.id);

    const count = await db.inquiry.count({ where: { idempotencyKey } });
    expect(count).toBe(1);
  });

  it("rate-limits after 5 submissions from the same IP within 24h (BR-2.4)", async () => {
    const ip = "10.0.0.7";
    for (let i = 0; i < 5; i++) {
      const res = await postInquiry(
        makeRequest({ ...validBody, message: `Attempt number ${i} with enough length.` }, ip)
      );
      expect(res.status).toBe(201);
    }

    const sixth = await postInquiry(
      makeRequest({ ...validBody, message: "This is the sixth attempt, should be blocked." }, ip)
    );
    expect(sixth.status).toBe(429);
  });

  it("applies the identical rate limit regardless of a different email/name on each request", async () => {
    // Confirms the limit is keyed by IP, not by submitter identity — BR-2.4
    // applies "whether the submission came through the human form or the
    // agent's submit_inquiry tool", i.e. no way to route around it by
    // varying the visible fields.
    const ip = "10.0.0.8";
    for (let i = 0; i < 5; i++) {
      await postInquiry(
        makeRequest({ ...validBody, email: `person${i}@example.com` }, ip)
      );
    }
    const sixth = await postInquiry(makeRequest({ ...validBody, email: "another@example.com" }, ip));
    expect(sixth.status).toBe(429);
  });
});
