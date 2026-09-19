// lib/cv/render-docx.ts
// The CV as a Word document (#74), from the same model as the PDF. ATS-safe:
// one column, real Word headings (which ATS parsers map to sections), native
// bullet lists, a standard font, no tables or text boxes, and every link
// written out as text as well as clickable.

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { CvModel } from "@/lib/cv/model";
import { SECTION, contactLines, dateRange, displayUrl, headlineLine, monthYear } from "@/lib/cv/format";

const FONT = "Calibri";
const MUTED = "444444";

function link(text: string, url: string): ExternalHyperlink {
  return new ExternalHyperlink({ link: url, children: [new TextRun({ text, style: "Hyperlink" })] });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 80 },
    border: { bottom: { color: MUTED, space: 1, style: BorderStyle.SINGLE, size: 6 } },
  });
}

function title(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, bold: true })], spacing: { before: 120 } });
}

function meta(children: ParagraphChild[]): Paragraph {
  return new Paragraph({ children, spacing: { after: 40 } });
}

function muted(text: string): TextRun {
  return new TextRun({ text, color: MUTED });
}

const SEP = "  |  ";

function joined(parts: (string | ParagraphChild)[]): ParagraphChild[] {
  return parts.flatMap((part, i) => [
    ...(i > 0 ? [muted(SEP)] : []),
    typeof part === "string" ? muted(part) : part,
  ]);
}

function bullet(text: string): Paragraph {
  return new Paragraph({ text, bullet: { level: 0 } });
}

function labelled(label: string, value: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)] });
}

export function buildCvDocx(model: CvModel): Document {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({ children: [new TextRun({ text: model.name, bold: true, size: 40 })], alignment: AlignmentType.LEFT }),
  );
  const headline = headlineLine(model);
  if (headline) children.push(new Paragraph({ children: [new TextRun({ text: headline, size: 22, color: MUTED })] }));
  const lines = contactLines(model);
  lines.forEach((line, i) =>
    children.push(
      new Paragraph({
        children: joined(line.map((c) => (c.url ? link(c.text, c.url) : c.text))),
        spacing: { after: i === lines.length - 1 ? 120 : 0 },
      }),
    ),
  );

  if (model.summary) {
    children.push(heading(SECTION.summary), new Paragraph(model.summary));
  }

  if (model.experience.length > 0) {
    children.push(heading(SECTION.experience));
    for (const role of model.experience) {
      children.push(
        title(role.title),
        meta(joined([role.organization, ...(role.location ? [role.location] : []), dateRange(role.start, role.end)])),
        ...(role.highlights.length > 0 ? role.highlights.map(bullet) : [new Paragraph(role.description)]),
        ...(role.skills.length > 0 ? [labelled("Tools", role.skills.join(", "))] : []),
      );
    }
  }

  if (model.projects.length > 0) {
    children.push(heading(SECTION.projects));
    for (const project of model.projects) {
      children.push(
        title(project.name),
        meta(
          joined([
            project.organization,
            link(displayUrl(project.caseStudyUrl), project.caseStudyUrl),
            ...(project.liveUrl ? [link(displayUrl(project.liveUrl), project.liveUrl)] : []),
          ]),
        ),
        new Paragraph(project.description),
        ...project.impacts.map(bullet),
        ...(project.techStack.length > 0 ? [labelled("Stack", project.techStack.join(", "))] : []),
      );
    }
  }

  if (model.education.length > 0) {
    children.push(heading(SECTION.education));
    for (const e of model.education) {
      children.push(
        title(e.qualification),
        meta(joined([e.institution, dateRange(e.start, e.end, e.expectedGraduation)])),
        ...(e.honors ? [new Paragraph(e.honors)] : []),
        ...(e.coursework.length > 0 ? [labelled("Relevant coursework", e.coursework.join(", "))] : []),
      );
    }
  }

  if (model.skills.length > 0) {
    children.push(heading(SECTION.skills), ...model.skills.map((g) => labelled(g.category, g.names.join(", "))));
  }

  if (model.certifications.length > 0) {
    children.push(heading(SECTION.certifications));
    for (const c of model.certifications) {
      const details: (string | ParagraphChild)[] = [
        ...(c.issuer ? [c.issuer] : []),
        monthYear(c.date),
        ...(c.url ? [link(displayUrl(c.url), c.url)] : []),
      ];
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: c.title, bold: true }),
            ...details.flatMap((part) => [muted(SEP), typeof part === "string" ? muted(part) : part]),
          ],
        }),
      );
    }
  }

  return new Document({
    creator: model.name,
    title: `${model.name} — CV${model.targetRole ? ` (${model.targetRole})` : ""}`,
    description: model.headline ?? "Curriculum Vitae",
    keywords: model.skills.flatMap((g) => g.names).join(", "),
    styles: {
      default: {
        document: { run: { font: FONT, size: 21 }, paragraph: { spacing: { line: 264 } } },
        heading1: { run: { font: FONT, size: 22, bold: true, allCaps: true, color: "111111" } },
      },
    },
    sections: [
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 850, right: 850 } } },
        children,
      },
    ],
  });
}

export async function renderCvDocx(model: CvModel): Promise<Buffer> {
  return Packer.toBuffer(buildCvDocx(model));
}
