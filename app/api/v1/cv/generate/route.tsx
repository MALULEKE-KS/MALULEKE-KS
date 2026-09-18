// POST /api/v1/cv/generate — reflects live DB state at generation time (BR-7.1);
// prior DocumentGen rows superseded, not deleted (BR-7.2). Public — the
// visitor-facing "Download PDF" button on /cv, no admin session required.
// Rate-limited the same way /inquiries is: a real PDF render + DB write per
// request is cheap to abuse otherwise.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { CvGenerateInputSchema } from "@/lib/schemas";
import { experienceWithSkills, skillWithCategory, toEducationEntry, toExperienceEntry, toSkillEntry, supersedePriorDocuments } from "@/lib/rules/cv";
import { CvDocument } from "@/lib/cv/pdf-document";
import { checkAndIncrementRateLimit, getClientIp } from "@/lib/auth/rate-limit";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 10 generations per IP per hour

const OWNER_NAME = "Kurhula Success Maluleke";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = CvGenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid request", 400, { issues: parsed.error.issues });
  }
  const targetRole = parsed.data.targetRole ?? null;

  const ip = getClientIp(request);
  const rateLimit = await checkAndIncrementRateLimit(`cv-generate:ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return errorResponse("RATE_LIMITED", "Too many requests from this connection — try again later.", 429, {
      retryAfterMs: rateLimit.retryAfterMs,
    });
  }

  // BR-7.1 — fetched fresh on every call, never a cached/static snapshot.
  const [experienceRows, educationRows, skillRows] = await Promise.all([
    db.experience.findMany({ ...experienceWithSkills, orderBy: { startDate: "desc" } }),
    db.education.findMany({ orderBy: { startDate: "desc" } }),
    db.skill.findMany({ ...skillWithCategory, orderBy: { name: "asc" } }),
  ]);

  const experience = experienceRows.map(toExperienceEntry);
  const education = educationRows.map(toEducationEntry);
  const skills = skillRows.map(toSkillEntry);
  const roleLine = experience[0]?.title ?? "Software Engineer";

  const pdfBuffer = await renderToBuffer(
    <CvDocument name={OWNER_NAME} roleLine={roleLine} targetRole={targetRole} experience={experience} education={education} skills={skills} />
  );

  // Created first with a placeholder fileUrl, then updated once we know the
  // row's own id — the download route is id-addressed, so the URL can't be
  // built before the row exists.
  const created = await db.documentGen.create({
    data: { type: "cv", targetRole, fileData: Buffer.from(pdfBuffer), fileUrl: "" },
  });
  const fileUrl = new URL(`/api/v1/cv/documents/${created.id}`, request.url).toString();
  const updated = await db.documentGen.update({ where: { id: created.id }, data: { fileUrl } });

  await supersedePriorDocuments("cv", targetRole, fileUrl);

  return NextResponse.json({ fileUrl: updated.fileUrl, generatedAt: updated.generatedAt.toISOString() }, { status: 201 });
}
