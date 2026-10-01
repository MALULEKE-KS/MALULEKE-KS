// lib/content/blocks.ts
// Page content blocks (#106): site copy the owner edits in the admin instead
// of in code. Each block is a SiteContent row; this registry says which keys
// exist and what shape each body must have (validated on every write, and on
// every read so a malformed row degrades to "no content" instead of breaking a
// page). A new block is one entry here and one row — no migration (EXT-1).

import { cache } from "react";
import { z } from "zod";
import { dbPublic } from "@/lib/db";

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
    }),
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
