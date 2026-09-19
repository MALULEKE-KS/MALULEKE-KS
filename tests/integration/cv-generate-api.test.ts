// tests/integration/cv-generate-api.test.ts
// Real PDF generation (BR-7.1) and supersede behavior (BR-7.2) against the
// real database. No admin session needed — this is the public download flow.

import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as generateCv } from "@/app/api/v1/cv/generate/route";
import { GET as downloadCv } from "@/app/api/v1/cv/documents/[id]/route";
import { db } from "@/lib/db";

const createdDocumentIds: string[] = [];

// getClientIp falls back to "unknown" for these test requests (no
// x-forwarded-for header), so the rate-limit bucket is shared across every
// run of this file against the real dev database — clear it first so
// repeated local runs within the same hour don't accumulate toward the
// real 10/hour cap the route enforces.
beforeAll(async () => {
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "cv-generate:" } } }); // keys are hashed (F1.5)
});

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/v1/cv/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// No cleanup of generated documents: they are superseded, never deleted
// (BR-7.2, enforced by the database). The test database is disposable.

describe("POST /api/v1/cv/generate", () => {
  it("generates a real PDF and returns a downloadable fileUrl", async () => {
    const res = await generateCv(makeRequest({}));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.fileUrl).toMatch(/\/api\/v1\/cv\/documents\//);

    const id = body.fileUrl.split("/").pop();
    createdDocumentIds.push(id);

    const document = await db.documentGen.findUniqueOrThrow({ where: { id } });
    // A real PDF starts with the %PDF- magic bytes — proof this isn't a
    // placeholder/empty buffer.
    expect(Buffer.from(document.fileData).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("serves the generated PDF's bytes with the right content type", async () => {
    const genRes = await generateCv(makeRequest({}));
    const { fileUrl } = await genRes.json();
    const id = fileUrl.split("/").pop();
    createdDocumentIds.push(id);

    const res = await downloadCv(new NextRequest(fileUrl), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("returns 404 for a nonexistent document id", async () => {
    const res = await downloadCv(new NextRequest("http://localhost/api/v1/cv/documents/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(res.status).toBe(404);
  });

  it("supersedes the prior document for the same type/targetRole pair (BR-7.2)", async () => {
    const first = await generateCv(makeRequest({ targetRole: "Backend Engineer" }));
    const firstBody = await first.json();
    const firstId = firstBody.fileUrl.split("/").pop();
    createdDocumentIds.push(firstId);

    const second = await generateCv(makeRequest({ targetRole: "Backend Engineer" }));
    const secondBody = await second.json();
    const secondId = secondBody.fileUrl.split("/").pop();
    createdDocumentIds.push(secondId);

    const firstDocument = await db.documentGen.findUniqueOrThrow({ where: { id: firstId } });
    expect(firstDocument.supersededByFileUrl).toBe(secondBody.fileUrl);

    const secondDocument = await db.documentGen.findUniqueOrThrow({ where: { id: secondId } });
    // The current version is never deleted, and isn't itself marked
    // superseded until something newer replaces it.
    expect(secondDocument.supersededByFileUrl).toBeNull();
  });
});
