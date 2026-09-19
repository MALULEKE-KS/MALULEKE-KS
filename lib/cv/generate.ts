// lib/cv/generate.ts
// Generate and store a CV document (#74): build the model from live data
// (BR-7.1), check it, render the requested format, store it, and supersede
// the previous document of the same type, role and format (BR-7.2 — kept,
// never deleted). The completeness report is stored with the document.

import { db } from "@/lib/db";
import { buildCvModel } from "@/lib/cv/model";
import { checkCv } from "@/lib/cv/check";
import { renderCvPdf } from "@/lib/cv/render-pdf";
import { renderCvDocx } from "@/lib/cv/render-docx";
import { supersedePriorDocuments } from "@/lib/rules/cv";

export type CvFormat = "pdf" | "docx";

export const CV_CONTENT_TYPE: Record<CvFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function generateCvDocument({
  targetRole,
  format,
  siteUrl,
}: {
  targetRole: string | null;
  format: CvFormat;
  siteUrl: string;
}) {
  const model = await buildCvModel({ targetRole, siteUrl });
  const completeness = checkCv(model);
  const bytes = format === "pdf" ? await renderCvPdf(model) : await renderCvDocx(model);

  // Created first with a placeholder fileUrl, then updated once the row's
  // own id is known — the download route is id-addressed.
  const created = await db.documentGen.create({
    data: {
      type: "cv",
      targetRole: model.targetRole,
      format,
      fileData: new Uint8Array(bytes),
      fileUrl: "",
      completeness: { score: completeness.score, issues: completeness.issues.length },
    },
  });
  const fileUrl = new URL(`/api/v1/cv/documents/${created.id}`, siteUrl).toString();
  const document = await db.documentGen.update({ where: { id: created.id }, data: { fileUrl } });
  await supersedePriorDocuments("cv", model.targetRole, format, fileUrl);

  return { document, completeness };
}
