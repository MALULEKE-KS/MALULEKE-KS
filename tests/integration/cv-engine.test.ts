// @vitest-environment node
// tests/integration/cv-engine.test.ts
// The CV engine (#74) end to end against the real database: the same CV as
// PDF and Word, ATS-safe, built only from what the site shows, tailored by
// role, checked for completeness, and editable through the admin API.
// Node environment: react-pdf renders a blank page under jsdom.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import JSZip from "jszip";
import { NextRequest } from "next/server";
import { POST as generateCvRoute } from "@/app/api/v1/cv/generate/route";
import { GET as downloadCv } from "@/app/api/v1/cv/documents/[id]/route";
import { GET as getProfile, PATCH as patchProfile } from "@/app/api/v1/admin/profile/route";
import { POST as createLink } from "@/app/api/v1/admin/profile/links/route";
import { PATCH as patchLink, DELETE as deleteLink } from "@/app/api/v1/admin/profile/links/[id]/route";
import { GET as listAchievements, POST as createAchievement } from "@/app/api/v1/admin/achievements/route";
import { PATCH as patchAchievement, DELETE as deleteAchievement } from "@/app/api/v1/admin/achievements/[id]/route";
import { GET as checkCvRoute } from "@/app/api/v1/admin/cv/check/route";
import { PATCH as patchExperience } from "@/app/api/v1/admin/cv/experience/[id]/route";
import { buildCvModel } from "@/lib/cv/model";
import { generateCvDocument } from "@/lib/cv/generate";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

const RUN = `cv${Date.now().toString(36)}`;
const SITE = "https://portfolio.example";

let adminId: string;
let sessionCookie: string;
let originalProfile: { headline: string | null; phone: string | null; summary: string | null };

function adminRequest(url: string, method: string, body?: object): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json", cookie: `admin_session=${sessionCookie}` },
    ...(body && { body: JSON.stringify(body) }),
  });
}

/** Every text-showing operator in the PDF's content streams — a blank page has none. */
function pdfTextOperators(pdf: Buffer): number {
  const raw = pdf.toString("latin1");
  let count = 0;
  for (const match of raw.matchAll(/stream\r?\n/g)) {
    const start = match.index! + match[0].length;
    const end = raw.indexOf("endstream", start);
    try {
      const content = inflateSync(pdf.subarray(start, end)).toString("latin1");
      count += (content.match(/\bT[Jj]\b/g) ?? []).length;
    } catch {
      // Not a Flate stream (e.g. a font) — no text operators to count.
    }
  }
  return count;
}

async function docxXml(docx: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  return zip.file("word/document.xml")!.async("string");
}

beforeAll(async () => {
  adminId = (await db.adminUser.create({ data: { email: `${RUN}@example.com`, passwordHash: "unused-in-these-tests" } })).id;
  sessionCookie = createSessionCookieValue(adminId);
  const profile = await db.profile.findUniqueOrThrow({ where: { id: 1 } });
  originalProfile = { headline: profile.headline, phone: profile.phone, summary: profile.summary };
});

afterAll(async () => {
  if (!adminId) return;
  // Other files read the profile: put back exactly what was there.
  await db.profile.update({ where: { id: 1 }, data: originalProfile });
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
  await db.experience.deleteMany({ where: { title: { startsWith: RUN } } });
});

describe("the same CV in two formats, ATS-safe", () => {
  it("renders a PDF with real, extractable text", async () => {
    const { document, completeness } = await generateCvDocument({ targetRole: `${RUN} pdf`, format: "pdf", siteUrl: SITE });
    const pdf = Buffer.from(document.fileData);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfTextOperators(pdf)).toBeGreaterThan(10);
    expect(document.format).toBe("pdf");
    expect(document.completeness).toMatchObject({ score: completeness.score });
  });

  it("renders a Word document: headings, links, no tables", async () => {
    const { document } = await generateCvDocument({ targetRole: `${RUN} docx`, format: "docx", siteUrl: SITE });
    const docx = Buffer.from(document.fileData);
    expect(docx.subarray(0, 2).toString()).toBe("PK"); // a .docx is a zip
    const xml = await docxXml(docx);
    const profile = await db.publicProfile.findFirstOrThrow();
    expect(xml).toContain(profile.displayName);
    expect(xml).toContain("Heading1");
    expect(xml).toContain("w:hyperlink");
    expect(xml).not.toContain("<w:tbl>"); // tables break ATS parsing
  });

  it("serves each format with its content type and a named file", async () => {
    const req = new NextRequest(`${SITE}/api/v1/cv/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `203.0.113.${Date.now() % 250}` },
      body: JSON.stringify({ format: "docx", targetRole: `${RUN} route` }),
    });
    const res = await generateCvRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.format).toBe("docx");
    const id = body.fileUrl.split("/").pop();
    const download = await downloadCv(new NextRequest(body.fileUrl), { params: Promise.resolve({ id }) });
    expect(download.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(download.headers.get("Content-Disposition")).toMatch(/-CV-\d{4}-\d{2}-\d{2}\.docx"$/);
  });

  it("supersedes per format: a new PDF replaces the old PDF, never the Word file (BR-7.2)", async () => {
    const role = `${RUN} supersede`;
    const pdf1 = (await generateCvDocument({ targetRole: role, format: "pdf", siteUrl: SITE })).document;
    const docx = (await generateCvDocument({ targetRole: role, format: "docx", siteUrl: SITE })).document;
    const pdf2 = (await generateCvDocument({ targetRole: role, format: "pdf", siteUrl: SITE })).document;
    const [a, b, c] = await Promise.all(
      [pdf1, docx, pdf2].map((d) => db.documentGen.findUniqueOrThrow({ where: { id: d.id } })),
    );
    expect(a?.supersededByFileUrl).toBe(pdf2.fileUrl);
    expect(b?.supersededByFileUrl).toBeNull();
    expect(c?.supersededByFileUrl).toBeNull();
  });

  it("refuses an unknown format", async () => {
    const res = await generateCvRoute(
      new NextRequest(`${SITE}/api/v1/cv/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "rtf" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("the CV carries only what the site shows, tailored by role", () => {
  it("leaves out hidden roles, unpublished or excluded projects; keeps the portfolio link", async () => {
    const org = await db.organization.findFirstOrThrow({ where: { slug: "ksdrill-sa" } });
    const status = await db.status.findUniqueOrThrow({ where: { key: "planned" } });
    const base = { organizationId: org.id, statusId: status.id, techStack: ["Python"] };
    await db.system.create({ data: { ...base, name: `${RUN} Draft`, slug: `${RUN}-draft`, description: "Hidden." } });
    await db.system.create({
      data: { ...base, name: `${RUN} Excluded`, slug: `${RUN}-excluded`, description: "Off the CV.", contentStatus: "PUBLISHED", onCv: false },
    });
    await db.experience.create({
      data: { title: `${RUN} Hidden role`, organization: "X", startDate: new Date("2024-01-01"), description: "Hidden.", contentStatus: "DRAFT" },
    });

    const model = await buildCvModel({ siteUrl: SITE });
    const projectNames = model.projects.map((p) => p.name);
    expect(projectNames).not.toContain(`${RUN} Draft`);
    expect(projectNames).not.toContain(`${RUN} Excluded`);
    expect(model.experience.map((r) => r.title)).not.toContain(`${RUN} Hidden role`);
    expect(model.links[0]).toEqual({ label: "Portfolio", url: `${SITE}/` });
    for (const project of model.projects) expect(project.caseStudyUrl.startsWith(`${SITE}/systems/`)).toBe(true);
  });

  it("puts the project most relevant to the target role first", async () => {
    const org = await db.organization.findFirstOrThrow({ where: { slug: "ksdrill-sa" } });
    const status = await db.status.findUniqueOrThrow({ where: { key: "planned" } });
    await db.system.create({
      data: {
        name: `${RUN} Inference Service`,
        slug: `${RUN}-inference`,
        description: "An LLM agent with RAG and embeddings for machine learning workloads.",
        techStack: ["Python"],
        organizationId: org.id,
        statusId: status.id,
        contentStatus: "PUBLISHED",
        cvOrder: 99,
      },
    });
    const tailored = await buildCvModel({ siteUrl: SITE, targetRole: "AI Engineer" });
    expect(tailored.projects[0]?.name).toBe(`${RUN} Inference Service`);
    const untailored = await buildCvModel({ siteUrl: SITE });
    expect(untailored.projects[0]?.name).not.toBe(`${RUN} Inference Service`);
  });
});

describe("everything on the CV is editable in the admin", () => {
  it("edits the profile — headline, phone, summary — audited, and the CV follows", async () => {
    const res = await patchProfile(
      adminRequest(`${SITE}/api/v1/admin/profile`, "PATCH", {
        headline: "Software & AI Engineer",
        phone: "+27 60 000 0000",
        summary: `${RUN} summary.`,
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ phone: "+27 60 000 0000", summary: `${RUN} summary.` });

    const model = await buildCvModel({ siteUrl: SITE });
    expect(model.summary).toBe(`${RUN} summary.`);
    expect(model.phone).toBe("+27 60 000 0000");
    expect(await db.activityLog.count({ where: { action: "profile.update", adminUserId: adminId } })).toBe(1);

    const got = await getProfile(adminRequest(`${SITE}/api/v1/admin/profile`, "GET"));
    expect((await got.json()).links.length).toBeGreaterThanOrEqual(3);
  });

  it("refuses an invalid phone and an empty update", async () => {
    expect((await patchProfile(adminRequest(`${SITE}/api/v1/admin/profile`, "PATCH", { phone: "call me" }))).status).toBe(400);
    expect((await patchProfile(adminRequest(`${SITE}/api/v1/admin/profile`, "PATCH", {}))).status).toBe(400);
  });

  it("adds, edits and removes a link; the CV carries only links marked onCv", async () => {
    const created = await createLink(
      adminRequest(`${SITE}/api/v1/admin/profile/links`, "POST", { kind: `${RUN}-blog`, label: "Blog", url: "https://blog.example" }),
    );
    expect(created.status).toBe(201);
    const link = await created.json();
    expect((await buildCvModel({ siteUrl: SITE })).links.map((l) => l.url)).toContain("https://blog.example");

    const off = await patchLink(adminRequest(`${SITE}/api/v1/admin/profile/links/${link.id}`, "PATCH", { onCv: false }), {
      params: Promise.resolve({ id: link.id }),
    });
    expect(off.status).toBe(200);
    expect((await buildCvModel({ siteUrl: SITE })).links.map((l) => l.url)).not.toContain("https://blog.example");

    const insecure = await createLink(
      adminRequest(`${SITE}/api/v1/admin/profile/links`, "POST", { kind: `${RUN}-x`, label: "X", url: "http://x.example" }),
    );
    expect(insecure.status).toBe(400);

    const gone = await deleteLink(adminRequest(`${SITE}/api/v1/admin/profile/links/${link.id}`, "DELETE"), {
      params: Promise.resolve({ id: link.id }),
    });
    expect(gone.status).toBe(204);
  });

  it("certifications start as drafts and reach the CV once published", async () => {
    const created = await createAchievement(
      adminRequest(`${SITE}/api/v1/admin/achievements`, "POST", {
        title: `${RUN} Cloud Certificate`,
        issuer: "Example Institute",
        achievedOn: "2025-06-01",
        url: "https://cert.example/123",
      }),
    );
    expect(created.status).toBe(201);
    const achievement = await created.json();
    expect(achievement.contentStatus).toBe("draft");
    const titles = async () => (await buildCvModel({ siteUrl: SITE })).certifications.map((c) => c.title);
    expect(await titles()).not.toContain(`${RUN} Cloud Certificate`);

    const published = await patchAchievement(
      adminRequest(`${SITE}/api/v1/admin/achievements/${achievement.id}`, "PATCH", {
        title: `${RUN} Cloud Certificate`,
        issuer: "Example Institute",
        achievedOn: "2025-06-01",
        url: "https://cert.example/123",
        contentStatus: "published",
      }),
      { params: Promise.resolve({ id: achievement.id }) },
    );
    expect(published.status).toBe(200);
    expect(await titles()).toContain(`${RUN} Cloud Certificate`);

    const list = await listAchievements(adminRequest(`${SITE}/api/v1/admin/achievements`, "GET"));
    expect((await list.json()).data.some((a: { id: string }) => a.id === achievement.id)).toBe(true);
    const removed = await deleteAchievement(adminRequest(`${SITE}/api/v1/admin/achievements/${achievement.id}`, "DELETE"), {
      params: Promise.resolve({ id: achievement.id }),
    });
    expect(removed.status).toBe(204);
  });

  it("edits a role's bullets and hides it", async () => {
    const role = await db.experience.create({
      data: { title: `${RUN} Engineer`, organization: "Acme", startDate: new Date("2025-01-01"), description: "Work." },
    });
    const body = {
      title: `${RUN} Engineer`,
      organization: "Acme",
      startDate: "2025-01-01",
      description: "Work.",
      highlights: ["Shipped 2 systems to production.", "Cut build time by 40%."],
    };
    const edited = await patchExperience(adminRequest(`${SITE}/api/v1/admin/cv/experience/${role.id}`, "PATCH", body), {
      params: Promise.resolve({ id: role.id }),
    });
    expect(edited.status).toBe(200);
    expect((await edited.json()).highlights).toHaveLength(2);
    const onCv = (await buildCvModel({ siteUrl: SITE })).experience.find((r) => r.title === `${RUN} Engineer`);
    expect(onCv?.highlights).toEqual(body.highlights);

    await patchExperience(
      adminRequest(`${SITE}/api/v1/admin/cv/experience/${role.id}`, "PATCH", { ...body, contentStatus: "draft" }),
      { params: Promise.resolve({ id: role.id }) },
    );
    expect((await buildCvModel({ siteUrl: SITE })).experience.some((r) => r.title === `${RUN} Engineer`)).toBe(false);
  });

  it("the completeness report scores the CV and previews it", async () => {
    const res = await checkCvRoute(adminRequest(`${SITE}/api/v1/admin/cv/check?targetRole=AI%20Engineer`, "GET"));
    expect(res.status).toBe(200);
    const report = await res.json();
    expect(typeof report.score).toBe("number");
    expect(Array.isArray(report.issues)).toBe(true);
    expect(report.preview.targetRole).toBe("AI Engineer");
    const unauthenticated = await checkCvRoute(new NextRequest(`${SITE}/api/v1/admin/cv/check`));
    expect(unauthenticated.status).toBe(401);
  });
});
