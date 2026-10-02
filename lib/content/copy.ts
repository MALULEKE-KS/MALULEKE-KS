// lib/content/copy.ts
// Section copy from the "page-copy" content block (Admin → Page content). Each
// caller passes the words it shipped with as a fallback, so a page still reads
// properly if the block is ever missing — the block is the source; the
// fallback is a safety net, and the seed migration keeps the two identical.

import { cache } from "react";
import { getContentBlock } from "@/lib/content/blocks";

export interface SectionCopy {
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: { title: string; body?: string }[];
}

export const getPageCopy = cache(async (): Promise<Record<string, SectionCopy>> => (await getContentBlock("page-copy").catch(() => null)) ?? {});

/** {reviewSlaHours} and {owner} filled in from data. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? String(vars[k]) : all));
}

/** One section's copy: the block's words over the fallback, placeholders filled. */
export async function sectionCopy(key: string, fallback: SectionCopy, vars: Record<string, string | number> = {}): Promise<SectionCopy> {
  const merged = { ...fallback, ...((await getPageCopy())[key] ?? {}) };
  return {
    ...(merged.eyebrow && { eyebrow: fill(merged.eyebrow, vars) }),
    ...(merged.title && { title: fill(merged.title, vars) }),
    ...(merged.description && { description: fill(merged.description, vars) }),
    ...(merged.items && { items: merged.items.map((i) => ({ title: fill(i.title, vars), ...(i.body && { body: fill(i.body, vars) }) })) }),
  };
}
