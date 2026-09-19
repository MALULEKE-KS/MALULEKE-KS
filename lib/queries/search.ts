// lib/queries/search.ts
// Instant search (approved feature 5, F1.7). Calls the database's
// search_public(), which reads only the public views — so a result can never
// be something a visitor couldn't see, masking included. Full-text for
// meaning, trigram similarity for typos and partial words.

import { z } from "zod";
// Public reads only — the platform_public role (F1.8).
import { dbPublic as db } from "@/lib/db";

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export interface SearchResult {
  kind: "system" | "journey" | "skill";
  /** system → slug, journey → entry id, skill → skill id */
  key: string;
  title: string;
  subtitle: string | null;
  rank: number;
}

export async function searchPublic(q: string, limit = 10): Promise<SearchResult[]> {
  const parsed = SearchQuerySchema.safeParse({ q, limit });
  if (!parsed.success) return [];
  return db.$queryRaw<SearchResult[]>`
    SELECT kind, key, title, subtitle, rank FROM search_public(${parsed.data.q}, ${parsed.data.limit}::int)`;
}
