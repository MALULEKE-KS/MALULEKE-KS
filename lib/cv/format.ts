// lib/cv/format.ts
// Formatting shared by the PDF and DOCX renderers (#74), so both formats say
// exactly the same thing. ATS conventions: "Jan 2024 – Present" dates, links
// written out as readable text, sections in the standard order and names.

import type { CvModel } from "@/lib/cv/model";

export function monthYear(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function dateRange(start: Date, end: Date | null, expected?: Date | null): string {
  const to = end ? monthYear(end) : expected ? `Expected ${monthYear(expected)}` : "Present";
  return `${monthYear(start)} – ${to}`;
}

/** "github.com/MALULEKE-KS" — readable for a person and parseable for an ATS. */
export function displayUrl(url: string): string {
  return url.replace(/^mailto:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export interface ContactItem {
  text: string;
  url?: string;
}

/**
 * Two contact lines, each short enough never to wrap mid-item: location,
 * phone and email; then the links, written out as text.
 */
export function contactLines(model: CvModel): ContactItem[][] {
  const details: ContactItem[] = [
    ...(model.location ? [{ text: model.location }] : []),
    ...(model.phone ? [{ text: model.phone, url: `tel:${model.phone.replace(/[^+0-9]/g, "")}` }] : []),
    ...(model.email ? [{ text: model.email, url: `mailto:${model.email}` }] : []),
  ];
  const links: ContactItem[] = model.links.map((l) => ({ text: displayUrl(l.url), url: l.url }));
  return [details, links].filter((line) => line.length > 0);
}

/** The line under the name: headline and current qualification. */
export function headlineLine(model: CvModel): string {
  return [model.headline, model.qualificationLine].filter(Boolean).join(" | ");
}

/** Standard section names, in the order recruiters and ATS expect. */
export const SECTION = {
  summary: "Professional Summary",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
} as const;

/** "Kurhula-Success-Maluleke-CV-2026-09-19.pdf" */
export function fileName(ownerName: string, format: "pdf" | "docx", date: Date): string {
  const name = (ownerName || "CV").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${name}-CV-${date.toISOString().slice(0, 10)}.${format}`;
}
