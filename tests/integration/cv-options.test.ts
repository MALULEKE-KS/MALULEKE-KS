// @vitest-environment node
// tests/integration/cv-options.test.ts
// #92 — two CV options for visitors: the generated CV and the owner's uploaded
// CV (BR-7.1), uploads versioned and never altered or deleted (BR-7.2), which
// options are shown enforced by the database and by every CV route (BR-7.5),
// and an upload accepted only if it really is a PDF or a Word file (BR-7.6).
// Holds the exclusive CV-options lock: it hides options that other files use.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import JSZip from "jszip";
import { NextRequest } from "next/server";
import { GET as listUploads, POST as uploadCv } from "@/app/api/v1/admin/cv/uploads/route";
import { POST as restoreUpload } from "@/app/api/v1/admin/cv/uploads/[id]/restore/route";
import { GET as getOptions, PATCH as patchOptions } from "@/app/api/v1/admin/cv/options/route";
import { GET as publicOptions } from "@/app/api/v1/cv/options/route";
import { GET as downloadUpload } from "@/app/api/v1/cv/uploads/[id]/route";
import { POST as generateCv } from "@/app/api/v1/cv/generate/route";
import { GET as cvData } from "@/app/api/v1/cv/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";
import { CvUploadRejected, detectCvFormat } from "@/lib/cv/uploads";
import { holdCvOptionsLock } from "../helpers/cv-options-lock";

const RUN = `cvo${Date.now().toString(36)}`;
let cookie: string;
let releaseLock: () => Promise<void>;

const pdf = (marker: string) => new TextEncoder().encode(`%PDF-1.4\n% ${RUN} ${marker}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`);

async function docx(options: { macro?: boolean; notWord?: boolean } = {}) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`);
  if (!options.notWord) zip.file("word/document.xml", `<w:document><!-- ${RUN} --></w:document>`);
  else zip.file("xl/workbook.xml", "<workbook/>");
  if (options.macro) zip.file("word/vbaProject.bin", "macro");
  return new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
}

function adminRequest(url: string, init: { method: string; body?: BodyInit; json?: object; headers?: Record<string, string> }) {
  return new NextRequest(url, {
    method: init.method,
    headers: {
      cookie: `admin_session=${cookie}`,
      ...(init.json ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    body: init.json ? JSON.stringify(init.json) : init.body,
  });
}

async function upload(bytes: Uint8Array, name: string) {
  const form = new FormData();
  form.append("file", new File([bytes.slice()], name));
  return uploadCv(adminRequest("http://localhost/api/v1/admin/cv/uploads", { method: "POST", body: form }));
}

const setOptions = (json: object) =>
  patchOptions(adminRequest("http://localhost/api/v1/admin/cv/options", { method: "PATCH", json }));

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const publicRequest = (url: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) => new NextRequest(url, init);

beforeAll(async () => {
  releaseLock = await holdCvOptionsLock("exclusive");
  const admin = await db.adminUser.create({ data: { email: `${RUN}@example.com`, passwordHash: "unused-in-these-tests" } });
  cookie = createSessionCookieValue(admin.id, 1);
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "cv-" } } });
}, 10 * 60_000);

afterAll(async () => {
  // Leave the shared row as other test files expect it: both shown, generated first.
  await db.cvOptions.update({ where: { id: 1 }, data: { showGenerated: true, showUploaded: true, firstOption: "generated" } });
  await releaseLock?.();
});

describe("an upload is accepted only if its content is a PDF or a Word document (BR-7.6)", () => {
  it("recognises real files by their bytes, whatever they're called", async () => {
    expect(detectCvFormat(pdf("detect"))).toBe("pdf");
    expect(detectCvFormat(await docx())).toBe("docx");
  });

  it("refuses text, a truncated PDF, a non-Word archive and a Word file with macros", async () => {
    expect(() => detectCvFormat(new TextEncoder().encode("just text"))).toThrow(CvUploadRejected);
    expect(() => detectCvFormat(new TextEncoder().encode("%PDF-1.4 no end"))).toThrow(/incomplete/);
    expect(() => detectCvFormat(new Uint8Array(0))).toThrow(CvUploadRejected);
    await expect(docx({ notWord: true }).then(detectCvFormat)).rejects.toThrow(/not a Word document/);
    await expect(docx({ macro: true }).then(detectCvFormat)).rejects.toThrow(/macros/);
  });

  it("answers a renamed text file with 415 and an oversized body with 413, storing nothing", async () => {
    const before = await db.cvUpload.count();
    expect((await upload(new TextEncoder().encode("not a cv"), "cv.pdf")).status).toBe(415);
    const huge = await uploadCv(
      adminRequest("http://localhost/api/v1/admin/cv/uploads", {
        method: "POST",
        body: "x",
        headers: { "content-length": String(50 * 1024 * 1024), "content-type": "multipart/form-data; boundary=x" },
      }),
    );
    expect(huge.status).toBe(413);
    expect(await db.cvUpload.count()).toBe(before);
  });
});

describe("uploads are versioned: superseded, never altered or deleted (BR-7.2)", () => {
  let first: string;
  let second: string;

  it("a new upload becomes current and supersedes the previous one of its format; the same file again changes nothing", async () => {
    const one = await upload(pdf("v1"), "Kurhula CV.pdf");
    expect(one.status).toBe(201);
    first = (await one.json()).id;

    const again = await upload(pdf("v1"), "renamed.pdf");
    expect(again.status).toBe(200);
    expect((await again.json()).id).toBe(first);

    const two = await upload(pdf("v2"), "Kurhula CV v2.pdf");
    expect(two.status).toBe(201);
    second = (await two.json()).id;

    const word = await upload(await docx(), "Kurhula CV.docx");
    expect(word.status).toBe(201);

    const { versions } = await (await listUploads(adminRequest("http://localhost/api/v1/admin/cv/uploads", { method: "GET" }))).json();
    const byId = new Map(versions.map((v: { id: string; current: boolean }) => [v.id, v.current]));
    expect(byId.get(first)).toBe(false);
    expect(byId.get(second)).toBe(true);
    expect(versions.filter((v: { current: boolean; format: string }) => v.current).map((v: { format: string }) => v.format).sort()).toEqual(["docx", "pdf"]);
  });

  it("an earlier version can be made current again", async () => {
    const res = await restoreUpload(adminRequest(`http://localhost/api/v1/admin/cv/uploads/${first}/restore`, { method: "POST" }), params(first));
    expect(res.status).toBe(200);
    expect((await res.json()).current).toBe(true);
    expect((await db.cvUpload.findUniqueOrThrow({ where: { id: second } })).supersededAt).not.toBeNull();
  });

  it("the database refuses altering or deleting a version", async () => {
    await expect(db.cvUpload.update({ where: { id: first }, data: { fileName: "edited.pdf" } })).rejects.toThrow(/BR-7\.2/);
    await expect(db.cvUpload.delete({ where: { id: first } })).rejects.toThrow(/BR-7\.2/);
  });

  it("never copies file bytes into the audit log", async () => {
    const entry = await db.activityLog.findFirstOrThrow({ where: { entityType: "CvUpload", entityId: first, action: { endsWith: ".create" } } });
    expect(JSON.stringify(entry.after)).toContain("[redacted]");
    expect(JSON.stringify(entry.after)).not.toContain(RUN);
  });
});

describe("visitors get the options the admin shows, enforced by every route (BR-7.1, BR-7.5)", () => {
  it("lists both options, labelled, the chosen one first, with the uploaded files and their date", async () => {
    await setOptions({ showGenerated: true, showUploaded: true, firstOption: "uploaded" });
    const { options } = await (await publicOptions()).json();
    expect(options.map((o: { kind: string }) => o.kind)).toEqual(["uploaded", "generated"]);
    expect(options[0].uploadedAt).toBeTruthy();
    expect(options[0].files.map((f: { format: string }) => f.format)).toEqual(["docx", "pdf"]);
  });

  it("serves the current upload as an attachment with no sniffing; a superseded version is a 404", async () => {
    const { options } = await (await publicOptions()).json();
    const pdfFile = options.find((o: { kind: string }) => o.kind === "uploaded").files.find((f: { format: string }) => f.format === "pdf");
    const id = pdfFile.url.split("/").pop();
    const res = await downloadUpload(publicRequest(`http://localhost${pdfFile.url}`), params(id));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename=".+-CV-\d{4}-\d{2}-\d{2}\.pdf"$/);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");

    const superseded = await db.cvUpload.findFirstOrThrow({ where: { format: "pdf", supersededAt: { not: null } } });
    expect((await downloadUpload(publicRequest("http://localhost/x"), params(superseded.id))).status).toBe(404);
  });

  it("a hidden uploaded CV is unlisted and can't be downloaded", async () => {
    const current = await db.cvUpload.findFirstOrThrow({ where: { format: "pdf", supersededAt: null } });
    await setOptions({ showUploaded: false, firstOption: "generated" });
    const { options } = await (await publicOptions()).json();
    expect(options.map((o: { kind: string }) => o.kind)).toEqual(["generated"]);
    expect((await downloadUpload(publicRequest("http://localhost/x"), params(current.id))).status).toBe(404);
    await setOptions({ showUploaded: true });
  });

  it("a hidden generated CV is refused everywhere — generate, and the CV as data", async () => {
    await setOptions({ showGenerated: false, firstOption: "uploaded" });
    const generate = await generateCv(
      publicRequest("http://localhost/api/v1/cv/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    );
    expect(generate.status).toBe(404);
    expect((await cvData(publicRequest("http://localhost/api/v1/cv"))).status).toBe(404);
    const { options } = await (await publicOptions()).json();
    expect(options.map((o: { kind: string }) => o.kind)).toEqual(["uploaded"]);
    await setOptions({ showGenerated: true, firstOption: "generated" });
  });

  it("the database refuses hiding both, and listing a hidden option first — answered as 400 in the rule's words", async () => {
    const both = await setOptions({ showGenerated: false, showUploaded: false });
    expect(both.status).toBe(400);
    expect((await both.json()).error.message).toMatch(/^BR-7\.5:/);

    const hiddenFirst = await setOptions({ showUploaded: false, firstOption: "uploaded" });
    expect(hiddenFirst.status).toBe(400);

    const current = await (await getOptions(adminRequest("http://localhost/api/v1/admin/cv/options", { method: "GET" }))).json();
    expect(current).toMatchObject({ showGenerated: true, showUploaded: true, firstOption: "generated" });
  });

  it("the generated CV can't be hidden while no upload exists — a visitor always has a CV", async () => {
    // Uploads can't be deleted, so simulate "none yet" inside a transaction that's rolled back.
    const ROLLBACK = "rollback";
    await expect(
      db.$transaction(async (tx) => {
        await tx.cvUpload.updateMany({ where: { supersededAt: null }, data: { supersededAt: new Date() } });
        await tx.cvOptions.update({ where: { id: 1 }, data: { showGenerated: false, firstOption: "uploaded" } });
        throw new Error(ROLLBACK);
      }),
    ).rejects.toThrow(/BR-7\.5: upload a CV before hiding the generated one/);
  });
});
