// lib/content/json-blocks.ts
// The content blocks too nested for a plain form, edited as JSON in the admin
// (Admin → Page content). Pure schemas — no database import — so the admin's
// editor can check an entry in the browser with exactly the rules the server
// enforces on save.

import { z } from "zod";
import { EvidenceBlock } from "@/lib/evidence/schema";
import { ToursBlock } from "@/lib/guide/tour";

const Text = (max: number) => z.string().trim().min(1).max(max);
const Year = z.number().int().min(1990).max(2100);

/** /journey — the owner's life and career in chapters (owner, 2026-10-02). */
export const JourneyBlock = z
  .object({
    headline: Text(160),
    lede: Text(400),
    chapters: z
      .array(
        z.object({
          id: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40),
          from: Year,
          // null = still going.
          to: Year.nullable(),
          title: Text(80),
          place: Text(120).optional(),
          body: Text(1200),
        }),
      )
      .min(1)
      .max(10)
      .refine((cs) => cs.every((c) => c.to === null || c.to >= c.from), { message: "A chapter can't end before it starts" })
      .refine((cs) => new Set(cs.map((c) => c.id)).size === cs.length, { message: "Chapter ids must be unique" }),
    ahead: z.object({ title: Text(80), body: Text(800) }).optional(),
    // Drafted from his CV and answers; flips to true once he's read it.
    reviewed: z.boolean().default(false),
  });

/**
 * Every page's section copy (owner, 2026-10-02: "everything shouldn't be
 * hardcoded"): eyebrows, titles, descriptions and short lists, keyed by
 * section ("home.map", "about.skills", "contact.steps"…). *Word* marks the
 * accent. {reviewSlaHours} and {owner} are filled in from settings and the
 * profile. Interface labels (buttons, form fields) stay in code.
 */
export const PageCopyBlock = z.record(
  z.string().regex(/^[a-z]+(-[a-z]+)*\.[a-z]+(-[a-z]+)*$/, "keys look like page.section"),
  z
    .object({
      eyebrow: Text(60).optional(),
      title: Text(160).optional(),
      description: Text(400).optional(),
      items: z.array(z.object({ title: Text(80), body: Text(200).optional() })).max(8).optional(),
    })
    .strict(),
);

export const JSON_BLOCKS = { evidence: EvidenceBlock, journey: JourneyBlock, "page-copy": PageCopyBlock, "guide-tours": ToursBlock } as const;
export type JsonBlockKey = keyof typeof JSON_BLOCKS;
