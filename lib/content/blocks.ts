// lib/content/blocks.ts
// Page content blocks (#106): site copy the owner edits in the admin instead
// of in code. Each block is a SiteContent row; this registry says which keys
// exist and what shape each body must have (validated on every write, and on
// every read so a malformed row degrades to "no content" instead of breaking a
// page). A new block is one entry here and one row — no migration (EXT-1).

import { cache } from "react";
import { z } from "zod";
import { dbPublic } from "@/lib/db";
import { EvidenceBlock } from "@/lib/evidence/schema";
import { JourneyBlock, PageCopyBlock } from "@/lib/content/json-blocks";

const Text = (max: number) => z.string().trim().min(1).max(max);

export const CONTENT_BLOCKS = {
  "how-i-build": {
    title: "How I build — mission and principles",
    description: "The mission statement and the governing principles, shown on /how-i-build and the home page.",
    schema: z.object({
      mission: Text(400),
      principles: z
        .array(z.object({ name: Text(80), summary: Text(160), body: Text(800) }))
        .min(1)
        .max(8),
    }),
  },
  "home-intro": {
    title: "Home — introduction",
    description: "The home page's opening: the headline under your name and the paragraph that introduces you.",
    schema: z.object({
      headline: Text(160),
      lede: Text(600),
    }),
  },
  "systems-page": {
    title: "Systems — introduction",
    description: "The /systems page's heading and introduction.",
    schema: z.object({
      heading: Text(140),
      lede: Text(400),
    }),
  },
  "ai-guide": {
    title: "Home — AI guide section",
    description: "The home page's AI guide band: its label, heading, introduction and the example questions visitors can tap.",
    schema: z.object({
      eyebrow: Text(60),
      heading: Text(120),
      lede: Text(500),
      suggestions: z.array(Text(140)).min(1).max(6),
      // The chat's opening suggestions on a particular page (the longest matching path prefix wins), shown before the general ones.
      pageSuggestions: z
        .array(z.object({ page: z.string().trim().regex(/^\/[a-z0-9\-/]*$/, "a site path, e.g. /systems/"), questions: z.array(Text(140)).min(1).max(3) }))
        .max(12)
        .optional(),
    }),
  },
  evidence: {
    title: "Evidence — claims and their proof",
    description: "The claims the site makes and the evidence a visitor can open for each (docs/EVIDENCE-SPEC.md). Links: repo:<path>, /public-route or actions:<workflow>.yml.",
    schema: EvidenceBlock,
  },
  "page-copy": {
    title: "Section copy — every page's headings and introductions",
    description: "The eyebrow, title and description of each section on every page, keyed by page.section (e.g. home.map, about.skills). *Word* marks the accent; {reviewSlaHours} and {owner} are filled in for you. Buttons and form labels aren't here.",
    schema: PageCopyBlock,
  },
  release: {
    title: "Release — the version the site is on",
    description: "The status line at the foot of every page says which version the site is on and what's next (e.g. \"V1 · V2 on the way\"). The AI guide knows it too.",
    schema: z.object({
      current: Text(20),
      next: z.string().trim().max(20).default(""),
      nextNote: z.string().trim().max(60).default(""),
      link: z
        .string()
        .trim()
        .max(120)
        .regex(/^(\/[a-z0-9\-/#]*)?$/, "a site path such as /systems/maluleke-ks, or empty")
        .default(""),
    }),
  },
  journey: {
    title: "Journey — your story in chapters",
    description: "The /journey page: headline, introduction, the chapters of your life and career (years, place, a paragraph each) and what's next. Milestones inside each chapter come from Admin → Journey. Set reviewed to true once you've read the draft.",
    schema: JourneyBlock,
  },
} as const;

export type ContentKey = keyof typeof CONTENT_BLOCKS;
export type ContentBody<K extends ContentKey> = z.infer<(typeof CONTENT_BLOCKS)[K]["schema"]>;

export function isContentKey(key: string): key is ContentKey {
  return Object.prototype.hasOwnProperty.call(CONTENT_BLOCKS, key);
}

/** A block's public content, validated; null when absent or malformed. */
export const getContentBlock = cache(async <K extends ContentKey>(key: K): Promise<ContentBody<K> | null> => {
  const row = await dbPublic.publicSiteContent.findUnique({ where: { key } });
  if (!row) return null;
  const parsed = CONTENT_BLOCKS[key].schema.safeParse(row.body);
  return parsed.success ? (parsed.data as ContentBody<K>) : null;
});
