// lib/queries/lenses.ts
// The visitor lenses (Constitution §4) as the public sees them — key and
// label, in the owner's order. The framing prompts stay server-side: the AI
// guide reads them through the runtime role, never the public one.

import { cache } from "react";
import { dbPublic } from "@/lib/db";

export interface PublicLens {
  key: string;
  label: string;
}

export const getPublicLenses = cache(async (): Promise<PublicLens[]> => {
  const rows = await dbPublic.publicVisitorLens.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  return rows.map(({ key, label }) => ({ key, label }));
});
